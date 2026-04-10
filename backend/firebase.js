const admin = require('firebase-admin');
const path = require('path');

let db, auth;

try {
  // Path to your downloaded service account key
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });

  db = admin.firestore();
  auth = admin.auth();

  // Basic settings to handle nested objects & dates properly
  db.settings({ ignoreUndefinedProperties: true });

  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('💡 TIP: Ensure serviceAccountKey.json is present in the backend folder.');
}

module.exports = { admin, db, auth };
