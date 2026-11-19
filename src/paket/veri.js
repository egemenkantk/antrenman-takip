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
import { sonDersKontrol } from '../auth/hesap';
import { grupKayitKimligi, orantiliUcret, abonelikDonemi, abonelikDonemBul, abonelikKayitKimligi, donemBul, donemNo } from './model.js';
import { bugun } from '../program/model';

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
export async function paketTanimKaydet(eski, veri, yapan) {
  if (eski?.id) {
    await updateDoc(doc(db, 'paketTanimlari', eski.id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
    // Düet/trio eksik katılım ücreti: bu tanımla satılmış, henüz ücreti olmayan açık paketlere de yaz
    if (veri.eksikUcretleri && Object.keys(veri.eksikUcretleri).length) {
      const l = listele(await getDocs(query(collection(db, 'satilanPaketler'), where('paketTanimId', '==', eski.id))));
      for (const p of l) {
        if (p.durum === 'iptal' || (p.eksikUcretleri && Object.keys(p.eksikUcretleri).length)) continue;
        await updateDoc(doc(db, 'satilanPaketler', p.id), { eksikUcretleri: veri.eksikUcretleri });
      }
    }
    return;
  }
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

export async function paketAta({ kisi, tanim, baslangic, uygulananFiyat, fiyatNotu, oncekiDers = 0, bitisTarihi = null }, yapan) {
  const fiyat = Number(uygulananFiyat ?? tanim.fiyat) || 0;
  if (fiyat !== (Number(tanim.fiyat) || 0)) await gecmiseYaz(yapan, 'liste-disi-fiyat', { kisiId: kisi.id, paket: tanim.ad, liste: Number(tanim.fiyat) || 0, fiyat });
  const ref = await addDoc(collection(db, 'satilanPaketler'), {
    ...(oncekiDers > 0 || bitisTarihi ? { oncekiDers: Number(oncekiDers) || 0, aktarim: true, aktarimTarihi: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) } : {}),
    ...(bitisTarihi ? { bitisTarihi } : {}),
    ...(tanim.eksikUcretleri && Object.keys(tanim.eksikUcretleri).length ? { eksikUcretleri: tanim.eksikUcretleri } : {}),
    kisiId: kisi.id,
    tur: tanim.tur || 'bireysel',
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
  return ref.id;
}
export async function paketGuncelle(p, veri, yapan) {
  await updateDoc(doc(db, 'satilanPaketler', p.id), { ...veri, guncelleyen: yapan, guncelleme: serverTimestamp() });
  if ('uygulananFiyat' in veri && Number(veri.uygulananFiyat) !== Number(p.uygulananFiyat)) {
    await gecmiseYaz(yapan, 'fiyat-degisti', { paketId: p.id, kisiId: p.kisiId, eski: p.uygulananFiyat, yeni: veri.uygulananFiyat });
  }
}

// ---------- Aylık abonelik ----------
// Ana kayıt (tur "abonelik"): başlangıç, aylık ücret, ders hakkı, taahhüt bilgisi. Ödemeler dönem kayıtlarına girer.
export async function abonelikAta({ kisi, tanim, baslangic, aylikUcret, fiyatNotu }, yapan) {
  const ucret = Number(aylikUcret ?? tanim.fiyat) || 0;
  if (ucret !== (Number(tanim.fiyat) || 0)) await gecmiseYaz(yapan, 'liste-disi-fiyat', { kisiId: kisi.id, paket: tanim.ad, liste: Number(tanim.fiyat) || 0, fiyat: ucret });
  const ref = await addDoc(collection(db, 'satilanPaketler'), {
    kisiId: kisi.id,
    tur: 'abonelik',
    paketTanimId: tanim.id,
    paketAdi: tanim.ad,
    subeId: tanim.subeId || '',
    baslangic,
    aylikDers: Number(tanim.dersSayisi) || 12,
    haftalikDers: Number(tanim.haftalikDers) || 3,
    taahhutAy: Number(tanim.taahhutAy) || 0,
    aylikListe: Number(tanim.fiyat) || 0,
    aylikUcret: ucret,
    listeFiyati: 0,
    uygulananFiyat: 0,
    fiyatNotu: fiyatNotu || '',
    durum: 'aktif',
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  });
  const ana = { id: ref.id, kisiId: kisi.id, paketAdi: tanim.ad, subeId: tanim.subeId || '', baslangic, aylikDers: Number(tanim.dersSayisi) || 12, aylikListe: Number(tanim.fiyat) || 0, aylikUcret: ucret, fiyatNotu: fiyatNotu || '' };
  await abonelikDonemleriniAc(ana, yapan);
}
// Başlangıçtan bugüne kadar açılmamış dönem kayıtlarını açar (her sabah sunucu da açar)
export async function abonelikDonemleriniAc(ana, yapan, mevcut = []) {
  const simdi = abonelikDonemBul(ana.baslangic, bugun());
  if (!simdi) return;
  for (let no = Math.max(0, simdi.no - 11); no <= simdi.no; no++) {
    const d = abonelikDonemi(ana.baslangic, no);
    if (ana.bitis && d.bas > ana.bitis) break;
    const id = abonelikKayitKimligi(ana.id, d.bas);
    if (mevcut.some((m) => m.id === id)) continue;
    await setDoc(doc(db, 'satilanPaketler', id), {
      kisiId: ana.kisiId,
      tur: 'abonelikDonem',
      aboneId: ana.id,
      paketAdi: ana.paketAdi,
      subeId: ana.subeId || '',
      donemBas: d.bas,
      donemBit: d.bit,
      baslangic: d.bas,
      dersHakki: ana.aylikDers,
      listeFiyati: ana.aylikUcret,
      uygulananFiyat: ana.aylikUcret,
      fiyatNotu: ana.aylikUcret !== ana.aylikListe ? ana.fiyatNotu || 'Kişiye özel aylık ücret' : '',
      durum: 'aktif',
      kurumId: KURUM_ID,
      olusturan: yapan,
      olusturma: serverTimestamp(),
    });
  }
}

// Ek ücret: düet/trioda eksik katılım farkı gibi tek seferlik tutarlar (yalnızca yönetici).
// Bir yoklama kaydına bağlıysa kimliği sabittir; aynı ders için iki kez eklenmez.
export function ekUcretEkle({ kisiId, tarih, tutar, aciklama, ilgiliKayitId }, yapan) {
  const veri = {
    kisiId,
    tur: 'ek',
    paketAdi: aciklama || 'Ek ücret',
    listeFiyati: Number(tutar) || 0,
    uygulananFiyat: Number(tutar) || 0,
    fiyatNotu: '',
    baslangic: tarih,
    ilgiliKayitId: ilgiliKayitId || null,
    durum: 'aktif',
    kurumId: KURUM_ID,
    olusturan: yapan,
    olusturma: serverTimestamp(),
  };
  if (ilgiliKayitId) return setDoc(doc(db, 'satilanPaketler', `ek_${kisiId}_${ilgiliKayitId}`), veri);
  return addDoc(collection(db, 'satilanPaketler'), veri);
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

// Gruba sonradan katılanın katılım tarihini değiştirir (yalnızca yönetici).
// Katılımdan önce biten dönem kayıtları (ödeme alınmamışsa) iptal edilir; katıldığı dönemin ücreti
// kalan haftalara göre, sonraki dönemlerinki tam ücretle yeniden hesaplanır. Ödeme alınmış kayıtlara dokunulmaz.
export const KATILIM_ONCESI = 'Katılımdan önceki dönem';
export async function katilimGuncelle(grup, kisiId, tarih, tanim, odemeler, yapan) {
  await updateDoc(doc(db, 'gruplar', grup.id), { [`uyeKatilim.${kisiId}`]: tarih || deleteField() });
  const sonuc = { iptal: 0, guncel: 0, odemeli: 0 };
  if (!grup.donemBaslangic || !tanim) return sonuc;
  const simdi = donemBul(grup.donemBaslangic, bugun(), grup.donemAralari)?.no ?? 0;
  const odenen = (id) => odemeler.filter((o) => !o.silindi && o.satilanPaketId === id).reduce((t, o) => t + (Number(o.tutar) || 0), 0);
  const ozel = grup.ozelFiyatlar?.[kisiId];
  const liste = Number(tanim.fiyat) || 0;
  const tam = ozel ? Number(ozel.fiyat) || 0 : liste;
  for (let n = 0; n <= simdi + 1; n++) {
    const d = donemNo(grup.donemBaslangic, n, grup.donemAralari);
    const s = await getDoc(doc(db, 'satilanPaketler', grupKayitKimligi(grup.id, d.bas, kisiId)));
    if (!s.exists()) continue;
    const r = { id: s.id, ...s.data() };
    if (odenen(r.id) > 0) {
      if (tarih && d.bit < tarih) sonuc.odemeli++;
      continue;
    }
    if (tarih && d.bit < tarih) {
      if (r.durum !== 'iptal') {
        await paketGuncelle(r, { durum: 'iptal', fiyatNotu: KATILIM_ONCESI }, yapan);
        sonuc.iptal++;
      }
      continue;
    }
    // Elle "dahil değil" yapılmış dönem olduğu gibi kalır
    if (r.durum === 'iptal' && r.fiyatNotu !== KATILIM_ONCESI) continue;
    const ortada = tarih && tarih > d.bas && tarih <= d.bit;
    const notlar = [ozel ? `Kişiye özel ücret${ozel.not ? ` (${ozel.not})` : ''}` : '', ortada ? 'Dönem ortası katılım (orantılı)' : ''].filter(Boolean);
    await paketGuncelle(
      r,
      {
        durum: 'aktif',
        uygulananFiyat: ortada ? orantiliUcret(tam, d.bas, tarih) : tam,
        listeFiyati: ortada ? orantiliUcret(liste, d.bas, tarih) : liste,
        fiyatNotu: notlar.join(' · '),
      },
      yapan
    );
    sonuc.guncel++;
  }
  await gecmiseYaz(yapan, 'grup-katilim', { grupId: grup.id, kisiId, tarih });
  return sonuc;
}

// Bir dönemi kişi için "dahil değil" yap / geri al (yalnızca yönetici). Ödeme alınmış kayıt değiştirilmez.
export const DONEM_HARIC = 'Bu döneme dahil değil';
export async function donemDahilAyarla(grup, donem, tanim, kisiId, kayit, dahil, yapan) {
  if (!kayit) {
    await grupKaydiOlustur(grup, donem, tanim, kisiId, yapan);
    const s = await getDoc(doc(db, 'satilanPaketler', grupKayitKimligi(grup.id, donem.bas, kisiId)));
    kayit = { id: s.id, ...s.data() };
  }
  if (dahil) {
    const ozel = grup.ozelFiyatlar?.[kisiId];
    const katilim = grup.uyeKatilim?.[kisiId];
    const ortada = katilim && katilim > donem.bas && katilim <= donem.bit;
    const notlar = [ozel ? `Kişiye özel ücret${ozel.not ? ` (${ozel.not})` : ''}` : '', ortada ? 'Dönem ortası katılım (orantılı)' : ''].filter(Boolean);
    await paketGuncelle(kayit, { durum: 'aktif', fiyatNotu: notlar.join(' · ') }, yapan);
  } else {
    await paketGuncelle(kayit, { durum: 'iptal', fiyatNotu: DONEM_HARIC }, yapan);
  }
}

// ---------- Ödemeler ----------
// Ödeme anındaki dersi veren koçlar (grup → grubun koçları, diğerleri → kişinin koçları).
// Koç sonradan değişse de o ayın tahsilat dökümü bozulmasın diye ödemeye yazılır.
async function dersKoclari(kisiId, satilanPaketId) {
  try {
    const p = (await getDoc(doc(db, 'satilanPaketler', satilanPaketId))).data();
    if (p?.tur === 'grup' && p.grupId) {
      const g = await getDoc(doc(db, 'gruplar', p.grupId));
      if (g.exists()) return g.data().kocIds || [];
    }
    const k = await getDoc(doc(db, 'kisiler', kisiId));
    return k.exists() ? k.data().kocIds || [] : [];
  } catch {
    return null; // okunamazsa tahsilat ekranı güncel atamaya bakar
  }
}

export async function odemeEkle({ kisiId, satilanPaketId, tutar, tarih, yontem, not, ekAlanlar = {} }, yapan) {
  const kocIds = await dersKoclari(kisiId, satilanPaketId);
  return addDoc(collection(db, 'odemeler'), {
    ...(kocIds?.length ? { dersKocIds: kocIds } : {}),
    ...ekAlanlar,
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
export async function dersDusmeKarari(kisiId, kayitId, dussun) {
  await updateDoc(doc(db, 'kisiler', kisiId, 'antrenmanKayitlari', kayitId), { derstenDussun: dussun });
  sonDersKontrol(kisiId);
}
// Eksik katılımlı düet/trio dersi için "fark ücreti gerek yok" kararı
export function farkKarari(kisiId, kayitId) {
  return updateDoc(doc(db, 'kisiler', kisiId, 'antrenmanKayitlari', kayitId), { farkGerekYok: true });
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
