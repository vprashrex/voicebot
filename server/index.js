import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('audioMessage', (audioData) => {
    // Here you would typically:
    // 1. Process the audio (Linear16, 16000Hz)
    // 2. Send it to your inference service
    // 3. Get the response
    // For now, we'll echo back the same audio
    console.log('Audio data received', audioData);
    socket.emit('audioResponse', audioData);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});