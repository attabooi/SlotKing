// client/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBvHoD_QDk_tXbzomouz_iBVgI6zSOyKWc",
  authDomain: "murgle-f31ec.firebaseapp.com",
  projectId: "murgle-f31ec",
  storageBucket: "murgle-f31ec.firebasestorage.app",
  messagingSenderId: "499816336143",
  appId: "1:499816336143:web:68f680dbae5833a75f4c7a",
  measurementId: "G-6CS7GFJEB9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
