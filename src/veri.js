// Firestore okuma/yazma yardımcıları
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { KURUM_ID } from './config/marka';

export const BRANSLAR = ['Tenis', 'Kayak', 'Basketbol', 'Karting', 'Futbol', 'Voleybol', 'Cimnastik'];
export const HEDEFLER = [
  ['masa-basi', 'Masa başı çalışan'],
  ['ileri-yas', 'İleri yaş'],
  ['kilo', 'Kilo verme'],
  ['agri', 'Ağrı yönetimi'],
  ['kas', 'Kas kazanımı'],
  ['genel', 'Genel sağlık ve kondisyon'],
];
export const HEDEF_ADI = Object.fromEntries(HEDEFLER);
export const TIP_ADI = { sporcu: 'Sporcu', pt: 'PT danışanı' };
export const ROL_ADI = { yonetici: 'Yönetici', koc: 'Koç', ogrenci: 'Öğrenci / danışan', veli: 'Veli' };

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const sirala = (a) => a.sort((x, y) => (x.ad || '').localeCompare(y.ad || '', 'tr'));

// ---------- Şubeler ----------
export async function subeleriGetir() {
  return sirala(listele(await getDocs(collection(db, 'subeler'))));
}
export function subeEkle(veri) {
  return addDoc(collection(db, 'subeler'), { ...veri, kurumId: KURUM_ID, olusturma: serverTimestamp() });
}
export function subeGuncelle(id, veri) {
  return updateDoc(doc(db, 'subeler', id), veri);
}

// ---------- Kullanıcılar (yalnızca yönetici listeleyebilir) ----------
export async function kullanicilariGetir() {
  return sirala(listele(await getDocs(collection(db, 'kullanicilar'))));
}
export function hesabiBagla(telefon, kisiId) {
  return updateDoc(doc(db, 'kullanicilar', telefon), { bagliKisiler: arrayUnion(kisiId) });
}
export function hesapBaginiKaldir(telefon, kisiId) {
  return updateDoc(doc(db, 'kullanicilar', telefon), { bagliKisiler: arrayRemove(kisiId) });
}

// ---------- Kişiler ----------
export async function kisileriGetir(kullanici) {
  const ref = collection(db, 'kisiler');
  const q =
    kullanici.rol === 'yonetici' ? ref : query(ref, where('kocIds', 'array-contains', kullanici.id));
  return sirala(listele(await getDocs(q)));
}
export async function kisiEkle(veri, yapan) {
  const r = await addDoc(collection(db, 'kisiler'), {
    ...veri,
    aktif: true,
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  });
  return r.id;
}
export function kisiGuncelle(id, veri) {
  return updateDoc(doc(db, 'kisiler', id), { ...veri, guncelleme: serverTimestamp() });
}

export function yasHesapla(dogumTarihi, dogumYili) {
  if (!dogumTarihi) return dogumYili ? new Date().getFullYear() - Number(dogumYili) : null;
  const d = new Date(dogumTarihi);
  if (isNaN(d)) return null;
  const b = new Date();
  let y = b.getFullYear() - d.getFullYear();
  if (b.getMonth() < d.getMonth() || (b.getMonth() === d.getMonth() && b.getDate() < d.getDate())) y--;
  return y;
}

export function tarihGoster(t) {
  if (!t) return '';
  const [y, a, g] = t.split('-');
  return `${g}.${a}.${y}`;
}
