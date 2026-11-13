// Gelişim raporu hesapları. Test sonuçları: [{ test, tarih, deger, taraf?, normSeviye? }]
import { TESTLER, TEST_KATEGORILERI, testBilgisi } from '../testler/tanimlar.js';

export const TEST_ACIKLAMA = {
  '5 m sürat (sn)': 'İlk adımların hızı, çıkıştaki patlayıcılık',
  '10 m sürat (sn)': 'Hızlanma becerisi; oyundaki kısa atakların temeli',
  '20 m sürat (sn)': 'Hızlanma ve hıza ulaşma',
  '30 m sürat (sn)': 'Hızlanmadan maksimal hıza geçiş',
  'CMJ (cm)': 'Dikey sıçrama yüksekliği; bacakların patlayıcı gücü',
  'CMJ · uçuş süresi (sn)': 'Sıçramada havada kalınan süre',
  'Squat jump (cm)': 'Hareketsiz pozisyondan sıçrama; saf patlayıcı güç',
  'Drop jump RSI': 'Yere değip hızla yeniden sıçrayabilme (reaktif güç)',
  'Tek ayak CMJ (cm)': 'Tek bacakla sıçrama gücü',
  'Durarak uzun atlama (cm)': 'Yatay sıçrama; tüm vücudun patlayıcı gücü',
  'Bosco skoru (cm)': '30 saniye boyunca tekrarlı sıçramalarda ortalama performans',
  'Bosco · en yüksek sıçrama (cm)': 'Tekrarlı sıçramalardaki en iyi sıçrama',
  'Bosco · ortalama yükseklik (cm)': 'Tekrarlı sıçramaların ortalama yüksekliği',
  'Bosco · ortalama RSI': 'Tekrarlı sıçramalarda reaktif güç',
  'Bosco · ortalama temas süresi (sn)': 'Sıçramalar arasında yerde kalınan süre; kısa olması iyidir',
  'Bosco · yorgunluk indeksi (%)': 'Sıçrama boyunca performans düşüşü; düşük olması iyidir',
  'Bosco · toplam sıçrama': '30 saniyede yapılan sıçrama sayısı',
  'V-cut (sn)': 'Açılı kesmelerle yön değiştirme hızı',
  '505 çeviklik (sn)': '180° dönüşte yön değiştirme hızı',
  'T-test (sn)': 'İleri, yana ve geri hareketlerde çeviklik',
  'Denge (puan)': 'Tek ayak üzerinde denge kontrolü',
  'Otur-uzan (cm)': 'Arka bacak ve bel esnekliği',
  'Squat 1RM (kg)': 'Bacak kuvveti (tek tekrarda kaldırılabilen en yüksek ağırlık)',
  'Kavrama kuvveti (kg)': 'El ve önkol kuvveti; genel kuvvetin göstergesi',
  'Yo-Yo IR1 (m)': 'Kısa dinlenmelerle tekrarlanan koşularda dayanıklılık',
};

const ANTROPOMETRI = new Set(['Boy (cm)', 'Vücut ağırlığı (kg)', 'Bel çevresi (cm)']);
const satirAnahtari = (t) => t.test + (t.taraf ? '|' + t.taraf : '');
export const testTarihleri = (liste) => [...new Set(liste.map((t) => t.tarih))].sort();

// Belirtilen tarihe kadar (dahil) en son ölçüm
function tariheKadar(liste, anahtar, tarih) {
  return liste
    .filter((t) => satirAnahtari(t) === anahtar && t.tarih <= tarih)
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .pop();
}

export function degisimMetni(iyi, onceki, son) {
  if (onceki == null || !onceki) return '';
  const d = son - onceki;
  if (Math.abs(d) < 1e-9) return 'Değişim yok.';
  const p = '%' + Math.abs((d / onceki) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  if (iyi === 'notr') return d > 0 ? `${p} arttı.` : `${p} azaldı.`;
  if (iyi === 'dusuk') return d < 0 ? `${p} azaldı, gelişme var.` : `${p} arttı, gerileme var.`;
  return d > 0 ? `${p} oranında artış oldu, gelişme var.` : `${p} oranında düşüş oldu, gerileme var.`;
}

// Kategorilere göre gruplanmış karşılaştırma satırları
export function testSatirlari(liste, A, B, { vucut = false } = {}) {
  const anahtarlar = [...new Set(liste.map(satirAnahtari))];
  const kategoriler = [...TEST_KATEGORILERI.map(([k]) => k), 'Diğer'];
  const sira = Object.keys(TESTLER);
  const gruplar = kategoriler.map((kat) => {
    const satirlar = anahtarlar
      .filter((k) => {
        const t = k.split('|')[0];
        if (!vucut && ANTROPOMETRI.has(t)) return false;
        return testBilgisi(t).kat === kat;
      })
      .sort((x, y) => {
        const a = sira.indexOf(x.split('|')[0]), b = sira.indexOf(y.split('|')[0]);
        return (a < 0 ? 999 : a) - (b < 0 ? 999 : b) || x.localeCompare(y, 'tr');
      })
      .map((k) => {
        const [test, taraf] = k.split('|');
        const bilgi = testBilgisi(test);
        const son = tariheKadar(liste, k, B);
        if (!son) return null;
        const onceki = A ? tariheKadar(liste, k, A) : null;
        const yeni = !A || son.tarih > A;
        const pv = onceki && yeni ? onceki.deger : null;
        const tum = liste.filter((t) => satirAnahtari(t) === k && t.tarih <= B).map((t) => t.deger);
        const enIyi = bilgi.iyi === 'dusuk' ? Math.min(...tum) : Math.max(...tum);
        const fark = pv != null ? son.deger - pv : null;
        const iyi = fark == null || Math.abs(fark) < 1e-9 || bilgi.iyi === 'notr' ? null : bilgi.iyi === 'dusuk' ? fark < 0 : fark > 0;
        const rekor = bilgi.iyi !== 'notr' && tum.length > 1 && son.deger === enIyi && yeni && pv != null && son.deger !== pv;
        return { anahtar: k, test, taraf: taraf || null, bilgi, son, onceki: pv, fark, iyi, rekor, yeni };
      })
      .filter(Boolean);
    return { kat, satirlar };
  });
  return gruplar.filter((g) => g.satirlar.length);
}

// Grafik için noktalar (B'ye kadar)
export function grafikNoktalari(liste, anahtar, B) {
  return liste
    .filter((t) => satirAnahtari(t) === anahtar && t.tarih <= B)
    .sort((a, b) => a.tarih.localeCompare(b.tarih));
}

// Antrenman özeti: kayıtlar (antrenmanKayitlari) ve wellness, [A, B] aralığı
export function antrenmanOzeti(kayitlar, wellness, A, B) {
  const ara = (t) => t >= A && t <= B;
  const k = kayitlar.filter((x) => ara(x.tarih || ''));
  const geldi = k.filter((x) => !x.katilim || x.katilim === 'geldi');
  const planli = k.filter((x) => x.katilim !== 'izinli').length;
  const rpeler = geldi.map((x) => x.rpe).filter((v) => typeof v === 'number');
  const dakika = geldi.reduce((t, x) => t + (Number(x.sure) || 0), 0);
  const w = wellness.filter((x) => ara(x.tarih || ''));
  const wp = w
    .map((x) => {
      const d = ['uyku', 'enerji', 'kasAgrisi', 'stres', 'ruhHali'].map((a) => x[a]).filter((v) => typeof v === 'number');
      return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
    })
    .filter((v) => v != null);
  return {
    seans: geldi.length,
    katilim: planli ? geldi.length / planli : null,
    dakika,
    ortRpe: rpeler.length ? rpeler.reduce((a, b) => a + b, 0) / rpeler.length : null,
    ortWellness: wp.length ? wp.reduce((a, b) => a + b, 0) / wp.length : null,
    wellnessSayisi: wp.length,
  };
}
