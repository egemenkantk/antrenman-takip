// WhatsApp'tan yapıştırılan fikstür metnini satır satır etkinliğe çevirir.
// Her satırda bir tarih aranır (07.12.2026, 7.12, 7/12/26, 7 Aralık, 7 Ara 2026); saat (14:00, 14.00) ve
// geri kalan metin başlık olur. Tarihi bulunamayan satırlar atlanır ve "okunamadı" olarak döner.

const AYLAR = ['oca', 'şub', 'mar', 'nis', 'may', 'haz', 'tem', 'ağu', 'eyl', 'eki', 'kas', 'ara'];
const GUN_ADLARI = /\b(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar|pzt|sal|çar|car|per|cum|cmt|paz)\b\.?/giu;
const iki = (n) => String(n).padStart(2, '0');

function yilBul(gun, ay, yil, bugun) {
  if (yil) return yil < 100 ? 2000 + yil : yil;
  // Yıl yazılmamışsa: bugünden 2 aydan eskiye düşüyorsa gelecek yıl sayılır
  const by = Number(bugun.slice(0, 4));
  const aday = `${by}-${iki(ay)}-${iki(gun)}`;
  const sinir = new Date(bugun + 'T00:00:00Z');
  sinir.setUTCDate(sinir.getUTCDate() - 60);
  return aday < sinir.toISOString().slice(0, 10) ? by + 1 : by;
}

function gecerli(y, a, g) {
  const d = new Date(Date.UTC(y, a - 1, g));
  return d.getUTCFullYear() === y && d.getUTCMonth() === a - 1 && d.getUTCDate() === g;
}

export function satirOku(satir, bugun) {
  let metin = satir.replace(/[*_~]/g, ' ').trim();
  if (!metin) return null;
  let tarih = null;
  // 1) Sayısal tarih: 07.12.2026 / 7.12 / 7/12/26 / 07-12-2026
  let m = metin.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?!\d)/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
    const g = Number(m[1]), a = Number(m[2]);
    const y = yilBul(g, a, m[3] ? Number(m[3]) : null, bugun);
    if (gecerli(y, a, g)) {
      tarih = `${y}-${iki(a)}-${iki(g)}`;
      metin = metin.replace(m[0], ' ');
    }
  }
  // 2) Ay adıyla: 7 Aralık (2026)
  if (!tarih) {
    m = metin.match(/(?<!\d)(\d{1,2})\s+([a-zçğıöşü]+)\.?(?:\s+(\d{4}))?/iu);
    const ay = m ? AYLAR.findIndex((x) => m[2].toLocaleLowerCase('tr').startsWith(x)) + 1 : 0;
    if (m && ay) {
      const g = Number(m[1]);
      const y = yilBul(g, ay, m[3] ? Number(m[3]) : null, bugun);
      if (gecerli(y, ay, g)) {
        tarih = `${y}-${iki(ay)}-${iki(g)}`;
        metin = metin.replace(m[0], ' ');
      }
    }
  }
  if (!tarih) return { okunamadi: satir.trim() };
  // Saat: 14:00 / 14.00
  let saat = '';
  const s = metin.match(/(?<!\d)([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/);
  if (s) {
    saat = `${iki(s[1])}:${s[2]}`;
    metin = metin.replace(s[0], ' ');
  }
  const ad = metin
    .replace(GUN_ADLARI, ' ')
    .replace(/\b(saat|tarih)\b:?/giu, ' ')
    .replace(/^[\s\-–—|,:;•·>]+|[\s\-–—|,:;•·]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*:\s*[–—-]\s*/g, ' – ')
    .trim();
  return { tarih, saat, ad };
}

export function fiksturOku(metin, bugun) {
  const satirlar = [];
  const okunamayan = [];
  for (const satir of String(metin || '').split(/\r?\n/)) {
    const r = satirOku(satir, bugun);
    if (!r) continue;
    if (r.okunamadi) okunamayan.push(r.okunamadi);
    else satirlar.push(r);
  }
  satirlar.sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  return { satirlar, okunamayan };
}
