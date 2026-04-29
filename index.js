const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve the built frontend
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('joinRoom', (roomCode) => {
    socket.join(roomCode);
    
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [socket.id] };
      console.log(`Room ${roomCode} created by ${socket.id}`);
      socket.emit('roomCreated', roomCode);
    } else if (rooms[roomCode].players.length < 2) {
      rooms[roomCode].players.push(socket.id);
      console.log(`User ${socket.id} joined room ${roomCode}`);
      
      io.to(roomCode).emit('gameStart', {
        players: rooms[roomCode].players
      });
    } else {
      socket.emit('roomFull', roomCode);
    }
  });

  socket.on('playerAction', (data) => {
    const { roomCode, action, state } = data;
    socket.to(roomCode).emit('opponentAction', { action, state });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const room in rooms) {
      if (rooms[room].players.includes(socket.id)) {
        io.to(room).emit('playerLeft', socket.id);
        delete rooms[room]; 
        break;
      }
    }
  });
});

// Fallback: serve index.html for any non-API route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`PrismaX Fight Club running on port ${PORT}`);
});
