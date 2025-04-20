import express from 'express';

// DEBUG: Print all environment variables at startup
console.log('--- ENVIRONMENT VARIABLES AT SERVER START ---');
console.log(process.env);
console.log('------------------------------------------------');

import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import adminRoutes from './routes/admin.route.js';
import bookingRoutes from './routes/booking.route.js';
import mapRoutes from './routes/map.route.js';
import reviewRoutes from './routes/review.route.js';
import userRoutes from './routes/user.route.js';
import { connectToMongoDB, closeMongoDBConnection } from './db/mongodb.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin', mapRoutes); 
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api', reviewRoutes); 

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: err.message
    });
});

// Connect to MongoDB when server starts
connectToMongoDB()
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.warn('MongoDB connection failed:', err.message);
        console.warn('Server will continue with file-based storage');
    });

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Upload directory: ${join(__dirname, 'uploads')}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        // Port is already in use, but we'll ignore this since the server is likely already running
        console.log(`Port ${PORT} is already in use. Server might be already running.`);
    } else {
        console.error('Server error:', err);
    }
});

// Handle process termination
process.on('SIGTERM', async () => {
    console.log('SIGTERM received');
    try {
        await closeMongoDBConnection();
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
    }
    server.close(() => {
        console.log('Server terminated');
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received');
    try {
        await closeMongoDBConnection();
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
    }
    server.close(() => {
        console.log('Server terminated');
    });
});
