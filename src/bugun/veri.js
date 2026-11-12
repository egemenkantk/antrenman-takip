import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { sonDersKontrol } from '../auth/hesap';

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export async function tumProgramlar() {
  return listele(await getDocs(collection(db, 'programlar')));
}

export async function gunOzelleriGetir(tarih) {
  return listele(await getDocs(query(collection(db, 'gunOzel'), where('tarih', '==', tarih))));
}
export async function sahibinGunOzelleri(sahipId) {
  return listele(await getDocs(query(collection(db, 'gunOzel'), where('sahipId', '==', sahipId))));
}
export const gunOzelId = (sahipId, tarih) => `${sahipId}__${tarih}`;
export function gunOzelKaydet(sahipTip, sahipId, tarih, veri, yapan) {
  return setDoc(doc(db, 'gunOzel', gunOzelId(sahipId, tarih)), {
    ...veri,
    sahipTip,
    sahipId,
    tarih,
    kurumId: KURUM_ID,
    kaydeden: yapan,
    guncelleme: serverTimestamp(),
  });
}
export function gunOzelSil(sahipId, tarih) {
  return deleteDoc(doc(db, 'gunOzel', gunOzelId(sahipId, tarih)));
}

// Günlük kayıtlar: belge kimliği tarihten türetilir, böylece ikinci kez kaydetmek üzerine yazar
export const bireyselKayitId = (tarih) => tarih;
export const grupKayitId = (tarih, grupId) => `${tarih}_${grupId}`;

export async function gunlukDurum(kisiIds, tarih, grupIdleri = {}) {
  const sonuc = {};
  await Promise.all(
    kisiIds.map(async (id) => {
      const [w, a, g] = await Promise.all([
        getDoc(doc(db, 'kisiler', id, 'wellness', tarih)).catch(() => null),
        getDoc(doc(db, 'kisiler', id, 'antrenmanKayitlari', bireyselKayitId(tarih))).catch(() => null),
        grupIdleri[id]
          ? getDoc(doc(db, 'kisiler', id, 'antrenmanKayitlari', grupKayitId(tarih, grupIdleri[id]))).catch(() => null)
          : null,
      ]);
      sonuc[id] = {
        wellness: w?.exists() ? w.data() : null,
        bireysel: a?.exists() ? a.data() : null,
        grup: g?.exists?.() ? g.data() : null,
      };
    })
  );
  return sonuc;
}

export function wellnessKaydet(kisiId, tarih, veri, yapan) {
  return setDoc(doc(db, 'kisiler', kisiId, 'wellness', tarih), {
    ...veri,
    tarih,
    dolduran: yapan,
    kurumId: KURUM_ID,
    kayit: serverTimestamp(),
  });
}

export async function antrenmanKaydet(kisiId, kayitId, veri, yapan) {
  await setDoc(doc(db, 'kisiler', kisiId, 'antrenmanKayitlari', kayitId), {
    ...veri,
    kaydeden: yapan,
    kurumId: KURUM_ID,
    kayit: serverTimestamp(),
  });
  // Bireysel ders: pakette tek ders kaldıysa öğrenci/veliye bildirim (beklemeden, arka planda)
  if (!String(kayitId).includes('_')) sonDersKontrol(kisiId);
}

export async function gunOzelleriAralik(bas, bit) {
  const q = query(collection(db, 'gunOzel'), where('tarih', '>=', bas), where('tarih', '<=', bit));
  return listele(await getDocs(q));
}
