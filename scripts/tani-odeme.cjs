// Tanı: verilen kişi kimlikleri için paket ve ödemeler (ad yazdırılmaz; depo herkese açık)
const admin = require('../functions/node_modules/firebase-admin');
const { PROJE } = require('../functions/ortak');
async function main() {
  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  for (const id of String(process.env.KISILER || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [ps, os, ks] = await Promise.all([
      db.collection('satilanPaketler').where('kisiId', '==', id).get(),
      db.collection('odemeler').where('kisiId', '==', id).get(),
      db.collection('kisiler').doc(id).get(),
    ]);
    console.log(`\n== kişi ${id} · aktif: ${ks.exists ? ks.data().aktif !== false : 'yok'}`);
    for (const d of ps.docs) {
      const p = d.data();
      console.log('paket', JSON.stringify({ id: d.id, tur: p.tur, paketAdi: p.paketAdi || p.grupAdi, baslangic: p.baslangic, donemBas: p.donemBas, fiyat: p.uygulananFiyat, durum: p.durum, olusturan: String(p.olusturan || '').slice(-2), olusturma: p.olusturma?.toDate?.().toISOString() }));
    }
    for (const d of os.docs) {
      const o = d.data();
      console.log('odeme', JSON.stringify({ id: d.id, paket: o.satilanPaketId, tutar: o.tutar, tarih: o.tarih, yontem: o.yontem, silindi: !!o.silindi, alan: String(o.tahsilEdenKocId || '').slice(-2), kayit: o.kayit?.toDate?.().toISOString(), not: o.not || '', aktarim: o.aktarimId || o.aktarim || null }));
    }
  }
}
main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
