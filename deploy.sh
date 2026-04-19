#!/bin/bash
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin

echo "🚀 Building frontend..."
cd frontend && npm run build
cd ..

echo "📤 Deploying to Firebase..."
npx -p firebase-tools firebase deploy --only hosting --project glucologic
