import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Values come from .env.local (never committed). Next.js inlines NEXT_PUBLIC_*
// variables into the browser bundle at build time, so only put values here that
// are safe to be public. The Firebase web config is public by design; access is
// protected by Firebase Auth + Realtime Database rules.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_NEXTAUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_NEXTAUTH_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_NEXTAUTH_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_NEXTAUTH_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_NEXTAUTH_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_NEXTAUTH_APP_ID,
};

// Next.js re-runs modules on hot reload; reuse the existing app if there is one.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
