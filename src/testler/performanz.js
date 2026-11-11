// Performanz "Veri Analiz Portalı" PDF raporlarını okur.
// Tüm raporlarda üst kısım aynı (sporcu ve test bilgileri); alt kısım teste özel.
// Girdi: pdf.js metin öğeleri [{ s, x, y, sayfa }] — y yukarı doğru artar (PDF koordinatı).
import { sayiyaCevir } from './tanimlar.js';

// pdf.js metni harf harf parçalayabiliyor ("B","os","c","o"…). Aynı satırdaki yakın parçaları
// ifadelere birleştir; aradaki boşluk büyükse ayrı ifade (ayrı sütun) olarak bırak.
export function ifadelereBirlestir(ogeler) {
  const sirali = [...ogeler].filter((o) => o.s !== '').sort((a, b) => a.sayfa - b.sayfa || b.y - a.y || a.x - b.x);
  const satirlar = [];
  for (const o of sirali) {
    const son = satirlar[satirlar.length - 1];
    if (son && son.sayfa === o.sayfa && Math.abs(son.y - o.y) < 3) son.p.push(o);
    else satirlar.push({ sayfa: o.sayfa, y: o.y, p: [o] });
  }
  const ifadeler = [];
  for (const sat of satirlar) {
    sat.p.sort((a, b) => a.x - b.x);
    let cur = null;
    for (const o of sat.p) {
      const gen = o.w ?? o.s.length * 5;
      if (cur) {
        const bosluk = o.x - cur.son;
        if (bosluk < 9 && !(o.s.trim() === '' && bosluk > 4)) {
          cur.s += (bosluk > 1.5 && !cur.s.endsWith(' ') && !o.s.startsWith(' ') ? ' ' : '') + o.s;
          cur.son = o.x + gen;
          continue;
        }
        ifadeler.push(cur);
      }
      cur = { s: o.s, x: o.x, y: sat.y, sayfa: sat.sayfa, son: o.x + gen };
    }
    if (cur) ifadeler.push(cur);
  }
  return ifadeler
    .map((i) => ({ ...i, s: i.s.replace(/\s+/g, ' ').trim() }))
    .filter((i) => i.s);
}

// İfadeleri satırlara grupla (yukarıdan aşağı, soldan sağa)
export function satirlaraAyir(ifadeler) {
  const satirlar = [];
  for (const o of ifadeler) {
    const son = satirlar[satirlar.length - 1];
    if (son && son.sayfa === o.sayfa && Math.abs(son.y - o.y) < 3) son.ogeler.push(o);
    else satirlar.push({ sayfa: o.sayfa, y: o.y, ogeler: [o] });
  }
  for (const s of satirlar) {
    s.ogeler.sort((a, b) => a.x - b.x);
    s.metin = s.ogeler.map((o) => o.s).join(' ');
  }
  return satirlar;
}

const tarihCevir = (s) => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// "Etiket:" öğesinin hemen sağındaki değer (aynı satırda, bir sonraki etikete kadar)
function etiketDegeri(satirlar, etiket) {
  for (const sat of satirlar) {
    const i = sat.ogeler.findIndex((o) => o.s.trim().replace(/\s+/g, ' ').startsWith(etiket));
    if (i < 0) continue;
    const ilk = sat.ogeler[i].s.trim();
    const ayni = ilk.slice(etiket.length).trim();
    if (ayni) return ayni;
    const sonraki = sat.ogeler[i + 1];
    if (sonraki && !/:$/.test(sonraki.s.trim())) return sonraki.s.trim();
    return '';
  }
  return null;
}

// Bir başlığın altındaki (bir sonraki satırlarda, yatayda en yakın) değer — kutucuklu özetler için
function altindakiDeger(ogeler, etiket) {
  const e = ogeler.find((o) => o.s.trim().startsWith(etiket));
  if (!e) return null;
  const adaylar = ogeler.filter(
    (o) => o.sayfa === e.sayfa && o.y < e.y - 2 && e.y - o.y < 45 && /[\d]/.test(o.s) && Math.abs(o.x - e.x) < 90
  );
  adaylar.sort((a, b) => b.y - a.y || Math.abs(a.x - e.x) - Math.abs(b.x - e.x));
  return adaylar[0]?.s.trim() || null;
}

const SEVIYELER = ['Desteklenmeli', 'Geliştirilmeli', 'Normal', 'İyi', 'Mükemmel'];

export function raporuOku(hamOgeler) {
  const ogeler = ifadelereBirlestir(hamOgeler);
  const satirlar = satirlaraAyir(ogeler);
  const tumMetin = satirlar.map((s) => s.metin).join('\n');

  if (!/PERFORMANZ|Veri Analiz Portalı/i.test(tumMetin) || !/Adı Soyadı/.test(tumMetin)) {
    return { hata: 'Bu bir Performanz raporu gibi görünmüyor.' };
  }

  const ad = etiketDegeri(satirlar, 'Adı Soyadı:') || '';
  const dogum = tarihCevir(etiketDegeri(satirlar, 'Doğum Tarihi:'));
  const tarih = tarihCevir(etiketDegeri(satirlar, 'Tarih:'));
  const cinsiyet = etiketDegeri(satirlar, 'Cinsiyet:') || '';
  const boy = sayiyaCevir((etiketDegeri(satirlar, 'Boy:') || '').replace(/cm/i, ''));
  const kilo = sayiyaCevir((etiketDegeri(satirlar, 'Kilo:') || '').replace(/kg/i, ''));
  const takim = etiketDegeri(satirlar, 'Takım:') || '';
  const sonucHam = etiketDegeri(satirlar, 'Sonuç:') || '';
  const sm = /(-?[\d.,]+)\s*([^\d\s].*)?$/.exec(sonucHam);
  const sonuc = sm ? sayiyaCevir(sm[1]) : null;
  const birim = sm?.[2]?.trim() || '';

  // Test türü: başlıktaki ad satırının en sağındaki öğe (ör. "Counter Movement Jump (CMJ)")
  let tur = '';
  const adSatiri = satirlar.find((s) => s.ogeler.length >= 2 && s.ogeler[0].s.trim() === ad);
  if (adSatiri) tur = adSatiri.ogeler.slice(1).map((o) => o.s).join(' ').trim();
  if (!tur) tur = etiketDegeri(satirlar, 'Tür:') || '';

  // Normatif değerlendirme
  const yasGrubu = (/Yaş Grubu:\s*([\d]+\s*-\s*[\d]+)/.exec(tumMetin)?.[1] || '').replace(/\s/g, '');
  const seviyeM = /[“"](Desteklenmeli|Geliştirilmeli|Normal|İyi|Mükemmel)[”"]/.exec(tumMetin);
  const normSeviye = seviyeM && SEVIYELER.includes(seviyeM[1]) ? seviyeM[1] : null;
  const normTakimdan = /bu teste ait/i.test(tumMetin) && /takım ortalaması kullanılarak/i.test(tumMetin.replace(/\s+/g, ' '));

  const sonucNesnesi = {
    ad, dogum, tarih, cinsiyet, boy, kilo, takim, tur, sonuc, birim,
    yasGrubu, normSeviye: normTakimdan ? null : normSeviye, normTakimdan,
    detay: {}, olcumler: [],
  };

  const t = tur.toLocaleLowerCase('tr');
  if (/bosco/.test(t)) {
    const etiketler = [
      ['Bosco Skoru', 'boscoSkoru'], ['Yorgunluk İndeksi', 'yorgunlukIndeksi'], ['Ortalama RSI', 'ortalamaRsi'],
      ['Ortalama Temas', 'ortalamaTemas'], ['Toplam Sıçrama', 'toplamSicrama'], ['Ortalama Yükseklik', 'ortalamaYukseklik'],
      ['En Yüksek Sıçrama', 'enYuksek'],
    ];
    for (const [e, k] of etiketler) {
      const v = altindakiDeger(ogeler, e);
      if (v) sonucNesnesi.detay[k] = sayiyaCevir(v.replace(/[^\d,.-]/g, ''));
    }
    sonucNesnesi.olcumler.push({ test: 'Bosco skoru (cm)', deger: sonuc });
  } else if (/counter movement|cmj/.test(t)) {
    const ucus = altindakiDeger(ogeler, 'Uçuş Süresi');
    if (ucus) sonucNesnesi.detay.ucusSuresi = sayiyaCevir(ucus.replace(/[^\d,.-]/g, ''));
    sonucNesnesi.olcumler.push({ test: 'CMJ (cm)', deger: sonuc });
  } else if (/squat jump/.test(t)) {
    sonucNesnesi.olcumler.push({ test: 'Squat jump (cm)', deger: sonuc });
  } else if (/drop jump/.test(t)) {
    sonucNesnesi.olcumler.push({ test: 'Drop jump RSI', deger: sonuc });
  } else if (/denge/.test(t)) {
    const taraf = /sağ/.test(t) ? 'sag' : /sol/.test(t) ? 'sol' : null;
    const bolgeler = {};
    for (const m of tumMetin.matchAll(/Bölge\s+([A-Z])\s*\(%\s*([\d,]+)\)/g)) bolgeler[m[1]] = sayiyaCevir(m[2]);
    const duz = tumMetin.replace(/\s+/g, ' ');
    const onArka = /(ön|arka) bölgeye \(%([\d,]+)\)/.exec(duz);
    const sagSol = /(sağ|sol) tarafa \(%([\d,]+)\)/.exec(duz);
    sonucNesnesi.detay = {
      bolgeler,
      ...(onArka ? { onArkaYon: onArka[1], onArkaYuzde: sayiyaCevir(onArka[2]) } : {}),
      ...(sagSol ? { sagSolYon: sagSol[1], sagSolYuzde: sayiyaCevir(sagSol[2]) } : {}),
    };
    sonucNesnesi.olcumler.push({ test: 'Denge (puan)', deger: sonuc, taraf });
  } else if (/sürat|surat/.test(t)) {
    const araSureler = [];
    const gorulen = new Set();
    for (const m of tumMetin.replace(/\s+/g, ' ').matchAll(/(\d+)\s*-\s*(\d+)\s*m\s+Süre:\s*([\d,]+)\s*s\s+Hız:\s*([\d,]+)\s*m\/s/g)) {
      const k = `${m[1]}-${m[2]}`;
      if (gorulen.has(k)) continue;
      gorulen.add(k);
      araSureler.push({ aralik: k, sure: sayiyaCevir(m[3]), hiz: sayiyaCevir(m[4]) });
    }
    sonucNesnesi.detay = { araSureler };
    const mesafe = araSureler.length ? Math.max(...araSureler.map((a) => Number(a.aralik.split('-')[1]))) : null;
    sonucNesnesi.mesafe = mesafe;
    if (/belirsiz/.test(t)) {
      sonucNesnesi.belirsiz = true; // hangi test olduğu yüklemede seçilir (ör. V-cut)
      sonucNesnesi.olcumler.push({ test: null, deger: sonuc });
    } else {
      const m = /(\d+)\s*metre/.exec(t);
      const n = m ? Number(m[1]) : mesafe;
      sonucNesnesi.olcumler.push({ test: `${n} m sürat (sn)`, deger: sonuc });
    }
  } else if (/otur|uzan/.test(t)) {
    sonucNesnesi.olcumler.push({ test: 'Otur-uzan (cm)', deger: sonuc });
  } else {
    sonucNesnesi.bilinmeyen = true;
    sonucNesnesi.olcumler.push({ test: null, deger: sonuc });
  }
  return sonucNesnesi;
}

// Tarayıcıda: PDF dosyasını metin öğelerine çevir (pdf.js gerektiğinde yüklenir)
export async function pdfMetinOgeleri(dosya) {
  const pdfjs = await import('pdfjs-dist');
  const isci = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = isci;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await dosya.arrayBuffer()) }).promise;
  const ogeler = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const sayfa = await pdf.getPage(p);
    const icerik = await sayfa.getTextContent();
    for (const it of icerik.items) {
      if (!it.str) continue;
      ogeler.push({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, sayfa: p });
    }
  }
  return ogeler;
}
