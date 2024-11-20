// firebaseConfig.js
import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBezN4fk8KuFQXRaw6P940vbqfdz2NqIG8",
  authDomain: "music-taste-bdec8.firebaseapp.com",
  projectId: "music-taste-bdec8",
  storageBucket: "music-taste-bdec8.firebasestorage.app",
  messagingSenderId: "641284920949",
  appId: "1:641284920949:web:37be1e99847cde51b3ca3c",
  measurementId: "G-N7MFWSS82L",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Firebase Auth with React Native AsyncStorage for persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});


export { app, auth, db, storage };