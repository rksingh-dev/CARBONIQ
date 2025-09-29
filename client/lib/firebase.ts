// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7gt4t92K2PWb2UWPGkRU9OIklqqA6ARs",
  authDomain: "superman-rahul.firebaseapp.com",
  projectId: "superman-rahul",
  storageBucket: "superman-rahul.firebasestorage.app",
  messagingSenderId: "745317052051",
  appId: "1:745317052051:web:19fa7b15c922947f04a766"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
