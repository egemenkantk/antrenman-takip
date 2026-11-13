// Paket ve ödeme hesapları (saf fonksiyonlar; sunucudaki günlük kontrol de aynı mantığı kullanır)
import { gunEkle, gunFarki } from '../program/model.js';

export const DONEM_GUN = 28; // grup dersleri 4 haftalık dönemlerle ilerler
export const TUR_ADI = {
  bireysel: 'Bireysel / PT (ders sayılı)',
  duet: 'Düet (ders sayılı, kişi başı)',
  trio: 'Trio (ders sayılı, kişi başı)',
  grup: 'Grup (4 haftalık dönem)',
  abonelik: 'Aylık abonelik (sporcu, başlangıç gününe göre her ay)',
};
export const TUR_KISA = { bireysel: 'Bireysel', duet: 'Düet', trio: 'Trio', grup: 'Grup', ek: 'Ek ücret', abonelik: 'Aylık abonelik', abonelikDonem: 'Abonelik' };
// Ders sayılı paket türleri: yoklamada "geldi" olan ders paketten düşer
export const DERS_SAYILI = ['bireysel', 'duet', 'trio'];
export const dersSayili = (tur) => DERS_SAYILI.includes(tur);
export const GRUP_DERS_TURU = { grup: 'Grup dersi (4 haftalık dönem)', duet: 'Düet', trio: 'Trio' };
export const KITLE_ADI = { sporcu: 'Sporcu', pt: 'PT danışanı' };
export const YONTEMLER = [
  ['nakit', 'Nakit'],
  ['havale', 'Havale / EFT'],
  ['kart', 'Kart'],
];
export const YONTEM_ADI = Object.fromEntries(YONTEMLER);

export const tl = (n) =>
  (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺';

// ---------- Grup dönemleri ----------
// Grubun ilk dönem başlangıcından itibaren 28 günlük dönemler. tarih hangi döneme düşüyor?
export function donemBul(donemBaslangic, tarih) {
  if (!donemBaslangic || !tarih || tarih < donemBaslangic) return null;
  const no = Math.floor(gunFarki(donemBaslangic, tarih) / DONEM_GUN);
  return donemNo(donemBaslangic, no);
}
export function donemNo(donemBaslangic, no) {
  if (no < 0) return null;
  const bas = gunEkle(donemBaslangic, no * DONEM_GUN);
  return { no, bas, bit: gunEkle(bas, DONEM_GUN - 1) };
}

// Dönem ortasında katılan: kalan haftalara göre orantılı (katıldığı hafta dahil)
export function kalanHafta(donemBas, katilim) {
  if (!katilim || katilim <= donemBas) return 4;
  const hafta = Math.floor(gunFarki(donemBas, katilim) / 7); // 0..3
  return Math.max(1, 4 - Math.min(hafta, 3));
}
export function orantiliUcret(donemUcreti, donemBas, katilim) {
  const k = kalanHafta(donemBas, katilim);
  return Math.round((Number(donemUcreti) || 0) * k / 4);
}

// Grup dönem kaydının belge kimliği: aynı kayıt iki kez açılmasın
export const grupKayitKimligi = (grupId, donemBas, kisiId) => `g_${grupId}_${donemBas}_${kisiId}`;

// ---------- Ödeme özeti ----------
export function odenen(odemeler, paketId) {
  return odemeler
    .filter((o) => o.satilanPaketId === paketId && !o.silindi)
    .reduce((t, o) => t + (Number(o.tutar) || 0), 0);
}
export function odemeDurumu(paket, odemeler) {
  const o = odenen(odemeler, paket.id);
  const fiyat = Number(paket.uygulananFiyat) || 0;
  const kalan = Math.max(0, fiyat - o);
  return { odenen: o, kalan, durum: paket.durum === 'iptal' ? 'iptal' : kalan <= 0 ? 'odendi' : o > 0 ? 'kismi' : 'odenmedi' };
}
export const DURUM_ADI = { odendi: 'Ödendi', kismi: 'Kısmi', odenmedi: 'Ödenmedi', iptal: 'İptal' };

// ---------- Ders sayılı paketlere (bireysel, düet, trio) ders dağıtımı ----------
// Kaydın türü: bireysel kayıt (kimliği yalnızca tarih) ya da düet/trio grubunun kaydı (dersTuru alanı).
// Sayılan ders: "geldi" ya da yöneticinin "dersten düşsün" dediği "gelmedi". Düet/trioda gelmeyenden düşmez.
// Her ders, aynı türdeki, başlangıcı dersten önce olan en eski dolmamış pakete yazılır.
export function kayitTuru(kayit) {
  const id = String(kayit?.id || '');
  if (!kayit?.tarih || id.startsWith('sk_')) return null;
  if (kayit.dersTuru === 'duet' || kayit.dersTuru === 'trio') return kayit.dersTuru;
  return id.includes('_') ? null : 'bireysel';
}
export function sayilanDers(kayit) {
  if (!kayitTuru(kayit)) return false;
  if (kayit.katilim === 'geldi') return true;
  return kayit.katilim === 'gelmedi' && kayit.derstenDussun === true;
}
export function dersleriDagit(paketler, kayitlar) {
  // Aylık aboneliği olan günlerdeki bireysel dersler aboneliğe sayılır, bireysel paketten düşmez
  const abonelikler = paketler.filter((p) => p.tur === 'abonelik' && p.durum !== 'iptal');
  kayitlar = kayitlar.filter((k) => !(kayitTuru(k) === 'bireysel' && abonelikler.some((a) => abonelikKapsar(a, k.tarih))));
  const sayili = paketler
    .filter((p) => dersSayili(p.tur) && p.durum !== 'iptal')
    .sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || '') || (a.id || '').localeCompare(b.id || ''));
  const sonuc = Object.fromEntries(sayili.map((p) => [p.id, { kullanilan: 0, dersler: [] }]));
  const disarida = [];
  const dersler = kayitlar.filter(sayilanDers).sort((a, b) => a.tarih.localeCompare(b.tarih));
  for (const d of dersler) {
    const tur = kayitTuru(d);
    const p = sayili.find((x) => x.tur === tur && (x.baslangic || '') <= d.tarih && sonuc[x.id].kullanilan < (Number(x.dersSayisi) || 0));
    if (!p) {
      disarida.push({ ...d, tur });
      continue;
    }
    sonuc[p.id].kullanilan++;
    sonuc[p.id].dersler.push(d);
  }
  for (const p of sayili) sonuc[p.id].kalan = Math.max(0, (Number(p.dersSayisi) || 0) - sonuc[p.id].kullanilan);
  return { paketler: sonuc, paketsizDersler: disarida };
}

// Düet/trio dersinde eksik katılım: kayıtta gelen sayısı grup boyundan azsa
export const eksikKatilim = (kayit) =>
  (kayit?.dersTuru === 'duet' || kayit?.dersTuru === 'trio') && kayit.katilim === 'geldi' && kayit.gelenSayisi < kayit.grupBoyu;

// ---------- Aylık abonelik ----------
// Dönem: başlangıç gününden bir sonraki ayın aynı gününe (6 Kasım → 5 Aralık, sonraki ödeme 6 Aralık).
// Ayın 29–31'i olmayan aylarda ayın son günü kullanılır.
export function ayEkle(tarih, n) {
  const [y, m, d] = tarih.split('-').map(Number);
  const hedef = new Date(Date.UTC(y, m - 1 + n, 1));
  const sonGun = new Date(Date.UTC(hedef.getUTCFullYear(), hedef.getUTCMonth() + 1, 0)).getUTCDate();
  hedef.setUTCDate(Math.min(d, sonGun));
  return hedef.toISOString().slice(0, 10);
}
export function abonelikDonemi(baslangic, no) {
  if (no < 0) return null;
  const bas = ayEkle(baslangic, no);
  return { no, bas, bit: gunEkle(ayEkle(baslangic, no + 1), -1) };
}
export function abonelikDonemBul(baslangic, tarih) {
  if (!baslangic || !tarih || tarih < baslangic) return null;
  let no = Math.max(0, (Number(tarih.slice(0, 4)) - Number(baslangic.slice(0, 4))) * 12 + Number(tarih.slice(5, 7)) - Number(baslangic.slice(5, 7)) - 1);
  while (abonelikDonemi(baslangic, no + 1).bas <= tarih) no++;
  return abonelikDonemi(baslangic, no);
}
export const abonelikKapsar = (a, tarih) => a.baslangic <= tarih && (!a.bitis || tarih <= a.bitis);
export const abonelikKayitKimligi = (aboneId, donemBas) => `a_${aboneId}_${donemBas}`;
// Taahhüt yalnızca bilgi: en az kaç ay, şu an kaçıncı ay
export function taahhutBilgisi(a, bugunTarih) {
  const d = abonelikDonemBul(a.baslangic, bugunTarih);
  const ay = d ? d.no + 1 : 0;
  const en = Number(a.taahhutAy) || 0;
  return { ay, en, doldu: en ? ay > en : true, bitis: en ? ayEkle(a.baslangic, en) : null };
}
// Dönemdeki dersler: geldi hak yer; habersiz "gelmedi" telafisi olmadığı için hak yer
// (yönetici "dersten düşmesin" derse yemez); "izinli / ertelendi" hak yemez.
export function abonelikDersleri(donem, kayitlar, hak) {
  const l = kayitlar.filter((k) => {
    const id = String(k.id || '');
    return k.tarih >= donem.bas && k.tarih <= donem.bit && !id.startsWith('sk_') && k.dersTuru !== 'duet' && k.dersTuru !== 'trio';
  });
  const geldi = l.filter((k) => k.katilim === 'geldi').length;
  const yanan = l.filter((k) => k.katilim === 'gelmedi' && k.derstenDussun !== false).length;
  const ertelenen = l.filter((k) => k.katilim === 'izinli').length;
  return { geldi, yanan, ertelenen, hak, kalan: Math.max(0, hak - geldi - yanan), dersler: l.sort((a, b) => a.tarih.localeCompare(b.tarih)) };
}
