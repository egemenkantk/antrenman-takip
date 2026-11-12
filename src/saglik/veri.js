// Sakatlık, fizyoterapist görüşmeleri, sakatlık ve branş kütüphaneleri
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { SAKATLIK_TASLAKLARI, BRANS_TASLAKLARI } from './taslaklar';

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
export const BOLGELER = ['Diz', 'Ayak bileği', 'Uyluk', 'Kalça / kasık', 'Bel', 'Boyun', 'Omuz', 'Dirsek', 'El / bilek', 'Baldır / aşil', 'Ayak', 'Diğer'];
export const TARAF_ADI = { sag: 'Sağ', sol: 'Sol', iki: 'İki taraf', yok: '' };

// ---------- Kütüphaneler ----------
let tipOnbellek = null;
export async function sakatlikTipleriGetir(yenile) {
  if (!tipOnbellek || yenile) tipOnbellek = listele(await getDocs(collection(db, 'sakatlikTipleri'))).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  return tipOnbellek;
}
export function sakatlikTipiKaydet(id, veri, yapan) {
  tipOnbellek = null;
  const v = { ...veri, kurumId: KURUM_ID, guncelleyen: yapan, guncelleme: serverTimestamp() };
  return id ? setDoc(doc(db, 'sakatlikTipleri', id), v) : addDoc(collection(db, 'sakatlikTipleri'), v);
}
export function sakatlikTipiSil(id) {
  tipOnbellek = null;
  return deleteDoc(doc(db, 'sakatlikTipleri', id));
}
export async function sakatlikTaslaklariniEkle(yapan) {
  tipOnbellek = null;
  const b = writeBatch(db);
  for (const t of SAKATLIK_TASLAKLARI) {
    b.set(doc(db, 'sakatlikTipleri', t.kod), { ...t, taslak: true, kurumId: KURUM_ID, guncelleyen: yapan, guncelleme: serverTimestamp() });
  }
  await b.commit();
}

let bransOnbellek = null;
export async function branslariGetir(yenile) {
  if (!bransOnbellek || yenile) bransOnbellek = listele(await getDocs(collection(db, 'branslar'))).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  return bransOnbellek;
}
export function bransKaydet(id, veri, yapan) {
  bransOnbellek = null;
  return setDoc(doc(db, 'branslar', id), { ...veri, kurumId: KURUM_ID, guncelleyen: yapan, guncelleme: serverTimestamp() });
}
export const bransKimligi = (ad) =>
  ad
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-');
export async function bransTaslaklariniEkle(yapan, mevcut = []) {
  bransOnbellek = null;
  const b = writeBatch(db);
  for (const t of BRANS_TASLAKLARI) {
    const id = bransKimligi(t.ad);
    if (mevcut.some((m) => m.id === id)) continue; // düzenlenmiş profilin üzerine yazılmaz
    b.set(doc(db, 'branslar', id), { ...t, taslak: true, kurumId: KURUM_ID, guncelleyen: yapan, guncelleme: serverTimestamp() });
  }
  await b.commit();
}

// ---------- Kişinin sakatlıkları ----------
export async function sakatliklariGetir(kisiId) {
  return listele(await getDocs(collection(db, 'kisiler', kisiId, 'sakatliklar'))).sort((a, b) =>
    (b.baslangic || '').localeCompare(a.baslangic || '')
  );
}
export async function gorusmeleriGetir(kisiId, sakatlikId) {
  return listele(await getDocs(collection(db, 'kisiler', kisiId, 'sakatliklar', sakatlikId, 'gorusmeler'))).sort((a, b) =>
    (b.tarih || '').localeCompare(a.tarih || '')
  );
}

// Kişi belgesindeki özet: Bugün ve kartta uyarı için (bölge, taraf, aşama, tür)
async function ozetiGuncelle(kisiId) {
  const l = await sakatliklariGetir(kisiId);
  const aktif = l
    .filter((s) => s.durum !== 'iyilesti')
    .map((s) => ({ id: s.id, tipId: s.tipId || '', ad: s.tipAd || s.tani || 'Sakatlık', bolge: s.bolge || '', taraf: s.taraf || '', asama: s.asama || 1 }));
  await updateDoc(doc(db, 'kisiler', kisiId), { aktifSakatliklar: aktif });
}

export async function sakatlikKaydet(kisiId, id, veri, yapan) {
  const v = { ...veri, kurumId: KURUM_ID, guncelleyen: yapan, guncelleme: serverTimestamp() };
  if (id) await updateDoc(doc(db, 'kisiler', kisiId, 'sakatliklar', id), v);
  else await addDoc(collection(db, 'kisiler', kisiId, 'sakatliklar'), { ...v, durum: 'aktif', asama: veri.asama || 1, gecisler: [], olusturan: yapan, olusturma: serverTimestamp() });
  await ozetiGuncelle(kisiId);
}
export async function asamaGecir(kisiId, s, { asama, tarih, onaylayan, not }, yapan) {
  await updateDoc(doc(db, 'kisiler', kisiId, 'sakatliklar', s.id), {
    asama,
    gecisler: arrayUnion({ asama, tarih, onaylayan: onaylayan || '', not: not || '', yapan }),
    guncelleme: serverTimestamp(),
  });
  await ozetiGuncelle(kisiId);
}
export async function sakatlikKapat(kisiId, s, bitis, yapan, geriAl = false) {
  await updateDoc(doc(db, 'kisiler', kisiId, 'sakatliklar', s.id), {
    durum: geriAl ? 'aktif' : 'iyilesti',
    bitis: geriAl ? null : bitis,
    guncelleyen: yapan,
    guncelleme: serverTimestamp(),
  });
  await ozetiGuncelle(kisiId);
}
export function gorusmeEkle(kisiId, sakatlikId, veri, yapan) {
  return Promise.all([
    addDoc(collection(db, 'kisiler', kisiId, 'sakatliklar', sakatlikId, 'gorusmeler'), { ...veri, kurumId: KURUM_ID, yapan, kayit: serverTimestamp() }),
    veri.sonrakiKontrol || veri.kisitlar
      ? updateDoc(doc(db, 'kisiler', kisiId, 'sakatliklar', sakatlikId), {
          ...(veri.sonrakiKontrol ? { sonrakiKontrol: veri.sonrakiKontrol } : {}),
          ...(veri.kisitlar ? { kisitlar: veri.kisitlar } : {}),
        })
      : null,
  ]);
}

// Kişinin aktif sakatlıklarına göre bu aşamada kaçınılacak hareket kalıpları
export function riskliKaliplar(kisi, tipler) {
  const s = new Set();
  for (const a of kisi?.aktifSakatliklar || []) {
    const t = tipler.find((x) => x.id === a.tipId);
    (t?.asamalar?.[(a.asama || 1) - 1]?.kacinilacakKaliplar || []).forEach((k) => s.add(k));
  }
  return s;
}
export const sakatlikEtiketi = (a) => [a.bolge, TARAF_ADI[a.taraf]].filter(Boolean).join(' · ') + ` · Aşama ${a.asama || 1}`;
