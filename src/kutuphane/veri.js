import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const sirala = (l) => l.sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));

// ---------- Egzersizler ----------
let onbellek = null;
export async function egzersizleriGetir(tazele = false) {
  if (onbellek && !tazele) return onbellek;
  onbellek = sirala(listele(await getDocs(collection(db, 'egzersizler'))));
  return onbellek;
}
export async function egzersizKaydet(eski, veri, yapan) {
  onbellek = null;
  if (eski?.id) return updateDoc(doc(db, 'egzersizler', eski.id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
  return addDoc(collection(db, 'egzersizler'), { ...veri, kurumId: KURUM_ID, olusturan: yapan, olusturma: serverTimestamp() });
}
export async function egzersizSil(id) {
  onbellek = null;
  return deleteDoc(doc(db, 'egzersizler', id));
}
export async function egzersizleriTopluEkle(liste, yapan) {
  onbellek = null;
  for (let i = 0; i < liste.length; i += 400) {
    const b = writeBatch(db);
    for (const e of liste.slice(i, i + 400)) {
      b.set(doc(collection(db, 'egzersizler')), { ...e, kurumId: KURUM_ID, olusturan: yapan, olusturma: serverTimestamp() });
    }
    await b.commit();
  }
}

// Program satırından egzersiz adını ayıkla: "Back squat 4×5 @%80", "Goblet squat — 3×10" → "Back squat", "Goblet squat"
export function satirdanAd(satir) {
  let s = String(satir || '').trim();
  s = s.replace(/\s+[—–-]\s+.*$/, '');
  s = s.replace(/\s+\d+\s*[×x*]\s*\d.*$/i, '');
  s = s.replace(/\s+\d+(\s*(sn|dk|m|tekrar|temas))\b.*$/i, '');
  s = s.replace(/\s*\(.*\)\s*$/, '');
  return s.trim();
}
export const normal = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

// Satırın kütüphanedeki karşılığı (ad eşleşmesi)
export function egzersizBul(satir, kutuphane) {
  if (!kutuphane?.length) return null;
  const ad = normal(satirdanAd(satir));
  if (!ad) return null;
  return kutuphane.find((e) => normal(e.ad) === ad) || null;
}

// ---------- Program şablonları ----------
export async function sablonlariGetir() {
  return sirala(listele(await getDocs(collection(db, 'programSablonlari'))));
}
export function sablonKaydet(blok, ad, yapan) {
  const { id, sahipTip, sahipId, baslangic, olusturan, olusturma, guncelleyen, guncelleme, kaynak, kurumId, ...icerik } = blok;
  return addDoc(collection(db, 'programSablonlari'), {
    ...icerik,
    ad,
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  });
}
export function sablonGuncelle(id, veri) {
  return updateDoc(doc(db, 'programSablonlari', id), veri);
}
export function sablonSil(id) {
  return deleteDoc(doc(db, 'programSablonlari', id));
}
