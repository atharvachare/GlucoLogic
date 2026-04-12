const { db } = require('../firebase');

/**
 * Calculates Insulin Sensitivity Factor (ISF) for a single log entry.
 * Formula: ISF = (before_glucose - after_glucose) / insulin_units
 * Returns null if glucose did not drop (meal spike or other factors).
 */
const calculateISF = (before, after, units) => {
    if (!units || units <= 0) return null;
    const drop = before - after;
    // Only compute ISF when glucose actually dropped — a rise means meal/other factors dominated
    return drop > 0 ? drop / units : null;
};

/**
 * Re-calculates global user stats (avg ISF) based on history in Firestore.
 * Uses a weighted average — recent 10 logs are counted double (2x weight).
 */
const reCalculateUserStats = async (userId) => {
    const logsSnapshot = await db.collection('users').doc(userId).collection('logs')
        .where('isf', '>', 0)
        .orderBy('isf') // Required by Firestore for inequality filter
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

    const logs = logsSnapshot.docs.map(doc => doc.data());

    if (logs.length === 0) return;

    let totalWeightedISF = 0;
    let totalWeight = 0;

    logs.forEach((log, index) => {
        // Recent 10 logs are weighted 2x to emphasise current body response
        const weight = index < 10 ? 2 : 1;
        totalWeightedISF += log.isf * weight;
        totalWeight += weight;
    });

    const avgISF = totalWeightedISF / totalWeight;

    let confidence = 'Low';
    if (logs.length >= 30) confidence = 'High';
    else if (logs.length >= 10) confidence = 'Medium';

    const stats = {
        avg_isf: avgISF,
        confidence_score: confidence,
        total_logs: logs.length,
        last_updated: new Date().toISOString()
    };

    await db.collection('users').doc(userId).update({ stats });

    return { avgISF, confidence, count: logs.length };
};

/**
 * Provides an insulin dose suggestion using the ISF.
 * Formula: Suggested Units = (Current Glucose - Target) / ISF
 * Falls back to 1700 Rule (weight-based) if no personal ISF data exists.
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

    // —— Safety checks ——
    if (currentGlucose < 70) {
        return {
            suggestion: 0,
            alert: 'LOW SUGAR ALERT!',
            risk: 'High',
            reason: 'Critical hypoglycemia. Do not take insulin. Consume 15g fast-acting sugar immediately.'
        };
    }
    if (currentGlucose < targetMin) {
        return { suggestion: 0, reason: `Glucose is below your target minimum (${targetMin}). No insulin needed.` };
    }

    // —— ISF: personalised or fallback ——
    let isf = stats.avg_isf;
    let isfSource = 'Personal';

    if (!isf || isf <= 0) {
        // 1700 Rule: ISF ≈ 1700 / Total Daily Dose (TDD)
        // TDD is estimated as weight(kg) × 0.5
        const weight = health.weight || 70;
        const estimatedTDD = weight * 0.5;
        isf = 1700 / estimatedTDD;
        isfSource = 'Estimated (1700 Rule)';
    }

    // —— Core formula ——
    // Units = (Current Glucose - Target) / ISF
    const dropNeeded = currentGlucose - targetMid;
    let suggestedUnits = dropNeeded / isf;

    // —— Activity level adjustments ——
    let adjustmentMsg = '';
    const activity = lifestyle.activity_level || 'None';
    if (activity === 'Heavy') {
        suggestedUnits *= 0.8;
        adjustmentMsg = 'Reduced by 20% due to Heavy Activity level.';
    } else if (activity === 'Moderate') {
        suggestedUnits *= 0.9;
        adjustmentMsg = 'Reduced by 10% due to Moderate Activity level.';
    }

    // —— Safety cap ——
    const cap = 20;
    const finalSuggestion = Math.min(suggestedUnits, cap);

    return {
        suggestion: parseFloat(finalSuggestion.toFixed(1)),
        isCapped: suggestedUnits > cap,
        target: targetMid,
        isf: parseFloat(isf.toFixed(2)),
        isfSource,
        confidence: stats.confidence_score || 'Not enough data',
        adjustment: adjustmentMsg,
        risk: currentGlucose > 250 ? 'High' : (currentGlucose > 180 ? 'Medium' : 'Low')
    };
};

module.exports = {
    calculateISF,
    reCalculateUserStats,
    getInsulinSuggestion
};
