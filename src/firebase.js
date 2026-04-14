import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYDcigAsKl7gY1qROG3RY66kItFli-l64",
  authDomain: "angarmd-60359.firebaseapp.com",
  projectId: "angarmd-60359",
  storageBucket: "angarmd-60359.firebasestorage.app",
  messagingSenderId: "360491777362",
  appId: "1:360491777362:web:2744b84fd62432c06f8e8b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);