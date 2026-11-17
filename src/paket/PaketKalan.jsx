// Bugün ekranı: özel ders tamamlanınca o dersin düştüğü paket, ders başı ücret ve kalan tutar
import { useEffect, useState } from 'react';
import { kisiPaketleri, bireyselKayitlar } from './veri';
import { dersleriDagit, dersBasiUcret, tl, TUR_KISA } from './model.js';

export default function PaketKalan({ kisiId, kayitId, ad, surum }) {
  const [b, setB] = useState(null);
  useEffect(() => {
    let iptal = false;
    Promise.all([kisiPaketleri(kisiId), bireyselKayitlar(kisiId)])
      .then(([paketler, kayitlar]) => {
        if (!paketler.some((x) => ['bireysel', 'duet', 'trio'].includes(x.tur))) return;
        const d = dersleriDagit(paketler, kayitlar);
        const p = paketler.find((x) => d.paketler[x.id]?.dersler.some((k) => k.id === kayitId));
        if (iptal) return;
        if (!p) return setB(d.paketsizDersler.some((k) => k.id === kayitId) ? { paketsiz: true } : null);
        const r = d.paketler[p.id];
        const ders = r.dersler.find((k) => k.id === kayitId);
        if (ders?.oncedenSayildi) return setB({ onceden: true, ad: p.paketAdi || TUR_KISA[p.tur] });
        const eksik = ders && Math.abs(ders.maliyet - dersBasiUcret(p)) > 0.5;
        setB({ ad: p.paketAdi || TUR_KISA[p.tur], birim: Math.round(ders?.maliyet ?? dersBasiUcret(p)), eksik, kalanDers: r.kalan, kalanTl: r.kalanTl, fiyatli: Number(p.uygulananFiyat) > 0 });
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [kisiId, kayitId, surum]);
  if (!b) return null;
  if (b.onceden) return <p className="paket-kalan">{ad ? `${ad} · ` : ''}{b.ad}: aktarımdan önceki ders, paketten düşmedi (koçun listesine yazıldı).</p>;
  if (b.paketsiz) return <p className="paket-kalan uyari-yazi">{ad ? `${ad}: ` : ''}Bu ders düşecek açık paket yok.</p>;
  return (
    <p className={'paket-kalan' + (b.kalanDers <= 1 ? ' uyari-yazi' : '')}>
      {ad ? <b>{ad}</b> : null}
      {ad ? ' · ' : ''}
      {b.ad}: {b.fiyatli ? <>bu ders {tl(b.birim)}{b.eksik ? ' (tek/eksik katılım ücreti)' : ''} düştü · </> : null}
      kalan <strong>{b.kalanDers} ders{b.fiyatli ? ` / ${tl(b.kalanTl)}` : ''}</strong>
    </p>
  );
}
