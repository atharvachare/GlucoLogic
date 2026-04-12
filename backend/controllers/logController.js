const { db } = require('../firebase');
const { calculateISF, reCalculateUserStats, getInsulinSuggestion } = require('../utils/engine');

const createLog = async (req, res) => {
    const { glucose_before, glucose_after, insulin_units, meal_type, food_description, activity_level } = req.body;
    const userId = req.user.id;

    try {
        // ISF = (before - after) / units; null if glucose didn't drop
        let isf = null;
        if (glucose_before && glucose_after && insulin_units > 0) {
            isf = calculateISF(glucose_before, glucose_after, insulin_units);
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
            isf,
            timestamp: new Date().toISOString()
        };

        await logRef.set(logData);

        if (isf !== null) {
            await reCalculateUserStats(userId);
        }

        res.status(201).json({ message: 'Log created successfully', isf });
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

        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            // Filter out any stale negative ISF stored from old calculation logic
            if (data.isf !== null && data.isf !== undefined && data.isf <= 0) {
                data.isf = null;
            }
            // Backwards compat: rename old 'effectiveness' field to 'isf' for display
            if (data.effectiveness !== undefined && data.isf === undefined) {
                data.isf = (data.effectiveness > 0) ? data.effectiveness : null;
            }
            return data;
        });

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

        const recentLogs = logsSnapshot.docs.map(doc => {
            const logData = doc.data();
            // Clean negative ISF values and handle backwards compat
            if (logData.isf !== null && logData.isf !== undefined && logData.isf <= 0) {
                logData.isf = null;
            }
            if (logData.effectiveness !== undefined && logData.isf === undefined) {
                logData.isf = (logData.effectiveness > 0) ? logData.effectiveness : null;
            }
            return logData;
        });

        // Calculate risk based on recent glucose readings
        let risk = 'Low';
        const highLogs = recentLogs.filter(l => l.glucose_before > 200).length;
        if (highLogs > 5) risk = 'High';
        else if (highLogs > 2) risk = 'Medium';

        // Backwards compat for stats: support both avg_isf and legacy avg_effectiveness
        const rawStats = data.stats || {};
        const stats = {
            avg_isf: rawStats.avg_isf || (rawStats.avg_effectiveness > 0 ? rawStats.avg_effectiveness : 0),
            confidence_score: rawStats.confidence_score || 'Low',
            total_logs: rawStats.total_logs || 0
        };

        res.json({
            stats,
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

        let isf = null;
        if (glucose_before && glucose_after && insulin_units > 0) {
            isf = calculateISF(glucose_before, glucose_after, insulin_units);
        }

        await logRef.update({
            glucose_before, glucose_after, insulin_units, meal_type, food_description, activity_level, isf
        });

        await reCalculateUserStats(userId);
        res.json({ message: 'Log updated successfully', isf });
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

/**
 * One-time migration: retroactively calculate ISF for all old log entries.
 * Fixes logs that have 'effectiveness' field or are missing 'isf' entirely.
 */
const migrateISF = async (req, res) => {
    const userId = req.user.id;
    try {
        const snapshot = await db.collection('users').doc(userId).collection('logs').get();
        const batch = db.batch();
        let updatedCount = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const { glucose_before, glucose_after, insulin_units } = data;

            // Only process logs that have all 3 readings but no valid 'isf' yet
            const hasReadings = glucose_before && glucose_after && insulin_units > 0;
            const needsMigration = data.isf === undefined || data.isf === null;

            if (hasReadings && needsMigration) {
                const calculatedISF = calculateISF(glucose_before, glucose_after, insulin_units);
                batch.update(doc.ref, { isf: calculatedISF });
                updatedCount++;
            }
        });

        await batch.commit();

        // Recalculate global stats with all the newly computed ISF values
        await reCalculateUserStats(userId);

        res.json({ message: `Migration complete. Updated ${updatedCount} log entries.`, updatedCount });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createLog, getLogs, getSuggestion, getDashboardStats, updateLog, deleteLog, migrateISF };

