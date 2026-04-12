const { db } = require('../firebase');

/**
 * Calculates effectiveness for a single log entry.
 */
const calculateEntryEffectiveness = (before, after, units) => {
    if (!units || units <= 0) return null;
    const drop = before - after;
    // If glucose increased or stayed same, we can't learn insulin effectiveness from this log
    // (Likely due to meal impact or other factors)
    return drop > 0 ? drop / units : null;
};

/**
 * Re-calculates global user stats based on history in Firestore.
 */
const reCalculateUserStats = async (userId) => {
    const logsSnapshot = await db.collection('users').doc(userId).collection('logs')
        .where('effectiveness', '>', 0)
        .orderBy('effectiveness') // Required for inequality filters in some cases
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    
    const logs = logsSnapshot.docs.map(doc => doc.data());
    
    if (logs.length === 0) return;

    let totalWeightedEffectiveness = 0;
    let totalWeight = 0;

    logs.forEach((log, index) => {
        const weight = index < 10 ? 2 : 1;
        totalWeightedEffectiveness += log.effectiveness * weight;
        totalWeight += weight;
    });

    const avgEffectiveness = totalWeightedEffectiveness / totalWeight;
    
    let confidence = 'Low';
    if (logs.length >= 30) confidence = 'High';
    else if (logs.length >= 10) confidence = 'Medium';

    const stats = {
        avg_effectiveness: avgEffectiveness,
        confidence_score: confidence,
        total_logs: logs.length,
        last_updated: new Date().toISOString()
    };

    await db.collection('users').doc(userId).update({ stats });
    
    return { avgEffectiveness, confidence, count: logs.length };
};

/**
 * Provides an enhanced insulin suggestion using Firestore data.
 */
const getInsulinSuggestion = async (userId, currentGlucose) => {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { suggestion: 0, reason: 'User not found' };

    const data = userDoc.data();
    const health = data.health || {};
    const lifestyle = data.lifestyle || {};
    const stats = data.stats || {};

    const targetMin = health.target_glucose_min || 80;
    const targetMax = health.target_glucose_max || 140;
    const targetMid = (targetMin + targetMax) / 2;

    // Safety checks
    if (currentGlucose < 70) {
        return { suggestion: 0, alert: 'LOW SUGAR ALERT!', risk: 'High', reason: 'Critical hypoglycemia. Do not take insulin. Consume 15g fast-acting sugar immediately.' };
    }
    if (currentGlucose < targetMin) {
        return { suggestion: 0, reason: `Glucose is below your target minimum (${targetMin}). No insulin needed.` };
    }

    let effectiveness = stats.avg_effectiveness;

    // If no data, use a rough weight-based estimate
    if (!effectiveness || effectiveness <= 0) {
        const weight = health.weight || 70;
        const estimatedTDD = weight * 0.5;
        effectiveness = 1700 / estimatedTDD;
    }

    const dropNeeded = currentGlucose - targetMid;
    let suggestedUnits = dropNeeded / effectiveness;

    // Activity adjustments
    let adjustmentMsg = '';
    const activity = lifestyle.activity_level || 'None';
    if (activity === 'Heavy') {
        suggestedUnits *= 0.8;
        adjustmentMsg = 'Reduced by 20% due to Heavy Activity level.';
    } else if (activity === 'Moderate') {
        suggestedUnits *= 0.9;
        adjustmentMsg = 'Reduced by 10% due to Moderate Activity level.';
    }

    const cap = 20;
    const finalSuggestion = Math.min(suggestedUnits, cap);

    return {
        suggestion: parseFloat(finalSuggestion.toFixed(1)),
        isCapped: suggestedUnits > cap,
        target: targetMid,
        effectiveness: effectiveness.toFixed(2),
        confidence: stats.confidence_score || 'Estimated (Weight-based)',
        adjustment: adjustmentMsg,
        risk: currentGlucose > 250 ? 'High' : (currentGlucose > 180 ? 'Medium' : 'Low')
    };
};

module.exports = {
    calculateEntryEffectiveness,
    reCalculateUserStats,
    getInsulinSuggestion
};
