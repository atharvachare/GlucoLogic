const { db } = require('../firebase');
const { calculateEntryEffectiveness, reCalculateUserStats, getInsulinSuggestion } = require('../utils/engine');

const createLog = async (req, res) => {
    const { glucose_before, glucose_after, insulin_units, meal_type, food_description, activity_level } = req.body;
    const userId = req.user.id;

    try {
        let effectiveness = null;
        if (glucose_before && glucose_after && insulin_units > 0) {
            effectiveness = calculateEntryEffectiveness(glucose_before, glucose_after, insulin_units);
        }

        const logRef = db.collection('users').doc(userId).collection('logs').doc();
        const logData = {
            id: logRef.id,
            user_id: userId,
            glucose_before,
            glucose_after,
            insulin_units,
            meal_type,
            food_description,
            activity_level,
            effectiveness,
            timestamp: new Date().toISOString()
        };

        await logRef.set(logData);

        if (effectiveness !== null) {
            await reCalculateUserStats(userId);
        }

        res.status(201).json({ message: 'Log created successfully', effectiveness });
    } catch (error) {
        console.error('Create log error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getLogs = async (req, res) => {
    const userId = req.user.id;
    try {
        const snapshot = await db.collection('users').doc(userId).collection('logs')
            .orderBy('timestamp', 'desc').get();
        
        const logs = snapshot.docs.map(doc => doc.data());
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getSuggestion = async (req, res) => {
    const userId = req.user.id;
    const { current_glucose } = req.query;

    if (!current_glucose) {
        return res.status(400).json({ error: 'current_glucose is required' });
    }

    try {
        const suggestionData = await getInsulinSuggestion(userId, parseFloat(current_glucose));
        res.json(suggestionData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    const userId = req.user.id;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const data = userDoc.data();
        const logsSnapshot = await db.collection('users').doc(userId).collection('logs')
            .orderBy('timestamp', 'desc').limit(10).get();
        
        const recentLogs = logsSnapshot.docs.map(doc => doc.data());
        
        // Calculate risk
        let risk = 'Low';
        const highLogs = recentLogs.filter(l => l.glucose_before > 200).length;
        if (highLogs > 5) risk = 'High';
        else if (highLogs > 2) risk = 'Medium';

        res.json({
            stats: data.stats || { avg_effectiveness: 0, confidence_score: 'Low', total_logs: 0 },
            health: data.health || null,
            lifestyle: data.lifestyle || { activity_level: 'None' },
            recentLogs: recentLogs.reverse(),
            risk
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateLog = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { glucose_before, glucose_after, insulin_units, meal_type, food_description, activity_level } = req.body;

    try {
        const logRef = db.collection('users').doc(userId).collection('logs').doc(id);
        const logDoc = await logRef.get();

        if (!logDoc.exists) {
            return res.status(404).json({ error: 'Log not found' });
        }

        let effectiveness = null;
        if (glucose_before && glucose_after && insulin_units > 0) {
            effectiveness = calculateEntryEffectiveness(glucose_before, glucose_after, insulin_units);
        }

        await logRef.update({
            glucose_before, glucose_after, insulin_units, meal_type, food_description, activity_level, effectiveness
        });

        await reCalculateUserStats(userId);
        res.json({ message: 'Log updated successfully', effectiveness });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteLog = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        await db.collection('users').doc(userId).collection('logs').doc(id).delete();
        await reCalculateUserStats(userId);
        res.json({ message: 'Log deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createLog, getLogs, getSuggestion, getDashboardStats, updateLog, deleteLog };
