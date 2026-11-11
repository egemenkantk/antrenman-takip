// Sunucu tarafı ortak yardımcılar (fonksiyonlar ve kurulum betiği kullanır)
const crypto = require('crypto');

// Herkese açık web API anahtarı (src/firebase.js ile aynı)
const API_KEY = 'AIzaSyC6kzc7CRGXC6ERMDXdMfsWoOK4uQcRB8U';
const PROJE = 'antrenman-takip-e6e4f';
const KURUM_ID = 'fitkon';

// "0532 123 45 67" → "+905321234567"
function telefonuDuzenle(girdi) {
  let r = String(girdi || '').replace(/[^\d+]/g, '');
  if (r.startsWith('+')) r = r.slice(1);
  if (r.startsWith('0090')) r = r.slice(4);
  if (r.startsWith('90') && r.length === 12) r = r.slice(2);
  if (r.startsWith('0')) r = r.slice(1);
  if (!/^5\d{9}$/.test(r)) return null;
  return '+90' + r;
}

// E-postası olmayan kişiler için iç adres (posta kutusu değil, e-posta gitmez)
function icAdres(telefon) {
  return `${telefon.replace('+', '')}@telefon.${PROJE}.firebaseapp.com`;
}

function epostaGecerli(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// Kolay okunur geçici şifre: karışan harfler (0/O, 1/l/I) yok
function geciciSifreUret() {
  const harfler = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += harfler[b[i] % harfler.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}

function maskele(eposta) {
  const [ad, alan] = eposta.split('@');
  return `${ad.charAt(0)}${'*'.repeat(Math.max(2, ad.length - 1))}@${alan}`;
}

// Firebase'in kendi "şifre sıfırlama" e-postasını gönderir (ücretsiz)
async function sifirlamaEpostasiGonder(eposta) {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Firebase-Locale': 'tr' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: eposta }),
    }
  );
  if (!r.ok) throw new Error('sifirlama-epostasi: ' + (await r.text()));
}

module.exports = {
  API_KEY,
  PROJE,
  KURUM_ID,
  telefonuDuzenle,
  icAdres,
  epostaGecerli,
  geciciSifreUret,
  maskele,
  sifirlamaEpostasiGonder,
};
