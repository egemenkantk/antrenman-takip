// Paket ve ödeme hesapları (saf fonksiyonlar; sunucudaki günlük kontrol de aynı mantığı kullanır)
import { gunEkle, gunFarki } from '../program/model.js';

export const DONEM_GUN = 28; // grup dersleri 4 haftalık dönemlerle ilerler
export const TUR_ADI = {
  bireysel: 'Bireysel / PT (ders sayılı)',
  duet: 'Düet (ders sayılı, kişi başı)',
  trio: 'Trio (ders sayılı, kişi başı)',
  grup: 'Grup (4 haftalık dönem)',
};
export const TUR_KISA = { bireysel: 'Bireysel', duet: 'Düet', trio: 'Trio', grup: 'Grup', ek: 'Ek ücret' };
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
