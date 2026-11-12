// Bir gün için seans kartları (Bugün ekranı ve Takvim aynı hesabı kullanır)
import { coz, gununSeansi } from '../program/model';
import { maclar } from './veri';

export function gununKartlari({ kisiler, gruplar, programlar, ozeller, etkinlikler = [], tarih, sube = '', benimId = null }) {
  const hg = coz(tarih).getDay();
  const bloklari = (id) =>
    programlar.filter((p) => p.sahipId === id).sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || ''));
  const ozelOf = (id) => ozeller.find((o) => o.sahipId === id && o.tarih === tarih) || null;
  const kisininGruplari = (id) => gruplar.filter((g) => g.aktif !== false && (g.uyeIds || []).includes(id)).map((g) => g.id);
  const sonuc = [];

  for (const g of gruplar) {
    if (g.aktif === false) continue;
    if (sube && g.subeId !== sube) continue;
    if (benimId && !(g.kocIds || []).includes(benimId)) continue;
    const ozel = ozelOf(g.id);
    const s = gununSeansi(bloklari(g.id), tarih, ozel, maclar(etkinlikler, { tip: 'grup', id: g.id }));
    const saat = g.saatler?.[hg];
    const planli = s && !s.dinlenme && s.gun;
    if (saat == null && !ozel && !planli) continue;
    const uyeler = (g.uyeIds || []).map((id) => kisiler.find((k) => k.id === id)).filter((k) => k && k.aktif !== false);
    sonuc.push({ tip: 'grup', id: g.id, ad: g.ad, saat: saat || '', sure: g.sure, s, ozel, uyeler, g });
  }
  for (const k of kisiler) {
    if (k.aktif === false) continue;
    if (sube && !(k.subeIds || []).includes(sube)) continue;
    if (benimId && !(k.kocIds || []).includes(benimId)) continue;
    const ozel = ozelOf(k.id);
    const s = gununSeansi(bloklari(k.id), tarih, ozel, maclar(etkinlikler, { tip: 'kisi', id: k.id, grupIds: kisininGruplari(k.id) }));
    const saat = k.haftalikSaatler?.[hg];
    const planli = s && !s.dinlenme && s.gun;
    if (saat == null && !ozel && !planli) continue;
    sonuc.push({ tip: 'kisi', id: k.id, ad: k.ad, saat: saat || '', s, ozel, k });
  }
  return sonuc.sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99') || a.ad.localeCompare(b.ad, 'tr'));
}
