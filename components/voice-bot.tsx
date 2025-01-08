"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import protobuf from "protobufjs";

const SAMPLE_RATE = 16000;
const NUM_CHANNELS = 1;
const PLAY_TIME_RESET_THRESHOLD_MS = 1.0;

export function VoiceBot() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("Click the microphone to start");
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playTimeRef = useRef<number>(0);
  const lastMessageTimeRef = useRef<number>(0);
  const frameProtoRef = useRef<any>(null);

  useEffect(() => {
    // Load protobuf schema
    const loadProto = async () => {
      try {
        const root = await protobuf.load("/frames.proto");
        frameProtoRef.current = root.lookupType("pipecat.Frame");
        setStatus("Ready to connect");
      } catch (err) {
        console.error("Failed to load protobuf schema:", err);
        setStatus("Error loading voice bot");
      }
    };
    loadProto();

    return () => {
      stopAudio(true);
    };
  }, []);

  const initWebSocket = () => {
    wsRef.current = new WebSocket("ws://aicallerserver.ostello.co.in");
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.addEventListener("open", handleWebSocketOpen);
    wsRef.current.addEventListener("message", handleWebSocketMessage);
    wsRef.current.addEventListener("close", (event) => {
      console.log("WebSocket connection closed.", event.code, event.reason);
      stopAudio(false);
      setIsConnected(false);
      setStatus("Connection closed");
    });
    wsRef.current.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      setStatus("Connection error");
    });
  };

  const handleWebSocketOpen = async () => {
    setStatus("Connected");
    setIsConnected(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: NUM_CHANNELS,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: SAMPLE_RATE,
      });

      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);

      scriptProcessorRef.current.onaudioprocess = (event) => {
        if (!wsRef.current) return;

        const audioData = event.inputBuffer.getChannelData(0);
        const pcmS16Array = convertFloat32ToS16PCM(audioData);
        const pcmByteArray = new Uint8Array(pcmS16Array.buffer);
        
        const frame = frameProtoRef.current.create({
          audio: {
            audio: Array.from(pcmByteArray),
            sampleRate: SAMPLE_RATE,
            numChannels: NUM_CHANNELS,
          },
        });

        const encodedFrame = frameProtoRef.current.encode(frame).finish();
        wsRef.current.send(encodedFrame);
      };
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setStatus("Microphone access denied");
    }
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    setIsSpeaking(true);
    const arrayBuffer = event.data;
    enqueueAudioFromProto(arrayBuffer);
  };

  const enqueueAudioFromProto = (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) return;

    const parsedFrame = frameProtoRef.current.decode(new Uint8Array(arrayBuffer));
    if (!parsedFrame?.audio) return;

    const diffTime = audioContextRef.current.currentTime - lastMessageTimeRef.current;
    if (playTimeRef.current === 0 || diffTime > PLAY_TIME_RESET_THRESHOLD_MS) {
      playTimeRef.current = audioContextRef.current.currentTime;
    }
    lastMessageTimeRef.current = audioContextRef.current.currentTime;

    const audioVector = Array.from(parsedFrame.audio.audio);
    const audioArray = new Uint8Array(audioVector);

    audioContextRef.current.decodeAudioData(audioArray.buffer, (buffer) => {
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = buffer;
      source.start(playTimeRef.current);
      source.connect(audioContextRef.current!.destination);
      playTimeRef.current += buffer.duration;

      source.onended = () => {
        setIsSpeaking(false);
      };
    });
  };

  const convertFloat32ToS16PCM = (float32Array: Float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  const toggleAudio = () => {
    if (!isConnected) {
      initWebSocket();
    } else {
      stopAudio(true);
    }
  };

  const stopAudio = (closeWebsocket: boolean) => {
    playTimeRef.current = 0;
    setIsConnected(false);
    setIsSpeaking(false);

    if (wsRef.current && closeWebsocket) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    setStatus("Click the microphone to start");
  };

  return (
    <Card className="w-full max-w-md p-8 bg-black/20 backdrop-blur-lg border-gray-800">
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <Button
            size="lg"
            variant={isConnected ? "destructive" : "default"}
            className={cn(
              "h-24 w-24 rounded-full",
              isConnected && "bg-red-500 hover:bg-red-600"
            )}
            onClick={toggleAudio}
          >
            {isConnected ? (
              <MicOff className="h-12 w-12" />
            ) : (
              <Mic className="h-12 w-12" />
            )}
          </Button>
          
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2"
              >
                {/* <Waveform className="h-8 w-8 text-primary animate-pulse" /> */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-gray-400 text-center">{status}</p>
      </div>
    </Card>
  );
}