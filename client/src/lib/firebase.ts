// client/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVBURTovuNnoljp6z09imXmRdntPkci-8",
  authDomain: "slotking-db3c0.firebaseapp.com",
  projectId: "slotking-db3c0",
  storageBucket: "slotking-db3c0.appspot.com",
  messagingSenderId: "921019918279",
  appId: "1:921019918279:web:d93a08abdd4975fa5bdbe2",
  measurementId: "G-P34V2ZDX54"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
