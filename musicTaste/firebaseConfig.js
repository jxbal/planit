// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBezN4fk8KuFQXRaw6P940vbqfdz2NqIG8",
  authDomain: "music-taste-bdec8.firebaseapp.com",
  projectId: "music-taste-bdec8",
  storageBucket: "music-taste-bdec8.appspot.com",
  messagingSenderId: "641284920949",
  appId: "1:641284920949:web:37be1e99847cde51b3ca3c",
  measurementId: "G-N7MFWSS82L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

export { db };