// Ders değişiklikleri: sabit saatli bir dersin o günlük saatini değiştirme, başka güne taşıma ya da iptal.
// Belge kimliği dersin asıl tarihine bağlıdır: <sahipId>__<asıl tarih>
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
export const degisiklikId = (sahipId, tarih) => `${sahipId}__${tarih}`;

// Aralıktaki değişiklikler: asıl tarihi ya da yeni tarihi aralığa düşenler
export async function degisiklikleriGetir(bas, bit) {
  const [a, b] = await Promise.all([
    getDocs(query(collection(db, 'dersDegisiklik'), where('tarih', '>=', bas), where('tarih', '<=', bit))),
    getDocs(query(collection(db, 'dersDegisiklik'), where('yeniTarih', '>=', bas), where('yeniTarih', '<=', bit))),
  ]);
  const m = new Map();
  [...listele(a), ...listele(b)].forEach((d) => m.set(d.id, d));
  return [...m.values()];
}

export function degisiklikKaydet({ sahipTip, sahipId, sahipAd, tarih, eskiSaat }, veri, yapan) {
  return setDoc(doc(db, 'dersDegisiklik', degisiklikId(sahipId, tarih)), {
    sahipTip,
    sahipId,
    sahipAd: sahipAd || '',
    tarih,
    eskiSaat: eskiSaat || '',
    islem: veri.islem, // saat | tasi | iptal
    yeniTarih: veri.islem === 'tasi' ? veri.yeniTarih : veri.islem === 'saat' ? tarih : null,
    yeniSaat: veri.islem === 'iptal' ? '' : veri.yeniSaat || '',
    not: veri.not || '',
    kurumId: KURUM_ID,
    yapan,
    kayit: serverTimestamp(),
  });
}
export function degisiklikSil(sahipId, tarih) {
  return deleteDoc(doc(db, 'dersDegisiklik', degisiklikId(sahipId, tarih)));
}
