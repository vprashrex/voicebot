export const processAudioStream = async (stream: MediaStream): Promise<AudioContext> => {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule('/src/utils/audioProcessor.js');
  return audioContext;
};

export const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  });
};