const { db } = require('../firebase');
const { calculateISF, reCalculateUserStats, getInsulinSuggestion } = require('../utils/engine');

const createLog = async (req, res) => {
    const { glucose_before, glucose_after, insulin_units, insulin_rapid, insulin_long, carbs, meal_type, food_description, activity_level } = req.body;
    const userId = req.user.id;

    try {
        const rapid = parseFloat(insulin_rapid) || 0;
        const long = parseFloat(insulin_long) || 0;
        const total = parseFloat(insulin_units) || (rapid + long);
        const meals = parseFloat(carbs) || 0;

        // ISF = (before - after) / units; null if glucose didn't drop
        let isf = null;
        if (glucose_before && glucose_after && rapid > 0) {
            isf = calculateISF(glucose_before, glucose_after, rapid);
        }

        const logRef = db.collection('users').doc(userId).collection('logs').doc();
        const logData = {
            id: logRef.id,
            user_id: userId,
            glucose_before: glucose_before ? parseFloat(glucose_before) : null,
            glucose_after: glucose_after ? parseFloat(glucose_after) : null,
            insulin_units: total,
            insulin_rapid: rapid,
            insulin_long: long,
            carbs: meals,
            meal_type,
            food_description,
            activity_level,
            isf,
            timestamp: new Date().toISOString()
        };

        await logRef.set(logData);

        // ALWAYS recalculate if we have a before/after pair — essential for learning CIR from spikes
        if (glucose_before && glucose_after) {
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

        const logs = [];
        const batch = db.batch();
        let needsBatch = false;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            let isf = data.isf;

            // Handle stale negative values
            if (isf !== null && isf !== undefined && isf <= 0) {
                isf = null;
            }

            // Auto-calculate if missing but data is complete
            if (isf === undefined || isf === null) {
                const { glucose_before, glucose_after, insulin_units, effectiveness } = data;
                
                // Fallback to legacy effectiveness if available
                if (effectiveness > 0) {
                    isf = effectiveness;
                } else if (glucose_before && glucose_after && insulin_units > 0) {
                    // Recalculate if we have the raw numbers
                    isf = calculateISF(glucose_before, glucose_after, insulin_units);
                }

                if (isf !== undefined && isf !== null) {
                    batch.update(doc.ref, { isf });
                    needsBatch = true;
                }
            }

            logs.push({ ...data, isf });
        });

        if (needsBatch) {
            await batch.commit();
        }

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getSuggestion = async (req, res) => {
    const userId = req.user.id;
    // Extract with fallback to ensure no undefined values
    const queryGlucose = req.query.current_glucose;
    const queryCarbs = req.query.carbs;

    if (!queryGlucose) {
        return res.status(400).json({ error: 'current_glucose is required' });
    }

    try {
        const glucoseNum = parseFloat(queryGlucose);
        const carbsNum = parseFloat(queryCarbs) || 0;

        console.log(`[SuggestionRequest] User: ${userId}, Glucose: ${glucoseNum}, Carbs: ${carbsNum}`);

        const suggestionData = await getInsulinSuggestion(userId, glucoseNum, carbsNum);
        res.json(suggestionData);
    } catch (error) {
        console.error('Suggestion Error:', error);
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
            avg_cir: rawStats.avg_cir || 0,
            confidence_score: rawStats.confidence_score || 'Low',
            total_logs: rawStats.total_logs || 0,
            meal_stats: rawStats.meal_stats || { avg_carbs_breakfast: 30, avg_carbs_lunch: 50, avg_carbs_dinner: 60, avg_carbs_snack: 15 }
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
    const { glucose_before, glucose_after, insulin_units, insulin_rapid, insulin_long, carbs, meal_type, food_description, activity_level } = req.body;

    try {
        const logRef = db.collection('users').doc(userId).collection('logs').doc(id);
        const logDoc = await logRef.get();

        if (!logDoc.exists) {
            return res.status(404).json({ error: 'Log not found' });
        }

        const rapid = parseFloat(insulin_rapid) || 0;
        const long = parseFloat(insulin_long) || 0;
        const total = parseFloat(insulin_units) || (rapid + long);
        const meals = parseFloat(carbs) || 0;

        let isf = null;
        if (glucose_before && glucose_after && rapid > 0) {
            isf = calculateISF(glucose_before, glucose_after, rapid);
        }

        await logRef.update({
            glucose_before: glucose_before ? parseFloat(glucose_before) : null,
            glucose_after: glucose_after ? parseFloat(glucose_after) : null,
            insulin_units: total,
            insulin_rapid: rapid,
            insulin_long: long,
            carbs: meals,
            meal_type,
            food_description,
            activity_level,
            isf
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
            const { glucose_before, glucose_after, insulin_units, insulin_rapid, insulin_long } = data;

            const rapid = parseFloat(insulin_rapid) || (data.insulin_type !== 'basal' ? parseFloat(insulin_units) : 0);
            
            // Only process logs that have all readings but no valid 'isf' yet
            const hasReadings = glucose_before && glucose_after && rapid > 0;
            const needsMigration = data.isf === undefined || data.isf === null;

            if (hasReadings && needsMigration) {
                const calculatedISF = calculateISF(glucose_before, glucose_after, rapid);
                batch.update(doc.ref, { 
                    isf: calculatedISF,
                    insulin_rapid: rapid, // Back-fill the new field if it was missing
                    insulin_units: parseFloat(insulin_units) || rapid
                });
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

