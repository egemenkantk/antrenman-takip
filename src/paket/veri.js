// Paketler, ödemeler, bildirimler — Firestore yardımcıları
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { grupKayitKimligi, orantiliUcret } from './model.js';

const listele = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

async function gecmiseYaz(yapan, islem, detay) {
  try {
    await addDoc(collection(db, 'islemGecmisi'), { yapan, islem, detay, kurumId: KURUM_ID, tarih: serverTimestamp() });
  } catch {
    /* geçmiş yazılamasa da işlem tamamlanmış sayılır */
  }
}

// ---------- Paket tanımları ----------
export async function paketTanimlariGetir() {
  return listele(await getDocs(collection(db, 'paketTanimlari'))).sort(
    (a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr')
  );
}
export function paketTanimKaydet(eski, veri, yapan) {
  if (eski?.id) return updateDoc(doc(db, 'paketTanimlari', eski.id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
  return addDoc(collection(db, 'paketTanimlari'), { ...veri, aktif: true, kurumId: KURUM_ID, olusturan: yapan, olusturma: serverTimestamp() });
}

// ---------- Satılan paketler ----------
// Koç yalnızca kendi kişilerinin kayıtlarını okuyabildiği için sorgular hep kişi bazında yapılır.
export async function kisiPaketleri(kisiId) {
  return listele(await getDocs(query(collection(db, 'satilanPaketler'), where('kisiId', '==', kisiId))));
}
export async function kisiOdemeleri(kisiId) {
  return listele(await getDocs(query(collection(db, 'odemeler'), where('kisiId', '==', kisiId))));
}
export async function cokluKisiVerisi(kisiIds) {
  const paketler = [];
  const odemeler = [];
  const parcalar = [];
  for (let i = 0; i < kisiIds.length; i += 10) parcalar.push(kisiIds.slice(i, i + 10));
  for (const p of parcalar) {
    const r = await Promise.all(p.map((id) => Promise.all([kisiPaketleri(id), kisiOdemeleri(id)])));
    r.forEach(([a, b]) => { paketler.push(...a); odemeler.push(...b); });
  }
  return { paketler, odemeler };
}
// Yönetici için tek sorguyla tümü
export async function tumPaketVerisi() {
  const [p, o] = await Promise.all([getDocs(collection(db, 'satilanPaketler')), getDocs(collection(db, 'odemeler'))]);
  return { paketler: listele(p), odemeler: listele(o) };
}

export function paketAta({ kisi, tanim, baslangic, uygulananFiyat, fiyatNotu }, yapan) {
  return addDoc(collection(db, 'satilanPaketler'), {
    kisiId: kisi.id,
    tur: 'bireysel',
    paketTanimId: tanim.id,
    paketAdi: tanim.ad,
    subeId: tanim.subeId || '',
    dersSayisi: Number(tanim.dersSayisi) || 0,
    listeFiyati: Number(tanim.fiyat) || 0,
    uygulananFiyat: Number(uygulananFiyat ?? tanim.fiyat) || 0,
    fiyatNotu: fiyatNotu || '',
    baslangic,
    durum: 'aktif',
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  });
}
export async function paketGuncelle(p, veri, yapan) {
  await updateDoc(doc(db, 'satilanPaketler', p.id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
  if ('uygulananFiyat' in veri && Number(veri.uygulananFiyat) !== Number(p.uygulananFiyat)) {
    await gecmiseYaz(yapan, 'fiyat-degisti', { paketId: p.id, kisiId: p.kisiId, eski: p.uygulananFiyat, yeni: veri.uygulananFiyat });
  }
}

// ---------- Grup dönemleri ----------
export async function grupDonemKayitlari(grup, donem) {
  const sonuc = {};
  await Promise.all(
    (grup.uyeIds || []).map(async (kisiId) => {
      try {
        const s = await getDoc(doc(db, 'satilanPaketler', grupKayitKimligi(grup.id, donem.bas, kisiId)));
        sonuc[kisiId] = s.exists() ? { id: s.id, ...s.data() } : null;
      } catch {
        sonuc[kisiId] = null;
      }
    })
  );
  return sonuc;
}
export function grupKaydiOlustur(grup, donem, tanim, kisiId, yapan) {
  const katilim = grup.uyeKatilim?.[kisiId];
  const ozel = grup.ozelFiyatlar?.[kisiId];
  const liste = Number(tanim.fiyat) || 0;
  const tam = ozel ? Number(ozel.fiyat) || 0 : liste;
  const ortada = katilim && katilim > donem.bas && katilim <= donem.bit;
  const ucret = ortada ? orantiliUcret(tam, donem.bas, katilim) : tam;
  const notlar = [ozel ? `Kişiye özel ücret${ozel.not ? ` (${ozel.not})` : ''}` : '', ortada ? 'Dönem ortası katılım (orantılı)' : ''].filter(Boolean);
  return setDoc(doc(db, 'satilanPaketler', grupKayitKimligi(grup.id, donem.bas, kisiId)), {
    kisiId,
    tur: 'grup',
    grupId: grup.id,
    grupAdi: grup.ad || '',
    paketTanimId: tanim.id,
    paketAdi: tanim.ad,
    subeId: grup.subeId || tanim.subeId || '',
    donemBas: donem.bas,
    donemBit: donem.bit,
    baslangic: donem.bas,
    tamUcret: tam,
    listeFiyati: ortada ? orantiliUcret(liste, donem.bas, katilim) : liste,
    uygulananFiyat: ucret,
    fiyatNotu: notlar.join(' · '),
    durum: 'aktif',
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  });
}

// Kişiye özel grup ücreti: sonraki dönemlere de uygulanır (yalnızca yönetici)
export async function grupOzelFiyat(grupId, kisiId, fiyat, not, yapan) {
  await updateDoc(doc(db, 'gruplar', grupId), {
    [`ozelFiyatlar.${kisiId}`]: fiyat === null ? deleteField() : { fiyat: Number(fiyat) || 0, not: not || '' },
  });
  await gecmiseYaz(yapan, 'grup-ozel-fiyat', { grupId, kisiId, fiyat });
}

// ---------- Ödemeler ----------
export function odemeEkle({ kisiId, satilanPaketId, tutar, tarih, yontem, not }, yapan) {
  return addDoc(collection(db, 'odemeler'), {
    kisiId,
    satilanPaketId,
    tutar: Number(tutar) || 0,
    tarih,
    yontem,
    not: not || '',
    tahsilEdenKocId: yapan,
    silindi: false,
    kurumId: KURUM_ID,
    kayit: serverTimestamp(),
  });
}
export function odemeDuzelt(o, yeni, yapan) {
  return updateDoc(doc(db, 'odemeler', o.id), {
    ...yeni,
    tutar: Number(yeni.tutar) || 0,
    duzeltmeGecmisi: arrayUnion({
      eski: { tutar: o.tutar, tarih: o.tarih, yontem: o.yontem, not: o.not || '' },
      yapan,
      zaman: new Date().toISOString(),
    }),
  });
}
// Silme: kayıt kaybolmaz, "silindi" işaretlenir ve geçmişe yazılır (yalnızca yönetici)
export async function odemeSil(o, neden, yapan) {
  await updateDoc(doc(db, 'odemeler', o.id), { silindi: true, silmeNedeni: neden || '', silen: yapan, silmeZamani: serverTimestamp() });
  await gecmiseYaz(yapan, 'odeme-silindi', { odemeId: o.id, kisiId: o.kisiId, tutar: o.tutar, neden: neden || '' });
}

// Gelmedi olarak işaretlenen bireysel dersin paketten düşüp düşmeyeceği (yönetici kararı)
export function dersDusmeKarari(kisiId, kayitId, dussun) {
  return updateDoc(doc(db, 'kisiler', kisiId, 'antrenmanKayitlari', kayitId), { derstenDussun: dussun });
}
export async function bireyselKayitlar(kisiId) {
  return listele(await getDocs(collection(db, 'kisiler', kisiId, 'antrenmanKayitlari')));
}

// ---------- Bildirimler ----------
export async function bildirimlerim(benimId) {
  const q = query(collection(db, 'bildirimler'), where('aliciKullaniciId', '==', benimId), orderBy('tarih', 'desc'), limit(40));
  return listele(await getDocs(q));
}
export function bildirimOkundu(id) {
  return updateDoc(doc(db, 'bildirimler', id), { okundu: true });
}
