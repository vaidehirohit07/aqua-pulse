import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

/* ════════════════════════════════════════════════════════════════
   FIREBASE SETUP
   Fill these in a .env file at the project root (see .env.example).
   If they're missing, the app automatically falls back to a local
   "demo mode" so the login flow still works offline.
   ════════════════════════════════════════════════════════════════ */

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp({
      apiKey: cfg.apiKey!,
      authDomain: cfg.authDomain!,
      projectId: cfg.projectId!,
      storageBucket: cfg.storageBucket ?? "",
      messagingSenderId: cfg.messagingSenderId ?? "",
      appId: cfg.appId!,
    });
    authInstance = getAuth(app);
  } catch (err) {
    console.error("Firebase failed to initialise — falling back to demo mode.", err);
    app = null;
    authInstance = null;
  }
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
