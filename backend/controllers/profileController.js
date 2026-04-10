const { db } = require('../firebase');

const getProfile = async (req, res) => {
    const userId = req.user.id;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const data = userDoc.data();
        res.json({
            personal: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                age: data.age,
                gender: data.gender,
                dob: data.dob,
                address: data.address,
                emergency_contact_name: data.emergency_contact_name,
                emergency_contact_phone: data.emergency_contact_phone,
                mode: data.mode
            },
            medical: data.medical || {},
            insulin: data.insulin || {},
            lifestyle: data.lifestyle || {},
            health: data.health || {}
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: error.message });
    }
};

const updatePersonal = async (req, res) => {
    const userId = req.user.id;
    const { name, phone, age, gender, dob, address, emergency_contact_name, emergency_contact_phone } = req.body;

    try {
        await db.collection('users').doc(userId).update({
            name, phone, age, gender, dob, address, emergency_contact_name, emergency_contact_phone
        });
        res.json({ message: 'Personal info updated' });
    } catch (error) {
        console.error('Update personal error:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateMedical = async (req, res) => {
    const userId = req.user.id;
    const medical = req.body;

    try {
        await db.collection('users').doc(userId).update({ medical });
        res.json({ message: 'Medical profile updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateInsulin = async (req, res) => {
    const userId = req.user.id;
    const insulin = req.body;

    try {
        await db.collection('users').doc(userId).update({ insulin });
        res.json({ message: 'Insulin profile updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateLifestyle = async (req, res) => {
    const userId = req.user.id;
    const lifestyle = req.body;

    try {
        await db.collection('users').doc(userId).update({ lifestyle });
        res.json({ message: 'Lifestyle profile updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateHealth = async (req, res) => {
    const userId = req.user.id;
    const health = req.body;

    try {
        // Calculate BMI
        if (health.weight && health.height) {
            const heightInMeters = health.height / 100;
            health.bmi = parseFloat((health.weight / (heightInMeters * heightInMeters)).toFixed(2));
        }

        await db.collection('users').doc(userId).update({ health });
        res.json({ message: 'Health baseline updated', bmi: health.bmi });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getProfile, updatePersonal, updateMedical, updateInsulin, updateLifestyle, updateHealth };
