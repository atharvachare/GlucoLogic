const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authMiddleware = require('./middlewares/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Import controllers
const authController = require('./controllers/authController');
const { createLog, getLogs, getSuggestion, getDashboardStats, updateLog, deleteLog, migrateISF } = require('./controllers/logController');
const profileRoutes = require('./routes/profile');

// Auth Routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.put('/api/auth/profile', authMiddleware, authController.updateProfile);

// Profile Routes
app.use('/api/profile', profileRoutes);

// Log Routes — IMPORTANT: specific routes must come before wildcard /:id routes
app.post('/api/logs/migrate-isf', authMiddleware, migrateISF);  // must be before POST /api/logs/:id
app.post('/api/logs', authMiddleware, createLog);
app.get('/api/logs', authMiddleware, getLogs);
app.put('/api/logs/:id', authMiddleware, updateLog);
app.delete('/api/logs/:id', authMiddleware, deleteLog);
app.get('/api/suggestions', authMiddleware, getSuggestion);
app.get('/api/dashboard', authMiddleware, getDashboardStats);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
