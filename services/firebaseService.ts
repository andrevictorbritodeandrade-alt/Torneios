import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, collection, writeBatch, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { FirebaseConfig, DashboardCardData, ClassDataMap, TournamentState, ActivityLogData, GalleryData } from '../types';
import firebaseAppletConfig from '../firebase-applet-config.json';

const CONFIG_KEY = 'chess_club_firebase_config';

export const getStoredConfig = (): FirebaseConfig | null => {
  // First try the applet config file
  if (firebaseAppletConfig && firebaseAppletConfig.apiKey) {
    return firebaseAppletConfig as FirebaseConfig;
  }
  
  // Then try environment variables
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }

  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const saveConfig = (config: FirebaseConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Reload the page to apply the new config
  window.location.reload();
};

let db: any = null;
let app: any = null;
let auth: any = null;
let persistenceEnabled = false;

export const initFirebase = () => {
  if (db && auth) return true;

  const config = getStoredConfig();
  if (!config) {
    console.warn("Firebase config not found in localStorage.");
    return false;
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    
    if (!db) {
      db = getFirestore(app);
      
      // Enable offline persistence - only once
      if (!persistenceEnabled) {
        persistenceEnabled = true;
        enableIndexedDbPersistence(db).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
          } else if (err.code === 'unimplemented') {
            console.warn("The current browser does not support all of the features required to enable persistence.");
          } else {
            console.error("Persistence error:", err);
          }
        });
      }
    }

    if (!auth) {
      auth = getAuth(app);
      signInAnonymously(auth).catch((err) => console.error("Auth Error:", err));
    }
    
    return true;
  } catch (e) {
    console.error("Erro ao iniciar Firebase", e);
    return false;
  }
};

export const onAuthChange = (callback: (user: any) => void) => {
  if (!auth) {
    const config = getStoredConfig();
    if (config) {
      if (!getApps().length) app = initializeApp(config);
      else app = getApp();
      auth = getAuth(app);
    }
  }
  if (auth) {
    return onAuthStateChanged(auth, callback);
  }
  return () => {};
};

// Inicializa cards padrão se não existirem
export const seedDatabase = async () => {
  if (!db) return;
  
  const defaultCards: DashboardCardData[] = [
    { id: 'total_students', title: 'Total de Alunos', value: 124, type: 'number', trend: '+12% este mês', icon: 'users', lastUpdated: Date.now() },
    { id: 'active_classes', title: 'Turmas Ativas', value: 8, type: 'number', trend: '2 manhã / 6 tarde', icon: 'book', lastUpdated: Date.now() },
    { id: 'next_event', title: 'Próximo Torneio', value: '15 Mai - Interescolar', type: 'text', icon: 'trophy', lastUpdated: Date.now() },
    { id: 'club_status', title: 'Status do Clube', value: 'Aberto', type: 'status', icon: 'door', lastUpdated: Date.now() },
  ];

  for (const card of defaultCards) {
    await setDoc(doc(db, 'dashboard', card.id), card, { merge: true });
  }
};

// Listener em tempo real Dashboard
export const subscribeToDashboard = (callback: (data: DashboardCardData[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  const unsub = onSnapshot(collection(db, 'dashboard'), (snapshot: any) => {
    const cards: DashboardCardData[] = [];
    snapshot.forEach((doc: any) => {
      cards.push(doc.data() as DashboardCardData);
    });
    cards.sort((a, b) => a.id.localeCompare(b.id));
    callback(cards);
  });

  return unsub;
};

// Atualizar valor Dashboard
export const updateCardValue = async (id: string, value: string | number) => {
  if (!db) return;
  const docRef = doc(db, 'dashboard', id);
  await updateDoc(docRef, {
    value: value,
    lastUpdated: Date.now()
  });
};

// --- REAL-TIME CLASSES SYNC ---

export const subscribeToClasses = (callback: (data: ClassDataMap) => void) => {
  if (!db) return () => {};
  
  return onSnapshot(collection(db, 'classes'), (snapshot: any) => {
    const classes: ClassDataMap = {};
    if (snapshot.empty) {
        // Do not callback with empty data to avoid wiping local data
        return;
    }
    snapshot.forEach((doc: any) => {
      classes[doc.id] = doc.data();
    });
    callback(classes);
  });
};

export const saveClassesToFirestore = async (data: ClassDataMap) => {
  if (!db) return;
  const batch = writeBatch(db);
  
  // Save each class as a document
  Object.values(data).forEach((cls) => {
    const ref = doc(db, 'classes', cls.id);
    batch.set(ref, cls);
  });
  
  await batch.commit();
};

// --- REAL-TIME ACTIVITY LOG SYNC ---

export const subscribeToActivityLog = (callback: (data: ActivityLogData | null) => void) => {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'activities', 'log'), (doc: any) => {
    if (doc.exists()) {
      callback(doc.data() as ActivityLogData);
    }
  });
};

export const saveActivityLogToFirestore = async (data: ActivityLogData) => {
  if (!db) return;
  await setDoc(doc(db, 'activities', 'log'), data);
};

// --- REAL-TIME TOURNAMENT SYNC ---

export const subscribeToTournament = (callback: (data: TournamentState | null) => void) => {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'tournaments', 'active'), (doc: any) => {
    if (doc.exists()) {
      callback(doc.data() as TournamentState);
    } else {
      callback(null);
    }
  });
};

export const saveTournamentToFirestore = async (data: TournamentState) => {
  if (!db) return;
  await setDoc(doc(db, 'tournaments', 'active'), data);
};

// --- REAL-TIME GALLERY SYNC ---

export const subscribeToGallery = (callback: (data: GalleryData | null) => void) => {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'gallery', 'main'), (doc: any) => {
    if (doc.exists()) {
      callback(doc.data() as GalleryData);
    } else {
      callback(null);
    }
  });
};

export const saveGalleryToFirestore = async (data: GalleryData) => {
  if (!db) return;
  await setDoc(doc(db, 'gallery', 'main'), data);
};