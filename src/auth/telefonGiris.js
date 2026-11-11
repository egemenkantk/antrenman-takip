// Telefon numarası + şifre ile giriş.
//
// Firebase'de "telefon + şifre" doğrudan yok; şöyle kuruldu:
//  - İlk giriş ve şifremi unuttum: telefon numarası SMS koduyla doğrulanır
//    (Firebase telefon girişi). Ardından kişi şifresini belirler; şifre,
//    telefon numarasından türetilen iç bir e-posta adresine bağlanır.
//  - Sonraki girişler: telefon + şifre (SMS gitmez).
// Her iki yol da aynı Firebase hesabına (aynı uid) çıkar.
// Yalnızca yöneticinin "kullanicilar" listesine eklediği numaralar içeri girebilir.

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

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

// Şifrenin bağlandığı iç adres. Gerçek bir posta kutusu değildir, e-posta gönderilmez.
function icAdres(telefon) {
  return `${telefon.replace('+', '')}@telefon.antrenman-takip-e6e4f.firebaseapp.com`;
}

export async function kullaniciKaydi(telefon) {
  const snap = await getDoc(doc(db, 'kullanicilar', telefon));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

const HATALAR = {
  'auth/invalid-credential': 'Telefon numarası veya şifre hatalı.',
  'auth/wrong-password': 'Telefon numarası veya şifre hatalı.',
  'auth/user-not-found': 'Bu numarayla henüz şifre belirlenmemiş. "İlk giriş" ile başlayın.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.',
  'auth/invalid-verification-code': 'SMS kodu hatalı.',
  'auth/code-expired': 'SMS kodunun süresi doldu. Yeni kod isteyin.',
  'auth/invalid-phone-number': 'Telefon numarası geçersiz.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/quota-exceeded': 'SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.',
  'auth/network-request-failed': 'İnternet bağlantısı yok gibi görünüyor.',
};

export function hataMesaji(e) {
  if (e && e.kullaniciMesaji) return e.kullaniciMesaji;
  return HATALAR[e?.code] || 'Bir sorun oluştu. Lütfen tekrar deneyin.';
}

function yetkisizHata() {
  const e = new Error('yetkisiz');
  e.kullaniciMesaji = 'Bu numara sistemde kayıtlı değil. Lütfen koçunuzla iletişime geçin.';
  return e;
}

async function kalicilikAyarla(benihatirla) {
  await setPersistence(auth, benihatirla ? browserLocalPersistence : browserSessionPersistence);
}

// Normal giriş: telefon + şifre
export async function sifreyleGiris(telefon, sifre, benihatirla) {
  await kalicilikAyarla(benihatirla);
  await signInWithEmailAndPassword(auth, icAdres(telefon), sifre);
  const kayit = await kullaniciKaydi(telefon).catch(() => null);
  if (!kayit || kayit.aktif === false) {
    await signOut(auth);
    throw yetkisizHata();
  }
}

let recaptcha = null;
function recaptchaHazirla(butonId) {
  if (recaptcha) recaptcha.clear();
  recaptcha = new RecaptchaVerifier(auth, butonId, { size: 'invisible' });
  return recaptcha;
}

// İlk giriş / şifremi unuttum — 1. adım: SMS gönder
export async function smsGonder(telefon, butonId, benihatirla) {
  await kalicilikAyarla(benihatirla);
  return signInWithPhoneNumber(auth, telefon, recaptchaHazirla(butonId));
}

// 2. adım: kodu doğrula; numara listede değilse oluşan hesabı hemen sil
export async function smsDogrula(onay, kod, telefon) {
  const sonuc = await onay.confirm(kod.trim());
  const kayit = await kullaniciKaydi(telefon).catch(() => null);
  if (!kayit || kayit.aktif === false) {
    try { await sonuc.user.delete(); } catch { await signOut(auth); }
    throw yetkisizHata();
  }
  return sonuc.user;
}

// 3. adım: şifre belirle (ilk kez) veya değiştir (şifremi unuttum)
export async function sifreBelirle(kullanici, telefon, sifre) {
  const sifresiVar = kullanici.providerData.some((p) => p.providerId === 'password');
  if (sifresiVar) {
    await updatePassword(kullanici, sifre);
  } else {
    await linkWithCredential(kullanici, EmailAuthProvider.credential(icAdres(telefon), sifre));
  }
}

export function cikis() {
  return signOut(auth);
}
