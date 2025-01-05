import React from 'react';
import AudioRecorder from './components/AudioRecorder';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">Voice Bot</h1>
        <AudioRecorder />
      </div>
    </div>
  );
}

export default App;