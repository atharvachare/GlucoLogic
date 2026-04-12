const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'insulin_system.db'),
        driver: sqlite3.Database
    });

    // Initialize tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            mode TEXT DEFAULT 'adult',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migration: Add missing columns to users if they don't exist
    const columns = await db.all('PRAGMA table_info(users)');
    const columnNames = columns.map(c => c.name);
    
    const requiredColumns = [
        ['phone', 'TEXT'],
        ['age', 'INTEGER'],
        ['gender', 'TEXT'],
        ['dob', 'TEXT'],
        ['address', 'TEXT'],
        ['emergency_contact_name', 'TEXT'],
        ['emergency_contact_phone', 'TEXT']
    ];

    for (const [name, type] of requiredColumns) {
        if (!columnNames.includes(name)) {
            await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
        }
    }

    await db.exec(`
        CREATE TABLE IF NOT EXISTS medical_profile (
            user_id INTEGER PRIMARY KEY,
            diabetes_type TEXT,
            diagnosis_date TEXT,
            treatment_type TEXT,
            doctor_name TEXT,
            hospital TEXT,
            conditions TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS insulin_profile (
            user_id INTEGER PRIMARY KEY,
            insulin_type TEXT,
            brand TEXT,
            daily_dose REAL,
            carb_ratio REAL,
            correction_factor REAL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS lifestyle (
            user_id INTEGER PRIMARY KEY,
            diet_type TEXT,
            meal_pattern TEXT,
            activity_level TEXT,
            sleep_hours REAL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS health_baseline (
            user_id INTEGER PRIMARY KEY,
            weight REAL,
            height REAL,
            bmi REAL,
            target_glucose_min REAL DEFAULT 80,
            target_glucose_max REAL DEFAULT 140,
            hba1c REAL,
            blood_pressure TEXT,
            allergies TEXT,
            risk_history TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            glucose_before REAL,
            glucose_after REAL,
            insulin_units REAL,
            meal_type TEXT,
            food_description TEXT,
            activity_level TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            isf REAL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_stats (
            user_id INTEGER PRIMARY KEY,
            avg_isf REAL DEFAULT 0,
            confidence_score TEXT DEFAULT 'Low',
            total_logs INTEGER DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);
    
    return db;
}

const getDB = () => db;

module.exports = { initDB, getDB };
