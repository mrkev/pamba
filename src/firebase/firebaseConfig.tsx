import { FirebaseApp, initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhdehFiYqwx3ahC5yCh6NTQgW7NxZMXvk",
  authDomain: "pamba-c5951.firebaseapp.com",
  projectId: "pamba-c5951",
  storageBucket: "pamba-c5951.appspot.com",
  messagingSenderId: "204416012722",
  appId: "1:204416012722:web:9e00b129f067d20c4894ab",
};

export function initFirebaseApp(): FirebaseApp {
  const app = initializeApp(firebaseConfig);
  return app;
}
