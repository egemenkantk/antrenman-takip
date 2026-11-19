// Tahsilatlar: ödeme tarihine göre aylık toplam, türe / gruba / koça göre kırılım, 12 aylık gidiş.
// Maaş hesabı ay içinde alınan paradan yapıldığı için ay = ödemenin alındığı ay.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { tarihGoster, TIP_ADI } from '../veri';
import { kisaTarih } from '../program/model';
import { tl, YONTEM_ADI, YONTEMLER, dersleriDagit, TUR_KISA, dersBasiUcret, kayitTuru, sayilanDers, abonelikKapsar, bizeKalanTutar, ortakPayi } from './model.js';
import { bireyselKayitlar } from './veri';
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
// Bize kalan: ortaklı gruplarda ortağın payı düşülmüş tutar
const toplaNet = (l) => l.reduce((t, o) => t + (o.net ?? (Number(o.tutar) || 0)), 0);

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

// Derse giren koça göre: grup → grubun koçları, diğerleri → kişinin koçları (ödeme anında kaydedilen öncelikli).
// Birden fazla koç varsa her koça tutarın tamamı yazılır. Maaş hesabına girmeyen koçlar (ör. kurucu) gizlenebilir.
function useGizliKoclar() {
  const [gizli, setGizli] = useState(null);
  useEffect(() => {
    getDoc(doc(db, 'kurumlar', KURUM_ID))
      .then((s) => setGizli(s.data()?.tahsilat?.gizliKoclar || []))
      .catch(() => setGizli([]));
  }, []);
  async function gizliAyarla(l) {
    setGizli(l);
    await setDoc(doc(db, 'kurumlar', KURUM_ID), { tahsilat: { gizliKoclar: l } }, { merge: true }).catch(() => {});
  }
  return [gizli, gizliAyarla];
}

// Yapılan özel dersler (bireysel / düet / trio): dersi veren koç, ders sayısı ve paket fiyatına göre ders başı değer.
// Ders, yoklamada seçilen "dersi veren koç"a (yoksa kaydı girene) yazılır; başka koça yazılmaz.
function OzelDersler({ ay, paketler, kisiMap, koclar, benim, gizli, sadece = null }) {
  const [kayitlar, setKayitlar] = useState(null);
  const [acik, setAcik] = useState(null);
  // Bütün kişilerin özel dersleri sayılır (paketi olsun olmasın); grup dersleri hariç
  const kisiIds = useMemo(() => Object.keys(kisiMap).filter((id) => kisiMap[id]?.tip !== 'cimnastik'), [kisiMap]);
  useEffect(() => {
    Promise.all(kisiIds.map((id) => bireyselKayitlar(id).then((l) => [id, l]).catch(() => [id, []]))).then((l) => setKayitlar(Object.fromEntries(l)));
  }, [kisiIds.join()]);

  const satirlar = useMemo(() => {
    if (!kayitlar) return null;
    const m = {};
    const ekle = (kisiId, ders, kalemAnahtar, kalem, deger) => {
      if (ders.tarih.slice(0, 7) !== ay) return;
      const kocId = ders.dersiVeren || ders.kaydeden || '?';
      const r = (m[kocId] ||= { id: kocId, dersler: new Set(), deger: 0, gelmedi: 0, paketsiz: 0, kalemler: {} });
      // Düet/trio dersi tek ders sayılır; değer her öğrencinin kendi paketinden gelir
      r.dersler.add(ders.dersTuru ? `${ders.id}` : `${kisiId}:${ders.id}`);
      r.deger += deger || 0;
      if (ders.katilim === 'gelmedi') r.gelmedi++;
      if (kalem.paketsiz) r.paketsiz++;
      const k = (r.kalemler[kalemAnahtar] ||= { ...kalem, n: 0, toplam: 0, eksik: 0 });
      k.n++;
      k.toplam += deger || 0;
      if (kalem.birim != null && deger != null && Math.abs(deger - kalem.birim) > 0.5) k.eksik++;
    };
    for (const kisiId of kisiIds) {
      const ad = kisiMap[kisiId]?.ad || 'Kişi';
      const pl = paketler.filter((p) => p.kisiId === kisiId);
      const tum = kayitlar[kisiId] || [];
      const d = dersleriDagit(pl, tum);
      // 1) Pakete düşen dersler (aktarımda sayılanlar dahil)
      for (const p of pl) {
        const dagilim = d.paketler[p.id];
        if (!dagilim) continue;
        const birim = dersBasiUcret(p);
        for (const ders of dagilim.dersler) {
          ekle(kisiId, ders, kisiId + p.id, { ad, paket: p.paketAdi || TUR_KISA[p.tur], tur: p.tur, fiyat: Number(p.uygulananFiyat) || 0, dersSayisi: Number(p.dersSayisi) || 0, birim }, ders.maliyet ?? birim);
        }
      }
      // 2) Aylık abonelikteki bireysel dersler: aylık ücret ÷ aylık ders hakkı
      const abonelikler = pl.filter((p) => p.tur === 'abonelik' && p.durum !== 'iptal');
      for (const ders of tum.filter((k) => kayitTuru(k) === 'bireysel' && sayilanDers(k))) {
        const a = abonelikler.find((x) => abonelikKapsar(x, ders.tarih));
        if (!a) continue;
        const birim = (Number(a.aylikUcret) || 0) / (Number(a.aylikDers) || 12);
        ekle(kisiId, ders, kisiId + a.id, { ad, paket: a.paketAdi || 'Aylık abonelik', tur: 'abonelik', fiyat: Number(a.aylikUcret) || 0, dersSayisi: Number(a.aylikDers) || 12, birim, aylik: true }, birim);
      }
      // 3) Paketi olmayan (ya da paketi dolmuş) dersler: sayılır, değeri yok
      for (const ders of d.paketsizDersler) {
        ekle(kisiId, ders, kisiId + ':paketsiz:' + ders.tur, { ad, paket: `${TUR_KISA[ders.tur] || 'Özel'} · paket yok`, tur: ders.tur, paketsiz: true }, 0);
      }
    }
    return Object.values(m).sort((a, b) => b.deger - a.deger);
  }, [kayitlar, paketler, ay]);

  if (!satirlar || !gizli) return null;
  const gorunen = sadece ? satirlar.filter((r) => r.id === sadece) : satirlar.filter((r) => !gizli.includes(r.id));
  if (!gorunen.length && !satirlar.length) return null;
  const ad = (id) => (id === '?' ? 'Koç belirtilmemiş' : kocAdi(id, benim, koclar));
  const yuvarla = (v) => Math.round(v);

  return (
    <section>
      <h3>Yapılan özel dersler · {ayAdi(ay)}</h3>
      <p className="aciklama kucuk-yazi">
        Bireysel, düet, trio ve aylık abonelikteki bireysel derslerde o ay kim kaç ders yaptı ve bu derslerin değeri (paket fiyatı ÷ ders sayısı; abonelikte aylık ücret ÷ aylık ders hakkı). Paketi girilmemiş dersler sayılır ama değeri yazılmaz. Ders, yoklamada seçilen
        "dersi veren koç"a yazılır; seçilmemişse kaydı girene. Gösterilmeyen koçların dersleri başka koça yazılmaz.
      </p>
      {gorunen.length === 0 ? (
        <p className="aciklama">Bu ay gösterilecek özel ders yok.</p>
      ) : (
        <div className="tablo-kap">
          <table className="tablo koc-tablo">
            <thead><tr><th>Koç</th><th>Ders sayısı</th><th>Ders değeri</th></tr></thead>
            <tbody>
              {gorunen.map((r) => (
                <Fragment key={r.id}>
                  <tr className="tikla" onClick={() => setAcik(acik === r.id ? null : r.id)} aria-expanded={acik === r.id}>
                    <th>{acik === r.id ? '▾ ' : '▸ '}{ad(r.id)}</th>
                    <td>
                      {r.dersler.size} ders
                      {r.gelmedi ? <small className="aciklama"> · {r.gelmedi} gelmedi (düştü)</small> : null}
                      {r.paketsiz ? <small className="uyari-yazi"> · {r.paketsiz} ders paketsiz</small> : null}
                    </td>
                    <td><strong>{tl(yuvarla(r.deger))}</strong></td>
                  </tr>
                  {acik === r.id && (
                    <tr className="koc-dokum">
                      <td colSpan={3}>
                        <ul>
                          {Object.values(r.kalemler).map((k) => (
                            <li key={k.ad + k.paket}>
                              {k.paketsiz ? (
                                <>
                                  {k.ad} · <span className="uyari-yazi">{k.paket}</span> · <strong>{k.n} ders</strong> <small className="aciklama">(paket girilince değeri hesaplanır)</small>
                                </>
                              ) : (
                                <>
                                  {k.ad} · {k.paket}: {tl(k.fiyat)} / {k.dersSayisi} ders{k.aylik ? ' (aylık)' : ''} = ders başı {tl(yuvarla(k.birim))} · <strong>{k.n} ders</strong> ={' '}
                                  <strong>{tl(yuvarla(k.toplam))}</strong>
                                  {k.eksik ? <small className="aciklama"> · {k.eksik} ders tek/eksik katılım ücretiyle</small> : null}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function KocaGore({ odemeler, ay, grupMap, kisiMap, koclar, benim, indirAdi, gizli, gizliAyarla, sadece = null }) {
  const [acik, setAcik] = useState(null);

  const satirlar = useMemo(() => {
    const m = {};
    for (const o of odemeler) {
      const ids = o.dersKocIds || (o.sinif === 'grup' ? grupMap[o.p?.grupId]?.kocIds : kisiMap[o.kisiId]?.kocIds) || [];
      // Maaş tablosu bize kalan tutarla (ortaklı grupta ortağın payı düşülür)
      const tutar = o.net ?? (Number(o.tutar) || 0);
      const brut = Number(o.tutar) || 0;
      for (const id of ids.length ? ids : ['?']) {
        const r = (m[id] ||= { id, toplam: 0, sinif: {}, kalemler: {} });
        r.toplam += tutar;
        r.sinif[o.sinif] = (r.sinif[o.sinif] || 0) + tutar;
        // Döküm: grup dersleri grup grup, diğerleri kişi kişi
        const anahtar = o.sinif === 'grup' ? 'g:' + (o.p?.grupId || '?') : o.sinif + ':' + o.kisiId;
        const ad = o.sinif === 'grup' ? grupMap[o.p?.grupId]?.ad || o.p?.grupAdi || 'Grup' : `${o.k?.ad || 'Kişi'} · ${o.p?.paketAdi || SINIF_ADI[o.sinif]}`;
        const k = (r.kalemler[anahtar] ||= { ad, sinif: o.sinif, tutar: 0, brut: 0, kisiler: new Set() });
        k.tutar += tutar;
        k.brut += brut;
        k.kisiler.add(o.kisiId);
      }
    }
    return Object.values(m).sort((a, b) => (a.id === '?') - (b.id === '?') || b.toplam - a.toplam);
  }, [odemeler, grupMap, kisiMap]);

  if (!gizli || !satirlar.length) return null;
  const gorunen = sadece ? satirlar.filter((r) => r.id === sadece) : satirlar.filter((r) => !gizli.includes(r.id));
  const ad = (id) => (id === '?' ? 'Koç atanmamış' : kocAdi(id, benim, koclar));

  function indir() {
    csvIndir(indirAdi, [
      ['Koç', 'Kalem', 'Tür', 'Ödeyen kişi', 'Tutar'],
      ...gorunen.flatMap((r) =>
        Object.values(r.kalemler).map((k) => [ad(r.id), k.ad, SINIF_ADI[k.sinif], k.kisiler.size, String(k.tutar).replace('.', ',')])
      ),
    ]);
  }

  return (
    <section>
      <div className="baslik-satiri">
        <h3>Derse giren koça göre · {ayAdi(ay)}</h3>
        <button type="button" className="ikincil kucuk" onClick={indir}>Excel'e indir</button>
      </div>
      <p className="aciklama kucuk-yazi">
        Grup ödemeleri grubun koçlarına, bireysel / düet / abonelik ödemeleri öğrencinin koçlarına yazılır. Ortaklı gruplarda bize kalan yazılır. Birden fazla koç varsa her birine tutarın tamamı
        yazılır (bu yüzden satırların toplamı ayın toplamından büyük olabilir). Satıra dokununca döküm açılır.
      </p>
      <div className="tablo-kap">
        <table className="tablo koc-tablo">
          <thead>
            <tr><th>Koç</th>{SINIFLAR.map(([k, a]) => <th key={k}>{a}</th>)}<th>Toplam</th></tr>
          </thead>
          <tbody>
            {gorunen.map((r) => (
              <Fragment key={r.id}>
                <tr className="tikla" onClick={() => setAcik(acik === r.id ? null : r.id)} aria-expanded={acik === r.id}>
                  <th>{acik === r.id ? '▾ ' : '▸ '}{ad(r.id)}</th>
                  {SINIFLAR.map(([k]) => <td key={k}>{r.sinif[k] ? tl(r.sinif[k]) : '—'}</td>)}
                  <td><strong>{tl(r.toplam)}</strong></td>
                </tr>
                {acik === r.id && (
                  <tr className="koc-dokum">
                    <td colSpan={SINIFLAR.length + 2}>
                      <ul className="sade-liste">
                        {Object.values(r.kalemler)
                          .sort((a, b) => SINIFLAR.findIndex(([k]) => k === a.sinif) - SINIFLAR.findIndex(([k]) => k === b.sinif) || b.tutar - a.tutar)
                          .map((k) => (
                            <li key={k.ad}>
                              <i className={'seri-renk s-' + k.sinif} />
                              {k.ad} · <strong>{tl(k.tutar)}</strong>
                              {k.sinif === 'grup' ? ` · ${k.kisiler.size} kişi ödedi` : ''}
                              {Math.abs(k.brut - k.tutar) > 0.5 ? <small className="aciklama"> · %{Math.round((1 - k.tutar / k.brut) * 100)} ortağa</small> : null}
                            </li>
                          ))}
                      </ul>
                      {r.id !== '?' && !sadece && (
                        <button type="button" className="metin" onClick={() => gizliAyarla([...gizli, r.id])}>
                          Bu koçu maaş tablosunda gösterme
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {gizli.length > 0 && !sadece && (
        <p className="aciklama kucuk-yazi">
          Gösterilmeyen: {gizli.map((id) => (
            <button key={id} type="button" className="metin" onClick={() => gizliAyarla(gizli.filter((x) => x !== id))}>
              {kocAdi(id, benim, koclar)} (göster)
            </button>
          ))}
        </p>
      )}
    </section>
  );
}

export default function Tahsilatlar({ veri, kisiler, gruplar = [], subeler = [], koclar, benim, yonetici, kendiOzeti = false }) {
  const [ay, setAy] = useState(buAy());
  const [koc, setKoc] = useState('');
  const [yontem, setYontem] = useState('');
  const [sube, setSube] = useState('');
  const [tip, setTip] = useState('');
  const [sinif, setSinif] = useState('');
  const [gizli, gizliAyarla] = useGizliKoclar();

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
          const sinif = sinifOf(p);
          const g = sinif === 'grup' ? grupMap[p?.grupId] : null;
          return { ...o, p, sinif, k: kisiMap[o.kisiId], net: ortakPayi(g) > 0 ? bizeKalanTutar(o.tutar, g) : Number(o.tutar) || 0 };
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
  // Ortaklı gruplarda bütün toplamlar bize kalan tutarla; ortağa giden ayrıca küçük not olarak
  const oncekiAy = toplaNet(tumu.filter((o) => o.tarih.slice(0, 7) === ayKaydir(ay, -1)));
  const toplam = toplaNet(ayinkiler);
  const ortaga = topla(ayinkiler) - toplam;
  const fark = oncekiAy > 0 ? Math.round(((toplam - oncekiAy) / oncekiAy) * 100) : null;
  const sinifToplam = Object.fromEntries(SINIFLAR.map(([k]) => [k, toplaNet(ayinkiler.filter((o) => o.sinif === k))]));

  const aylar = Array.from({ length: 12 }, (_, i) => ayKaydir(buAy(), i - 11)).map((a) => {
    const l = tumu.filter((o) => o.tarih.slice(0, 7) === a);
    return { ay: a, toplam: toplaNet(l), sinif: Object.fromEntries(SINIFLAR.map(([k]) => [k, toplaNet(l.filter((o) => o.sinif === k))])) };
  });

  // Grup kırılımı: o ay alınan grup ödemeleri, grup grup
  const grupSatirlari = useMemo(() => {
    const m = {};
    for (const o of ayinkiler.filter((x) => x.sinif === 'grup')) {
      const id = o.p?.grupId || '?';
      m[id] = m[id] || { id, ad: grupMap[id]?.ad || o.p?.grupAdi || 'Grup', cim: !!grupMap[id]?.cimnastik, ortak: ortakPayi(grupMap[id]), tutar: 0, net: 0, kisiler: new Set() };
      m[id].tutar += Number(o.tutar) || 0;
      m[id].net += o.net;
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
      m[id] = m[id] || { id, ad: grupMap[id]?.ad || 'Grup', cim: !!grupMap[id]?.cimnastik, ortak: ortakPayi(grupMap[id]), tutar: 0, net: 0, kisiler: new Set() };
      m[id].bekleyen = bekleyen[id];
    }
    return Object.values(m).sort((a, b) => b.tutar - a.tutar);
  }, [ayinkiler, veri, grupMap, ay]);
  const cimToplam = grupSatirlari.filter((g) => g.cim).reduce((t, g) => t + g.net, 0);
  const ortakVar = grupSatirlari.some((g) => g.ortak > 0);

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
          {ortaga > 0.5 && <span className="aciklama kucuk-yazi">Ortaklı gruplarda ortağın payı ({tl(ortaga)}) düşülmüş tutar</span>}
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
              <thead><tr><th>Grup</th><th>{ortakVar ? 'Bize kalan' : 'Alınan'}</th><th>Ödeyen</th><th>Bu ay başlayan dönemde bekleyen</th></tr></thead>
              <tbody>
                {grupSatirlari.map((g) => (
                  <tr key={g.id}>
                    <th>{g.ad}{g.cim ? <small className="aciklama"> · cimnastik</small> : null}</th>
                    <td>{tl(g.net)}{g.ortak > 0 && <small className="aciklama"> · %{g.ortak} ortağa</small>}</td>
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

      {yonetici && (
        <KocaGore odemeler={ayinkiler} ay={ay} grupMap={grupMap} kisiMap={kisiMap} koclar={koclar} benim={benim} indirAdi={`koclara-gore-${ay}.csv`} gizli={gizli} gizliAyarla={gizliAyarla} />
      )}
      {yonetici && <OzelDersler ay={ay} paketler={veri.paketler} kisiMap={kisiMap} koclar={koclar} benim={benim} gizli={gizli} />}
      {!yonetici && kendiOzeti && (
        <>
          <KocaGore odemeler={ayinkiler} ay={ay} grupMap={grupMap} kisiMap={kisiMap} koclar={koclar} benim={benim} indirAdi={`tahsilatim-${ay}.csv`} gizli={[]} gizliAyarla={() => {}} sadece={benim} />
          <OzelDersler ay={ay} paketler={veri.paketler} kisiMap={kisiMap} koclar={koclar} benim={benim} gizli={[]} sadece={benim} />
        </>
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
