import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';

export async function programlariGetir(sahipId) {
  const snap = await getDocs(query(collection(db, 'programlar'), where('sahipId', '==', sahipId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || ''));
}

export function programEkle(sahipTip, sahipId, blok, yapan) {
  return addDoc(collection(db, 'programlar'), {
    ...blok,
    sahipTip,
    sahipId,
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  });
}

export function programGuncelle(id, blok, yapan) {
  const { id: _, ...veri } = blok;
  return updateDoc(doc(db, 'programlar', id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
}

export function programSil(id) {
  return deleteDoc(doc(db, 'programlar', id));
}
