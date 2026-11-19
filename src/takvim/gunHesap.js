// Bir gün için seans kartları (Bugün ekranı ve Takvim aynı hesabı kullanır)
import { coz, gununSeansi } from '../program/model';
import { maclar } from './veri';

// degisiklikler: ders saati değişikliği / taşıma / iptal (takvim/degisiklik.js)
export function gununKartlari({ kisiler, gruplar, programlar, ozeller, etkinlikler = [], degisiklikler = [], tarih, sube = '', benimId = null }) {
  const degOf = (id) => degisiklikler.find((d) => d.sahipId === id && d.tarih === tarih) || null;
  // Başka günden bu güne taşınan dersler
  const gelenler = (id) => degisiklikler.filter((d) => d.sahipId === id && d.islem === 'tasi' && d.yeniTarih === tarih && d.tarih !== tarih);
  const hg = coz(tarih).getDay();
  const bloklari = (id) =>
    programlar.filter((p) => p.sahipId === id).sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || ''));
  const ozelOf = (id) => ozeller.find((o) => o.sahipId === id && o.tarih === tarih) || null;
  const kisininGruplari = (id) => gruplar.filter((g) => g.aktif !== false && (g.uyeIds || []).includes(id)).map((g) => g.id);
  // Güne özel düzenleme hariç, programda bugün seans var mı
  const programli = (id, mac) => {
    const p = gununSeansi(bloklari(id), tarih, null, mac);
    return !!(p && !p.dinlenme && p.gun);
  };
  const sonuc = [];

  for (const g of gruplar) {
    if (g.aktif === false || g.sadeceOdeme) continue;
    if (sube && g.subeId !== sube) continue;
    if (benimId && !(g.kocIds || []).includes(benimId)) continue;
    const ozel = ozelOf(g.id);
    const s = gununSeansi(bloklari(g.id), tarih, ozel, maclar(etkinlikler, { tip: 'grup', id: g.id }));
    const saat = g.saatler?.[hg];
    const planli = s && !s.dinlenme && s.gun;
    // Başlangıç tarihi (kişi) ya da gruba katılım tarihinden önceki günlerde üye görünmez
    const uyeler = (g.uyeIds || [])
      .map((id) => kisiler.find((k) => k.id === id))
      .filter((k) => k && k.aktif !== false && !(k.baslangicTarihi && tarih < k.baslangicTarihi) && !(g.uyeKatilim?.[k.id] && tarih < g.uyeKatilim[k.id]));
    for (const d of gelenler(g.id)) {
      const s2 = gununSeansi(bloklari(g.id), d.tarih, ozelOf(g.id), maclar(etkinlikler, { tip: 'grup', id: g.id }));
      sonuc.push({ tip: 'grup', id: g.id, ad: g.ad, saat: d.yeniSaat || '', sure: g.sure, s: s2, ozel: null, uyeler, g, degisiklik: d, durum: 'gelen' });
    }
    const deg = degOf(g.id);
    if (saat == null && !ozel && !planli && !deg) continue;
    // Bu güne taşınan ders varsa ve bugün sabit saat/planlı seans yoksa, güne özel düzenleme o derse aittir: ikinci kart açılmaz
    if (saat == null && gelenler(g.id).length && !programli(g.id, maclar(etkinlikler, { tip: 'grup', id: g.id }))) continue;
    sonuc.push({ tip: 'grup', id: g.id, ad: g.ad, saat: deg?.islem === 'saat' ? deg.yeniSaat : saat || '', eskiSaat: saat || '', sure: g.sure, s, ozel, uyeler, g, degisiklik: deg, durum: deg ? (deg.islem === 'saat' ? 'saat' : deg.islem === 'iptal' ? 'iptal' : 'gitti') : null });
  }
  for (const k of kisiler) {
    if (k.aktif === false) continue;
    if (k.baslangicTarihi && tarih < k.baslangicTarihi) continue; // başlamadan önceki günlerde görünmez
    if (sube && !(k.subeIds || []).includes(sube)) continue;
    if (benimId && !(k.kocIds || []).includes(benimId)) continue;
    const ozel = ozelOf(k.id);
    const mac = maclar(etkinlikler, { tip: 'kisi', id: k.id, grupIds: kisininGruplari(k.id) });
    const s = gununSeansi(bloklari(k.id), tarih, ozel, mac);
    const saat = k.haftalikSaatler?.[hg];
    const planli = s && !s.dinlenme && s.gun;
    for (const d of gelenler(k.id)) {
      // Taşınan ders asıl gününün programıyla gelir
      const s2 = gununSeansi(bloklari(k.id), d.tarih, ozelOf(k.id), mac);
      sonuc.push({ tip: 'kisi', id: k.id, ad: k.ad, saat: d.yeniSaat || '', s: s2, ozel: null, k, degisiklik: d, durum: 'gelen' });
    }
    const deg = degOf(k.id);
    if (saat == null && !ozel && !planli && !deg) continue;
    // Bu güne taşınan ders varsa ve bugün sabit saat/planlı seans yoksa, güne özel düzenleme o derse aittir: ikinci kart açılmaz
    if (saat == null && gelenler(k.id).length && !programli(k.id, mac)) continue;
    sonuc.push({ tip: 'kisi', id: k.id, ad: k.ad, saat: deg?.islem === 'saat' ? deg.yeniSaat : saat || '', eskiSaat: saat || '', s, ozel, k, degisiklik: deg, durum: deg ? (deg.islem === 'saat' ? 'saat' : deg.islem === 'iptal' ? 'iptal' : 'gitti') : null });
  }
  return sonuc.sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99') || a.ad.localeCompare(b.ad, 'tr'));
}
