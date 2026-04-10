const admin = require('firebase-admin');
const path = require('path');

let db, auth;

try {
  let credential;
  const fs = require('fs');
  
  if (process.env.FIREBASE_CREDENTIALS) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS));
  } else {
      let serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
      if (!fs.existsSync(serviceAccountPath)) {
          serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
      }
      credential = admin.credential.cert(serviceAccountPath);
  }

  admin.initializeApp({
    credential: credential
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
