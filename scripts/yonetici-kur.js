// Tek seferlik: ilk yönetici hesabını oluşturur.
// GitHub Actions'taki "Yönetici hesabı kur" akışından çalışır; şifre üretmez,
// verilen e-postaya Firebase'in "şifreni belirle" e-postasını gönderir.
//
// Kullanım: TELEFON=... AD=... EPOSTA=... node scripts/yonetici-kur.js

const admin = require('../functions/node_modules/firebase-admin');
const {
  PROJE,
  KURUM_ID,
  telefonuDuzenle,
  epostaGecerli,
  sifirlamaEpostasiGonder,
  maskele,
} = require('../functions/ortak');

async function main() {
  const telefon = telefonuDuzenle(process.env.TELEFON);
  const ad = String(process.env.AD || '').trim();
  const eposta = String(process.env.EPOSTA || '').trim().toLowerCase();
  if (!telefon) throw new Error('Telefon numarası geçersiz.');
  if (!ad) throw new Error('Ad gerekli.');
  if (!epostaGecerli(eposta)) throw new Error('E-posta geçersiz.');

  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  const ref = db.collection('kullanicilar').doc(telefon);
  const mevcut = await ref.get();

  let uid = mevcut.exists ? mevcut.data().uid : null;
  if (!uid) {
    const varOlan = await admin.auth().getUserByEmail(eposta).catch(() => null);
    const kullanici =
      varOlan ||
      (await admin.auth().createUser({
        email: eposta,
        password: require('crypto').randomBytes(24).toString('base64'),
        displayName: ad,
      }));
    uid = kullanici.uid;
  }
  await admin.auth().setCustomUserClaims(uid, { telefon });
  await ref.set(
    {
      ad,
      rol: 'yonetici',
      aktif: true,
      kurumId: KURUM_ID,
      uid,
      eposta,
      sifreDegismeli: false,
      ekYetkiler: [],
      bagliKisiler: [],
    },
    { merge: true }
  );
  await sifirlamaEpostasiGonder(eposta);
  console.log(`Yönetici hesabı hazır. Şifre belirleme e-postası gönderildi: ${maskele(eposta)}`);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
