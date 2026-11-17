// Tek bir ödemeyi "silindi" işaretler (iz kalır). ODEME_ID ve NEDEN ortam değişkenleri.
const admin = require('../functions/node_modules/firebase-admin');
const { PROJE } = require('../functions/ortak');
async function main() {
  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  const ref = db.collection('odemeler').doc(String(process.env.ODEME_ID));
  const s = await ref.get();
  if (!s.exists) throw new Error('Ödeme bulunamadı');
  await ref.update({ silindi: true, silen: 'bakim', silinme: admin.firestore.FieldValue.serverTimestamp(), silmeNedeni: String(process.env.NEDEN || '') });
  console.log('silindi işaretlendi:', s.id, s.data().tutar);
}
main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
