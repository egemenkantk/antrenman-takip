// Grup dönemleri — her sabah çalışan kontrol
// 1) Şu anki dönemin kaydı olmayan grup üyelerine dönem kaydı açar (dönem ortası katılan: orantılı ücret).
// 2) Dönemin son günü: gruptaki öğrenci/veli hesaplarına ödeme hatırlatması, yöneticilere ödedi/ödemedi özeti.
// Aynı gün iki kez çalışsa da belge kimlikleri sabit olduğu için çift kayıt/bildirim oluşmaz.

const DONEM_GUN = 28;

const tarihStr = (d) => d.toISOString().slice(0, 10);
const coz = (s) => new Date(s + 'T00:00:00Z');
const gunEkle = (s, n) => {
  const d = coz(s);
  d.setUTCDate(d.getUTCDate() + n);
  return tarihStr(d);
};
const gunFarki = (a, b) => Math.round((coz(b) - coz(a)) / 86400000);
const istanbulBugun = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const kisa = (s) => coz(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const tl = (n) => (Number(n) || 0).toLocaleString('tr-TR') + ' ₺';

function donemBul(bas, tarih) {
  if (!bas || tarih < bas) return null;
  const no = Math.floor(gunFarki(bas, tarih) / DONEM_GUN);
  const b = gunEkle(bas, no * DONEM_GUN);
  return { no, bas: b, bit: gunEkle(b, DONEM_GUN - 1) };
}
function orantili(ucret, donemBas, katilim) {
  const hafta = Math.min(3, Math.floor(gunFarki(donemBas, katilim) / 7));
  return Math.round((Number(ucret) || 0) * Math.max(1, 4 - hafta) / 4);
}
const kayitId = (grupId, donemBas, kisiId) => `g_${grupId}_${donemBas}_${kisiId}`;

function parcala(a, n) {
  const r = [];
  for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n));
  return r;
}

async function donemKontrolu(db, admin, KURUM_ID, bugun = istanbulBugun()) {
  const zaman = admin.firestore.FieldValue.serverTimestamp();
  const [gs, ts, ys] = await Promise.all([
    db.collection('gruplar').get(),
    db.collection('paketTanimlari').get(),
    db.collection('kullanicilar').where('rol', '==', 'yonetici').get(),
  ]);
  const tanimlar = Object.fromEntries(ts.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  const yoneticiler = ys.docs.filter((d) => d.data().aktif !== false).map((d) => d.id);
  const rapor = { acilan: 0, hatirlatma: 0, ozet: 0 };

  for (const gd of gs.docs) {
    const g = { id: gd.id, ...gd.data() };
    const tanim = tanimlar[g.paketTanimId];
    if (g.aktif === false || !tanim || !g.donemBaslangic) continue;
    const donem = donemBul(g.donemBaslangic, bugun);
    if (!donem) continue;
    const uyeler = g.uyeIds || [];
    if (!uyeler.length) continue;

    // 1) Eksik dönem kayıtları
    const refler = uyeler.map((k) => db.collection('satilanPaketler').doc(kayitId(g.id, donem.bas, k)));
    const mevcut = await db.getAll(...refler);
    const kayitlar = {};
    for (let i = 0; i < uyeler.length; i++) {
      const kisiId = uyeler[i];
      if (mevcut[i].exists) {
        kayitlar[kisiId] = { id: mevcut[i].id, ...mevcut[i].data() };
        continue;
      }
      const katilim = g.uyeKatilim?.[kisiId];
      const ozel = g.ozelFiyatlar?.[kisiId];
      const liste = Number(tanim.fiyat) || 0;
      const tam = ozel ? Number(ozel.fiyat) || 0 : liste;
      const ortada = katilim && katilim > donem.bas && katilim <= donem.bit;
      // Dönem başladıktan sonra eklenen ama katılım tarihi bu dönemden sonra olan kişi için kayıt açılmaz
      if (katilim && katilim > donem.bit) continue;
      const veri = {
        kisiId,
        tur: 'grup',
        grupId: g.id,
        grupAdi: g.ad || '',
        paketTanimId: tanim.id,
        paketAdi: tanim.ad || '',
        subeId: g.subeId || tanim.subeId || '',
        donemBas: donem.bas,
        donemBit: donem.bit,
        baslangic: donem.bas,
        tamUcret: liste,
        listeFiyati: ortada ? orantili(liste, donem.bas, katilim) : liste,
        uygulananFiyat: ortada ? orantili(tam, donem.bas, katilim) : tam,
        fiyatNotu: [ozel ? `Kişiye özel ücret${ozel.not ? ` (${ozel.not})` : ''}` : '', ortada ? 'Dönem ortası katılım (orantılı)' : '']
          .filter(Boolean)
          .join(' · '),
        durum: 'aktif',
        kurumId: KURUM_ID,
        olusturan: 'otomatik',
        olusturma: zaman,
      };
      await refler[i].create(veri).then(() => rapor.acilan++).catch(() => {});
      kayitlar[kisiId] = { id: refler[i].id, ...veri };
    }

    // 2) Dönemin son günü: hatırlatma ve özet
    if (bugun !== donem.bit) continue;
    const sonraki = gunEkle(donem.bit, 1);
    const toplu = db.batch();

    // Gruptaki öğrenci/veli hesapları (aynı veli birden fazla çocuk için tek bildirim alır)
    const alicilar = new Set();
    for (const p of parcala(uyeler, 30)) {
      const s = await db.collection('kullanicilar').where('bagliKisiler', 'array-contains-any', p).get();
      s.docs.forEach((d) => {
        const u = d.data();
        if ((u.rol === 'veli' || u.rol === 'ogrenci') && u.aktif !== false) alicilar.add(d.id);
      });
    }
    for (const tel of alicilar) {
      toplu.set(db.collection('bildirimler').doc(`donem_${g.id}_${donem.bas}_${tel}`), {
        aliciKullaniciId: tel,
        tip: 'grup-donem-odemesi',
        baslik: 'Ödeme hatırlatması',
        metin: `${g.ad}: yeni 4 haftalık dönem ${kisa(sonraki)} tarihinde başlıyor. Dönem ödemesini hatırlatırız.`,
        okundu: false,
        kurumId: KURUM_ID,
        tarih: zaman,
      });
      rapor.hatirlatma++;
    }

    // Yöneticiye özet: bu dönem kim ödedi, kim ödemedi
    const odemeler = [];
    for (const p of parcala(uyeler, 30)) {
      const s = await db.collection('odemeler').where('kisiId', 'in', p).get();
      s.docs.forEach((d) => odemeler.push(d.data()));
    }
    const kisiDocs = await db.getAll(...uyeler.map((k) => db.collection('kisiler').doc(k)));
    const ad = Object.fromEntries(kisiDocs.map((d) => [d.id, d.exists ? d.data().ad : 'Kişi']));
    const odeyen = [];
    const eksik = [];
    for (const k of uyeler) {
      const r = kayitlar[k];
      if (!r || r.durum === 'iptal') continue;
      const odenen = odemeler
        .filter((o) => o.satilanPaketId === r.id && !o.silindi)
        .reduce((t, o) => t + (Number(o.tutar) || 0), 0);
      const kalan = (Number(r.uygulananFiyat) || 0) - odenen;
      if (kalan <= 0) odeyen.push(ad[k]);
      else eksik.push(`${ad[k]} (${tl(kalan)})`);
    }
    for (const tel of yoneticiler) {
      toplu.set(db.collection('bildirimler').doc(`ozet_${g.id}_${donem.bas}_${tel}`), {
        aliciKullaniciId: tel,
        tip: 'grup-donem-ozeti',
        baslik: `${g.ad} · dönem sonu`,
        metin:
          `${kisa(donem.bas)} – ${kisa(donem.bit)}: ${odeyen.length}/${odeyen.length + eksik.length} kişi ödedi.` +
          (eksik.length ? ` Ödemeyen/eksik: ${eksik.join(', ')}.` : ' Herkes ödedi.') +
          ` Velilere hatırlatma gönderildi (${alicilar.size} hesap).`,
        okundu: false,
        kurumId: KURUM_ID,
        tarih: zaman,
      });
      rapor.ozet++;
    }
    await toplu.commit();
  }
  return rapor;
}

module.exports = { donemKontrolu, donemBul, orantili, istanbulBugun };

// ---------- Bireysel paket: son ders bildirimi ----------
// Yoklama kaydı değişince kişinin bireysel paketleri yeniden hesaplanır; bir pakette tek ders kaldıysa
// kişiye bağlı öğrenci/veli hesaplarına bir kez bildirim gider (belge kimliği sabit, tekrar gitmez).
function sayilanDers(k) {
  const id = String(k.id || '');
  if (!k.tarih || id.startsWith('sk_') || id.includes('_')) return false;
  return k.katilim === 'geldi' || (k.katilim === 'gelmedi' && k.derstenDussun === true);
}
function kalanDersler(paketler, kayitlar) {
  const bireysel = paketler
    .filter((p) => p.tur === 'bireysel' && p.durum !== 'iptal')
    .sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || '') || a.id.localeCompare(b.id));
  const kullanilan = Object.fromEntries(bireysel.map((p) => [p.id, 0]));
  for (const d of kayitlar.filter(sayilanDers).sort((a, b) => a.tarih.localeCompare(b.tarih))) {
    const p = bireysel.find((x) => (x.baslangic || '') <= d.tarih && kullanilan[x.id] < (Number(x.dersSayisi) || 0));
    if (p) kullanilan[p.id]++;
  }
  return bireysel.map((p) => ({ p, kalan: (Number(p.dersSayisi) || 0) - kullanilan[p.id] }));
}
async function sonDersKontrolu(db, admin, KURUM_ID, kisiId) {
  const [ps, ks] = await Promise.all([
    db.collection('satilanPaketler').where('kisiId', '==', kisiId).get(),
    db.collection('kisiler').doc(kisiId).collection('antrenmanKayitlari').get(),
  ]);
  const paketler = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!paketler.some((p) => p.tur === 'bireysel')) return 0;
  const sonDers = kalanDersler(paketler, ks.docs.map((d) => ({ id: d.id, ...d.data() }))).filter((x) => x.kalan === 1);
  if (!sonDers.length) return 0;
  const us = await db.collection('kullanicilar').where('bagliKisiler', 'array-contains', kisiId).get();
  const alicilar = us.docs.filter((d) => ['ogrenci', 'veli'].includes(d.data().rol) && d.data().aktif !== false);
  const kisi = await db.collection('kisiler').doc(kisiId).get();
  const ad = kisi.exists ? (kisi.data().ad || '').split(' ')[0] : '';
  let n = 0;
  for (const { p } of sonDers) {
    for (const u of alicilar) {
      const veli = u.data().rol === 'veli';
      await db
        .collection('bildirimler')
        .doc(`sonders_${p.id}_${u.id}`)
        .create({
          aliciKullaniciId: u.id,
          tip: 'paket-son-ders',
          baslik: 'Paketin son dersi',
          metin: `${veli && ad ? `${ad} için ` : ''}${p.paketAdi || 'paket'}: bir sonraki ders paketin son dersi.`,
          okundu: false,
          kurumId: KURUM_ID,
          tarih: admin.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => n++)
        .catch(() => {}); // daha önce gönderildiyse tekrar gönderilmez
    }
  }
  return n;
}

module.exports.sonDersKontrolu = sonDersKontrolu;
