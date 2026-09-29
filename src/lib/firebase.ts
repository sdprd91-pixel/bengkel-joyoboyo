import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Support both Vercel Environment Variables and local config file with solid fallbacks
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as any);

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || firebaseConfigJson?.apiKey || 'AIzaSyCDcRClnIBIVX-QIzU_GCgTShElhmwr1Go',
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfigJson?.authDomain || 'formal-canopy-wt3g1.firebaseapp.com',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfigJson?.projectId || 'formal-canopy-wt3g1',
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfigJson?.storageBucket || 'formal-canopy-wt3g1.firebasestorage.app',
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfigJson?.messagingSenderId || '781101940109',
  appId: (env.VITE_FIREBASE_APP_ID as string) || firebaseConfigJson?.appId || '1:781101940109:web:a00fb57f2b1a5b7a2951c4',
  measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID as string) || firebaseConfigJson?.measurementId || '',
};

export const firestoreDbId =
  (env.VITE_FIREBASE_DATABASE_ID as string) ||
  firebaseConfigJson?.firestoreDatabaseId ||
  'ai-studio-bengkelmotorjoyo-cfeb524e-909a-44cd-a9a8-d6c23e3f5878';

// Initialize Firebase App safely
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth: Auth = getAuth(app);

// Safe Firebase Auth initialization helper without unneeded anonymous sign-in attempts
export async function ensureFirebaseAuth(): Promise<void> {
  return Promise.resolve();
}

// Initialize Firestore with custom databaseId if configured, or default database
export const db: Firestore =
  firestoreDbId && firestoreDbId !== '(default)'
    ? getFirestore(app, firestoreDbId)
    : getFirestore(app);

export default app;
