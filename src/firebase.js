// Firebase bağlantısı. Bu bilgiler herkese açık web yapılandırmasıdır;
// güvenlik Firestore kurallarıyla sağlanır (firestore.rules).
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyC6kzc7CRGXC6ERMDXdMfsWoOK4uQcRB8U',
  authDomain: 'antrenman-takip-e6e4f.firebaseapp.com',
  projectId: 'antrenman-takip-e6e4f',
  storageBucket: 'antrenman-takip-e6e4f.firebasestorage.app',
  messagingSenderId: '467351236830',
  appId: '1:467351236830:web:b2883715b09ca1ecc4924f',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'tr';
export const db = getFirestore(app);
export const fonksiyonlar = getFunctions(app, 'europe-west3');
