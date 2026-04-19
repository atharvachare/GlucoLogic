#!/bin/bash
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin

echo "🚀 Building frontend..."
cd frontend && npm run build
cd ..

echo "🛠️ Repairing Firebase Link..."
# Clear the corrupted project setting and explicitly use 'glucologic'
npx -p firebase-tools firebase use --clear
npx -p firebase-tools firebase use glucologic --add

echo "📤 Deploying to Firebase..."
npx -p firebase-tools firebase deploy --only hosting --project glucologic
