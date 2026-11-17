// Tanı: verilen kişi kimlikleri için paket ve ödemeler (ad yazdırılmaz; depo herkese açık)
const admin = require('../functions/node_modules/firebase-admin');
const { PROJE } = require('../functions/ortak');
async function main() {
  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  // "ozet:<sha256>" verilirse adında bu kelime (küçük harf) geçen kişiler bulunur; ad yazdırılmaz
  let liste = String(process.env.KISILER || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ozetler = liste.filter((x) => x.startsWith('ozet:')).map((x) => x.slice(5));
  if (ozetler.length) {
    const crypto = require('crypto');
    const h = (t) => crypto.createHash('sha256').update(t).digest('hex');
    const ks = await db.collection('kisiler').get();
    liste = liste.filter((x) => !x.startsWith('ozet:'));
    for (const d of ks.docs) {
      const kelimeler = String(d.data().ad || '').toLocaleLowerCase('tr-TR').split(/\s+/);
      if (kelimeler.some((k) => ozetler.includes(h(k)))) liste.push(d.id);
    }
    console.log('eşleşen kişi kaydı: ' + liste.length);
  }
  // "ay:YYYY-MM": o aydaki tüm ödemeler (kişi kimliğiyle, ad yok)
  const aylar = liste.filter((x) => x.startsWith('ay:')).map((x) => x.slice(3));
  liste = liste.filter((x) => !x.startsWith('ay:'));
  for (const ay of aylar) {
    const os = await db.collection('odemeler').where('tarih', '>=', ay + '-01').where('tarih', '<=', ay + '-31').get();
    console.log(`\n== ${ay} ödemeleri: ${os.size}`);
    for (const d of os.docs) {
      const o = d.data();
      const p = (await db.collection('satilanPaketler').doc(o.satilanPaketId || 'x').get()).data() || {};
      const k = (await db.collection('kisiler').doc(o.kisiId || 'x').get());
      const crypto = require('crypto');
      console.log('odeme', JSON.stringify({ id: d.id, kisi: o.kisiId, kisiVar: k.exists, adOzet: k.exists ? crypto.createHash('sha256').update(String(k.data().ad || '')).digest('hex').slice(0, 8) : null, paket: o.satilanPaketId, paketKisi: p.kisiId, tur: p.tur, tutar: o.tutar, tarih: o.tarih, silindi: !!o.silindi, kayit: o.kayit?.toDate?.().toISOString(), not: o.not || '' }));
    }
  }
  for (const id of liste) {
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
