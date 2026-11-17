// Grup dönemleri: takvim önizlemesi, ara haftalar (özel durumda dönem kaydırma) ve geçmiş dönemlerin aktarımı
import { Fragment, useEffect, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where, deleteDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { donemBul, donemNo, odemeDurumu, tl, YONTEMLER, grupKayitKimligi } from './model.js';
import { grupKaydiOlustur, kisiOdemeleri, kisiPaketleri, odemeEkle, paketGuncelle, DONEM_HARIC, KATILIM_ONCESI } from './veri';

// ---------- Takvim önizlemesi ----------
export function DonemTakvimi({ bas, aralar = [], adet = 5 }) {
  if (!bas) return null;
  const simdi = donemBul(bas, bugun(), aralar);
  const ilkNo = Math.max(0, (simdi?.no ?? 0) - 2);
  const l = Array.from({ length: adet }, (_, i) => donemNo(bas, ilkNo + i, aralar));
  return (
    <div className="donem-takvimi" aria-label="Dönem takvimi">
      {l.map((d) => (
        <span key={d.no} className={'donem-cip' + (simdi && d.no === simdi.no && !simdi.arada ? ' simdi' : '')}>
          {d.araSonrasi ? <small>⏸ {d.araSonrasi} hafta ara · </small> : null}
          {d.no + 1}. dönem: {kisaTarih(d.bas)} – {kisaTarih(d.bit)}
          {simdi && d.no === simdi.no && !simdi.arada ? ' (şu an)' : ''}
        </span>
      ))}
    </div>
  );
}

// ---------- Ara haftalar ----------
export function AraHaftalar({ grup, onDegisti }) {
  const [acik, setAcik] = useState(false);
  const [hafta, setHafta] = useState(1);
  const [hata, setHata] = useState('');
  const aralar = grup.donemAralari || [];
  const simdi = donemBul(grup.donemBaslangic, bugun(), aralar);
  // Yalnızca henüz başlamamış dönemler ertelenebilir
  const ileri = Array.from({ length: 6 }, (_, i) => donemNo(grup.donemBaslangic, (simdi?.no ?? 0) + i, aralar)).filter((d) => d.bas > bugun());
  const [secim, setSecim] = useState('');

  async function ekle() {
    setHata('');
    const d = ileri.find((x) => String(x.no) === secim) || ileri[0];
    if (!d) return;
    // Erteleme, dönemin şu anki (kaymış) başlangıcına göre değil, ara öncesi planlanan başlangıcına yazılır
    const planlanan = d.araSonrasi ? null : d.bas;
    if (!planlanan) return setHata('Bu dönem zaten ertelenmiş; önce mevcut arayı kaldırın.');
    try {
      await updateDoc(doc(db, 'gruplar', grup.id), { donemAralari: [...aralar, { tarih: planlanan, hafta: Number(hafta) || 1 }] });
      setAcik(false);
      onDegisti?.();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }
  async function kaldir(a) {
    if (a.tarih <= bugun()) return setHata('Başlamış ya da geçmiş bir ara kaldırılamaz.');
    if (!window.confirm(`${kisaTarih(a.tarih)} için ${a.hafta} haftalık ara kaldırılsın mı?`)) return;
    try {
      await updateDoc(doc(db, 'gruplar', grup.id), { donemAralari: aralar.filter((x) => !(x.tarih === a.tarih && x.hafta === a.hafta)) });
      onDegisti?.();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  return (
    <div className="ara-haftalar">
      {aralar.length > 0 && (
        <p className="aciklama kucuk-yazi">
          Aralar:{' '}
          {aralar.map((a) => (
            <span key={a.tarih + a.hafta}>
              {kisaTarih(a.tarih)} başlayacak dönem {a.hafta} hafta ertelendi{' '}
              {a.tarih > bugun() && <button className="metin" onClick={() => kaldir(a)}>kaldır</button>}{' '}
            </span>
          ))}
        </p>
      )}
      {!acik ? (
        <button className="metin" onClick={() => setAcik(true)} disabled={!ileri.length}>⏸ Ara hafta ekle (tatil vb.)</button>
      ) : (
        <div className="kart-form ic-form">
          <strong>Dönemi ertele</strong>
          <p className="aciklama kucuk-yazi">Seçilen dönem ve sonraki bütün dönemler bu kadar hafta ileri kayar. Geçmiş dönemler değişmez.</p>
          <div className="form-izgara">
            <label className="alan">
              <span>Ertelenecek dönem</span>
              <select value={secim} onChange={(e) => setSecim(e.target.value)}>
                {ileri.map((d) => <option key={d.no} value={d.no}>{d.no + 1}. dönem · {kisaTarih(d.bas)} başlangıçlı</option>)}
              </select>
            </label>
            <label className="alan">
              <span>Kaç hafta ara</span>
              <select value={hafta} onChange={(e) => setHafta(e.target.value)}>
                {[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h} hafta</option>)}
              </select>
            </label>
          </div>
          <DonemTakvimi bas={grup.donemBaslangic} aralar={[...aralar, ...(ileri.length ? [{ tarih: (ileri.find((x) => String(x.no) === secim) || ileri[0]).bas, hafta: Number(hafta) }] : [])]} />
          {hata && <p className="hata">{hata}</p>}
          <div className="dugme-satiri">
            <button className="birincil kucuk" onClick={ekle}>Kaydet</button>
            <button className="metin" onClick={() => setAcik(false)}>Vazgeç</button>
          </div>
        </div>
      )}
      {hata && !acik && <p className="hata">{hata}</p>}
    </div>
  );
}

// ---------- Geçmiş dönemleri aktar ----------
const DURUM = [
  ['', '—'],
  ['odendi', 'Ödendi'],
  ['odenmedi', 'Ödenmedi'],
  ['yok', 'Yoktu'],
];

export function GecmisAktarim({ grup, kisiler, tanim, benim, onBitti, onVazgec }) {
  const aralar = grup.donemAralari || [];
  const simdiNo = donemBul(grup.donemBaslangic, bugun(), aralar)?.no ?? 0;
  const donemler = Array.from({ length: simdiNo + 1 }, (_, i) => donemNo(grup.donemBaslangic, i, aralar));
  const uyeler = (grup.uyeIds || []).map((id) => kisiler.find((k) => k.id === id) || { id, ad: 'Kişi' });
  const [mevcut, setMevcut] = useState(null); // { [kisiId]: { [donemBas]: {kayit, od} } }
  const [hucre, setHucre] = useState({}); // `${kisiId}|${donemBas}` → { d, tutar, tarih, yontem }
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const fiyat = (kid) => Number(grup.ozelFiyatlar?.[kid]?.fiyat ?? tanim.fiyat) || 0;

  useEffect(() => {
    Promise.all(
      uyeler.map(async (k) => {
        const [pl, ol] = await Promise.all([kisiPaketleri(k.id).catch(() => []), kisiOdemeleri(k.id).catch(() => [])]);
        const m = {};
        for (const p of pl.filter((x) => x.tur === 'grup' && x.grupId === grup.id)) m[p.donemBas] = { kayit: p, od: odemeDurumu(p, ol) };
        return [k.id, m];
      })
    ).then((l) => setMevcut(Object.fromEntries(l)));
  }, [grup.id]);

  const anahtar = (kid, d) => `${kid}|${d.bas}`;
  const ayarla = (kid, d, deg) =>
    setHucre((h) => ({ ...h, [anahtar(kid, d)]: { d: '', tutar: fiyat(kid), tarih: d.bas, yontem: 'nakit', ...h[anahtar(kid, d)], ...deg } }));
  const satirDoldur = (kid, deger) => {
    for (const d of donemler) if (!kilitli(kid, d)) ayarla(kid, d, { d: deger });
  };
  const kilitli = (kid, d) => {
    const m = mevcut?.[kid]?.[d.bas];
    return !!(m && m.od.odenen > 0);
  };

  const sayilar = Object.values(hucre).reduce((t, h) => ((t[h.d] = (t[h.d] || 0) + 1), t), {});

  async function kaydet() {
    setHata('');
    const secilen = Object.entries(hucre).filter(([, h]) => h.d);
    if (!secilen.length) return setHata('Hiç hücre seçilmedi.');
    if (!window.confirm(`${sayilar.odendi || 0} ödendi, ${sayilar.odenmedi || 0} ödenmedi, ${sayilar.yok || 0} yoktu kaydedilsin mi?`)) return;
    setBekliyor(true);
    const aktarimId = 'akt_' + Date.now();
    try {
      // Katılım: baştan "Yoktu" olan dönemlerden sonraki ilk dönem
      const katilim = { ...(grup.uyeKatilim || {}) };
      const oncekiKatilim = {};
      for (const k of uyeler) {
        let ilkVar = null;
        for (const d of donemler) {
          const h = hucre[anahtar(k.id, d)]?.d;
          const m = mevcut[k.id]?.[d.bas];
          const var_ = h === 'odendi' || h === 'odenmedi' || (!h && m && m.kayit.durum !== 'iptal');
          if (var_) { ilkVar = d; break; }
          if (h !== 'yok') break; // belirsiz dönem: katılımı değiştirme
        }
        if (ilkVar && ilkVar.no > 0 && hucre[anahtar(k.id, donemler[0])]?.d === 'yok' && (!katilim[k.id] || katilim[k.id] < ilkVar.bas)) {
          oncekiKatilim[k.id] = katilim[k.id] || null;
          katilim[k.id] = ilkVar.bas;
        }
      }
      if (Object.keys(oncekiKatilim).length) await updateDoc(doc(db, 'gruplar', grup.id), { uyeKatilim: katilim });
      const g2 = { ...grup, uyeKatilim: katilim };

      for (const k of uyeler) {
        for (const d of donemler) {
          const h = hucre[anahtar(k.id, d)];
          if (!h?.d) continue;
          const m = mevcut[k.id]?.[d.bas];
          let kayit = m?.kayit;
          const kayitAc = async () => {
            if (kayit) return kayit;
            await grupKaydiOlustur(g2, d, tanim, k.id, benim);
            const id = grupKayitKimligi(grup.id, d.bas, k.id);
            await updateDoc(doc(db, 'satilanPaketler', id), { aktarimId });
            kayit = { id, kisiId: k.id, durum: 'aktif', fiyatNotu: '' };
            return kayit;
          };
          if (h.d === 'yok') {
            const once = katilim[k.id] && d.bit < katilim[k.id];
            if (kayit && !(m.od.odenen > 0)) await paketGuncelle(kayit, { durum: 'iptal', fiyatNotu: once ? KATILIM_ONCESI : DONEM_HARIC }, benim);
            else if (!kayit && !once) {
              await kayitAc();
              await paketGuncelle(kayit, { durum: 'iptal', fiyatNotu: DONEM_HARIC }, benim);
            }
            continue;
          }
          await kayitAc();
          if (kayit.durum === 'iptal') await paketGuncelle(kayit, { durum: 'aktif', fiyatNotu: '' }, benim);
          if (h.d === 'odendi' && Number(h.tutar) > 0) {
            await odemeEkle(
              {
                kisiId: k.id,
                satilanPaketId: kayit.id,
                tutar: Number(h.tutar),
                tarih: h.tarih || d.bas,
                yontem: h.yontem,
                not: `Aktarım · ${d.no + 1}. dönem (${kisaTarih(d.bas)} – ${kisaTarih(d.bit)})`,
                ekAlanlar: { aktarimId },
              },
              benim
            );
          }
        }
      }
      await updateDoc(doc(db, 'gruplar', grup.id), {
        aktarimlar: arrayUnion({ id: aktarimId, tarih: bugun(), yapan: benim, sayilar, oncekiKatilim }),
        guncelleme: serverTimestamp(),
      });
      onBitti(`Aktarım kaydedildi: ${sayilar.odendi || 0} ödendi, ${sayilar.odenmedi || 0} ödenmedi, ${sayilar.yok || 0} yoktu.`);
    } catch (e) {
      setHata(hataMesaji(e) + ' Kaydedilenler kaldı; "Aktarımı geri al" ile temizleyebilirsiniz.');
      setBekliyor(false);
    }
  }

  if (!mevcut) return <p className="aciklama">Yükleniyor…</p>;
  return (
    <div className="kart-form ic-form gecmis-aktarim">
      <strong>Geçmiş dönemleri aktar</strong>
      <p className="aciklama kucuk-yazi">
        Her öğrenci için her dönemi seçin: <b>Ödendi</b> (tutar, ödemenin alındığı tarih ve yöntem), <b>Ödenmedi</b> (borç olarak kalır) ya da <b>Yoktu</b> (o dönem grupta
        değildi). Baştaki "Yoktu"lardan sonraki ilk dönem katılım tarihi olur. Ödeme alınmış dönemler kilitlidir. Satır başındaki düğmeyle bütün dönemleri tek seferde doldurabilirsiniz.
      </p>
      <div className="tablo-kap">
        <table className="tablo aktarim-tablo">
          <thead>
            <tr>
              <th>Öğrenci</th>
              {donemler.map((d) => <th key={d.no}>{d.no + 1}. dönem<br /><small>{kisaTarih(d.bas)} – {kisaTarih(d.bit)}</small></th>)}
            </tr>
          </thead>
          <tbody>
            {uyeler.map((k) => (
              <tr key={k.id}>
                <th scope="row">
                  {k.ad}
                  <span className="satir-doldur">
                    <button type="button" className="metin" onClick={() => satirDoldur(k.id, 'odendi')}>hepsi ödendi</button>
                  </span>
                </th>
                {donemler.map((d) => {
                  const m = mevcut[k.id]?.[d.bas];
                  const h = hucre[anahtar(k.id, d)] || {};
                  if (kilitli(k.id, d)) {
                    return <td key={d.no} className="kilitli">✓ kayıtlı<br /><small>{tl(m.od.odenen)}</small></td>;
                  }
                  return (
                    <td key={d.no} className={h.d ? 'secili-' + h.d : ''}>
                      <select value={h.d || ''} onChange={(e) => ayarla(k.id, d, { d: e.target.value })} aria-label={`${k.ad} ${d.no + 1}. dönem`}>
                        {DURUM.map(([v, ad]) => <option key={v} value={v}>{v === '' && m ? (m.kayit.durum === 'iptal' ? 'İptal (değiştirme)' : 'Ödenmedi (değiştirme)') : ad}</option>)}
                      </select>
                      {h.d === 'odendi' && (
                        <>
                          <input type="number" min="0" value={h.tutar} onChange={(e) => ayarla(k.id, d, { tutar: e.target.value })} aria-label="Tutar" />
                          <input type="date" value={h.tarih} onChange={(e) => ayarla(k.id, d, { tarih: e.target.value })} aria-label="Ödeme tarihi" />
                          <select value={h.yontem} onChange={(e) => ayarla(k.id, d, { yontem: e.target.value })} aria-label="Yöntem">
                            {YONTEMLER.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
                          </select>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="aciklama">
        Seçilen: {sayilar.odendi || 0} ödendi · {sayilar.odenmedi || 0} ödenmedi · {sayilar.yok || 0} yoktu
      </p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor} onClick={kaydet}>{bekliyor ? 'Kaydediliyor…' : 'Aktarımı kaydet'}</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// Son aktarımı geri al: aktarımla açılan kayıtları siler, ödemelerini "silindi" yapar, katılım tarihlerini eski haline getirir
export async function aktarimiGeriAl(grup, akt, benim) {
  const [ps, os] = await Promise.all([
    getDocs(query(collection(db, 'satilanPaketler'), where('aktarimId', '==', akt.id))),
    getDocs(query(collection(db, 'odemeler'), where('aktarimId', '==', akt.id))),
  ]);
  for (const o of os.docs) await updateDoc(o.ref, { silindi: true, silen: benim, silinme: serverTimestamp(), silmeNedeni: 'Aktarım geri alındı' });
  for (const p of ps.docs) await deleteDoc(p.ref);
  const katilim = { ...(grup.uyeKatilim || {}) };
  for (const [kid, eski] of Object.entries(akt.oncekiKatilim || {})) {
    if (eski) katilim[kid] = eski;
    else delete katilim[kid];
  }
  await updateDoc(doc(db, 'gruplar', grup.id), {
    uyeKatilim: katilim,
    aktarimlar: (grup.aktarimlar || []).filter((a) => a.id !== akt.id),
  });
  return { odeme: os.size, kayit: ps.size };
}

export function AktarimListesi({ grup, benim, onDegisti }) {
  const [hata, setHata] = useState('');
  if (!grup.aktarimlar?.length) return null;
  return (
    <p className="aciklama kucuk-yazi">
      Aktarımlar:{' '}
      {grup.aktarimlar.map((a) => (
        <Fragment key={a.id}>
          {kisaTarih(a.tarih)} ({a.sayilar?.odendi || 0} ödendi, {a.sayilar?.odenmedi || 0} ödenmedi, {a.sayilar?.yok || 0} yoktu){' '}
          <button
            className="metin"
            onClick={async () => {
              if (!window.confirm('Bu aktarım geri alınsın mı? Aktarımla girilen ödemeler silinir (iz kalır), açılan dönem kayıtları kaldırılır.')) return;
              try {
                await aktarimiGeriAl(grup, a, benim);
                onDegisti?.();
              } catch (e) {
                setHata(hataMesaji(e));
              }
            }}
          >
            geri al
          </button>{' '}
        </Fragment>
      ))}
      {hata && <span className="hata"> {hata}</span>}
    </p>
  );
}
