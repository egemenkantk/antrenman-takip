// Dünya / uluslararası normlar. Değerlendirme: kişinin test günündeki yaşı ve cinsiyetine göre.
// Kaynaklar (yalnızca açık erişimli tablolardan aktarıldı):
//  EUROFIT – Tomkinson GR ve ark. European normative values for physical fitness in children and adolescents
//            aged 9–17 years (2 779 165 Eurofit performansı, 30 ülke). Br J Sports Med 2018;52:1445–56.
//  ABD     – ABD okul nüfusu fitness normları (President's Challenge / NSPFS), 6–17 yaş; ExRx Youth Fitness Norms.
//  TENIS   – Axman S ve ark. Physical performance tests in 8008 competitive youth tennis players: systematic review
//            and meta-analysis of normative values. Eur J Sport Sci 2025;25(9):e70023. (Havuzlanmış ortalamalar)
import { BEEP_TEST } from './tanimlar.js';

export const KAYNAKLAR = {
  eurofit: { kisa: 'Avrupa normu (Eurofit)', uzun: 'Tomkinson ve ark., Br J Sports Med 2018 – 30 Avrupa ülkesi, yaklaşık 2,8 milyon ölçüm, 9–17 yaş' },
  abd: { kisa: 'ABD okul normu', uzun: 'ABD okul nüfusu fitness normları (President\'s Challenge), 6–17 yaş' },
  tenis: { kisa: 'Genç tenisçi ortalaması', uzun: 'Axman ve ark., Eur J Sport Sci 2025 – 8008 yarışmacı genç tenisçinin meta-analizi' },
};

// Yüzdelik tabloları: yaş → [P20, P40, P50, P60, P80] (Eurofit) ya da [P5, P25, P50, P75, P95] (ABD)
const P_EUROFIT = [20, 40, 50, 60, 80];
const P_ABD = [5, 25, 50, 75, 95];
const P_ABD_SINAV = [10, 30, 50, 70, 90]; // şınav tablosu 10/30/50/70/90 derecelendirmesiyle verilir

const EUROFIT = {
  'Durarak uzun atlama (cm)': {
    E: { 9: [116.8, 128.7, 133.8, 138.9, 150.7], 10: [124.6, 137.0, 142.4, 147.7, 160.1], 11: [133.3, 146.3, 151.9, 157.5, 170.5], 12: [141.2, 154.8, 160.7, 166.5, 180.1], 13: [149.3, 163.6, 169.7, 175.9, 190.2], 14: [159.6, 174.8, 181.4, 188.0, 203.2], 15: [169.8, 186.0, 192.9, 199.8, 215.9], 16: [176.9, 193.6, 200.8, 207.9, 224.6], 17: [181.6, 198.5, 205.8, 213.1, 230.1] },
    K: { 9: [107.1, 118.9, 123.9, 129.0, 140.8], 10: [114.9, 127.0, 132.3, 137.5, 149.8], 11: [122.6, 135.2, 140.6, 146.0, 158.7], 12: [128.6, 141.6, 147.1, 152.7, 165.8], 13: [131.6, 144.8, 150.4, 156.1, 169.3], 14: [133.6, 146.8, 152.5, 158.3, 171.6], 15: [134.8, 148.1, 153.9, 159.6, 173.1], 16: [135.5, 148.8, 154.6, 160.4, 173.8], 17: [137.2, 150.6, 156.4, 162.3, 175.8] },
  },
  'Kavrama kuvveti (kg)': {
    E: { 9: [11.9, 14.3, 15.3, 16.4, 18.8], 10: [13.0, 15.7, 16.8, 18.0, 20.6], 11: [14.8, 17.7, 19.0, 20.3, 23.2], 12: [17.7, 21.2, 22.6, 24.1, 27.6], 13: [22.5, 26.6, 28.4, 30.2, 34.3], 14: [27.9, 32.6, 34.6, 36.6, 41.2], 15: [32.5, 37.4, 39.5, 41.6, 46.5], 16: [35.8, 40.7, 42.9, 45.0, 49.9], 17: [38.0, 42.9, 45.0, 47.1, 52.1] },
    K: { 9: [10.4, 12.6, 13.6, 14.6, 16.8], 10: [11.5, 14.1, 15.2, 16.3, 18.8], 11: [13.4, 16.3, 17.5, 18.8, 21.7], 12: [16.2, 19.3, 20.6, 21.9, 25.0], 13: [20.3, 23.3, 24.6, 25.9, 29.0], 14: [22.7, 25.7, 27.1, 28.4, 31.4], 15: [23.5, 26.7, 28.0, 29.4, 32.5], 16: [23.6, 26.9, 28.2, 29.6, 32.8], 17: [23.8, 27.0, 28.4, 29.8, 33.0] },
  },
  // Eurofit kutusunda ayak tabanı 15 cm'dir
  'Otur-uzan (cm)': {
    E: { 9: [10.7, 14.4, 16.0, 17.6, 21.4], 10: [10.8, 14.4, 16.1, 17.7, 21.5], 11: [10.8, 14.4, 16.1, 17.7, 21.5], 12: [10.8, 14.5, 16.1, 17.8, 21.7], 13: [11.1, 14.8, 16.5, 18.2, 22.2], 14: [12.1, 16.2, 18.0, 19.9, 24.2], 15: [13.7, 18.3, 20.3, 22.4, 27.2], 16: [14.6, 19.3, 21.4, 23.6, 28.6], 17: [15.5, 20.4, 22.6, 24.8, 30.0] },
    K: { 9: [13.1, 16.9, 18.6, 20.3, 24.2], 10: [13.7, 17.5, 19.2, 20.9, 24.8], 11: [14.5, 18.4, 20.1, 21.7, 25.6], 12: [15.8, 19.7, 21.4, 23.1, 27.1], 13: [17.3, 21.3, 23.1, 24.8, 28.9], 14: [18.6, 22.7, 24.5, 26.3, 30.4], 15: [19.5, 23.6, 25.4, 27.2, 31.3], 16: [20.0, 24.1, 25.9, 27.6, 31.8], 17: [20.3, 24.4, 26.1, 27.9, 32.1] },
  },
  // 20 m mekik koşusu (Léger 1 dk kademe): tamamlanan kademe/dakika
  [BEEP_TEST]: {
    E: { 9: [2.80, 3.93, 4.43, 4.92, 6.08], 10: [3.13, 4.31, 4.83, 5.34, 6.55], 11: [3.45, 4.68, 5.22, 5.75, 7.01], 12: [3.77, 5.06, 5.61, 6.18, 7.49], 13: [4.11, 5.44, 6.02, 6.60, 7.97], 14: [4.57, 5.95, 6.55, 7.15, 8.56], 15: [4.95, 6.34, 6.95, 7.56, 8.98], 16: [5.22, 6.61, 7.21, 7.81, 9.23], 17: [5.67, 7.06, 7.66, 8.26, 9.67] },
    K: { 9: [2.08, 2.98, 3.38, 3.77, 4.70], 10: [2.29, 3.22, 3.63, 4.04, 5.00], 11: [2.64, 3.64, 4.07, 4.51, 5.53], 12: [2.66, 3.69, 4.14, 4.60, 5.66], 13: [2.64, 3.68, 4.13, 4.58, 5.65], 14: [2.64, 3.68, 4.13, 4.58, 5.65], 15: [2.63, 3.67, 4.13, 4.58, 5.65], 16: [2.61, 3.66, 4.11, 4.57, 5.64], 17: [2.60, 3.65, 4.11, 4.56, 5.64] },
  },
};

const ABD = {
  // 1 dakikada mekik (eller ense arkasında, dirsekler dizlere)
  'Mekik (tekrar)': {
    E: { 6: [6, 15, 20, 26, 36], 7: [10, 19, 26, 33, 42], 8: [14, 25, 30, 37, 47], 9: [15, 26, 32, 38, 48], 10: [16, 27, 34, 40, 50], 11: [17, 29, 36, 41, 51], 12: [19, 31, 39, 46, 56], 13: [25, 35, 41, 48, 58], 14: [27, 36, 42, 49, 59], 15: [28, 38, 44, 50, 60], 16: [28, 38, 45, 51, 61], 17: [25, 38, 46, 52, 62] },
    K: { 6: [6, 14, 22, 28, 35], 7: [10, 20, 25, 31, 40], 8: [12, 22, 29, 35, 44], 9: [14, 23, 30, 36, 45], 10: [15, 25, 32, 39, 47], 11: [19, 28, 34, 40, 50], 12: [19, 30, 36, 41, 52], 13: [19, 30, 35, 41, 51], 14: [20, 30, 35, 42, 51], 15: [20, 30, 37, 43, 56], 16: [20, 30, 37, 43, 54], 17: [20, 31, 37, 44, 54] },
  },
  // Barfiks: yalnızca erkekler (kızlarda bükülü kol asılma kullanılır)
  'Barfiks (tekrar)': {
    E: { 10: [0, 0, 1, 3, 9], 11: [0, 0, 2, 4, 9], 12: [0, 0, 2, 4, 9], 13: [0, 1, 3, 5, 10], 14: [0, 2, 4, 7, 12], 15: [0, 3, 6, 9, 15], 16: [1, 4, 7, 10, 15], 17: [1, 4, 7, 10, 15] },
  },
  // ABD kutusu: ayak tabanı 23 cm
  'Otur-uzan (cm)': {
    E: { 6: [16, 22, 25, 29, 33], 7: [16, 22, 25, 29, 33], 8: [16, 22, 25, 29, 34] },
    K: { 6: [18, 23, 27, 30, 34], 7: [17, 24, 27, 31, 34], 8: [17, 23, 28, 31, 35] },
  },
};
const ABD_SINAV = {
  'Şınav (tekrar)': {
    E: { 6: [2, 4, 7, 7, 11], 7: [3, 5, 8, 11, 17], 8: [4, 7, 9, 13, 19], 9: [5, 8, 12, 15, 20], 10: [7, 11, 14, 18, 25], 11: [3, 10, 15, 23, 30], 12: [7, 13, 18, 25, 34], 13: [9, 16, 23, 30, 40], 14: [11, 18, 25, 32, 42], 15: [15, 25, 30, 35, 44], 16: [18, 27, 32, 37, 46], 17: [22, 30, 36, 45, 55] },
    K: { 6: [2, 4, 6, 7, 11], 7: [3, 5, 8, 11, 17], 8: [4, 7, 9, 13, 19], 9: [5, 8, 12, 15, 20], 10: [4, 9, 13, 17, 20], 11: [3, 8, 12, 16, 20], 12: [3, 7, 11, 15, 21], 13: [3, 6, 11, 15, 22], 14: [3, 6, 11, 15, 22], 15: [4, 9, 15, 17, 23], 16: [4, 10, 15, 18, 26], 17: [5, 12, 16, 19, 28] },
  },
};

// Genç tenisçi havuzlanmış ortalamaları (U10 = 9 yaş, U12 = 11 yaş …)
const TENIS = {
  'CMJ (cm)': {
    E: { 9: 21.58, 10: 22.95, 11: 30.05, 12: 29.59, 13: 31.26, 14: 36.18, 15: 34.68, 16: 39.07, 17: 38.12 },
    K: { 10: 24.13, 11: 29.13, 12: 28.80, 13: 28.48, 14: 31.99, 15: 26.87, 16: 35.70, 17: 31.13 },
  },
  '10 m sürat (sn)': {
    E: { 9: 2.49, 10: 2.13, 11: 2.03, 12: 1.97, 13: 1.97, 14: 1.86, 15: 1.90, 16: 1.82, 17: 1.77 },
    K: { 9: 2.29, 10: 2.18, 11: 2.03, 12: 2.03, 13: 2.02, 14: 1.97, 16: 1.95, 17: 1.96 },
  },
  '20 m sürat (sn)': {
    E: { 7: 4.32, 8: 4.14, 10: 3.77, 11: 3.61, 12: 3.52, 13: 3.48, 14: 3.24, 15: 3.30, 16: 3.11, 17: 3.09 },
    K: { 7: 4.42, 8: 4.19, 9: 4.04, 10: 3.76, 11: 3.63, 12: 3.57, 13: 3.66, 14: 3.44, 15: 3.72, 16: 3.51, 17: 3.38 },
  },
  '505 çeviklik (sn)': {
    E: { 7: 3.05, 8: 2.95, 9: 2.78, 10: 2.66, 11: 2.61, 12: 2.89, 14: 2.88, 15: 2.83, 16: 2.97 },
    K: { 7: 3.10, 8: 2.97, 9: 2.83, 10: 2.73, 11: 2.65, 12: 2.88, 14: 3.15, 15: 3.20 },
  },
};

// Léger 20 m mekik koşusunda kademe başına mekik sayısı
const MEKIK_SAYISI = [0, 7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16];
const beepDakika = (v) => {
  const L = Math.floor(v);
  const s = Math.round((v - L) * 100);
  return Math.max(0, L - 1) + s / (MEKIK_SAYISI[L] || 12);
};

// Kendi otur-uzan kutumuzda ayak tabanı 22 cm
const BIZIM_OTUR_UZAN_AYAK = 22;

export const SEVIYELER = ['Geliştirilmeli', 'Ortalamanın altında', 'Ortalama', 'Ortalamanın üstünde', 'Çok iyi'];
const yuzdelikSeviye = (p) => (p < 20 ? 0 : p < 40 ? 1 : p < 60 ? 2 : p < 80 ? 3 : 4);

// Test günündeki yaş (tam yıl)
export function testYasi(kisi, tarih) {
  if (kisi?.dogumTarihi) {
    const [y, m, g] = kisi.dogumTarihi.split('-').map(Number);
    const [ty, tm, tg] = tarih.split('-').map(Number);
    return ty - y - (tm < m || (tm === m && tg < g) ? 1 : 0);
  }
  if (kisi?.dogumYili) return Number(tarih.slice(0, 4)) - Number(kisi.dogumYili) - (Number(tarih.slice(5, 7)) < 7 ? 1 : 0);
  return null;
}

// Değeri yüzdelik noktalarına göre yerleştir (doğrusal ara değer)
function yuzdelikBul(deger, noktalar, yuzdelikler, dusukIyi) {
  const v = dusukIyi ? -deger : deger;
  const n = noktalar.map((x) => (dusukIyi ? -x : x));
  if (v <= n[0]) return { p: yuzdelikler[0], kenar: v < n[0] ? 'alt' : null };
  if (v >= n[n.length - 1]) return { p: yuzdelikler[yuzdelikler.length - 1], kenar: v > n[n.length - 1] ? 'ust' : null };
  for (let i = 1; i < n.length; i++) {
    if (v <= n[i]) {
      if (n[i] === n[i - 1]) return { p: yuzdelikler[i], kenar: null };
      const t = (v - n[i - 1]) / (n[i] - n[i - 1]);
      return { p: Math.round(yuzdelikler[i - 1] + t * (yuzdelikler[i] - yuzdelikler[i - 1])), kenar: null };
    }
  }
  return null;
}

export const normVarMi = (test) => !!(EUROFIT[test] || ABD[test] || ABD_SINAV[test] || TENIS[test]);

/**
 * Test sonucunu norma göre değerlendirir.
 * @returns {null | { kaynak, yas, seviye, seviyeNo, yuzdelik?, kenar?, ortalama, farkYuzde?, tur: 'yuzdelik'|'ortalama' }}
 */
export function normDegerlendir(test, deger, kisi, tarih) {
  if (deger == null || !kisi) return null;
  const cins = kisi.cinsiyet === 'K' || kisi.cinsiyet === 'E' ? kisi.cinsiyet : null;
  if (!cins) return null;
  const yas = testYasi(kisi, tarih);
  if (yas == null) return null;

  // Yüzdelik tabloları
  const adaylar = [
    [EUROFIT[test], P_EUROFIT, 'eurofit'],
    [ABD[test], P_ABD, 'abd'],
    [ABD_SINAV[test], P_ABD_SINAV, 'abd'],
  ];
  for (const [tablo, yuzdelikler, kaynak] of adaylar) {
    const satir = tablo?.[cins]?.[yas];
    if (!satir) continue;
    let v = deger;
    if (test === BEEP_TEST) v = beepDakika(deger);
    if (test === 'Otur-uzan (cm)') v = deger - BIZIM_OTUR_UZAN_AYAK + (kaynak === 'eurofit' ? 15 : 23);
    const r = yuzdelikBul(v, satir, yuzdelikler, false);
    if (!r) continue;
    const no = r.kenar === 'alt' ? 0 : yuzdelikSeviye(r.p);
    // Ortalama, kendi ölçeğimizde gösterilir
    let ort = satir[2];
    ort = Math.round(ort * 10) / 10;
    if (test === 'Otur-uzan (cm)') ort = Math.round((ort + BIZIM_OTUR_UZAN_AYAK - (kaynak === 'eurofit' ? 15 : 23)) * 10) / 10;
    return { tur: 'yuzdelik', kaynak, yas, yuzdelik: r.p, kenar: r.kenar, seviyeNo: no, seviye: SEVIYELER[no], ortalama: test === BEEP_TEST ? null : ort };
  }

  // Ortalama tabloları (sporcu referansı)
  const ort = TENIS[test]?.[cins]?.[yas];
  if (ort != null) {
    const dusukIyi = /\(sn\)/.test(test);
    const fark = ((deger - ort) / ort) * 100;
    const iyiYonde = dusukIyi ? -fark : fark;
    const no = iyiYonde > 10 ? 4 : iyiYonde > 3 ? 3 : iyiYonde >= -3 ? 2 : iyiYonde >= -10 ? 1 : 0;
    return { tur: 'ortalama', kaynak: 'tenis', yas, farkYuzde: Math.round(fark * 10) / 10, sure: dusukIyi, seviyeNo: no, seviye: SEVIYELER[no], ortalama: ort };
  }
  return null;
}

export function normMetni(n) {
  if (!n) return '';
  if (n.tur === 'yuzdelik') {
    const p = n.kenar === 'alt' ? `<${n.yuzdelik}` : n.kenar === 'ust' ? `${n.yuzdelik}+` : String(n.yuzdelik);
    return `${n.seviye} · yüzdelik dilim: ${p}`;
  }
  const f = Math.abs(n.farkYuzde).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  if (n.farkYuzde === 0) return `${n.seviye} · ortalamayla aynı`;
  const yon = n.sure ? (n.farkYuzde > 0 ? 'yavaş' : 'hızlı') : n.farkYuzde > 0 ? 'yüksek' : 'düşük';
  return `${n.seviye} · ortalamadan %${f} daha ${yon}`;
}
