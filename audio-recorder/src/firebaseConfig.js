import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBB4uP-BtctP4pLlxgrYn-CyuufkWOx9gY",
    authDomain: "classcut-ce547.firebaseapp.com",
    projectId: "classcut-ce547",
    storageBucket: "classcut-ce547.appspot.com",
    messagingSenderId: "792092056221",
    appId: "1:792092056221:web:d5920515726bc403cb1274",
    measurementId: "G-EXDVE02NCS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firebase Analytics
const analytics = getAnalytics(app);

export { db, auth, analytics };