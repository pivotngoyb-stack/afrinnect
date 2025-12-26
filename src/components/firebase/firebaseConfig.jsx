import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDFfrqew9sH07QgTT3yc0glYfuDWdW1Hyg",
  authDomain: "afrinnect.firebaseapp.com",
  projectId: "afrinnect",
  storageBucket: "afrinnect.firebasestorage.app",
  messagingSenderId: "1061676943168",
  appId: "1:1061676943168:web:ad3c6151548c30900c5ca5",
  measurementId: "G-8ZBF5S0M3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);