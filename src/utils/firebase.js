import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdK5tH-Ypc7O8u5HeJZNbpGFe1iqoATVw",
  authDomain: "scdi-9f290.firebaseapp.com",
  projectId: "scdi-9f290",
  storageBucket: "scdi-9f290.firebasestorage.app",
  messagingSenderId: "258775302897",
  appId: "1:258775302897:web:9249ba37c8470d04161f50"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
