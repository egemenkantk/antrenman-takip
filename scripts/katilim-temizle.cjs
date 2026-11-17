// Gruba sonradan katılanların, katılım tarihinden önce biten dönem kayıtlarını bulur.
// UYGULA=1 ise ödeme alınmamış olanları iptal eder (fiyatNotu: 'Katılımdan önceki dönem'); ödemelilere dokunmaz.
// Depo herkese açık: ad/telefon yazdırılmaz.
const admin = require('../functions/node_modules/firebase-admin');
const { PROJE } = require('../functions/ortak');
const UYGULA = process.env.UYGULA === '1';

async function main() {
  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  const gs = await db.collection('gruplar').get();
  let bulunan = 0, iptal = 0, odemeli = 0;
  for (const g of gs.docs) {
    const katilim = g.data().uyeKatilim || {};
    for (const [kisiId, tarih] of Object.entries(katilim)) {
      if (!tarih) continue;
      const ps = await db.collection('satilanPaketler').where('kisiId', '==', kisiId).get();
      for (const p of ps.docs) {
        const r = p.data();
        if (r.tur !== 'grup' || r.grupId !== g.id || !r.donemBit || r.donemBit >= tarih || r.durum === 'iptal') continue;
        bulunan++;
        const os = await db.collection('odemeler').where('satilanPaketId', '==', p.id).get();
        const odenen = os.docs.filter((o) => !o.data().silindi).reduce((t, o) => t + (Number(o.data().tutar) || 0), 0);
        console.log(JSON.stringify({ kayit: p.id, donemBas: r.donemBas, katilim: tarih, odenen }));
        if (odenen > 0) { odemeli++; continue; }
        if (UYGULA) {
          await p.ref.update({ durum: 'iptal', fiyatNotu: 'Katılımdan önceki dönem', guncelleyen: 'temizlik', guncelleme: admin.firestore.FieldValue.serverTimestamp() });
          iptal++;
        }
      }
    }
  }
  console.log(`Bulunan ${bulunan} · iptal edilen ${iptal} · ödemesi olduğu için dokunulmayan ${odemeli} · ${UYGULA ? 'UYGULANDI' : 'yalnızca kontrol'}`);
}
main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
