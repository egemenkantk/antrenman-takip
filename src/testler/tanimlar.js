// Test tanımları. Test adı birimi içerir ("CMJ (cm)"); aktarılan eski ölçümler de bu biçimde.
// iyi: 'yuksek' → büyük değer iyi, 'dusuk' → küçük değer iyi (süreler)
export const TEST_KATEGORILERI = [
  ['Sıçrama', [
    ['CMJ (cm)', 'yuksek'],
    ['Squat jump (cm)', 'yuksek'],
    ['Drop jump RSI', 'yuksek'],
    ['Bosco skoru (cm)', 'yuksek'],
    ['Bosco · en yüksek sıçrama (cm)', 'yuksek'],
    ['Bosco · ortalama yükseklik (cm)', 'yuksek'],
    ['Bosco · ortalama RSI', 'yuksek'],
    ['Bosco · ortalama temas süresi (sn)', 'dusuk'],
    ['Bosco · yorgunluk indeksi (%)', 'dusuk'],
    ['Bosco · toplam sıçrama', 'yuksek'],
    ['CMJ · uçuş süresi (sn)', 'yuksek'],
    ['Tek ayak CMJ (cm)', 'yuksek', true],
    ['Durarak uzun atlama (cm)', 'yuksek'],
  ]],
  ['Sürat', [
    ['5 m sürat (sn)', 'dusuk'],
    ['10 m sürat (sn)', 'dusuk'],
    ['20 m sürat (sn)', 'dusuk'],
    ['30 m sürat (sn)', 'dusuk'],
    ['Uçan 10 m (sn)', 'dusuk'],
  ]],
  ['Çeviklik', [
    ['V-cut (sn)', 'dusuk'],
    ['505 çeviklik (sn)', 'dusuk', true],
    ['T-test (sn)', 'dusuk'],
    ['Pro-agility (sn)', 'dusuk'],
    ['Illinois (sn)', 'dusuk'],
  ]],
  ['Denge', [
    ['Denge (puan)', 'yuksek', true],
  ]],
  ['Esneklik', [
    ['Otur-uzan (cm)', 'yuksek'],
  ]],
  ['Kuvvet', [
    ['Squat 1RM (kg)', 'yuksek'],
    ['Bench press 1RM (kg)', 'yuksek'],
    ['Trap bar deadlift 1RM (kg)', 'yuksek'],
    ['Barfiks (tekrar)', 'yuksek'],
    ['1 dk squat (tekrar)', 'yuksek'],
    ['Gravity pull up (tekrar)', 'yuksek', false, true], // makinede zorluk seviyesiyle yapılır
    ['Mekik (tekrar)', 'yuksek'],
    ['Şınav (tekrar)', 'yuksek'],
    ['Kavrama kuvveti (kg)', 'yuksek', true],
  ]],
  ['Dayanıklılık', [
    ['Yo-Yo IR1 (m)', 'yuksek'],
    ['30-15 IFT (km/s)', 'yuksek'],
    ['Mekik koşusu (seviye)', 'yuksek'],
    ['RSA ortalama (sn)', 'dusuk'],
  ]],
  ['Antropometri', [
    // notr: artış ya da azalış tek başına gelişme/gerileme sayılmaz
    ['Boy (cm)', 'notr'],
    ['Vücut ağırlığı (kg)', 'notr'],
    ['Yağ oranı (%)', 'dusuk'],
    ['Omuz çevresi (cm)', 'notr'],
    ['Göğüs çevresi (cm)', 'notr'],
    ['Kol çevresi (cm)', 'notr'],
    ['Bel çevresi (cm)', 'dusuk'],
    ['Kalça çevresi (cm)', 'notr'],
    ['Bacak çevresi (cm)', 'notr'],
    ['Alt bacak çevresi (cm)', 'notr'],
  ]],
];

export const TESTLER = Object.fromEntries(
  TEST_KATEGORILERI.flatMap(([kat, l]) => l.map(([ad, iyi, tarafli, seviyeli]) => [ad, { ad, kat, iyi, tarafli: !!tarafli, seviyeli: !!seviyeli }]))
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
