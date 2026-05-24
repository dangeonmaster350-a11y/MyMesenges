const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('.'));

// Хранилище пользователей и сообщений
const users = new Map();
const messages = [];

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    
    socket.on('register_user', (userId) => {
        users.set(socket.id, { userId, socketId: socket.id });
        console.log(`User ${userId} registered`);
        io.emit('online_users', Array.from(users.values()).map(u => u.userId));
    });
    
    socket.on('send_message', (data) => {
        const { to, text, from } = data;
        
        // Сохраняем сообщение
        messages.push({
            from,
            to,
            text,
            timestamp: new Date(),
            id: Date.now()
        });
        
        // Отправляем получателю
        for (let [sockId, user] of users.entries()) {
            if (user.userId === to) {
                io.to(sockId).emit('receive_message', {
                    from: from,
                    text: text,
                    timestamp: new Date()
                });
                break;
            }
        }
        
        // Подтверждение отправителю
        socket.emit('message_sent', { success: true });
    });
    
    socket.on('typing', (data) => {
        for (let [sockId, user] of users.entries()) {
            if (user.userId === data.to) {
                io.to(sockId).emit('user_typing', { from: data.from });
                break;
            }
        }
    });
    
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        users.delete(socket.id);
        if (user) {
            io.emit('user_offline', user.userId);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Open this URL in multiple browsers to test real messaging`);
});
