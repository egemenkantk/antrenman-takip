import { useState } from 'react';
import SiraliListe from './SiraliListe';
import {
  BOLUMLER,
  BOLUM_SIRASI,
  BOLUM_RENK,
  FAZLAR_SPORCU,
  FAZLAR_PT,
  HARF,
  HAFTA_GUNLERI,
  SABLON_ADLARI_SPORCU,
  gunBolumleri,
  dozaj,
  blokBitis,
  gunEkle,
  kisaTarih,
  gunHaftaGunu,
  yeniBlok,
} from './model';
import { HEDEFLER } from '../veri';

const GUN_ADI = Object.fromEntries(HAFTA_GUNLERI);
const kopya = (o) => JSON.parse(JSON.stringify(o));

// Gün sayısı ve hafta sayısı değişince gün/ilerleme dizilerini uyumla
function uyumla(b) {
  const n = Math.max(1, (b.haftaGunleri || []).length);
  const gunler = [...(b.gunler || [])];
  while (gunler.length < n) gunler.push({ baslik: '', bolumler: b.sade ? [] : [...(b.bolumler || [])], icerik: {} });
  gunler.length = n;
  let ilerleme = b.ilerleme || [];
  if (!b.sade) {
    ilerleme = Array.from({ length: b.haftalar || 1 }, (_, i) => {
      const h = ilerleme[i] || { not: '' };
      if (h.gun) return { not: h.not || '', gun: Array.from({ length: n }, (_, d) => ({ ...(h.gun[d] || {}) })) };
      // ortak (gün ayrımı olmayan) dozajı güne ayrılmış biçime çevir
      return { not: h.not || '', gun: Array.from({ length: n }, () => ({ ...(h.bolum || {}) })) };
    });
  }
  return { ...b, gunler, ilerleme };
}

export default function ProgramDuzenleyici({ ilk, sade, varsayilanBaslangic, hedef, onKaydet, onVazgec }) {
  const [b, setB] = useState(() =>
    uyumla(ilk ? kopya(ilk) : yeniBlok({ sablon: sade ? hedef || 'bos' : 'genel', sade, baslangic: varsayilanBaslangic }))
  );
  const [sablon, setSablon] = useState(ilk ? '' : sade ? hedef || 'bos' : 'genel');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [ilerlemeAcik, setIlerlemeAcik] = useState(!sade);
  const guncelle = (deg) => setB((x) => uyumla({ ...x, ...deg }));
  const fazlar = sade ? FAZLAR_PT : FAZLAR_SPORCU;

  function sablonSec(v) {
    setSablon(v);
    const y = yeniBlok({ sablon: v, sade, baslangic: b.baslangic });
    setB(uyumla(y));
  }

  function gunGuncelle(i, deg) {
    setB((x) => {
      const gunler = [...x.gunler];
      gunler[i] = { ...gunler[i], ...deg };
      return { ...x, gunler };
    });
  }
  function bolumAcKapa(i, k) {
    const g = b.gunler[i];
    const secili = gunBolumleri(b, g);
    const yeni = secili.includes(k) ? secili.filter((x) => x !== k) : [...secili, k];
    gunGuncelle(i, { bolumler: yeni });
    if (!b.bolumler.includes(k)) setB((x) => ({ ...x, bolumler: BOLUM_SIRASI.filter((s) => [...x.bolumler, k].includes(s)) }));
  }
  function dozGuncelle(h, g, k, v) {
    setB((x) => {
      const ilerleme = kopya(x.ilerleme);
      ilerleme[h].gun[g][k] = v;
      return { ...x, ilerleme };
    });
  }

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (!b.ad.trim()) return setHata('Blok adı gerekli.');
    if (!b.baslangic) return setHata('Başlangıç tarihi gerekli.');
    if (!b.haftaGunleri.length) return setHata('En az bir antrenman günü seç.');
    if (b.faz === 'ozelAd' && !b.fazAdi.trim()) return setHata('Faz adını yaz.');
    // Kullanılan bölümleri gün seçimlerinden topla
    const kullanilan = new Set(b.gunler.flatMap((g) => gunBolumleri(b, g)));
    const temiz = { ...b, ad: b.ad.trim(), bolumler: b.sade ? [] : BOLUM_SIRASI.filter((k) => kullanilan.has(k)) };
    setBekliyor(true);
    try {
      await onKaydet(temiz);
    } catch (err) {
      setHata(err?.code === 'permission-denied' ? 'Program düzenleme yetkin yok.' : 'Kaydedilemedi, tekrar dene.');
      setBekliyor(false);
    }
  }

  return (
    <form className="kart-form program-form" onSubmit={kaydet}>
      <h3>{ilk ? 'Bloğu düzenle' : sade ? 'Yeni haftalık plan' : 'Yeni program bloğu'}</h3>

      <div className="form-izgara">
        {!ilk && (
          <label className="alan">
            <span>{sade ? 'Hedefe göre örnek şablon' : 'Hazır şablon'}</span>
            <select value={sablon} onChange={(e) => sablonSec(e.target.value)}>
              {sade
                ? [...HEDEFLER, ['bos', 'Boş plan']].map(([v, ad]) => <option key={v} value={v}>{ad}</option>)
                : SABLON_ADLARI_SPORCU.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
            </select>
          </label>
        )}
        <label className="alan">
          <span>{sade ? 'Plan adı' : 'Blok adı'}</span>
          <input value={b.ad} onChange={(e) => guncelle({ ad: e.target.value })} />
        </label>
        <label className="alan">
          <span>{sade ? 'Faz' : 'Dönem'}</span>
          <select value={b.faz} onChange={(e) => guncelle({ faz: e.target.value })}>
            {Object.entries(fazlar).map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
            <option value="ozelAd">Kendi fazımı yazacağım…</option>
          </select>
        </label>
        {b.faz === 'ozelAd' && (
          <label className="alan">
            <span>Faz adı</span>
            <input value={b.fazAdi || ''} onChange={(e) => guncelle({ fazAdi: e.target.value })} placeholder="Örn. Rehabilitasyon sonrası" />
          </label>
        )}
        <label className="alan">
          <span>Başlangıç</span>
          <input type="date" value={b.baslangic} onChange={(e) => guncelle({ baslangic: e.target.value })} />
        </label>
        <label className="alan">
          <span>Hafta sayısı</span>
          <input
            type="number"
            min="1"
            max="16"
            value={b.haftalar}
            onChange={(e) => guncelle({ haftalar: Math.max(1, Math.min(16, Number(e.target.value) || 1)) })}
          />
          <small className="ipucu">Bitiş: {b.baslangic ? kisaTarih(gunEkle(blokBitis(b), -1)) : '—'}</small>
        </label>
      </div>

      {!b.sade && (
        <div className="alan">
          <span>Seanslar neye göre planlansın?</span>
          <div className="secim-cubugu" role="radiogroup" aria-label="Planlama">
            {[['hafta', 'Haftanın sabit günleri'], ['mac', 'Maç gününe göre (MD-4, MD-2…)']].map(([v, ad]) => (
              <button
                type="button"
                key={v}
                role="radio"
                aria-checked={(b.plan || 'hafta') === v}
                className={'secim' + ((b.plan || 'hafta') === v ? ' secili' : '')}
                onClick={() => guncelle({ plan: v })}
              >
                {ad}
              </button>
            ))}
          </div>
        </div>
      )}

      {b.plan === 'mac' && !b.sade ? (
        <div className="alan">
          <span>Maçlar arasındaki seans sayısı</span>
          <div className="cip-grubu">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={'cip' + (b.gunler.length === n ? ' secili' : '')}
                aria-pressed={b.gunler.length === n}
                onClick={() => guncelle({ haftaGunleri: HAFTA_GUNLERI.slice(0, n).map(([g]) => g) })}
              >
                {n}
              </button>
            ))}
          </div>
          <small className="ipucu">Her seansın maça göre gününü aşağıda seç. Maç ve turnuvalar Takvim bölümünden girilir.</small>
        </div>
      ) : (
        <div className="alan">
          <span>Antrenman günleri</span>
          <div className="cip-grubu">
            {HAFTA_GUNLERI.map(([v, ad]) => {
              const acik = b.haftaGunleri.includes(v);
              return (
                <button
                  type="button"
                  key={v}
                  className={'cip' + (acik ? ' secili' : '')}
                  aria-pressed={acik}
                  onClick={() =>
                    guncelle({ haftaGunleri: acik ? b.haftaGunleri.filter((x) => x !== v) : [...b.haftaGunleri, v] })
                  }
                >
                  {ad}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="gun-duzen-izgara">
        {b.gunler.map((g, i) => {
          const secili = gunBolumleri(b, g);
          return (
            <fieldset key={i} className="gun-duzen">
              <legend>
                <span className="harf">{HARF[i]}</span>{' '}
                {b.plan === 'mac' && !b.sade ? (
                  <select
                    value={g.md ?? ''}
                    onChange={(e) => gunGuncelle(i, { md: e.target.value === '' ? null : Number(e.target.value) })}
                    aria-label={`${HARF[i]} seansının maça göre günü`}
                  >
                    <option value="">Maç gününü seç</option>
                    {[-5, -4, -3, -2, -1, 1, 2].map((v) => <option key={v} value={v}>{v > 0 ? `MD+${v}` : `MD${v}`}</option>)}
                  </select>
                ) : (
                  GUN_ADI[gunHaftaGunu(b, i)] || ''
                )}
              </legend>
              <label className="alan">
                <span>Başlık</span>
                <input value={g.baslik || ''} onChange={(e) => gunGuncelle(i, { baslik: e.target.value })} />
              </label>
              {b.sade ? (
                <label className="alan">
                  <span>Egzersizler (her satıra bir hareket, örn. "Goblet squat — 3×10")</span>
                  <textarea
                    rows={7}
                    value={g.icerik?.liste || ''}
                    onChange={(e) => gunGuncelle(i, { icerik: { ...g.icerik, liste: e.target.value } })}
                  />
                </label>
              ) : (
                <>
                  <div className="cip-grubu kucuk">
                    {BOLUM_SIRASI.map((k) => (
                      <button
                        type="button"
                        key={k}
                        className={'cip bolum-cip' + (secili.includes(k) ? ' secili' : '')}
                        style={{ '--bc': BOLUM_RENK[k] }}
                        aria-pressed={secili.includes(k)}
                        onClick={() => bolumAcKapa(i, k)}
                      >
                        {BOLUMLER[k].ad}
                      </button>
                    ))}
                  </div>
                  {secili.length > 0 && (
                    <SiraliListe
                      ogeler={secili}
                      anahtar={(k) => k}
                      onSirala={(yeni) => gunGuncelle(i, { bolumler: yeni })}
                      cizim={(k, tutamac) => (
                        <div className="bolum-duzen" style={{ '--bc': BOLUM_RENK[k] }}>
                          <div className="bolum-duzen-ust">
                            <strong>{BOLUMLER[k].ad}</strong>
                            {tutamac}
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Her satıra bir hareket"
                            value={g.icerik?.[k] || ''}
                            onChange={(e) => gunGuncelle(i, { icerik: { ...g.icerik, [k]: e.target.value } })}
                          />
                        </div>
                      )}
                    />
                  )}
                </>
              )}
            </fieldset>
          );
        })}
      </div>

      {!b.sade && (
        <div className="alan">
          <button type="button" className="metin" onClick={() => setIlerlemeAcik(!ilerlemeAcik)}>
            {ilerlemeAcik ? '▾' : '▸'} Haftalık ilerleme (gün ve bölüm bazlı dozaj)
          </button>
          {ilerlemeAcik && (
            <div className="tablo-kap">
              <table className="tablo ilerleme-duzen">
                <thead>
                  <tr>
                    <th>Hafta</th>
                    {b.gunler.map((g, gi) =>
                      gunBolumleri(b, g)
                        .filter((k) => BOLUMLER[k]?.doz)
                        .map((k) => (
                          <th key={gi + k} style={{ borderBottomColor: BOLUM_RENK[k] }}>
                            {HARF[gi]} · {BOLUMLER[k].ad}
                          </th>
                        ))
                    )}
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {b.ilerleme.map((h, hi) => (
                    <tr key={hi}>
                      <th scope="row">{hi + 1}</th>
                      {b.gunler.map((g, gi) =>
                        gunBolumleri(b, g)
                          .filter((k) => BOLUMLER[k]?.doz)
                          .map((k) => (
                            <td key={gi + k}>
                              <input
                                value={dozaj(h, gi, k)}
                                placeholder={BOLUMLER[k].ipucu}
                                onChange={(e) => dozGuncelle(hi, gi, k, e.target.value)}
                              />
                            </td>
                          ))
                      )}
                      <td>
                        <input
                          value={h.not || ''}
                          onChange={(e) =>
                            setB((x) => {
                              const ilerleme = kopya(x.ilerleme);
                              ilerleme[hi].not = e.target.value;
                              return { ...x, ilerleme };
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <label className="alan">
        <span>{sade ? 'Plan notu' : 'Blok notu'}</span>
        <textarea rows={2} value={b.not || ''} onChange={(e) => guncelle({ not: e.target.value })} />
      </label>

      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}
