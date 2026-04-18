const { db } = require('../firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { name, email, password, age, weight, diabetes_type } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Add to Firestore
        const userRef = db.collection('users').doc();
        const userData = {
            id: userRef.id,
            name,
            email,
            password: hashedPassword,
            age: age || null,
            weight: weight || null,
            diabetes_type: diabetes_type || 'Type 1',
            mode: 'adult',
            created_at: new Date().toISOString()
        };
        
        await userRef.set(userData);

        const token = jwt.sign({ id: userRef.id, email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        
        res.status(201).json({ token, user: userData });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                age: user.age, 
                weight: user.weight, 
                diabetes_type: user.diabetes_type,
                mode: user.mode || 'adult'
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    const { target_glucose, mode } = req.body;
    const userId = req.user.id;

    try {
        await db.collection('users').doc(userId).update({
            target_glucose: target_glucose || 120,
            mode: mode || 'adult'
        });
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: error.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        // Security best practice: Don't tell the user if the email is invalid
        // Just return success so people can't "fish" for emails.
        res.json({ message: 'If an account exists, a reset link has been sent.' });
        
        if (!snapshot.empty) {
            console.log(`PASSWORD RESET REQUESTED FOR: ${email}`);
            // TODO: Generate a reset token and send a real email here.
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login, updateProfile, forgotPassword };
