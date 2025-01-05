import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { processAudioStream } from '../utils/audioUtils';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioWorklet = useRef<AudioWorkletNode | null>(null);
  const { socket, isConnected } = useSocket();
  const { playAudio } = useAudioPlayer();

  useEffect(() => {
    if (!socket) return;

    socket.on('audioResponse', (audioData: ArrayBuffer) => {
      playAudio(audioData);
    });

    return () => {
      socket.off('audioResponse');
    };
  }, [socket, playAudio]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      audioContext.current = new AudioContext({ sampleRate: 16000 });
      await audioContext.current.audioWorklet.addModule('/src/utils/audioProcessor.js');

      const source = audioContext.current.createMediaStreamSource(stream);
      audioWorklet.current = new AudioWorkletNode(audioContext.current, 'audio-processor');

      audioWorklet.current.port.onmessage = (event) => {
        if (socket && event.data) {
          socket.emit('audioMessage', event.data);
        }
      };

      source.connect(audioWorklet.current);
      audioWorklet.current.connect(audioContext.current.destination);

      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (audioContext.current && audioWorklet.current) {
      audioWorklet.current.disconnect();
      audioContext.current.close();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-4 rounded-full transition-colors ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={!isConnected}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>
        <Volume2 className={`w-6 h-6 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
      </div>
      <p className="text-sm text-gray-600">
        {isConnected ? 'Connected to server' : 'Connecting...'}
      </p>
      <p className="text-sm font-medium">
        {isRecording ? 'Listening...' : 'Click to start listening'}
      </p>
    </div>
  );
};

export default AudioRecorder;