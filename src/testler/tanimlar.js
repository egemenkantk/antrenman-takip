// Test tanımları. Test adı birimi içerir ("CMJ (cm)"); aktarılan eski ölçümler de bu biçimde.
// iyi: 'yuksek' → büyük değer iyi, 'dusuk' → küçük değer iyi (süreler)
export const TEST_KATEGORILERI = [
  ['Sıçrama', [
    ['CMJ (cm)', 'yuksek'],
    ['Squat jump (cm)', 'yuksek'],
    ['Drop jump RSI', 'yuksek'],
    ['Bosco skoru (cm)', 'yuksek'],
    ['Tek ayak CMJ (cm)', 'yuksek', true],
    ['Durarak uzun atlama (cm)', 'yuksek'],
  ]],
  ['Sürat', [
    ['5 m sürat (sn)', 'dusuk'],
    ['10 m sürat (sn)', 'dusuk'],
    ['20 m sürat (sn)', 'dusuk'],
    ['30 m sürat (sn)', 'dusuk'],
  ]],
  ['Çeviklik', [
    ['V-cut (sn)', 'dusuk'],
    ['505 çeviklik (sn)', 'dusuk', true],
    ['T-test (sn)', 'dusuk'],
  ]],
  ['Denge', [
    ['Denge (puan)', 'yuksek', true],
  ]],
  ['Esneklik', [
    ['Otur-uzan (cm)', 'yuksek'],
  ]],
  ['Kuvvet', [
    ['Squat 1RM (kg)', 'yuksek'],
    ['Kavrama kuvveti (kg)', 'yuksek', true],
  ]],
  ['Dayanıklılık', [
    ['Yo-Yo IR1 (m)', 'yuksek'],
  ]],
  ['Antropometri', [
    ['Boy (cm)', 'yuksek'],
    ['Vücut ağırlığı (kg)', 'yuksek'],
    ['Bel çevresi (cm)', 'dusuk'],
  ]],
];

export const TESTLER = Object.fromEntries(
  TEST_KATEGORILERI.flatMap(([kat, l]) => l.map(([ad, iyi, tarafli]) => [ad, { ad, kat, iyi, tarafli: !!tarafli }]))
);
export const testBilgisi = (ad) => TESTLER[ad] || { ad, kat: 'Diğer', iyi: /\(sn\)/.test(ad) ? 'dusuk' : 'yuksek', tarafli: false };
export const TARAF_ADI = { sag: 'Sağ', sol: 'Sol' };

// "15,97" → 15.97
export const sayiyaCevir = (s) => {
  if (s == null || s === '') return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const sayiGoster = (v, basamak = 2) =>
  v == null ? '—' : String(Math.round(v * 10 ** basamak) / 10 ** basamak).replace('.', ',');

export const slug = (s) =>
  String(s).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const sonucId = (kaynak, tarih, test, taraf) => `${kaynak}_${tarih}_${slug(test)}${taraf ? '_' + taraf : ''}`;
