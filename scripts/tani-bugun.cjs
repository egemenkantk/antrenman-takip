// Tanı: aynı adla birden fazla kişi kaydı ve Bugün ekranında iki kez çıkan kişiler.
// Depo herkese açık olduğu için ad/telefon YAZDIRILMAZ; yalnızca belge kimlikleri ve sayılar.
const admin = require('../functions/node_modules/firebase-admin');
const { PROJE } = require('../functions/ortak');

const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
const bugun = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const hg = new Date(bugun + 'T12:00:00Z').getUTCDay();

async function main() {
  admin.initializeApp({ projectId: PROJE });
  const db = admin.firestore();
  const [ks, gs, ds, us] = await Promise.all([
    db.collection('kisiler').get(),
    db.collection('gruplar').get(),
    db.collection('dersDegisiklik').get(),
    db.collection('kullanicilar').get(),
  ]);
  const kisiler = ks.docs.map((d) => ({ id: d.id, ...d.data() }));
  const gruplar = gs.docs.map((d) => ({ id: d.id, ...d.data() }));
  const kullanicilar = us.docs.map((d) => d.data());

  console.log(`Bugün: ${bugun} (gün ${hg}) · ${kisiler.length} kişi · ${gruplar.length} grup`);
  console.log('\n== Aynı adlı kişi kayıtları ==');
  const ada = {};
  for (const k of kisiler) (ada[norm(k.ad)] ||= []).push(k);
  let n = 0;
  for (const l of Object.values(ada).filter((l) => l.length > 1)) {
    n++;
    console.log(`-- küme ${n}`);
    for (const k of l) {
      const [ts, ak] = await Promise.all([
        db.collection('kisiler').doc(k.id).collection('testSonuclari').count().get(),
        db.collection('kisiler').doc(k.id).collection('antrenmanKayitlari').count().get(),
      ]);
      const gr = gruplar.filter((g) => (g.uyeIds || []).includes(k.id));
      console.log(
        JSON.stringify({
          id: k.id,
          aktif: k.aktif !== false,
          tip: k.tip,
          olusturma: k.olusturma?.toDate?.().toISOString?.() || null,
          eskiId: k.eskiId ? 'var' : 'yok',
          gruplar: gr.map((g) => g.id + (g.aktif === false ? '(pasif)' : '')),
          haftalikGunler: Object.keys(k.haftalikSaatler || {}),
          testSonucu: ts.data().count,
          antrenmanKaydi: ak.data().count,
          bagliHesap: kullanicilar.filter((u) => (u.bagliKisiler || []).includes(k.id)).length,
          paketKoc: (k.kocIds || []).length,
        })
      );
    }
  }
  if (!n) console.log('yok');

  console.log('\n== Bugün birden fazla kartta görünen kişiler ==');
  const kaynak = {};
  const ekle = (id, s) => (kaynak[id] ||= []).push(s);
  for (const g of gruplar) {
    if (g.aktif === false || g.saatler?.[hg] == null) continue;
    const uyeler = g.uyeIds || [];
    if (new Set(uyeler).size !== uyeler.length) console.log(`! grup ${g.id}: uyeIds içinde tekrar var`);
    for (const id of uyeler) ekle(id, `grup:${g.id}`);
  }
  for (const k of kisiler) if (k.aktif !== false && k.haftalikSaatler?.[hg] != null) ekle(k.id, 'bireysel');
  for (const d of ds.docs.map((x) => x.data())) {
    if (d.tarih === bugun || d.yeniTarih === bugun) console.log(`değişiklik: sahip ${d.sahipTip}:${d.sahipId} ${d.islem} ${d.tarih}->${d.yeniTarih || ''} ${d.yeniSaat || ''}`);
    if (d.islem === 'tasi' && d.yeniTarih === bugun && d.tarih !== bugun && d.sahipTip === 'kisi') ekle(d.sahipId, 'gelen');
  }
  const cift = Object.entries(kaynak).filter(([, l]) => l.length > 1);
  for (const [id, l] of cift) console.log(JSON.stringify({ id, kartlar: l }));
  if (!cift.length) console.log('yok');
}
main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
