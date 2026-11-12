// Sunucu fonksiyonları — SMS'siz telefon + şifre girişi ve kullanıcı yönetimi
//
// Kimlik: her kullanıcının Firebase hesabında "telefon" etiketi (custom claim) vardır.
// Hesabın e-postası: kişi e-posta verdiyse gerçek adresi, vermediyse iç adres.
// Giriş: telefon + şifre sunucuda doğrulanır, tarayıcıya tek kullanımlık giriş anahtarı döner.
// Şifremi unuttum: e-postası olan kendisi sıfırlar; olmayan yöneticiden geçici şifre alır.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const {
  API_KEY,
  PROJE,
  KURUM_ID,
  telefonuDuzenle,
  icAdres,
  epostaGecerli,
  geciciSifreUret,
  maskele,
  sifirlamaEpostasiGonder,
} = require('./ortak');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({
  region: 'europe-west3',
  maxInstances: 5,
  // Giriş anahtarı üretebilmek için Firebase'in kendi yönetici hesabıyla çalışır
  serviceAccount: `firebase-adminsdk-fbsvc@${PROJE}.iam.gserviceaccount.com`,
});

const ROLLER = ['yonetici', 'koc', 'ogrenci', 'veli'];

async function kayitGetir(telefon) {
  const s = await db.collection('kullanicilar').doc(telefon).get();
  return s.exists ? s.data() : null;
}

async function cagiranKayit(request) {
  const telefon = request.auth?.token?.telefon;
  if (!telefon) throw new HttpsError('unauthenticated', 'Giriş yapılmamış.');
  const kayit = await kayitGetir(telefon);
  if (!kayit || kayit.aktif === false) throw new HttpsError('permission-denied', 'Hesap etkin değil.');
  return { telefon, kayit };
}

async function yoneticiMi(request) {
  const c = await cagiranKayit(request);
  if (c.kayit.rol !== 'yonetici') throw new HttpsError('permission-denied', 'Bu işlem için yönetici olmalısınız.');
  return c;
}

async function islemKaydet(yapan, islem, detay) {
  await db.collection('islemGecmisi').add({
    yapan,
    islem,
    detay,
    kurumId: KURUM_ID,
    tarih: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ---------- Giriş ----------
exports.girisYap = onCall(async (request) => {
  const telefon = telefonuDuzenle(request.data?.telefon);
  const sifre = String(request.data?.sifre || '');
  const gecersiz = new HttpsError('invalid-argument', 'Telefon numarası veya şifre hatalı.');
  if (!telefon || !sifre) throw gecersiz;

  const iz = '…' + telefon.slice(-2); // kayıtlarda numaranın yalnızca son 2 hanesi
  const kayit = await kayitGetir(telefon);
  if (!kayit || kayit.aktif === false || !kayit.uid) {
    console.warn('girisYap reddedildi', { iz, sebep: !kayit ? 'kayit-yok' : !kayit.uid ? 'uid-yok' : 'pasif' });
    throw gecersiz;
  }

  const kullanici = await admin.auth().getUser(kayit.uid).catch(() => null);
  if (!kullanici || kullanici.disabled) {
    console.warn('girisYap reddedildi', { iz, sebep: !kullanici ? 'hesap-yok' : 'hesap-kapali' });
    throw gecersiz;
  }

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: kullanici.email, password: sifre, returnSecureToken: false }),
    }
  );
  if (!r.ok) {
    const hata = (await r.json().catch(() => ({})))?.error?.message || '';
    console.warn('girisYap reddedildi', { iz, sebep: 'sifre-kontrolu', durum: r.status, hata });
    if (hata.startsWith('TOO_MANY_ATTEMPTS')) {
      throw new HttpsError('resource-exhausted', 'Çok fazla hatalı deneme. Biraz sonra tekrar deneyin.');
    }
    throw gecersiz;
  }
  const token = await admin.auth().createCustomToken(kayit.uid, { telefon });
  return { token };
});

// ---------- Şifremi unuttum ----------
exports.sifreSifirla = onCall(async (request) => {
  const telefon = telefonuDuzenle(request.data?.telefon);
  if (!telefon) throw new HttpsError('invalid-argument', 'Telefon numarası geçersiz.');
  const kayit = await kayitGetir(telefon);
  if (!kayit || kayit.aktif === false || !kayit.uid) return { durum: 'yonetici' };
  if (!kayit.eposta) return { durum: 'yonetici' };
  try {
    await sifirlamaEpostasiGonder(kayit.eposta);
  } catch (e) {
    console.error(e);
    throw new HttpsError('internal', 'E-posta gönderilemedi.');
  }
  return { durum: 'eposta', adres: maskele(kayit.eposta) };
});

// ---------- Kendi hesabım ----------
exports.sifremiDegistir = onCall(async (request) => {
  const { telefon, kayit } = await cagiranKayit(request);
  const yeni = String(request.data?.yeniSifre || '');
  if (yeni.length < 6) throw new HttpsError('invalid-argument', 'Şifre en az 6 karakter olmalı.');
  await admin.auth().updateUser(kayit.uid, { password: yeni });
  await db.collection('kullanicilar').doc(telefon).update({ sifreDegismeli: false });
  return { tamam: true };
});

exports.epostaGuncelle = onCall(async (request) => {
  const { telefon, kayit } = await cagiranKayit(request);
  const ham = String(request.data?.eposta || '').trim().toLowerCase();
  if (ham && !epostaGecerli(ham)) throw new HttpsError('invalid-argument', 'E-posta adresi geçersiz.');
  try {
    await admin.auth().updateUser(kayit.uid, { email: ham || icAdres(telefon) });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu e-posta başka bir hesapta kullanılıyor.');
    }
    throw e;
  }
  await db.collection('kullanicilar').doc(telefon).update({ eposta: ham || null });
  return { tamam: true };
});

// ---------- Yönetici: kullanıcı ekleme ve geçici şifre ----------
exports.kullaniciOlustur = onCall(async (request) => {
  const { telefon: yapan } = await yoneticiMi(request);
  const d = request.data || {};
  const telefon = telefonuDuzenle(d.telefon);
  const ad = String(d.ad || '').trim();
  const rol = d.rol;
  const eposta = String(d.eposta || '').trim().toLowerCase();
  if (!telefon) throw new HttpsError('invalid-argument', 'Telefon numarası geçersiz.');
  if (!ad) throw new HttpsError('invalid-argument', 'Ad gerekli.');
  if (!ROLLER.includes(rol)) throw new HttpsError('invalid-argument', 'Rol geçersiz.');
  if (eposta && !epostaGecerli(eposta)) throw new HttpsError('invalid-argument', 'E-posta adresi geçersiz.');
  if (await kayitGetir(telefon)) throw new HttpsError('already-exists', 'Bu numara zaten kayıtlı.');

  const geciciSifre = geciciSifreUret();
  let kullanici;
  try {
    kullanici = await admin.auth().createUser({
      email: eposta || icAdres(telefon),
      password: geciciSifre,
      displayName: ad,
    });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu e-posta başka bir hesapta kullanılıyor.');
    }
    throw e;
  }
  await admin.auth().setCustomUserClaims(kullanici.uid, { telefon });
  await db.collection('kullanicilar').doc(telefon).set({
    ad,
    rol,
    aktif: true,
    kurumId: KURUM_ID,
    uid: kullanici.uid,
    eposta: eposta || null,
    sifreDegismeli: true,
    ekYetkiler: [],
    bagliKisiler: Array.isArray(d.bagliKisiler) ? d.bagliKisiler : [],
    olusturan: yapan,
    olusturma: admin.firestore.FieldValue.serverTimestamp(),
  });
  await islemKaydet(yapan, 'kullaniciOlustur', { telefon, rol });
  return { geciciSifre };
});

exports.geciciSifreVer = onCall(async (request) => {
  const { telefon: yapan } = await yoneticiMi(request);
  const telefon = telefonuDuzenle(request.data?.telefon);
  const kayit = telefon && (await kayitGetir(telefon));
  if (!kayit || !kayit.uid) throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
  const geciciSifre = geciciSifreUret();
  await admin.auth().updateUser(kayit.uid, { password: geciciSifre });
  await admin.auth().revokeRefreshTokens(kayit.uid);
  await db.collection('kullanicilar').doc(telefon).update({ sifreDegismeli: true });
  await islemKaydet(yapan, 'geciciSifreVer', { telefon });
  return { geciciSifre };
});

// Pasife al / tekrar aktif et: kayıtlar kalır, pasif kullanıcı giriş yapamaz
exports.kullaniciDurum = onCall(async (request) => {
  const { telefon: yapan } = await yoneticiMi(request);
  const telefon = telefonuDuzenle(request.data?.telefon);
  const aktif = request.data?.aktif === true;
  if (telefon === yapan) throw new HttpsError('failed-precondition', 'Kendi hesabını pasife alamazsın.');
  const kayit = telefon && (await kayitGetir(telefon));
  if (!kayit) throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
  if (kayit.uid) {
    await admin.auth().updateUser(kayit.uid, { disabled: !aktif }).catch(() => null);
    if (!aktif) await admin.auth().revokeRefreshTokens(kayit.uid).catch(() => null);
  }
  await db.collection('kullanicilar').doc(telefon).update({ aktif });
  await islemKaydet(yapan, aktif ? 'kullaniciAktif' : 'kullaniciPasif', { telefon });
  return { tamam: true };
});

// Tamamen sil: yalnızca yanlış/test amaçlı eklenen hesaplar için
exports.kullaniciSil = onCall(async (request) => {
  const { telefon: yapan } = await yoneticiMi(request);
  const telefon = telefonuDuzenle(request.data?.telefon);
  if (telefon === yapan) throw new HttpsError('failed-precondition', 'Kendi hesabını silemezsin.');
  const kayit = telefon && (await kayitGetir(telefon));
  if (!kayit) throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
  if (kayit.uid) {
    await admin.auth().deleteUser(kayit.uid).catch((e) => {
      if (e.code !== 'auth/user-not-found') throw e;
    });
  }
  await db.collection('kullanicilar').doc(telefon).delete();
  await islemKaydet(yapan, 'kullaniciSil', { telefon, rol: kayit.rol });
  return { tamam: true };
});

// ---------- Grup dönemleri: her sabah 08:00 (İstanbul) ----------
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { donemKontrolu } = require('./donem');

exports.donemKontrol = onSchedule({ schedule: '0 8 * * *', timeZone: 'Europe/Istanbul' }, async () => {
  const r = await donemKontrolu(db, admin, KURUM_ID);
  console.log('Dönem kontrolü', JSON.stringify(r));
});

// Yönetici "şimdi çalıştır" der (ör. ilk kurulumda ya da test için)
exports.donemKontrolCalistir = onCall(async (request) => {
  await yoneticiMi(request);
  return donemKontrolu(db, admin, KURUM_ID);
});

// ---------- Bireysel paket: son ders bildirimi (yoklama girilince) ----------
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { sonDersKontrolu } = require('./donem');

exports.sonDersBildirimi = onDocumentWritten('kisiler/{kisiId}/antrenmanKayitlari/{kayitId}', async (event) => {
  if (String(event.params.kayitId).includes('_')) return; // grup dersi kayıtları paketten düşmez
  await sonDersKontrolu(db, admin, KURUM_ID, event.params.kisiId);
});
