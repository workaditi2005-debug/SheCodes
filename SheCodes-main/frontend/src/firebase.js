// Firebase configuration for NeuroAid (NeuroAid-SIH-2026 / neuroaid-web)
// Environment variables are loaded via Vite (import.meta.env.VITE_FIREBASE_*)

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const cleanEnv = (val) => (typeof val === "string" ? val.trim().replace(/^["']|["']$/g, "") : val);

const rawApiKey = cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY);
const rawProjectId = cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID);

export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  rawApiKey !== "your_firebase_api_key_here" &&
  rawApiKey !== "AIzaSy..." &&
  rawProjectId &&
  rawProjectId !== "your_project_id"
);

const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: rawProjectId,
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
};

let appInstance = null;
let authInstance = null;
let googleProviderInstance = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    googleProviderInstance = new GoogleAuthProvider();
  } catch (err) {
    console.warn("Firebase initialization warning (running in offline/local demo mode):", err);
    appInstance = null;
    authInstance = null;
    googleProviderInstance = null;
  }
} else {
  console.info("Firebase credentials not configured or placeholder detected; running in local demo mode.");
}

export const app = appInstance;
export const auth = authInstance;
export const googleProvider = googleProviderInstance;

export default app;

