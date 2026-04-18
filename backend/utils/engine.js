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
    // Fetch recent logs ordered by time, then filter for valid ISF in memory
    // (Avoids need for Firestore composite index on isf + timestamp)
    const logsSnapshot = await db.collection('users').doc(userId).collection('logs')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    // Filter to only logs with a valid positive ISF
    const allLogs = logsSnapshot.docs.map(doc => doc.data());
    const logs = allLogs
        .filter(log => {
            // Support both new 'isf' field and old 'effectiveness' field
            const isf = log.isf !== undefined ? log.isf : log.effectiveness;
            return isf !== null && isf !== undefined && isf > 0;
        })
        .slice(0, 50); // Limit to 50 for weighted average

    if (logs.length === 0) return;

    let totalWeightedISF = 0;
    let totalWeight = 0;

    logs.forEach((log, index) => {
        // Recent 10 logs are weighted 2x to emphasise current body response
        const weight = index < 10 ? 2 : 1;
        // Support both new 'isf' field and old 'effectiveness' field
        const isfVal = log.isf !== undefined && log.isf !== null ? log.isf : log.effectiveness;
        totalWeightedISF += isfVal * weight;
        totalWeight += weight;
    });

    const avgISF = totalWeightedISF / totalWeight;

    let confidence = 'Low';
    if (logs.length >= 15) confidence = 'High';
    else if (logs.length >= 5) confidence = 'Medium';

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
 * Provides an insulin dose suggestion using ISF, IOB, and Carbohydrate intake.
 * Formula: Suggested Units = ((Current Glucose - Target) / ISF - IOB) + (Carbs / CIR)
 * Falls back to 1700 Rule for ISF and 1:15 for CIR if no personal data exists.
 */
const getInsulinSuggestion = async (userId, currentGlucose, carbs = 0) => {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { suggestion: 0, reason: 'User not found' };

    const data = userDoc.data();
    const health = data.health || {};
    const lifestyle = data.lifestyle || {};
    const stats = data.stats || {};

    const targetMin = health.target_glucose_min || 80;
    const targetMax = health.target_glucose_max || 140;
    const targetMid = (targetMin + targetMax) / 2;

    // —— 1. FETCH IOB (Insulin on Board) ——
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    
    const recentLogsSnapshot = await db.collection('users').doc(userId).collection('logs')
        .where('timestamp', '>=', fourHoursAgo.toISOString())
        .get();
        
    let iob = 0;
    const now = new Date();
    recentLogsSnapshot.forEach(doc => {
        const log = doc.data();
        
        // IOB Tracking should ONLY consider Rapid-Acting insulin.
        // We prioritizing 'insulin_rapid' field, but fallback to 'insulin_units' for older logs.
        const rapidUnits = log.insulin_rapid || (log.insulin_type !== 'basal' ? log.insulin_units : 0);
        
        if (rapidUnits > 0) {
            const logTime = new Date(log.timestamp);
            const hoursPassed = (now - logTime) / (1000 * 60 * 60);
            if (hoursPassed < 4) {
                const percentActive = 1 - (hoursPassed / 4);
                iob += rapidUnits * percentActive;
            }
        }
    });

    // —— 2. SAFETY CHECKS ——
    if (currentGlucose < 70) {
        return {
            suggestion: 0,
            alert: 'LOW SUGAR ALERT!',
            risk: 'High',
            iob: parseFloat(iob.toFixed(1)),
            reason: 'Critical hypoglycemia. Do not take insulin. Consume 15g fast-acting sugar immediately.'
        };
    }

    // —— 3. ISF & CIR (Learning or Fallback) ——
    let isf = stats.avg_isf;
    let isfSource = 'Personal';
    if (!isf || isf <= 0) {
        const weight = health.weight || 70;
        const estimatedTDD = weight * 0.5;
        isf = 1700 / estimatedTDD;
        isfSource = 'Estimated (1700 Rule)';
    }

    // CIR: Carb-to-Insulin Ratio (How many grams 1 unit covers)
    // Fallback: 1:15 is standard for most adults.
    let cir = stats.avg_cir || 15; 
    let cirSource = stats.avg_cir ? 'Personal' : 'Default (1:15)';

    // —— 4. CALCULATE DOSES ——
    
    // A. Correction Dose (for high sugar)
    const dropNeeded = Math.max(0, currentGlucose - targetMid);
    let correctionDose = dropNeeded / isf;

    // B. Meal Dose (for carbohydrates)
    let mealDose = carbs / cir;

    // —— 5. IOB DEDUCTION ——
    // Only subtract IOB from Correction Dose (don't subtract from meal dose usually)
    let iobAdjustmentMsg = '';
    let netCorrection = correctionDose;
    if (iob > 0) {
        netCorrection = Math.max(0, correctionDose - iob);
        iobAdjustmentMsg = `IOB of ${iob.toFixed(1)} units subtracted from correction.`;
    }

    let rawSuggested = netCorrection + mealDose;

    // —— 6. ACTIVITY ADJUSTMENTS ——
    let activityAdjustmentMsg = '';
    const activity = lifestyle.activity_level || 'None';
    if (activity === 'Heavy') {
        rawSuggested *= 0.8;
        activityAdjustmentMsg = 'Reduced by 20% due to Heavy Activity level.';
    } else if (activity === 'Moderate') {
        rawSuggested *= 0.9;
        activityAdjustmentMsg = 'Reduced by 10% due to Moderate Activity level.';
    }

    // —— 7. SAFETY CAP ——
    const cap = 20;
    const finalSuggestion = Math.min(rawSuggested, cap);

    return {
        suggestion: parseFloat(finalSuggestion.toFixed(1)),
        isCapped: rawSuggested > cap,
        target: targetMid,
        targetMid: targetMid,
        targetRange: [targetMin, targetMax],
        isf: parseFloat(isf.toFixed(2)),
        isfSource,
        cir: cir,
        cirSource,
        iob: parseFloat(iob.toFixed(1)),
        doses: {
            correction: parseFloat(correctionDose.toFixed(1)),
            meal: parseFloat(mealDose.toFixed(1)),
            netCorrection: parseFloat(netCorrection.toFixed(1))
        },
        confidence: stats.confidence_score || 'Not enough data',
        iobAdjustment: iobAdjustmentMsg,
        activityAdjustment: activityAdjustmentMsg,
        risk: currentGlucose > 250 ? 'High' : (currentGlucose > 180 ? 'Medium' : 'Low')
    };
};

module.exports = {
    calculateISF,
    reCalculateUserStats,
    getInsulinSuggestion
};
