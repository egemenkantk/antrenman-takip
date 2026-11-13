import { doc, writeBatch, serverTimestamp, collection, getDocs, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { sonucId } from './tanimlar.js';

// sonuclar: [{ kisiId, test, tarih, deger, taraf?, kaynak, detay?, normSeviye?, yasGrubu?, dosyaAdi? }]
export async function sonuclariKaydet(sonuclar, yapan) {
  for (let i = 0; i < sonuclar.length; i += 400) {
    const b = writeBatch(db);
    for (const s of sonuclar.slice(i, i + 400)) {
      const { kisiId, ...v } = s;
      const id = sonucId(v.kaynak, v.tarih, v.test, v.taraf);
      b.set(doc(db, 'kisiler', kisiId, 'testSonuclari', id), {
        ...v,
        taraf: v.taraf || null,
        kurumId: KURUM_ID,
        kaydeden: yapan,
        kayit: serverTimestamp(),
      });
    }
    await b.commit();
  }
}

export async function kisininSonuclari(kisiId) {
  const snap = await getDocs(collection(db, 'kisiler', kisiId, 'testSonuclari'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function sonucSil(kisiId, id) {
  return deleteDoc(doc(db, 'kisiler', kisiId, 'testSonuclari', id));
}

// Tek sonucu düzelt (değer, tarih, seviye, not); eski değer düzeltme geçmişinde kalır
export function sonucGuncelle(kisiId, eski, yeni, yapan) {
  return updateDoc(doc(db, 'kisiler', kisiId, 'testSonuclari', eski.id), {
    deger: yeni.deger,
    tarih: yeni.tarih,
    seviye: yeni.seviye ?? deleteField(),
    not: yeni.not ? yeni.not : deleteField(),
    duzelten: yapan,
    duzeltme: serverTimestamp(),
    oncekiDeger: eski.deger,
  });
}
