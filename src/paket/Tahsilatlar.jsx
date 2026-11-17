// Tahsilatlar: ödeme tarihine göre aylık toplam, türe / gruba / koça göre kırılım, 12 aylık gidiş.
// Maaş hesabı ay içinde alınan paradan yapıldığı için ay = ödemenin alındığı ay.
import { useMemo, useState } from 'react';
import { tarihGoster, TIP_ADI } from '../veri';
import { kisaTarih } from '../program/model';
import { tl, YONTEM_ADI, YONTEMLER } from './model.js';
import { kocAdi } from './bilesenler';

// Ödeme türü sınıfları (sabit sıra; renk sınıfa bağlı, sıraya değil)
export const SINIFLAR = [
  ['grup', 'Grup dersleri'],
  ['bireysel', 'Bireysel / PT'],
  ['duettrio', 'Düet / Trio'],
  ['abonelik', 'Aylık abonelik'],
  ['ek', 'Ek ücretler'],
];
const SINIF_ADI = Object.fromEntries(SINIFLAR);
const sinifOf = (p) => {
  if (!p) return 'ek';
  if (p.tur === 'grup') return 'grup';
  if (p.tur === 'duet' || p.tur === 'trio') return 'duettrio';
  if (p.tur === 'abonelik' || p.tur === 'abonelikDonem') return 'abonelik';
  if (p.tur === 'ek') return 'ek';
  return 'bireysel';
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ayAdi = (ay) => `${AYLAR[Number(ay.slice(5, 7)) - 1]} ${ay.slice(0, 4)}`;
const ayKisa = (ay) => AYLAR[Number(ay.slice(5, 7)) - 1].slice(0, 3);
const ayKaydir = (ay, n) => {
  const d = new Date(Number(ay.slice(0, 4)), Number(ay.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const buAy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const topla = (l) => l.reduce((t, o) => t + (Number(o.tutar) || 0), 0);

function csvIndir(ad, satirlar) {
  const kac = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const metin = '﻿' + satirlar.map((r) => r.map(kac).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([metin], { type: 'text/csv;charset=utf-8' }));
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

// 12 aylık yığılmış çubuk grafik
function AylikGrafik({ aylar, seciliAy, onSec }) {
  const [ust, setUst] = useState(null);
  const enCok = Math.max(1, ...aylar.map((a) => a.toplam));
  const Y = 160;
  return (
    <figure className="aylik-grafik" aria-label="Son 12 ay tahsilat">
      <div className="grafik-lejant">
        {SINIFLAR.map(([k, ad]) => (
          <span key={k}><i className={'seri-renk s-' + k} />{ad}</span>
        ))}
      </div>
      <div className="grafik-alan" onMouseLeave={() => setUst(null)}>
        {aylar.map((a) => (
          <button
            type="button"
            key={a.ay}
            className={'grafik-sutun' + (a.ay === seciliAy ? ' secili' : '')}
            onClick={() => onSec(a.ay)}
            onMouseEnter={() => setUst(a.ay)}
            onFocus={() => setUst(a.ay)}
            onBlur={() => setUst(null)}
            aria-label={`${ayAdi(a.ay)}: ${tl(a.toplam)}`}
          >
            <span className="yigin" style={{ height: (a.toplam / enCok) * Y }}>
              {SINIFLAR.filter(([k]) => a.sinif[k] > 0).map(([k]) => (
                <span key={k} className={'parca s-' + k} style={{ flexGrow: a.sinif[k] }} />
              ))}
            </span>
            <small>{ayKisa(a.ay)}</small>
            {ust === a.ay && (
              <span className="grafik-ipucu" role="tooltip">
                <b>{ayAdi(a.ay)}</b>
                <b>{tl(a.toplam)}</b>
                {SINIFLAR.filter(([k]) => a.sinif[k] > 0).map(([k, ad]) => (
                  <span key={k}><i className={'seri-renk s-' + k} />{ad}: {tl(a.sinif[k])}</span>
                ))}
              </span>
            )}
          </button>
        ))}
      </div>
      <figcaption className="aciklama kucuk-yazi">Bir aya dokununca o ayın özeti açılır.</figcaption>
    </figure>
  );
}

export default function Tahsilatlar({ veri, kisiler, gruplar = [], subeler = [], koclar, benim, yonetici }) {
  const [ay, setAy] = useState(buAy());
  const [koc, setKoc] = useState('');
  const [yontem, setYontem] = useState('');
  const [sube, setSube] = useState('');
  const [tip, setTip] = useState('');
  const [sinif, setSinif] = useState('');

  const paketMap = useMemo(() => Object.fromEntries(veri.paketler.map((p) => [p.id, p])), [veri.paketler]);
  const kisiMap = useMemo(() => Object.fromEntries(kisiler.map((k) => [k.id, k])), [kisiler]);
  const grupMap = useMemo(() => Object.fromEntries(gruplar.map((g) => [g.id, g])), [gruplar]);

  // Filtrelenmiş (ay hariç) ödemeler, türü ve grubu çözülmüş
  const tumu = useMemo(
    () =>
      veri.odemeler
        .filter((o) => !o.silindi && o.tarih)
        .map((o) => {
          const p = paketMap[o.satilanPaketId];
          return { ...o, p, sinif: sinifOf(p), k: kisiMap[o.kisiId] };
        })
        .filter(
          (o) =>
            (!koc || o.tahsilEdenKocId === koc) &&
            (!yontem || o.yontem === yontem) &&
            (!sube || (o.p?.subeId || grupMap[o.p?.grupId]?.subeId) === sube) &&
            (!tip || (o.k?.tip || 'sporcu') === tip)
        ),
    [veri.odemeler, paketMap, kisiMap, grupMap, koc, yontem, sube, tip]
  );

  const ayinkiler = tumu.filter((o) => o.tarih.slice(0, 7) === ay);
  const oncekiAy = topla(tumu.filter((o) => o.tarih.slice(0, 7) === ayKaydir(ay, -1)));
  const toplam = topla(ayinkiler);
  const fark = oncekiAy > 0 ? Math.round(((toplam - oncekiAy) / oncekiAy) * 100) : null;
  const sinifToplam = Object.fromEntries(SINIFLAR.map(([k]) => [k, topla(ayinkiler.filter((o) => o.sinif === k))]));

  const aylar = Array.from({ length: 12 }, (_, i) => ayKaydir(buAy(), i - 11)).map((a) => {
    const l = tumu.filter((o) => o.tarih.slice(0, 7) === a);
    return { ay: a, toplam: topla(l), sinif: Object.fromEntries(SINIFLAR.map(([k]) => [k, topla(l.filter((o) => o.sinif === k))])) };
  });

  // Grup kırılımı: o ay alınan grup ödemeleri, grup grup
  const grupSatirlari = useMemo(() => {
    const m = {};
    for (const o of ayinkiler.filter((x) => x.sinif === 'grup')) {
      const id = o.p?.grupId || '?';
      m[id] = m[id] || { id, ad: grupMap[id]?.ad || o.p?.grupAdi || 'Grup', cim: !!grupMap[id]?.cimnastik, tutar: 0, kisiler: new Set() };
      m[id].tutar += Number(o.tutar) || 0;
      m[id].kisiler.add(o.kisiId);
    }
    // Bu ay başlayan dönemlerde hâlâ ödemesi eksik olanlar
    const odenen = {};
    for (const o of veri.odemeler) if (!o.silindi) odenen[o.satilanPaketId] = (odenen[o.satilanPaketId] || 0) + (Number(o.tutar) || 0);
    const bekleyen = {};
    for (const p of veri.paketler) {
      if (p.tur !== 'grup' || p.durum === 'iptal' || (p.donemBas || '').slice(0, 7) !== ay) continue;
      if ((Number(p.uygulananFiyat) || 0) - (odenen[p.id] || 0) > 0) bekleyen[p.grupId] = (bekleyen[p.grupId] || 0) + 1;
    }
    for (const id of Object.keys(bekleyen)) {
      m[id] = m[id] || { id, ad: grupMap[id]?.ad || 'Grup', cim: !!grupMap[id]?.cimnastik, tutar: 0, kisiler: new Set() };
      m[id].bekleyen = bekleyen[id];
    }
    return Object.values(m).sort((a, b) => b.tutar - a.tutar);
  }, [ayinkiler, veri, grupMap, ay]);
  const cimToplam = grupSatirlari.filter((g) => g.cim).reduce((t, g) => t + g.tutar, 0);

  // Koç kırılımı (tahsil edene göre, türlere ayrılmış)
  const kocSatirlari = useMemo(() => {
    const m = {};
    for (const o of ayinkiler) {
      const id = o.tahsilEdenKocId || '?';
      m[id] = m[id] || { id, toplam: 0, sinif: {} };
      m[id].toplam += Number(o.tutar) || 0;
      m[id].sinif[o.sinif] = (m[id].sinif[o.sinif] || 0) + (Number(o.tutar) || 0);
    }
    return Object.values(m).sort((a, b) => b.toplam - a.toplam);
  }, [ayinkiler]);

  const liste = ayinkiler.filter((o) => !sinif || o.sinif === sinif).sort((a, b) => b.tarih.localeCompare(a.tarih));
  const tahsilEdenler = [...new Set(veri.odemeler.map((o) => o.tahsilEdenKocId).filter(Boolean))];
  const paketAdi = (p) => (p ? (p.tur === 'grup' ? `${p.grupAdi || p.paketAdi} · ${kisaTarih(p.donemBas)}` : p.paketAdi || '') : '');

  function indir() {
    csvIndir(`tahsilat-${ay}.csv`, [
      ['Tarih', 'Kişi', 'Tür', 'Paket / grup', 'Tutar', 'Yöntem', 'Tahsil eden'],
      ...liste.map((o) => [
        o.tarih,
        o.k?.ad || '',
        SINIF_ADI[o.sinif],
        paketAdi(o.p),
        String(Number(o.tutar) || 0).replace('.', ','),
        YONTEM_ADI[o.yontem] || o.yontem || '',
        kocAdi(o.tahsilEdenKocId, benim, koclar),
      ]),
    ]);
  }

  return (
    <div className="tahsilat">
      <div className="filtreler">
        <div className="ay-secici" role="group" aria-label="Ay">
          <button type="button" className="ikincil kucuk" onClick={() => setAy(ayKaydir(ay, -1))} aria-label="Önceki ay">‹</button>
          <strong>{ayAdi(ay)}</strong>
          <button type="button" className="ikincil kucuk" onClick={() => setAy(ayKaydir(ay, 1))} disabled={ay >= buAy()} aria-label="Sonraki ay">›</button>
        </div>
        {yonetici && (
          <select value={koc} onChange={(e) => setKoc(e.target.value)} aria-label="Tahsil eden">
            <option value="">Tüm koçlar</option>
            {tahsilEdenler.map((id) => <option key={id} value={id}>{kocAdi(id, benim, koclar)}</option>)}
          </select>
        )}
        <select value={yontem} onChange={(e) => setYontem(e.target.value)} aria-label="Yöntem">
          <option value="">Tüm yöntemler</option>
          {YONTEMLER.map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
        </select>
        {subeler.length > 1 && (
          <select value={sube} onChange={(e) => setSube(e.target.value)} aria-label="Şube">
            <option value="">Tüm şubeler</option>
            {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        )}
        <select value={tip} onChange={(e) => setTip(e.target.value)} aria-label="Kişi tipi">
          <option value="">Tüm kişiler</option>
          {Object.entries(TIP_ADI).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
        </select>
      </div>

      <section className="tahsilat-ozet">
        <div className="tahsilat-toplam">
          <span className="aciklama">{ayAdi(ay)} toplam tahsilat</span>
          <strong>{tl(toplam)}</strong>
          <span className="aciklama kucuk-yazi">
            {ayinkiler.length} ödeme
            {fark !== null && ` · geçen aya göre ${fark > 0 ? '+' : ''}${fark}%`}
            {fark === null && oncekiAy === 0 && ' · geçen ay kayıt yok'}
          </span>
        </div>
        <div className="sinif-kutulari">
          {SINIFLAR.map(([k, ad]) => (
            <button
              type="button"
              key={k}
              className={'sinif-kutu' + (sinif === k ? ' secili' : '')}
              aria-pressed={sinif === k}
              onClick={() => setSinif(sinif === k ? '' : k)}
            >
              <span><i className={'seri-renk s-' + k} />{ad}</span>
              <strong>{tl(sinifToplam[k])}</strong>
              <small>{toplam > 0 ? `%${Math.round((sinifToplam[k] / toplam) * 100)}` : '—'}</small>
            </button>
          ))}
        </div>
      </section>

      <AylikGrafik aylar={aylar} seciliAy={ay} onSec={setAy} />

      {(!sinif || sinif === 'grup') && grupSatirlari.length > 0 && (
        <section>
          <h3>Grup dersleri · {ayAdi(ay)}</h3>
          <div className="tablo-kap">
            <table className="tablo">
              <thead><tr><th>Grup</th><th>Alınan</th><th>Ödeyen</th><th>Bu ay başlayan dönemde bekleyen</th></tr></thead>
              <tbody>
                {grupSatirlari.map((g) => (
                  <tr key={g.id}>
                    <th>{g.ad}{g.cim ? <small className="aciklama"> · cimnastik</small> : null}</th>
                    <td>{tl(g.tutar)}</td>
                    <td>{g.kisiler.size} kişi</td>
                    <td>{g.bekleyen ? `${g.bekleyen} kişi` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              {cimToplam > 0 && cimToplam < sinifToplam.grup && (
                <tfoot>
                  <tr><th>Cimnastik grupları</th><td>{tl(cimToplam)}</td><td colSpan={2} /></tr>
                  <tr><th>Diğer gruplar</th><td>{tl(sinifToplam.grup - cimToplam)}</td><td colSpan={2} /></tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {yonetici && kocSatirlari.length > 0 && (
        <section>
          <h3>Tahsil edene göre · {ayAdi(ay)}</h3>
          <div className="tablo-kap">
            <table className="tablo">
              <thead>
                <tr><th>Koç</th>{SINIFLAR.map(([k, ad]) => <th key={k}>{ad}</th>)}<th>Toplam</th></tr>
              </thead>
              <tbody>
                {kocSatirlari.map((r) => (
                  <tr key={r.id}>
                    <th>{kocAdi(r.id, benim, koclar)}</th>
                    {SINIFLAR.map(([k]) => <td key={k}>{r.sinif[k] ? tl(r.sinif[k]) : '—'}</td>)}
                    <td><strong>{tl(r.toplam)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="baslik-satiri">
          <h3>{sinif ? `${SINIF_ADI[sinif]} · ` : ''}Ödemeler ({liste.length})</h3>
          {liste.length > 0 && <button type="button" className="ikincil kucuk" onClick={indir}>Excel'e indir</button>}
        </div>
        {sinif && <button type="button" className="metin" onClick={() => setSinif('')}>Tüm türleri göster</button>}
        {liste.length === 0 ? (
          <p className="aciklama">Bu ay kayıtlı ödeme yok.</p>
        ) : (
          <div className="tablo-kap">
            <table className="tablo">
              <thead><tr><th>Tarih</th><th>Kişi</th><th>Tür</th><th>Paket</th><th>Tutar</th><th>Yöntem</th><th>Alan</th></tr></thead>
              <tbody>
                {liste.map((o) => (
                  <tr key={o.id}>
                    <td>{tarihGoster(o.tarih)}</td>
                    <th>{o.k?.ad || 'Kişi'}</th>
                    <td><i className={'seri-renk s-' + o.sinif} />{SINIF_ADI[o.sinif]}</td>
                    <td>{paketAdi(o.p)}</td>
                    <td>{tl(o.tutar)}</td>
                    <td>{YONTEM_ADI[o.yontem] || o.yontem}</td>
                    <td>{kocAdi(o.tahsilEdenKocId, benim, koclar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
