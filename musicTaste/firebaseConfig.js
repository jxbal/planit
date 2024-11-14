// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBezN4fk8KuFQXRaw6P940vbqfdz2NqIG8",
  authDomain: "music-taste-bdec8.firebaseapp.com",
  projectId: "music-taste-bdec8",
  storageBucket: "music-taste-bdec8.appspot.com",
  messagingSenderId: "641284920949",
  appId: "1:641284920949:web:37be1e99847cde51b3ca3c",
  measurementId: "G-N7MFWSS82L"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize individual services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
