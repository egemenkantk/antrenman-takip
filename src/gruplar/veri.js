import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export async function gruplariGetir(kullanici) {
  const ref = collection(db, 'gruplar');
  const q = kullanici.rol === 'yonetici' ? ref : query(ref, where('kocIds', 'array-contains', kullanici.id));
  return listele(await getDocs(q)).sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
}

// Grup koçlarının üyelerin kartlarına erişebilmesi için her üyede "grupKocIds" tutulur.
// Bir grup kaydedildiğinde etkilenen kişiler için tüm gruplardan yeniden hesaplanır.
export async function grupKoclariniEsitle(kisiIds) {
  if (!kisiIds.length) return;
  const tum = listele(await getDocs(collection(db, 'gruplar'))).filter((g) => g.aktif !== false);
  const b = writeBatch(db);
  for (const id of kisiIds) {
    const koclar = new Set(tum.filter((g) => (g.uyeIds || []).includes(id)).flatMap((g) => g.kocIds || []));
    b.update(doc(db, 'kisiler', id), { grupKocIds: [...koclar] });
  }
  await b.commit();
}

export async function grupKaydet(eski, veri, yapan) {
  let id = eski?.id;
  if (id) {
    await updateDoc(doc(db, 'gruplar', id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
  } else {
    const r = await addDoc(collection(db, 'gruplar'), {
      ...veri,
      aktif: true,
      kurumId: KURUM_ID,
      olusturan: yapan,
      olusturma: serverTimestamp(),
    });
    id = r.id;
  }
  const etkilenen = [...new Set([...(eski?.uyeIds || []), ...(veri.uyeIds || [])])];
  await grupKoclariniEsitle(etkilenen);
  return id;
}

export async function grupDurum(g, aktif) {
  await updateDoc(doc(db, 'gruplar', g.id), { aktif });
  await grupKoclariniEsitle(g.uyeIds || []);
}
