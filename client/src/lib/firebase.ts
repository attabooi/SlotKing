// client/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA43u3P3S97R7rFwy26VCXu2lhyhR5vW04",
  authDomain: "murgle.firebaseapp.com",
  projectId: "murgle",
  storageBucket: "murgle.firebasestorage.app",
  messagingSenderId: "1032847672231",
  appId: "1:1032847672231:web:05b1b288d7409276c9ec82",
  measurementId: "G-XSGMXC3T4E"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
