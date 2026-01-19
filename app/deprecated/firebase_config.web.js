// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {initializeAuth} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use    
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChrHjrhM89XuDAFBhEFv9Zd4llFUbUbQ4",
  authDomain: "safeqore.firebaseapp.com",
  projectId: "safeqore",
  storageBucket: "safeqore.firebasestorage.app",
  messagingSenderId: "117587066520",
  appId: "1:117587066520:web:7f65d2f1918d2900731aed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app);