// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBezN4fk8KuFQXRaw6P940vbqfdz2NqIG8",
  authDomain: "music-taste-bdec8.firebaseapp.com",
  projectId: "music-taste-bdec8",
  storageBucket: "music-taste-bdec8.firebasestorage.app",
  messagingSenderId: "641284920949",
  appId: "1:641284920949:web:37be1e99847cde51b3ca3c",
  measurementId: "G-N7MFWSS82L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
