import { useCallback, useRef } from 'react';

export const useAudioPlayer = () => {
  const currentSource = useRef<AudioBufferSourceNode | null>(null);
  const currentAudioContext = useRef<AudioContext | null>(null);

  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    try {
      // Stop the currently playing audio, if any
      if (currentSource.current) {
        currentSource.current.stop();
        currentSource.current.disconnect();
        currentSource.current = null;
      }

      // Close previous audio context if it exists
      if (currentAudioContext.current) {
        currentAudioContext.current.close();
        currentAudioContext.current = null;
      }

      // Create a new AudioContext and decode audio data
      const audioContext = new AudioContext();
      currentAudioContext.current = audioContext;

      const audioBuffer = await audioContext.decodeAudioData(audioData);

      // Create and configure a new audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      // Keep track of the current source
      currentSource.current = source;
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  return { playAudio };
};
