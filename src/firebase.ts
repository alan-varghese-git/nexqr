// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKANkFYu6EySZ5P_QdMgRu5qkuITJMouk",
  authDomain: "nexqr-981e5.firebaseapp.com",
  projectId: "nexqr-981e5",
  storageBucket: "nexqr-981e5.firebasestorage.app",
  messagingSenderId: "281795070446",
  appId: "1:281795070446:web:ebde75197793822b1d26ff"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };