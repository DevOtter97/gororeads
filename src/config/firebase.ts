import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

console.log('[Firebase] Config loaded:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId,
});

console.time('[Firebase] initializeApp');
export const app = initializeApp(firebaseConfig);
console.timeEnd('[Firebase] initializeApp');

console.time('[Firebase] getAuth');
export const auth = getAuth(app);
console.timeEnd('[Firebase] getAuth');

console.time('[Firebase] getFirestore');
export const db = getFirestore(app);
console.timeEnd('[Firebase] getFirestore');

console.time('[Firebase] getStorage');
export const storage = getStorage(app);
console.timeEnd('[Firebase] getStorage');

console.log('[Firebase] Initialization complete');
