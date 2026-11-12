// Paket ve ödeme hesapları (saf fonksiyonlar; sunucudaki günlük kontrol de aynı mantığı kullanır)
import { gunEkle, gunFarki } from '../program/model.js';

export const DONEM_GUN = 28; // grup dersleri 4 haftalık dönemlerle ilerler
export const TUR_ADI = { grup: 'Grup (4 haftalık dönem)', bireysel: 'Bireysel / PT (ders sayılı)' };
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

// ---------- Bireysel derslerin paketlere dağıtımı ----------
// Sayılan ders: bireysel kayıt (grup kaydı değil), "geldi" ya da yöneticinin "dersten düşsün" dediği "gelmedi".
// Her ders, tarihi paketin başlangıcından sonra olan en eski, dolmamış pakete yazılır.
export function sayilanDers(kayit) {
  if (!kayit?.tarih || String(kayit.id || '').startsWith('sk_') || String(kayit.id || '').includes('_')) return false;
  if (kayit.katilim === 'geldi') return true;
  return kayit.katilim === 'gelmedi' && kayit.derstenDussun === true;
}
export function dersleriDagit(paketler, kayitlar) {
  const bireysel = paketler
    .filter((p) => p.tur === 'bireysel' && p.durum !== 'iptal')
    .sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || '') || (a.id || '').localeCompare(b.id || ''));
  const sonuc = Object.fromEntries(bireysel.map((p) => [p.id, { kullanilan: 0, dersler: [] }]));
  const disarida = [];
  const dersler = kayitlar.filter(sayilanDers).sort((a, b) => a.tarih.localeCompare(b.tarih));
  for (const d of dersler) {
    const p = bireysel.find((x) => (x.baslangic || '') <= d.tarih && sonuc[x.id].kullanilan < (Number(x.dersSayisi) || 0));
    if (!p) {
      disarida.push(d);
      continue;
    }
    sonuc[p.id].kullanilan++;
    sonuc[p.id].dersler.push(d);
  }
  for (const p of bireysel) sonuc[p.id].kalan = Math.max(0, (Number(p.dersSayisi) || 0) - sonuc[p.id].kullanilan);
  return { paketler: sonuc, paketsizDersler: disarida };
}
