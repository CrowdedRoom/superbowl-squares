import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCuvvKrZrePAL4CHjaodxtljJr8QRkOa3Y",
  authDomain: "superbowl-squares-127be.firebaseapp.com",
  databaseURL: "https://superbowl-squares-127be-default-rtdb.firebaseio.com",
  projectId: "superbowl-squares-127be",
  storageBucket: "superbowl-squares-127be.firebasestorage.app",
  messagingSenderId: "622143627658",
  appId: "1:622143627658:web:5ffa3e16893ef5ebe8a873"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, onValue, get };
