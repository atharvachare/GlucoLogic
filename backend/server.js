const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const functions = require('firebase-functions');
const authMiddleware = require('./middlewares/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Import controllers
const authController = require('./controllers/authController');
const logController = require('./controllers/logController');
const { createLog, getLogs, getSuggestion, getDashboardStats, updateLog, deleteLog, migrateISF } = require('./controllers/logController');
const profileRoutes = require('./routes/profile');

// Auth Routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.put('/api/auth/profile', authMiddleware, authController.updateProfile);

// Profile Routes
app.use('/api/profile', profileRoutes);

// Log Routes
app.post('/api/logs', authMiddleware, logController.createLog);
app.get('/api/logs', authMiddleware, logController.getLogs);
app.put('/api/logs/:id', authMiddleware, logController.updateLog);
app.delete('/api/logs/:id', authMiddleware, logController.deleteLog);
app.get('/api/suggestions', authMiddleware, logController.getSuggestion);
app.get('/api/dashboard', authMiddleware, logController.getDashboardStats);
app.post('/api/logs/migrate-isf', authMiddleware, migrateISF);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
