import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
    getFirestore,
    initializeFirestore,
    type Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// Reusa la app si ya fue inicializada (HMR / hidrataciones multiples de Astro).
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auto-detect long-polling: Safari y redes con proxies/firewalls a veces
// bloquean el transporte WebChannel (streaming) que Firestore usa por defecto,
// produciendo errores "Fetch API cannot load ... due to access control checks".
// Con esta opcion el SDK detecta el problema y cae a long-polling automaticamente.
function initFirestore(): Firestore {
    try {
        return initializeFirestore(app, {
            experimentalAutoDetectLongPolling: true,
        });
    } catch {
        return getFirestore(app);
    }
}

export const auth = getAuth(app);
export const db = initFirestore();
export const storage = getStorage(app);
