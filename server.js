require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        // origin: "http://localhost:5173", // Client URL
        origin: "http://localhost:5173", // Client URL
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Make io accessible to routes
app.set('io', io);

// Database Connection
// mongoose.connect('mongodb://127.0.0.1:27017/pediatrician_clinic', {
//mongoose.connect('mongodb+srv://aditya31031998_db_user:Adityaadi334@pediatrician-clinic.mx1lp0w.mongodb.net/pediatrician_clinic?appName=pediatrician-clinic', {
mongoose.connect('mongodb+srv://Vercel-Admin-pediatrics:Adityaadi334@pediatrics.qsfg2fw.mongodb.net/?appName=pediatrics', {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected (Atlas Cloud: pediatrician_clinic)'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reviews', require('./routes/reviews'));
// Duplicate removed

app.get('/', (req, res) => {
    res.send('Pediatrician Clinic API Running');
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
