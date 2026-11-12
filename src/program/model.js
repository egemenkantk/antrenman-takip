// Program modeli — eski Sporcu Kartı mantığının taşınmış hali.
//
// Blok: { ad, faz, fazAdi?, baslangic, haftalar, plan: 'hafta'|'mac', haftaGunleri:[0-6],
//         bolumler:[...], gunler:[{baslik, bolumler:[...], icerik:{bolum: metin}, md}],
//         ilerleme:[{not, gun:[{bolum: dozaj}, ...]}], not, sade }
// sade: true → PT danışanı haftalık planı: bölüm yok, her günde tek egzersiz listesi (icerik.liste).

export const BOLUMLER = {
  isinma: { ad: 'Isınma', doz: false, ipucu: 'RAMP, aktivasyon' },
  kuvvet: { ad: 'Kuvvet', doz: true, ipucu: '4×5 @%80' },
  kdevam: { ad: 'Kuvvette devamlılık', doz: true, ipucu: '3×15 · 45 sn dinlenme' },
  core: { ad: 'Core', doz: true, ipucu: '3×30 sn plank · 3×10 Pallof' },
  power: { ad: 'Power', doz: true, ipucu: '80 temas · 4×3 clean' },
  hiz: { ad: 'Hız', doz: true, ipucu: '6×20 m · 2 dk' },
  ceviklik: { ad: 'Çeviklik', doz: true, ipucu: '6×505 · 90 sn' },
  denge: { ad: 'Denge', doz: true, ipucu: '3×30 sn tek ayak · gözler kapalı' },
  kardiyo: { ad: 'Kardiyovasküler dayanıklılık', doz: true, ipucu: '6×(30 sn : 30 sn) · Z4' },
  mobilite: { ad: 'Esneklik-mobilite', doz: true, ipucu: '15 dk akış' },
};
export const BOLUM_SIRASI = Object.keys(BOLUMLER);
export const BOLUM_RENK = {
  isinma: '#7C8A99', kuvvet: '#18212C', kdevam: '#6B4FBB', core: '#7A6A1C', power: '#D9822B',
  hiz: '#2347D8', ceviklik: '#0E8A8A', denge: '#A0527A', kardiyo: '#C8341F', mobilite: '#2E7D4F',
};

export const FAZLAR_SPORCU = {
  genel: 'Genel hazırlık',
  ozel: 'Özel hazırlık',
  musabaka: 'Müsabaka öncesi',
  sezon_ici: 'Sezon içi',
  sezon_arasi: 'Sezon arası',
  kuvvet: 'Kuvvet bloğu',
};
export const FAZLAR_PT = { adaptasyon: 'Adaptasyon', temel: 'Temel', ilerleme: 'İlerleme' };
export const FAZ_RENK = {
  genel: '#2E7D4F', ozel: '#2347D8', musabaka: '#C8341F', sezon_ici: '#7A3FD1', sezon_arasi: '#6B7785',
  kuvvet: '#B7791F', adaptasyon: '#2E7D4F', temel: '#2347D8', ilerleme: '#C8341F',
};
export function fazAdi(b) {
  if (b.faz === 'ozelAd') return b.fazAdi || 'Diğer';
  return FAZLAR_SPORCU[b.faz] || FAZLAR_PT[b.faz] || 'Diğer';
}
export const fazRengi = (b) => FAZ_RENK[b.faz] || '#6B7785';

export const HARF = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const HAFTA_GUNLERI = [[1, 'Pzt'], [2, 'Sal'], [3, 'Çar'], [4, 'Per'], [5, 'Cum'], [6, 'Cmt'], [0, 'Paz']];

// ---------- Tarih yardımcıları (yerel saat, "YYYY-AA-GG") ----------
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const coz = (s) => new Date(s + 'T00:00');
export const bugun = () => ymd(new Date());
export const gunEkle = (s, n) => {
  const d = coz(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const gunFarki = (a, b) => Math.round((coz(b) - coz(a)) / 86400000);
export const kisaTarih = (s) => coz(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
export const uzunTarih = (s) => coz(s).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- Blok hesapları ----------
export const haftaSayisi = (b) => b.haftalar || (b.ilerleme || []).length || 6;
export const blokBitis = (b) => gunEkle(b.baslangic, haftaSayisi(b) * 7);
export const blokDurumu = (b, t = bugun()) => (t < b.baslangic ? 'planli' : t >= blokBitis(b) ? 'bitti' : 'simdi');
export const gunBolumleri = (b, g) => (g?.bolumler?.length ? g.bolumler : b.bolumler || []);
export const dozBolumleri = (b) => (b.bolumler || []).filter((k) => BOLUMLER[k]?.doz);
export function dozaj(hafta, gunIdx, bolum) {
  if (!hafta) return '';
  if (hafta.gun) return hafta.gun[gunIdx]?.[bolum] || '';
  return hafta.bolum?.[bolum] || '';
}
const siraliGunler = (b) => [...(b.haftaGunleri || [1, 3, 5])].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
export const gunHaftaGunu = (b, i) => siraliGunler(b)[i];

// Maç gününe göre konum: MD0 maç günü, MD-n maçtan n gün önce, MD+n maçtan n gün sonra
export function macGunu(maclar, tarih) {
  if (!maclar?.length) return null;
  if (maclar.includes(tarih)) return { md: 0, etiket: 'Maç günü' };
  const sonraki = maclar.find((d) => d > tarih);
  const onceki = [...maclar].reverse().find((d) => d < tarih);
  const kalan = sonraki ? gunFarki(tarih, sonraki) : null;
  const gecen = onceki ? gunFarki(onceki, tarih) : null;
  const etiket = kalan != null && kalan <= 6 ? `MD-${kalan}` : gecen != null && gecen <= 2 ? `MD+${gecen}` : null;
  return { kalan, gecen, etiket };
}

// Bir tarihte bloktaki planlı seans. maclar: sahibin maç/turnuva tarihleri (sıralı)
export function planliSeans(bloklar, tarih, maclar = []) {
  const b = bloklar.find((x) => x.baslangic <= tarih && tarih < blokBitis(x));
  if (!b) return null;
  const hafta = Math.floor(gunFarki(b.baslangic, tarih) / 7);
  const rx = (b.ilerleme || [])[hafta] || null;
  if (b.plan === 'mac') {
    const m = macGunu(maclar, tarih);
    if (!m) return { blok: b, dinlenme: true, macTakvimi: true };
    if (m.md === 0) return { blok: b, dinlenme: true, macGunu: true, md: m };
    const i = (b.gunler || []).findIndex(
      (g) => g.md != null && g.md !== '' && ((+g.md < 0 && m.kalan === -g.md) || (+g.md > 0 && m.gecen === +g.md))
    );
    if (i < 0) return { blok: b, dinlenme: true, md: m };
    return { blok: b, hafta, gunIdx: i, gun: b.gunler[i], rx, md: m };
  }
  const gunler = siraliGunler(b);
  const idx = gunler.indexOf(coz(tarih).getDay());
  if (idx < 0 || !(b.gunler || []).length) return { blok: b, dinlenme: true };
  const gunIdx = idx % b.gunler.length;
  return { blok: b, hafta, gunIdx, gun: b.gunler[gunIdx], rx };
}

// ---------- Şablonlar ----------
const H = (hiz, power, kuvvet, kardiyo, not, ek = {}) => ({ not, bolum: { hiz, power, kuvvet, kardiyo, ...ek } });

export const SABLONLAR_SPORCU = {
  genel: {
    ad: 'Genel hazırlık', faz: 'genel', haftaGunleri: [1, 3, 5],
    bolumler: ['isinma', 'kuvvet', 'power', 'hiz', 'ceviklik', 'kardiyo'],
    not: 'Kuvvet ve aerobik temel, hızlanma mekaniği, düşük–orta yoğunluk pliometri. 6. hafta deload ve test.',
    gunler: [
      { baslik: 'Kuvvet + hızlanma', icerik: { isinma: 'RAMP 10 dk\nMini band aktivasyon', hiz: 'Duvar drill\n10 m çıkış (farklı başlangıç pozisyonları)', power: 'Squat jump\nPogo', kuvvet: 'Back squat\nRDL\nSplit squat\nCopenhagen plank' } },
      { baslik: 'Üst vücut + kondisyon', icerik: { isinma: 'RAMP 10 dk\nOmuz mobilitesi', power: 'Med ball göğüs atışı', kuvvet: 'Bench press\nBarfiks\nTek kol row\nPallof press', kardiyo: 'Tempo koşu / aerobik interval' } },
      { baslik: 'Çeviklik + tüm vücut', icerik: { isinma: 'RAMP 10 dk', ceviklik: '505\nKesme (cut) drilleri', power: 'Lateral bound\nBox jump', kuvvet: 'Trap bar deadlift\nHip thrust\nNordic hamstring' } },
    ],
    ilerleme: [
      H('6×10 m · 90 sn', '60 temas · düşük', '3×8 @%65', '12×15 sn : 45 sn tempo', 'Teknik öncelik', { ceviklik: '4×505 · 90 sn' }),
      H('8×10 m · 90 sn', '70 temas · düşük', '3×8 @%67,5', '14×15 sn : 45 sn', '', { ceviklik: '5×505 · 90 sn' }),
      H('6×15 m · 2 dk', '80 temas · orta', '4×6 @%72,5', '16×15 sn : 45 sn', '', { ceviklik: '6×505 · 90 sn' }),
      H('8×15 m · 2 dk', '90 temas · orta', '4×6 @%75', '2×6 dk aerobik interval', '', { ceviklik: '6×505 + kesme' }),
      H('6×20 m · 2 dk', '100 temas · orta', '4×5 @%78', '3×6 dk aerobik interval', 'En yüklü hafta', { ceviklik: '8×505 + kesme' }),
      H('4×10 m · 2 dk', '50 temas · düşük', '2×5 @%65', '1×6 dk', 'Deload + test haftası', { ceviklik: '3×505' }),
    ],
  },
  ozel: {
    ad: 'Özel hazırlık', faz: 'ozel', haftaGunleri: [1, 3, 5],
    bolumler: ['isinma', 'kuvvet', 'power', 'hiz', 'ceviklik', 'kardiyo'],
    not: 'Maksimal hız, reaktif kuvvet, güç ve spor spesifik kondisyon (tekrarlı sprint).',
    gunler: [
      { baslik: 'Maksimal hız + kuvvet', icerik: { isinma: 'RAMP + sprint drilleri', hiz: 'Uçan sprint\nHızlanma 20 m', power: 'Depth jump\nHurdle hop', kuvvet: 'Back squat\nRDL\nNordic hamstring' } },
      { baslik: 'Güç + tekrarlı sprint', icerik: { isinma: 'RAMP 10 dk', power: 'Med ball rotasyonel atış', kuvvet: 'Power clean\nBench press\nBarfiks', kardiyo: 'Tekrarlı sprint (RSA)' } },
      { baslik: 'Çeviklik + spor spesifik kondisyon', icerik: { isinma: 'RAMP 10 dk', ceviklik: 'Reaktif çeviklik (sinyalle yön değiştirme)\n505', power: 'Lateral bound\nTek ayak hop', kuvvet: 'Trap bar jump\nSplit squat', kardiyo: 'Small-sided oyun / spor spesifik interval' } },
    ],
    ilerleme: [
      H('4×20 m uçan · 3 dk', '80 temas · orta', '4×5 @%78', '2×(6×20 sn : 40 sn)', '', { ceviklik: '6 tekrar reaktif' }),
      H('5×20 m uçan · 3 dk', '90 temas · orta', '4×4 @%80', '3×(6×20 sn : 40 sn)', '', { ceviklik: '8 tekrar reaktif' }),
      H('6×20 m uçan · 3 dk', '100 temas · yüksek', '4×3 @%83', '3×(6×15 sn : 30 sn)', '', { ceviklik: '8 tekrar reaktif' }),
      H('6×30 m · 3 dk', '100 temas · yüksek', '4×3 @%85', '2×(6×30 m RSA · 20 sn)', '', { ceviklik: '10 tekrar reaktif' }),
      H('6×30 m · 4 dk', '110 temas · yüksek', '3×3 @%87', '3×(6×30 m RSA · 20 sn)', 'En yoğun hafta', { ceviklik: '10 tekrar reaktif' }),
      H('4×20 m · 3 dk', '60 temas · orta', '3×2 @%75', '1×(6×30 m RSA)', 'Deload + test haftası', { ceviklik: '6 tekrar' }),
    ],
  },
  musabaka: {
    ad: 'Müsabaka öncesi (taper)', faz: 'musabaka', haftaGunleri: [1, 3, 5],
    bolumler: ['isinma', 'kuvvet', 'power', 'hiz', 'kardiyo'],
    not: 'Yoğunluk korunur, hacim kademeli düşer. Amaç sezona taze ve hızlı girmek.',
    gunler: [
      { baslik: 'Kuvvet koruma', icerik: { isinma: 'RAMP 10 dk', power: 'Box jump', kuvvet: 'Back squat\nRDL\nBench press' } },
      { baslik: 'Hız', icerik: { isinma: 'RAMP + sprint drilleri', hiz: 'Hızlanma 10–20 m\nUçan 10 m', power: 'Pogo\nBound', kardiyo: 'Kısa interval' } },
      { baslik: 'Aktivasyon', icerik: { isinma: 'Dinamik mobilite', hiz: 'Reaksiyon start 5 m', power: 'Düşük hacim sıçrama', kuvvet: 'Hafif güç: med ball' } },
    ],
    ilerleme: [
      H('5×20 m · 3 dk', '60 temas · yüksek kalite', '3×3 @%85', '2×(5×20 sn : 40 sn)', 'Hacim %30 azalır'),
      H('4×20 m · 3 dk', '40 temas', '3×2 @%85', '1×(5×20 sn : 40 sn)', 'Hacim %50 azalır, yoğunluk korunur'),
      H('3×15 m · 3 dk', '20 temas', '2×2 @%80', '—', 'Müsabaka haftası: tazelik'),
    ],
  },
  sezon_arasi: {
    ad: 'Sezon arası', faz: 'sezon_arasi', haftaGunleri: [1, 3, 5],
    bolumler: ['isinma', 'kuvvet', 'kardiyo', 'mobilite'],
    not: 'Aktif dinlenme. Yaralanma geçmişi olan bölgelere rehabilitasyon ağırlıklı çalışma.',
    gunler: [
      { baslik: 'Genel kuvvet', icerik: { isinma: 'Mobilite 10 dk', kuvvet: 'Goblet squat\nHip thrust\nŞınav\nRow', mobilite: 'Esneme' } },
      { baslik: 'Aerobik + mobilite', icerik: { isinma: 'Hafif koşu', kardiyo: 'Bisiklet / yüzme Z2', mobilite: 'Mobilite akışı 20 dk' } },
      { baslik: 'Alternatif spor', icerik: { kardiyo: 'Farklı bir spor, oyun', mobilite: 'Foam roller' } },
    ],
    ilerleme: [
      H('', '', '2×10 @%60', '30 dk Z2', 'Tam dinlenme haftası da olabilir'),
      H('', '', '3×10 @%60', '35 dk Z2', ''),
      H('', '', '3×8 @%65', '40 dk Z2', ''),
      H('', '', '3×8 @%65', '40 dk Z2 + 4×1 dk Z4', 'Genel hazırlığa geçiş'),
    ],
  },
  kuvvet: {
    ad: 'Kuvvet bloğu', faz: 'kuvvet', haftaGunleri: [1, 3, 5],
    bolumler: ['isinma', 'kuvvet'],
    not: 'Saf kuvvet odaklı blok. Ana hareketlerde uzun dinlenme (3–4 dk).',
    gunler: [
      { baslik: 'Squat günü', icerik: { isinma: 'RAMP 10 dk', kuvvet: 'Back squat\nRDL 3×6\nWalking lunge 3×8\nCore' } },
      { baslik: 'Bench günü', icerik: { isinma: 'RAMP 10 dk', kuvvet: 'Bench press\nWeighted barfiks 4×5\nOverhead press 3×6\nDumbbell row 3×8' } },
      { baslik: 'Deadlift günü', icerik: { isinma: 'RAMP 10 dk', kuvvet: 'Deadlift\nFront squat 3×5\nClose-grip bench 3×6\nFarmer walk 3×30 m' } },
    ],
    ilerleme: ['4×6 @%75', '4×5 @%78', '5×5 @%80', '5×4 @%83', '5×3 @%86', '3×3 @%70'].map((k, i) =>
      H('', '', k, '', i === 4 ? 'En ağır hafta' : i === 5 ? 'Deload + test' : '')
    ),
  },
  bos: {
    ad: '', faz: 'genel', haftaGunleri: [1, 3, 5],
    bolumler: ['isinma', 'kuvvet', 'core', 'mobilite'],
    not: '',
    gunler: [{ baslik: '', icerik: {} }, { baslik: '', icerik: {} }, { baslik: '', icerik: {} }],
    ilerleme: Array.from({ length: 6 }, () => ({ not: '', bolum: {} })),
  },
};
export const SABLON_ADLARI_SPORCU = [
  ['genel', 'Genel hazırlık'], ['ozel', 'Özel hazırlık'], ['musabaka', 'Müsabaka öncesi'],
  ['sezon_arasi', 'Sezon arası'], ['kuvvet', 'Kuvvet bloğu'], ['bos', 'Boş blok'],
];

const P = (baslik, liste) => ({ baslik, icerik: { liste: liste.join('\n') } });
export const SABLONLAR_PT = {
  'masa-basi': {
    ad: 'Masa başı: duruş ve mobilite', haftaGunleri: [2, 4],
    not: 'Öne kayık baş, yuvarlak omuz ve kalça fleksör kısalığına yönelik. Ağrı artarsa egzersizi bırak.',
    gunler: [
      P('Mobilite + duruş', ['Cat-camel — 2×10', 'Torakal rotasyon — 2×8 / yön', 'Chin tuck — 2×10', 'Band pull-apart — 3×12', 'Glute bridge — 3×12', 'Dead bug — 3×8 / yön']),
      P('Tüm vücut kuvvet', ['Goblet squat — 3×10', 'Kablo / band row — 3×12', 'Dambıl RDL — 3×10', 'Eğimli şınav — 3×8', 'Side plank — 3×20 sn', 'Kalça fleksör esnetme — 2×30 sn']),
    ],
  },
  'ileri-yas': {
    ad: 'İleri yaş: denge ve fonksiyonel kuvvet', haftaGunleri: [2, 5],
    not: 'Düşme riskini azaltmaya yönelik denge ve günlük yaşam kuvveti. Destekli başla, güven arttıkça desteği azalt.',
    gunler: [
      P('Kuvvet + denge', ['Sandalyeden kalk-otur — 3×10', 'Duvar şınavı — 3×10', 'Tek ayak denge (destekli) — 3×20 sn', 'Topuk-parmak yürüyüş — 2×10 m', 'Band row — 3×12', 'Calf raise — 3×12']),
      P('Fonksiyonel', ['Step-up (alçak basamak) — 3×8 / bacak', 'Farmer walk — 3×20 m', 'Glute bridge — 3×12', 'Bird-dog — 3×8 / yön', 'Band ile yan adım — 3×10', 'Yürüyüş — 15 dk']),
    ],
  },
  kilo: {
    ad: 'Kilo verme: kuvvet + kardiyo', haftaGunleri: [1, 3, 5],
    not: 'Kas kütlesini koruyan kuvvet çalışması ve düzenli kardiyo. Beslenme önerisi kapsam dışı.',
    gunler: [
      P('Tüm vücut A + interval', ['Goblet squat — 3×12', 'Dambıl row — 3×12', 'Kettlebell deadlift — 3×10', 'Şınav — 3×10', 'Bisiklet interval — 8×(30 sn hızlı / 60 sn yavaş)']),
      P('Tüm vücut B + Z2', ['Reverse lunge — 3×10 / bacak', 'Lat pulldown — 3×12', 'Hip thrust — 3×12', 'Overhead press — 3×10', 'Kürek ergometresi — 15 dk Z2']),
      P('Devre', ['4 tur: KB swing 15 · step-up 10 / bacak · TRX row 12 · plank 30 sn', 'Yürüyüş — 20 dk']),
    ],
  },
  agri: {
    ad: 'Ağrı yönetimi: kontrollü güçlendirme', haftaGunleri: [2, 4],
    not: 'Ağrıyı artırmayan aralıkta çalış (0–10 ölçeğinde 3 ve altı). Ağrı artarsa dur; tanı ve yönlendirme için uzmana danış.',
    gunler: [
      P('Kontrol + stabilite', ['Diyafram nefesi — 2 dk', 'Cat-camel — 2×10', 'Dead bug — 3×8 / yön', 'Bird-dog — 3×8 / yön', 'Glute bridge — 3×12', 'Side plank (diz) — 3×20 sn']),
      P('Hareket + kuvvet', ['Hip hinge drill (çubukla) — 3×10', 'Kutuya goblet squat — 3×10', 'Pallof press — 3×10 / yön', 'Band row — 3×12', 'Suitcase carry — 3×20 m', 'Yürüyüş — 15 dk']),
    ],
  },
  kas: {
    ad: 'Kas kazanımı: alt / üst / tüm vücut', haftaGunleri: [1, 3, 5],
    not: 'Her hafta ana hareketlerde küçük yük artışı. Son setlerde 1–2 tekrar yedekte kalsın.',
    gunler: [
      P('Alt vücut', ['Squat — 4×8', 'RDL — 3×10', 'Leg press — 3×12', 'Walking lunge — 3×10 / bacak', 'Calf raise — 3×15']),
      P('Üst vücut', ['Bench press — 4×8', 'Row — 4×10', 'Overhead press — 3×10', 'Lat pulldown — 3×12', 'Biceps / triceps — 3×12']),
      P('Tüm vücut', ['Deadlift — 3×6', 'Eğimli dambıl press — 3×10', 'Split squat — 3×10', 'Face pull — 3×15', 'Plank — 3×40 sn']),
    ],
  },
  genel: {
    ad: 'Genel sağlık ve kondisyon', haftaGunleri: [2, 5],
    not: 'Haftada iki gün dengeli kuvvet ve kardiyo.',
    gunler: [
      P('Gün A', ['Goblet squat — 3×10', 'Şınav — 3×10', 'Row — 3×12', 'Glute bridge — 3×12', 'Plank — 3×30 sn', 'Bisiklet — 10 dk']),
      P('Gün B', ['Step-up — 3×10', 'Dambıl press — 3×10', 'Lat pulldown — 3×12', 'Farmer walk — 3×20 m', 'Side plank — 3×20 sn', 'Kardiyo — 15 dk Z2']),
    ],
  },
  bos: { ad: '', haftaGunleri: [2, 4], not: '', gunler: [P('', []), P('', [])] },
};

export function yeniBlok({ sablon, sade, baslangic }) {
  const kaynak = sade ? SABLONLAR_PT[sablon] || SABLONLAR_PT.bos : SABLONLAR_SPORCU[sablon] || SABLONLAR_SPORCU.bos;
  const k = JSON.parse(JSON.stringify(kaynak));
  if (sade) {
    return {
      ad: k.ad, faz: 'adaptasyon', fazAdi: '', baslangic, haftalar: 4, plan: 'hafta',
      haftaGunleri: k.haftaGunleri, bolumler: [], gunler: k.gunler, ilerleme: [], not: k.not, sade: true,
    };
  }
  return {
    ad: k.ad, faz: k.faz, fazAdi: '', baslangic, haftalar: k.ilerleme.length, plan: 'hafta',
    haftaGunleri: k.haftaGunleri, bolumler: k.bolumler,
    gunler: k.gunler.map((g) => ({ ...g, bolumler: Object.keys(g.icerik).length ? BOLUM_SIRASI.filter((b) => g.icerik[b] != null) : [] })),
    ilerleme: k.ilerleme, not: k.not, sade: false,
  };
}

// Eski Sporcu Kartı bloğu → yeni biçim
export function eskiBloguDonustur(b) {
  const OLD = { surat: 'hiz', plio: 'power', kondisyon: 'kardiyo', toparlanma: 'mobilite' };
  const m = (k) => OLD[k] || k;
  const icerikDonustur = (o = {}) => {
    const r = {};
    for (const [k, v] of Object.entries(o)) r[m(k)] = r[m(k)] && v ? r[m(k)] + '\n' + v : r[m(k)] || v;
    return r;
  };
  const ilerleme = (b.prog || []).map((p) => {
    const h = { not: p.note || '' };
    if (Array.isArray(p.ds)) h.gun = p.ds.map((d) => icerikDonustur(d || {}));
    else h.bolum = icerikDonustur(p.sec || {});
    return h;
  });
  return {
    ad: b.name || 'Blok',
    faz: FAZLAR_SPORCU[b.phase] ? b.phase : 'ozelAd',
    fazAdi: FAZLAR_SPORCU[b.phase] ? '' : b.phase || '',
    baslangic: b.start,
    haftalar: b.weeks || ilerleme.length || 6,
    plan: b.schedule === 'md' ? 'mac' : 'hafta',
    haftaGunleri: b.weekdays || [1, 3, 5],
    bolumler: (b.sections || []).map(m),
    gunler: (b.days || []).map((d) => ({
      baslik: d.title || '',
      bolumler: (d.secs || []).map(m),
      icerik: icerikDonustur(d.items || {}),
      md: d.md ?? null,
    })),
    ilerleme,
    not: b.note || '',
    sade: false,
  };
}

// Güne özel değişiklik uygulanmış seans. ozel: gunOzel belgesi (yoksa null)
export function gununSeansi(bloklar, tarih, ozel, maclar = []) {
  const s = planliSeans(bloklar, tarih, maclar);
  if (!ozel) return s;
  if (ozel.dinlenme) return { blok: s?.blok || null, dinlenme: true, ozel: true, ozelNot: ozel.not || '' };
  const gun = { baslik: ozel.baslik || '', bolumler: ozel.bolumler || [], icerik: ozel.icerik || {} };
  const gunIdx = s?.gunIdx ?? 0;
  const gunDoz = [];
  gunDoz[gunIdx] = ozel.doz || {};
  return {
    blok: s?.blok || { sade: !!ozel.sade, bolumler: ozel.bolumler || [] },
    hafta: s?.hafta ?? 0,
    gunIdx,
    gun,
    rx: { not: ozel.not || '', gun: gunDoz },
    ozel: true,
    ozelNot: ozel.not || '',
  };
}

// Seansın kısa metin özeti (antrenman kaydına yazılır)
export function seansOzeti(s) {
  if (!s?.gun) return '';
  if (s.blok?.sade) return s.gun.icerik?.liste || '';
  return gunBolumleri(s.blok, s.gun)
    .map((k) => {
      const d = dozaj(s.rx, s.gunIdx, k);
      const h = String(s.gun.icerik?.[k] || '').split('\n').map((x) => x.trim()).filter(Boolean).join(', ');
      if (!h && !d) return '';
      return `${BOLUMLER[k]?.ad || k}${d ? ` (${d})` : ''}: ${h}`;
    })
    .filter(Boolean)
    .join('\n');
}
