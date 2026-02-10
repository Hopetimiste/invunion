import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

let firebaseApp: FirebaseApp | null = null;

// Firebase config from Vite env vars or fallback to config.json
function getFirebaseConfig() {
  // Try Vite env vars first
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    };
  }
  return null;
}

export async function initFirebase(): Promise<FirebaseApp> {
  if (firebaseApp) return firebaseApp;

  // Try Vite env vars first
  const envConfig = getFirebaseConfig();
  if (envConfig) {
    console.log("[Firebase] Using env vars config");
    firebaseApp = initializeApp(envConfig);
    return firebaseApp;
  }

  // Fallback to config.json
  try {
    const res = await fetch("/config.json");
    const config = await res.json();

    if (!config.firebase) {
      throw new Error("Missing firebase config in config.json");
    }

    console.log("[Firebase] Using config.json");
    firebaseApp = initializeApp(config.firebase);
    return firebaseApp;
  } catch (err) {
    // Final fallback with hardcoded values
    console.warn("[Firebase] Fallback to hardcoded config");
    firebaseApp = initializeApp({
      apiKey: "AIzaSyDGf1gO9y2hKss9pB15hvDIXnHN2dvqHuY",
      authDomain: "invunion-prod.firebaseapp.com",
      projectId: "invunion-prod",
      appId: "1:730177123842:web:853301ffd9fe2cb02fd91b",
      messagingSenderId: "730177123842",
      storageBucket: "invunion-prod.firebasestorage.app",
    });
    return firebaseApp;
  }
}

export async function getFirebaseAuth(): Promise<Auth> {
  const app = await initFirebase();
  return getAuth(app);
}

export async function getFirebaseDb(): Promise<Firestore> {
  const app = await initFirebase();
  return getFirestore(app, "bdd-firestore-tenant-user");
}
