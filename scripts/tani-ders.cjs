// Tanı: bir aydaki antrenman kayıtları — tür, katılım, paket durumu, kaydeden (son 2 hane). Ad yazdırılmaz.
const admin = require('../functions/node_modules/firebase-admin');
const { PROJE } = require('../functions/ortak');
async function main() {
  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  const ay = process.env.AY;
  const ks = await db.collection('kisiler').get();
  const sp = await db.collection('satilanPaketler').get();
  const paket = {};
  for (const d of sp.docs) (paket[d.data().kisiId] ||= []).push(d.data().tur + (d.data().durum === 'iptal' ? '(iptal)' : '') + '@' + (d.data().baslangic || d.data().donemBas || ''));
  const say = {};
  for (const k of ks.docs) {
    const ar = await k.ref.collection('antrenmanKayitlari').where('tarih', '>=', ay + '-01').where('tarih', '<=', ay + '-31').get();
    for (const d of ar.docs) {
      const r = d.data();
      const tur = String(d.id).startsWith('sk_') ? 'aktarim' : r.dersTuru ? r.dersTuru : d.id.includes('_') ? 'grup' : 'bireysel';
      const anahtar = `${tur} · ${r.katilim} · kaydeden ${String(r.kaydeden || '').slice(-2)} · veren ${String(r.dersiVeren || '').slice(-2)}`;
      say[anahtar] = (say[anahtar] || 0) + 1;
      if (tur === 'bireysel' || tur === 'duet' || tur === 'trio') console.log('ders', k.id, d.id, r.katilim, 'paketler:', (paket[k.id] || []).join(',') || 'YOK', 'tip:', k.data().tip);
    }
  }
  console.log('\nÖZET');
  for (const [a, n] of Object.entries(say).sort()) console.log(n, a);
}
main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
