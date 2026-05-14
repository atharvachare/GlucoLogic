/**
 * Nutrition Service - Simulated for GlucoLogic
 * In production: Use Edamam, Nutritionix, or Google Gemini Multimodal for extraction.
 */

const COMMON_INDIAN_FOODS = {
    'roti': 15,
    'phulka': 12,
    'paratha': 25,
    'rice': 45, // 1 bowl
    'dal': 15,
    'sabzi': 10,
    'paneer': 5,
    'curd': 6,
    'dahi': 6,
    'poha': 40,
    'idli': 15,
    'dosa': 25,
    'upma': 35,
    'samosa': 20,
    'tea': 10, // with sugar
    'coffee': 10,
    'apple': 15,
    'banana': 25,
    'milk': 12
};

const extractCarbs = async (description) => {
    console.log(`[NutritionService] Extracting carbs for: "${description}"`);
    
    if (!description) return 0;

    const lowerDesc = description.toLowerCase();
    let totalCarbs = 0;
    let foundAny = false;

    // Basic regex-based extraction
    Object.entries(COMMON_INDIAN_FOODS).forEach(([food, carbs]) => {
        const regex = new RegExp(`(\\d+)?\\s*${food}`, 'g');
        let match;
        while ((match = regex.exec(lowerDesc)) !== null) {
            const count = parseInt(match[1]) || 1;
            totalCarbs += (count * carbs);
            foundAny = true;
        }
    });

    // If no common food found, simulate an AI fallback
    if (!foundAny) {
        // Mocking an AI call that estimates based on words
        const wordCount = description.split(' ').length;
        totalCarbs = Math.min(100, wordCount * 15); // Simple heuristic
    }

    // Add some random "AI variance" for realism in demo
    totalCarbs = Math.round(totalCarbs * (0.9 + Math.random() * 0.2));

    return totalCarbs;
};

module.exports = { extractCarbs };
