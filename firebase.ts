
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, query, orderBy, Firestore } from "firebase/firestore";

const COLLECTION_NAME = "az104_master_principles";

export interface VaultItem {
  hash: string;
  domain: string;
  foundationalRule: string;
  masteredAt: string;
}

const getFirebaseConfig = () => {
  const local = localStorage.getItem('vault_firebase_config');
  if (local) return JSON.parse(local);

  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
};

let dbInstance: Firestore | null = null;

const getDb = (): Firestore => {
  if (dbInstance) return dbInstance;
  
  const config = getFirebaseConfig();
  if (!config.projectId) throw new Error("Firebase not configured");

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  dbInstance = getFirestore(app);
  return dbInstance;
};

export const getQuestionHash = async (text: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const checkDuplicate = async (hash: string): Promise<boolean> => {
  try {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, hash);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (e) {
    return false;
  }
};

export const saveToVault = async (hash: string, domain: string, rule: string) => {
  try {
    const db = getDb();
    const docRef = doc(db, COLLECTION_NAME, hash);
    await setDoc(docRef, {
      masteredAt: new Date().toISOString(),
      domain,
      foundationalRule: rule,
      hash
    });
  } catch (e) {}
};

export const fetchVault = async (): Promise<VaultItem[]> => {
  try {
    const db = getDb();
    const q = query(collection(db, COLLECTION_NAME), orderBy("masteredAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as VaultItem);
  } catch (e) {
    return [];
  }
};
