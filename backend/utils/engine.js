const { db } = require('../firebase');

// --- CLINICAL SAFETY CONFIG ---
const SAFETY_CONFIG = {
    MAX_CORRECTION_DOSE: 6.0,    // Absolute cap for correction units
    MAX_TOTAL_DOSE: 20.0,         // Absolute cap for total dose
    MIN_ISF: 20,                  // Never assume more resistant than 1:20
    MAX_ISF: 150,                 // Never assume more sensitive than 1:150
    DAMPING_FACTOR: 0.2,          // Only change stats by 20% max per day
    OUTLIER_DEVIATION: 0.5        // Ignore logs that deviate > 50% from current avg
};

/**
 * Calculates Insulin Sensitivity Factor (ISF) with safety limits.
 */
const calculateISF = (before, after, units) => {
    if (!units || units <= 0) return null;
    const drop = before - after;
    if (drop <= 0) return null;
    const calculated = drop / units;
    // Bind to clinical reality
    return Math.max(SAFETY_CONFIG.MIN_ISF, Math.min(SAFETY_CONFIG.MAX_ISF, calculated));
};

/**
 * Re-calculates global user stats with Outlier Filtering and Damping.
 */
const reCalculateUserStats = async (userId) => {
    const userDoc = await db.collection('users').doc(userId).get();
    const currentStats = userDoc.data().stats || {};
    
    const logsSnapshot = await db.collection('users').doc(userId).collection('logs')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

    const logs = logsSnapshot.docs.map(doc => doc.data());

    // 1. Calculate Personal ISF with Outlier Guard
    const isfLogs = logs.filter(log => {
        const rapid = log.insulin_rapid || (log.insulin_type !== 'basal' ? log.insulin_units : 0);
        const hasReadings = log.glucose_before && log.glucose_after;
        const reflectsISF = rapid > 0 && (log.glucose_before - log.glucose_after) > 0;
        const noFood = !log.carbs || log.carbs === 0;
        return hasReadings && reflectsISF && noFood;
    });

    let targetISF = 0;
    if (isfLogs.length > 0) {
        let totalWeightedISF = 0;
        let totalISFWeight = 0;
        const currentAvg = currentStats.avg_isf || 50;

        isfLogs.forEach((log, index) => {
            const rapid = log.insulin_rapid || (log.insulin_type !== 'basal' ? log.insulin_units : 0);
            const drop = log.glucose_before - log.glucose_after;
            const efficiency = drop / rapid;

            // --- OUTLIER FILTER ---
            // If efficiency is 50% higher or lower than current average, it's likely sick day/bad site
            const deviation = Math.abs(efficiency - currentAvg) / currentAvg;
            if (deviation > SAFETY_CONFIG.OUTLIER_DEVIATION && isfLogs.length > 5) return;

            const weight = index < 10 ? 2 : 1;
            totalWeightedISF += efficiency * weight;
            totalISFWeight += weight;
        });
        targetISF = totalISFWeight > 0 ? totalWeightedISF / totalISFWeight : currentAvg;
    }

    // --- DAMPING ---
    // Never jump to a new ISF instantly. Move slowly toward it.
    let finalISF = currentStats.avg_isf || targetISF;
    if (targetISF > 0 && currentStats.avg_isf) {
        const diff = targetISF - currentStats.avg_isf;
        finalISF = currentStats.avg_isf + (diff * SAFETY_CONFIG.DAMPING_FACTOR);
    } else if (targetISF > 0) {
        finalISF = targetISF;
    }

    // 2. Calculate Personal CIR (Carb-to-Insulin Ratio)
    let avgCIR = currentStats.avg_cir || 15;
    if (finalISF > 0) {
        const cirLogs = logs.filter(log => {
            const rapid = log.insulin_rapid || (log.insulin_type !== 'basal' ? log.insulin_units : 0);
            return log.carbs > 0 && rapid > 0 && log.glucose_before && log.glucose_after;
        });

        if (cirLogs.length > 0) {
            let totalWeightedCIR = 0;
            let totalCIRWeight = 0;
            cirLogs.forEach((log, index) => {
                const rapid = log.insulin_rapid || (log.insulin_type !== 'basal' ? log.insulin_units : 0);
                const rise = log.glucose_after - log.glucose_before;
                const correctionGap = rise / finalISF;
                const neededInsulin = rapid + correctionGap;

                if (neededInsulin > 0) {
                    const cirCandidate = log.carbs / neededInsulin;
                    if (cirCandidate >= 3 && cirCandidate <= 100) {
                        const weight = index < 10 ? 2 : 1;
                        totalWeightedCIR += cirCandidate * weight;
                        totalCIRWeight += weight;
                    }
                }
            });
            const targetCIR = totalCIRWeight > 0 ? totalWeightedCIR / totalCIRWeight : 15;
            // Dampen CIR too
            const cirDiff = targetCIR - avgCIR;
            avgCIR = avgCIR + (cirDiff * SAFETY_CONFIG.DAMPING_FACTOR);
        }
    }

    // 3. Meal Stats
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealStats = {};
    mealTypes.forEach(type => {
        const typeLogs = logs.filter(l => l.meal_type === type && l.carbs > 0);
        if (typeLogs.length > 0) {
            const sum = typeLogs.reduce((s, l) => s + l.carbs, 0);
            mealStats[`avg_carbs_${type}`] = Math.round(sum / typeLogs.length);
        } else {
            const defaults = { breakfast: 30, lunch: 50, dinner: 60, snack: 15 };
            mealStats[`avg_carbs_${type}`] = defaults[type];
        }
    });

    let confidence = 'Low';
    if (isfLogs.length >= 10) confidence = 'High';
    else if (isfLogs.length >= 3) confidence = 'Medium';

    const stats = {
        avg_isf: finalISF,
        avg_cir: avgCIR,
        confidence_score: confidence,
        total_logs: logs.length,
        meal_stats: mealStats,
        last_updated: new Date().toISOString()
    };

    await db.collection('users').doc(userId).update({ stats });
    return stats;
};

/**
 * Provides safe dose suggestions with explicit breakdown and caps.
 */
const getInsulinSuggestion = async (userId, currentGlucose, carbs = 0) => {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { suggestion: 0, reason: 'User not found' };

    const data = userDoc.data();
    const stats = data.stats || {};
    const health = data.health || {};
    const insulinData = data.insulin || {};

    const targetMid = ( (health.target_glucose_min || 80) + (health.target_glucose_max || 140) ) / 2;

    // 1. Fetch IOB (4-hour decay)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const recentLogsSnapshot = await db.collection('users').doc(userId).collection('logs')
        .where('timestamp', '>=', fourHoursAgo.toISOString())
        .get();

    let iob = 0;
    recentLogsSnapshot.forEach(doc => {
        const log = doc.data();
        const rapid = log.insulin_rapid || (log.insulin_type !== 'basal' ? log.insulin_units : 0);
        if (rapid > 0) {
            const hoursPassed = (Date.now() - new Date(log.timestamp)) / (1000 * 60 * 60);
            if (hoursPassed < 4) iob += rapid * (1 - (hoursPassed / 4));
        }
    });

    // 2. Get Clinical Benchmarks (Manual Profile > Learned > Fallback)
    let isf = parseFloat(insulinData.correction_factor) || stats.avg_isf;
    let isfSource = parseFloat(insulinData.correction_factor) ? 'Doctor Set (Profile)' : (stats.avg_isf ? 'Safe Learned' : 'Calculated from Profile');
    
    if (!isf || isf <= 0) {
        const tdd = parseFloat(insulinData.daily_dose) || (parseFloat(health.weight) * 0.5) || 50; 
        isf = 1700 / tdd;
        isfSource = 'Estimated from Weight/TDD';
    }

    let cir = parseFloat(insulinData.carb_ratio) || stats.avg_cir || 15;
    let cirSource = parseFloat(insulinData.carb_ratio) ? 'Doctor Set (Profile)' : (stats.avg_cir ? 'Safe Learned' : 'Default Ratio');

    // Force "High" confidence if using a Doctor's manually set ratio
    const finalConfidence = (isfSource === 'Doctor Set (Profile)' || cirSource === 'Doctor Set (Profile)') 
        ? 'High (Doctor Set)' 
        : (stats.confidence_score || 'Low');

    // 3. Trend Detection (Predictive)
    const lastLogs = await db.collection('users').doc(userId).collection('logs')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
    
    let trendMsg = '';
    if (!lastLogs.empty) {
        const lastLog = lastLogs.docs[0].data();
        const timeDiff = (Date.now() - new Date(lastLog.timestamp)) / (1000 * 60 * 60);
        if (timeDiff < 3) { // Only trend if last reading was in last 3 hours
            const glucoseDiff = currentGlucose - lastLog.glucose_before;
            if (glucoseDiff > 40) trendMsg = '⚡ Rising rapidly! +'+glucoseDiff+' mg/dL in 2h.';
        }
    }

    const correctionGap = Math.max(0, currentGlucose - targetMid);
    const rawCorrection = correctionGap / isf;
    const netCorrection = Math.max(0, rawCorrection - iob);
    const mealDose = carbs / cir;

    let totalDose = netCorrection + mealDose;

    // 4. Safety Logic
    const correctionCapped = netCorrection > SAFETY_CONFIG.MAX_CORRECTION_DOSE;
    const finalCorrection = Math.min(netCorrection, SAFETY_CONFIG.MAX_CORRECTION_DOSE);
    
    let finalTotal = finalCorrection + mealDose;
    const totalCapped = finalTotal > SAFETY_CONFIG.MAX_TOTAL_DOSE;
    finalTotal = Math.min(finalTotal, SAFETY_CONFIG.MAX_TOTAL_DOSE);

    return {
        suggestion: parseFloat(finalTotal.toFixed(1)),
        isCapped: correctionCapped || totalCapped,
        trendAlert: trendMsg,
        caps: {
            correction: SAFETY_CONFIG.MAX_CORRECTION_DOSE,
            total: SAFETY_CONFIG.MAX_TOTAL_DOSE
        },
        breakdown: {
            correction: parseFloat(rawCorrection.toFixed(1)),
            iob_deduction: parseFloat(iob.toFixed(1)),
            net_correction: parseFloat(finalCorrection.toFixed(1)),
            meal: parseFloat(mealDose.toFixed(1))
        },
        factors: { isf, isfSource, cir, cirSource },
        target: targetMid,
        risk: currentGlucose > 250 ? 'High' : (trendMsg ? 'Warning' : 'Normal'),
        confidence: finalConfidence
    };
};

module.exports = {
    calculateISF,
    reCalculateUserStats,
    getInsulinSuggestion
};
