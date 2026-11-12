import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';

export const ETKINLIK_TURU = { mac: 'Maç', turnuva: 'Turnuva', test: 'Test günü', diger: 'Diğer' };
export const ETKINLIK_SIMGE = { mac: '🏟', turnuva: '🏆', test: '📋', diger: '📌' };

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export async function etkinlikleriGetir(bas, bit) {
  const q = query(collection(db, 'etkinlikler'), where('tarih', '>=', bas), where('tarih', '<=', bit));
  return listele(await getDocs(q)).sort((a, b) => (a.tarih + (a.saat || '')).localeCompare(b.tarih + (b.saat || '')));
}

export function etkinlikKaydet(eski, veri, yapan) {
  if (eski?.id) return updateDoc(doc(db, 'etkinlikler', eski.id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
  return addDoc(collection(db, 'etkinlikler'), { ...veri, kurumId: KURUM_ID, olusturan: yapan, olusturma: serverTimestamp() });
}

export function etkinlikSil(id) {
  return deleteDoc(doc(db, 'etkinlikler', id));
}

// Etkinlik bu kişiyi/grubu kapsıyor mu?
export function kapsiyor(e, { tip, id, grupIds = [] }) {
  if (e.kapsam === 'herkes') return true;
  if (tip === 'grup') return (e.grupIds || []).includes(id);
  return (e.kisiIds || []).includes(id) || (e.grupIds || []).some((g) => grupIds.includes(g));
}

// Sahibin maç ve turnuva tarihleri (maç gününe göre planlama için)
export function maclar(etkinlikler, sahip) {
  return [
    ...new Set(etkinlikler.filter((e) => (e.tur === 'mac' || e.tur === 'turnuva') && kapsiyor(e, sahip)).map((e) => e.tarih)),
  ].sort();
}
