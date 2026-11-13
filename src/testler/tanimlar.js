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
    ['Tek ayak denge (sn)', 'yuksek', true],
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
    ['Squat thrust (tekrar)', 'yuksek'],
    ['Mekik (tekrar)', 'yuksek'],
    ['Şınav (tekrar)', 'yuksek'],
    ['Kavrama kuvveti (kg)', 'yuksek', true],
  ]],
  ['Dayanıklılık', [
    ['Yo-Yo IR1 (m)', 'yuksek'],
    ['30-15 IFT (km/s)', 'yuksek'],
    ['Bleep test (seviye)', 'yuksek'],
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
// Katalogdaki sıra (kategori + test): listelerde Sporcu Kartı'ndaki düzen korunur
const SIRA = Object.fromEntries(Object.keys(TESTLER).map((ad, i) => [ad, i]));
export const testSirasi = (ad) => SIRA[ad] ?? 9999;

// Test girişinde her testin altında görünen kısa açıklama
export const TEST_ACIKLAMA = {
  'CMJ (cm)': 'Kollar belde, çömelip dikey sıçrama; alt vücut patlayıcı gücü',
  'Squat jump (cm)': 'Çömelmiş pozisyondan (yaylanmadan) dikey sıçrama',
  'Drop jump RSI': 'Kutudan düşüp hızlı sıçrama; reaktif kuvvet (sıçrama yüksekliği / temas süresi)',
  'Bosco skoru (cm)': 'Art arda sıçramalarda güç ve dayanıklılık (Performanz)',
  'Tek ayak CMJ (cm)': 'Tek ayakla dikey sıçrama; sağ-sol farkına bakılır',
  'Durarak uzun atlama (cm)': 'Durduğu yerden ileri sıçrama; yatay güç',
  '5 m sürat (sn)': 'İlk adım ve çıkış hızı',
  '10 m sürat (sn)': 'Hızlanma',
  '20 m sürat (sn)': 'Hızlanma ve sürat',
  '30 m sürat (sn)': 'Maksimal sürata ulaşma',
  'Uçan 10 m (sn)': 'Hareketli başlangıçla en yüksek hız',
  'V-cut (sn)': 'Açılı kesmelerle yön değiştirme hızı',
  '505 çeviklik (sn)': '180° dönüşte yön değiştirme hızı; sağ ve sol ayrı',
  'T-test (sn)': 'İleri, yana ve geri hareketlerde çeviklik',
  'Pro-agility (sn)': 'Kısa mesafede hızlı yön değiştirme',
  'Illinois (sn)': 'Engeller arasında çeviklik ve koordinasyon',
  'Denge (puan)': 'Tek ayak denge puanı (Performanz cihazı); sağ ve sol ayrı',
  'Tek ayak denge (sn)': 'Tek ayak üzerinde kaç saniye dengede kalabildiği; sağ ve sol ayrı',
  'Otur-uzan (cm)': 'Arka bacak ve bel esnekliği',
  'Squat 1RM (kg)': 'Bacak kuvveti (tek tekrarda kaldırılabilen en yüksek ağırlık)',
  'Bench press 1RM (kg)': 'Üst vücut itme kuvveti',
  'Trap bar deadlift 1RM (kg)': 'Tüm vücut kuvveti',
  'Barfiks (tekrar)': 'Üst vücut çekme kuvveti ve dayanıklılığı',
  '1 dk squat (tekrar)': '1 dakikada yapılan squat sayısı; bacak kuvvet dayanıklılığı',
  'Gravity pull up (tekrar)': 'Modifiye barfiks; üst vücut çekme kuvveti (makine seviyesiyle)',
  'Squat thrust (tekrar)': 'Belirli sürede squat thrust sayısı; tüm vücut dayanıklılığı',
  'Mekik (tekrar)': 'Karın (core) kaslarının dayanıklılığı',
  'Şınav (tekrar)': 'Üst vücut itme kuvveti ve dayanıklılığı',
  'Kavrama kuvveti (kg)': 'El dinamometresiyle kavrama; sağ ve sol ayrı',
  'Yo-Yo IR1 (m)': 'Kısa dinlenmelerle tekrarlanan koşularda dayanıklılık',
  '30-15 IFT (km/s)': 'Aralıklı koşu kapasitesi; kondisyonun göstergesi',
  'Bleep test (seviye)': 'Mekik koşusu; aerobik dayanıklılık',
  'RSA ortalama (sn)': 'Arka arkaya sprintlerde hızı koruyabilme',
  'Vücut ağırlığı (kg)': 'Kilo',
  'Yağ oranı (%)': 'Vücut yağ yüzdesi',
};

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
