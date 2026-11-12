// Portal ve ev programı — Firestore yardımcıları
import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, fonksiyonlar } from '../firebase';
import { KURUM_ID } from '../config/marka';

// Öğrenci/veli için sunucuda hazırlanan özet (liste fiyatı ve diğer çocuklar içermez)
export async function portalVerisiGetir(kisiId) {
  return (await httpsCallable(fonksiyonlar, 'portalVerisi')({ kisiId })).data;
}

export async function kisiGetir(kisiId) {
  const s = await getDoc(doc(db, 'kisiler', kisiId));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

// ---------- Ev programı ----------
export async function evProgramiGetir(kisiId) {
  const s = await getDoc(doc(db, 'kisiler', kisiId, 'evProgrami', 'aktif'));
  return s.exists() ? s.data() : null;
}
export function evProgramiKaydet(kisiId, veri, yapan) {
  return setDoc(doc(db, 'kisiler', kisiId, 'evProgrami', 'aktif'), {
    ...veri,
    kurumId: KURUM_ID,
    guncelleyen: yapan,
    guncelleme: serverTimestamp(),
  });
}
export async function evYapilanlar(kisiId, baslangic) {
  const q = query(collection(db, 'kisiler', kisiId, 'evYapilan'), where('tarih', '>=', baslangic));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
}
export function evYapildiKaydet(kisiId, tarih, yapilanlar, yapan) {
  return setDoc(doc(db, 'kisiler', kisiId, 'evYapilan', tarih), {
    tarih,
    yapilanlar,
    dolduran: yapan,
    kurumId: KURUM_ID,
    kayit: serverTimestamp(),
  });
}

// ---------- Wellness ----------
export async function wellnessGetir(kisiId, tarih) {
  const s = await getDoc(doc(db, 'kisiler', kisiId, 'wellness', tarih));
  return s.exists() ? s.data() : null;
}
export async function wellnessGecmisi(kisiId, baslangic) {
  const q = query(collection(db, 'kisiler', kisiId, 'wellness'), where('tarih', '>=', baslangic));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
}
