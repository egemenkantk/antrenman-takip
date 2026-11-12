// Giriş ve hesap işlemleri — telefon + şifre, SMS yok.
// Şifre kontrolü sunucuda yapılır (functions/index.js); tarayıcı yalnızca
// sunucunun verdiği tek kullanımlık giriş anahtarıyla oturum açar.

import {
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, fonksiyonlar } from '../firebase';

const cagir = (ad) => async (veri) => (await httpsCallable(fonksiyonlar, ad)(veri)).data;
export const donemKontrolCalistir = cagir('donemKontrolCalistir');

// "0532 123 45 67", "532 1234567", "+90 532..." → "+905321234567"
export function telefonuDuzenle(girdi) {
  let r = String(girdi || '').replace(/[^\d+]/g, '');
  if (r.startsWith('+')) r = r.slice(1);
  if (r.startsWith('0090')) r = r.slice(4);
  if (r.startsWith('90') && r.length === 12) r = r.slice(2);
  if (r.startsWith('0')) r = r.slice(1);
  if (!/^5\d{9}$/.test(r)) return null;
  return '+90' + r;
}

// "+905321234567" → "0532 123 45 67"
export function telefonuGoster(t) {
  if (!t || !t.startsWith('+90')) return t || '';
  const r = '0' + t.slice(3);
  return `${r.slice(0, 4)} ${r.slice(4, 7)} ${r.slice(7, 9)} ${r.slice(9)}`;
}

export async function kullaniciKaydi(telefon) {
  const snap = await getDoc(doc(db, 'kullanicilar', telefon));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function hataMesaji(e) {
  // Sunucu fonksiyonlarının Türkçe mesajları doğrudan gösterilir
  if (e?.code?.startsWith('functions/') && e.message && e.code !== 'functions/internal') return e.message;
  if (e?.code === 'functions/internal') return 'Sunucuda bir sorun oluştu. Lütfen tekrar deneyin.';
  if (e?.code === 'auth/network-request-failed') return 'İnternet bağlantısı yok gibi görünüyor.';
  return 'Bir sorun oluştu. Lütfen tekrar deneyin.';
}

export async function girisYap(telefon, sifre, benihatirla) {
  await setPersistence(auth, benihatirla ? browserLocalPersistence : browserSessionPersistence);
  const { token } = await cagir('girisYap')({ telefon, sifre });
  await signInWithCustomToken(auth, token);
}

export const sifreSifirla = (telefon) => cagir('sifreSifirla')({ telefon });
export const sifremiDegistir = (yeniSifre) => cagir('sifremiDegistir')({ yeniSifre });
export const epostaGuncelle = (eposta) => cagir('epostaGuncelle')({ eposta });
export const kullaniciOlustur = (veri) => cagir('kullaniciOlustur')(veri);
export const geciciSifreVer = (telefon) => cagir('geciciSifreVer')({ telefon });
export const kullaniciDurum = (telefon, aktif) => cagir('kullaniciDurum')({ telefon, aktif });
export const kullaniciSil = (telefon) => cagir('kullaniciSil')({ telefon });

export function cikis() {
  return signOut(auth);
}
