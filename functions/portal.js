// Öğrenci/veli portalı için kişiye özel özet.
// Liste fiyatı, diğer çocuklar ve koç notları bu özete girmez; öğrenci/veli bu koleksiyonları doğrudan okuyamaz.

const { kalanDersleriHesapla } = require('./donem');

const bugunIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const gunEkle = (s, n) => {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function portalVerisi(db, kisiId) {
  const bugun = bugunIst();
  const [ks, gs, ps, os, es, ss, kayitlar] = await Promise.all([
    db.collection('kisiler').doc(kisiId).get(),
    db.collection('gruplar').where('uyeIds', 'array-contains', kisiId).get(),
    db.collection('satilanPaketler').where('kisiId', '==', kisiId).get(),
    db.collection('odemeler').where('kisiId', '==', kisiId).get(),
    db.collection('etkinlikler').where('tarih', '>=', bugun).where('tarih', '<=', gunEkle(bugun, 60)).get(),
    db.collection('subeler').get(),
    db.collection('kisiler').doc(kisiId).collection('antrenmanKayitlari').get(),
  ]);
  if (!ks.exists) return null;
  const k = ks.data();
  const subeAdi = Object.fromEntries(ss.docs.map((d) => [d.id, d.data().ad]));
  const gruplar = gs.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((g) => g.aktif !== false)
    .map((g) => ({ id: g.id, ad: g.ad || '', saatler: g.saatler || {}, sure: g.sure || 60, sube: subeAdi[g.subeId] || '' }));
  const grupIds = gruplar.map((g) => g.id);

  const odemeler = os.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => !o.silindi);
  const paketler = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
  const dersler = Object.fromEntries(
    kalanDersleriHesapla(paketler, kayitlar.docs.map((d) => ({ id: d.id, ...d.data() }))).map((x) => [x.p.id, x])
  );
  const paketOzet = paketler
    .filter((p) => p.durum !== 'iptal')
    .map((p) => {
      const odenen = odemeler.filter((o) => o.satilanPaketId === p.id).reduce((t, o) => t + (Number(o.tutar) || 0), 0);
      const fiyat = Number(p.uygulananFiyat) || 0; // yalnızca kişinin kendi fiyatı
      const d = dersler[p.id];
      return {
        id: p.id,
        tur: p.tur,
        ad: p.tur === 'grup' ? p.grupAdi || p.paketAdi || '' : p.paketAdi || '',
        tarih: p.tur === 'ek' ? p.baslangic || '' : null,
        baslangic: p.baslangic || '',
        donemBas: p.donemBas || null,
        donemBit: p.donemBit || null,
        fiyat,
        odenen,
        kalan: Math.max(0, fiyat - odenen),
        dersSayisi: d ? Number(p.dersSayisi) || 0 : null,
        kullanilan: d ? d.kullanilan : null,
        kalanDers: d ? d.kalan : null,
      };
    })
    .sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || ''));

  const etkinlikler = es.docs
    .map((d) => d.data())
    .filter(
      (e) =>
        e.kapsam === 'herkes' || (e.kisiIds || []).includes(kisiId) || (e.grupIds || []).some((g) => grupIds.includes(g))
    )
    .map((e) => ({ tarih: e.tarih, saat: e.saat || '', tur: e.tur || 'diger', ad: e.ad || '', yer: e.yer || '' }))
    .sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));

  return {
    kisi: { id: kisiId, ad: k.ad || '', tip: k.tip || '', brans: k.brans || '', foto: k.foto || '', haftalikSaatler: k.haftalikSaatler || {} },
    gruplar,
    paketler: paketOzet,
    odemeler: odemeler
      .map((o) => ({ tarih: o.tarih, tutar: Number(o.tutar) || 0, yontem: o.yontem || '', satilanPaketId: o.satilanPaketId }))
      .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '')),
    etkinlikler,
  };
}

module.exports = { portalVerisi };
