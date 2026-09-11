# Firebase Setup for NeuroAid

## 1. Create a Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project" → name it "NeuroAid" → Continue
3. Disable Google Analytics (optional) → Create project

## 2. Enable Authentication
1. In Firebase Console → Build → Authentication
2. Click "Get started"
3. Enable "Email/Password" provider → Save

## 3. Enable Firestore Database
1. Build → Firestore Database → Create database
2. Start in **production mode** → Select a location → Enable

## 4. Set Firestore Security Rules
In Firestore → Rules, paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /assessments/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
  }
}
```

## 5. Get Your Firebase Config
1. Project Settings (gear icon) → Your apps → Web app (</>)
2. Register app → Copy the `firebaseConfig` object

## 6. Add Config to the App
Edit `frontend/src/firebase.js` and replace the placeholder values with your config:
```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "neuroaid-xxx.firebaseapp.com",
  projectId:         "neuroaid-xxx",
  storageBucket:     "neuroaid-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

## 7. Install Dependencies & Run
```bash
cd frontend
npm install
npm run dev
```

---
That's it! User registrations, logins, and assessment data will now persist in Firebase.
