/**
 * Activity Service - Simulated Live Data
 * In production: Integrate with Google Fit API or Apple HealthKit.
 */

const getLiveActivity = async (userId) => {
    // Simulating fetching "Current Day Steps" from a health sensor
    // In a real app, this would query a cache updated by a background sync
    
    const hour = new Date().getHours();
    let baseSteps = 0;

    // Simulate different step counts based on time of day
    if (hour > 7 && hour < 10) baseSteps = 2000; // Morning walk
    else if (hour >= 10 && hour < 13) baseSteps = 4000;
    else if (hour >= 13 && hour < 17) baseSteps = 6000;
    else if (hour >= 17 && hour < 21) baseSteps = 8500;
    else if (hour >= 21) baseSteps = 10000;
    else baseSteps = 500; // Night

    // Add some randomness
    const liveSteps = Math.floor(baseSteps + (Math.random() * 1000));
    
    let activityLevel = 'Sedentary';
    if (liveSteps > 8000) activityLevel = 'Highly Active';
    else if (liveSteps > 5000) activityLevel = 'Moderate';
    else if (liveSteps > 2000) activityLevel = 'Lightly Active';

    return {
        steps: liveSteps,
        activityLevel,
        timestamp: new Date().toISOString()
    };
};

module.exports = { getLiveActivity };
