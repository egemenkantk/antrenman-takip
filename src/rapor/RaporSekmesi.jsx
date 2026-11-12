// Gelişim raporu: sporcu ya da PT danışanı için, veliye ya da kişinin kendisine hitaben.
import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID, MARKA } from '../config/marka';
import { TIP_ADI, HEDEF_ADI, yasHesapla } from '../veri';
import { TARAF_ADI, sayiGoster } from '../testler/tanimlar';
import { testSatirlari, testTarihleri, grafikNoktalari, antrenmanOzeti, degisimMetni, TEST_ACIKLAMA } from './model';
import { bugun, gunEkle, gunFarki } from '../program/model';
import { posturleriGetir } from '../postur/PosturSekmesi';
import { BULGU, POSTUR, bulguMetni, egilim } from '../postur/tanimlar';

const altListe = async (kisiId, ad) =>
  (await getDocs(collection(db, 'kisiler', kisiId, ad))).docs.map((d) => ({ id: d.id, ...d.data() }));
const uzun = (t) => (t ? new Date(t + 'T00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const kisa = (t) => (t ? new Date(t + 'T00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function MiniGrafik({ baslik, noktalar }) {
  if (noktalar.length < 2) return null;
  const W = 220, H = 90, L = 8, R = 8, T = 16, B = 16;
  const v = noktalar.map((p) => p.deger);
  let lo = Math.min(...v), hi = Math.max(...v);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.15;
  lo -= pad; hi += pad;
  const x = (i) => L + (i / (noktalar.length - 1)) * (W - L - R);
  const y = (d) => T + (1 - (d - lo) / (hi - lo)) * (H - T - B);
  return (
    <div className="r-grafik">
      <b>{baslik}</b>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${baslik} gelişimi`}>
        <polyline points={noktalar.map((p, i) => `${x(i)},${y(p.deger)}`).join(' ')} fill="none" stroke="#2347D8" strokeWidth="2" />
        {noktalar.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.deger)} r="3" fill="#fff" stroke="#2347D8" strokeWidth="2" />
            <text x={x(i)} y={y(p.deger) - 6} fontSize="9.5" textAnchor={i === 0 ? 'start' : i === noktalar.length - 1 ? 'end' : 'middle'} fill="#18212C">
              {sayiGoster(p.deger)}
            </text>
          </g>
        ))}
        <text x={L} y={H - 3} fontSize="9" fill="#5D6B7B">{kisa(noktalar[0].tarih)}</text>
        <text x={W - R} y={H - 3} fontSize="9" textAnchor="end" fill="#5D6B7B">{kisa(noktalar[noktalar.length - 1].tarih)}</text>
      </svg>
    </div>
  );
}

export default function RaporSekmesi({ kisi, yapan }) {
  const sporcu = kisi.tip !== 'pt';
  const [veri, setVeri] = useState(null);
  const [marka, setMarka] = useState({ ad: MARKA.ad, koc: '', logo: null });
  const [kime, setKime] = useState(() => {
    const yas = yasHesapla(kisi.dogumTarihi, kisi.dogumYili);
    return sporcu && (yas == null || yas < 18) ? 'veli' : 'kisi';
  });
  const [mod, setMod] = useState(sporcu ? 'test' : 'donem'); // test: iki test günü · donem: tarih aralığı
  const [A, setA] = useState('');
  const [B, setB] = useState('');
  const [bolum, setBolum] = useState({ testler: sporcu, grafikler: sporcu, antrenman: true, postur: true, vucut: !sporcu, yorum: true });
  const [yorum, setYorum] = useState({ degerlendirme: '', hedefler: '' });
  const [durum, setDurum] = useState('');
  const sayfa = useRef(null);

  useEffect(() => {
    Promise.all([
      altListe(kisi.id, 'testSonuclari'),
      altListe(kisi.id, 'antrenmanKayitlari'),
      altListe(kisi.id, 'wellness'),
      getDoc(doc(db, 'kisiler', kisi.id, 'raporlar', 'taslak')),
      getDoc(doc(db, 'kurumlar', KURUM_ID)).catch(() => null),
      getDoc(doc(db, 'aktarim', 'sporcu-karti')).catch(() => null),
      posturleriGetir(kisi.id).catch(() => []),
    ]).then(([testler, kayitlar, wellness, taslak, kurum, eski, posturler]) => {
      setVeri({ testler: testler.filter((t) => typeof t.deger === 'number'), kayitlar, wellness, posturler });
      if (taslak.exists()) setYorum({ degerlendirme: taslak.data().degerlendirme || '', hedefler: taslak.data().hedefler || '' });
      const k = kurum?.exists() ? kurum.data().rapor || {} : {};
      setMarka({ ad: k.ad || MARKA.ad, koc: k.koc || '', logo: k.logo || (eski?.exists() ? eski.data().logo : null) || null });
    });
  }, [kisi.id]);

  const tarihler = useMemo(() => (veri ? testTarihleri(veri.testler) : []), [veri]);
  // Varsayılan tarihler
  useEffect(() => {
    if (!veri) return;
    if (mod === 'test') {
      setB(tarihler[tarihler.length - 1] || '');
      setA(tarihler.length > 1 ? tarihler[tarihler.length - 2] : '');
    } else {
      setB(bugun());
      setA(gunEkle(bugun(), -28));
    }
  }, [veri, mod]);

  if (!veri) return <p className="aciklama">Yükleniyor…</p>;

  const testGruplari = B ? testSatirlari(veri.testler, mod === 'test' ? A : '', B, { vucut: bolum.vucut }) : [];
  const satirlar = testGruplari.flatMap((g) => g.satirlar);
  const kiyas = satirlar.filter((r) => r.iyi != null);
  const ozetBas = A || (mod === 'test' ? tarihler[0] : '');
  const ozet = ozetBas && B ? antrenmanOzeti(veri.kayitlar, veri.wellness, ozetBas, B) : null;
  const vucut = B
    ? testSatirlari(veri.testler, A, B, { vucut: true }).flatMap((g) => g.satirlar).filter((r) => r.bilgi.kat === 'Antropometri')
    : [];
  const kartOlculeri = [
    ['Boy (cm)', kisi.boy],
    ['Vücut ağırlığı (kg)', kisi.kilo],
  ].filter(([t, v]) => v != null && !vucut.some((r) => r.test === t));
  const yas = yasHesapla(kisi.dogumTarihi, kisi.dogumYili);
  const hitap = kime === 'veli' ? 'Bu rapor sporcu ve ailesi için hazırlanmıştır.' : 'Bu rapor yalnızca kişinin kendisi için hazırlanmıştır.';
  const baslik = sporcu ? 'Sporcu Gelişim Raporu' : 'Gelişim Raporu';

  async function yorumKaydet() {
    setDurum('Kaydediliyor…');
    try {
      await setDoc(doc(db, 'kisiler', kisi.id, 'raporlar', 'taslak'), { ...yorum, kurumId: KURUM_ID, kaydeden: yapan, guncelleme: serverTimestamp() });
      setDurum('Yorum kaydedildi.');
    } catch {
      setDurum('Kaydedilemedi.');
    }
  }
  async function markaKaydet() {
    setDurum('Kaydediliyor…');
    try {
      await setDoc(doc(db, 'kurumlar', KURUM_ID), { rapor: marka }, { merge: true });
      setDurum('Rapor başlığı kaydedildi.');
    } catch {
      setDurum('Kaydedilemedi (yalnızca yönetici değiştirebilir).');
    }
  }
  async function logoSec(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const olcek = Math.min(1, 320 / img.width, 160 / img.height);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * olcek);
      c.height = Math.round(img.height * olcek);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      setMarka((m) => ({ ...m, logo: c.toDataURL('image/png') }));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  }
  async function pdfIndir() {
    setDurum('PDF hazırlanıyor…');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const ad = `${kisi.ad} - ${baslik} - ${B}.pdf`;
      await html2pdf()
        .set({
          margin: [8, 0, 8, 0],
          filename: ad,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.r-bas', '.r-kisi', '.r-ozet', '.r-tablo tr', '.r-grafikler', '.r-kpi', '.r-metin', '.r-bolum > h3'] },
        })
        .from(sayfa.current)
        .save();
      await setDoc(doc(collection(db, 'kisiler', kisi.id, 'raporlar')), {
        tarih: bugun(), A: A || null, B, kime, mod, kurumId: KURUM_ID, olusturan: yapan, olusturma: serverTimestamp(),
      }).catch(() => {});
      setDurum('PDF indirildi.');
    } catch {
      setDurum('PDF oluşturulamadı. "Yazdır" ile PDF olarak kaydetmeyi deneyebilirsin.');
    }
  }

  const fmtFark = (r) => {
    const yuzde = r.onceki ? (r.fark / r.onceki) * 100 : 0;
    return `${r.fark > 0 ? '+' : ''}${sayiGoster(r.fark)} (${yuzde > 0 ? '+' : ''}${yuzde.toFixed(1).replace('.', ',')}%)`;
  };

  return (
    <div className="rapor-yerlesim">
      <div className="rapor-secenek">
        <fieldset>
          <legend>Kime</legend>
          <label className="onay-kutusu"><input type="radio" checked={kime === 'veli'} onChange={() => setKime('veli')} /> <span>Veliye</span></label>
          <label className="onay-kutusu"><input type="radio" checked={kime === 'kisi'} onChange={() => setKime('kisi')} /> <span>{sporcu ? 'Sporcunun kendisine' : 'Danışanın kendisine'}</span></label>
        </fieldset>

        <fieldset>
          <legend>Dönem</legend>
          {sporcu && (
            <>
              <label className="onay-kutusu"><input type="radio" checked={mod === 'test'} onChange={() => setMod('test')} /> <span>İki test gününü karşılaştır</span></label>
              <label className="onay-kutusu"><input type="radio" checked={mod === 'donem'} onChange={() => setMod('donem')} /> <span>Tarih aralığı</span></label>
            </>
          )}
          {mod === 'test' ? (
            <>
              <label className="alan">
                <span>Önceki test</span>
                <select value={A} onChange={(e) => setA(e.target.value)}>
                  <option value="">— (karşılaştırma yok)</option>
                  {tarihler.filter((t) => t < B).map((t) => <option key={t} value={t}>{kisa(t)}</option>)}
                </select>
              </label>
              <label className="alan">
                <span>Son test</span>
                <select value={B} onChange={(e) => setB(e.target.value)}>
                  {tarihler.map((t) => <option key={t} value={t}>{kisa(t)}</option>)}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="alan"><span>Başlangıç</span><input type="date" value={A} onChange={(e) => setA(e.target.value)} /></label>
              <label className="alan"><span>Bitiş</span><input type="date" value={B} onChange={(e) => setB(e.target.value)} /></label>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Bölümler</legend>
          {[
            ...(sporcu ? [['testler', 'Test sonuçları ve açıklamalar'], ['grafikler', 'Gelişim grafikleri']] : []),
            ['antrenman', 'Antrenman özeti'],
            ['postur', 'Postür özeti'],
            ['vucut', 'Vücut ölçüleri'],
            ['yorum', 'Değerlendirme ve hedefler'],
          ].map(([k, ad]) => (
            <label key={k} className="onay-kutusu">
              <input type="checkbox" checked={!!bolum[k]} onChange={(e) => setBolum({ ...bolum, [k]: e.target.checked })} />
              <span>{ad}</span>
            </label>
          ))}
        </fieldset>

        {bolum.yorum && (
          <fieldset>
            <legend>Değerlendirme</legend>
            <label className="alan">
              <span>Bu dönem</span>
              <textarea rows={5} value={yorum.degerlendirme} onChange={(e) => setYorum({ ...yorum, degerlendirme: e.target.value })} placeholder="Bu dönemde neler gelişti, nelere odaklandık…" />
            </label>
            <label className="alan">
              <span>Sonraki dönem hedefleri</span>
              <textarea rows={4} value={yorum.hedefler} onChange={(e) => setYorum({ ...yorum, hedefler: e.target.value })} />
            </label>
            <button type="button" className="ikincil kucuk" onClick={yorumKaydet}>Yorumu kaydet</button>
          </fieldset>
        )}

        <details>
          <summary>Rapor başlığı (salon adı, koç, logo)</summary>
          <div className="ic-form">
            <label className="alan"><span>Salon / kulüp adı</span><input value={marka.ad} onChange={(e) => setMarka({ ...marka, ad: e.target.value })} /></label>
            <label className="alan"><span>Koç adı</span><input value={marka.koc} onChange={(e) => setMarka({ ...marka, koc: e.target.value })} /></label>
            <label className="alan"><span>Logo</span><input type="file" accept="image/*" onChange={logoSec} /></label>
            {marka.logo && (
              <div className="dugme-satiri">
                <img src={marka.logo} alt="Logo" className="logo-onizleme" />
                <button type="button" className="metin tehlike" onClick={() => setMarka({ ...marka, logo: null })}>Logoyu kaldır</button>
              </div>
            )}
            <button type="button" className="ikincil kucuk" onClick={markaKaydet}>Başlığı kaydet</button>
          </div>
        </details>

        <button className="birincil" onClick={pdfIndir} disabled={!B}>PDF olarak indir</button>
        <button className="ikincil" onClick={() => window.print()} disabled={!B}>Yazdır</button>
        {durum && <p className="aciklama kucuk-yazi" aria-live="polite">{durum}</p>}
      </div>

      <div className="rapor-sahne">
        <div className="rapor-sayfa" ref={sayfa}>
          <div className="r-bas">
            <div className="r-marka">
              {marka.logo && <img src={marka.logo} alt="" />}
              <div>
                <b>{marka.ad}</b>
                {marka.koc && <span>Koç: {marka.koc}</span>}
              </div>
            </div>
            <div className="r-baslik">
              <h1>{baslik}</h1>
              <p>Rapor tarihi: {uzun(bugun())}</p>
            </div>
          </div>

          <div className="r-kisi">
            {kisi.foto && <img className="r-foto" src={kisi.foto} alt="" />}
            <h2>{kisi.ad}</h2>
            {sporcu && kisi.brans && <span>Branş <b>{kisi.brans}{kisi.pozisyon ? ' · ' + kisi.pozisyon : ''}</b></span>}
            {!sporcu && kisi.hedef && <span>Hedef <b>{HEDEF_ADI[kisi.hedef]}</b></span>}
            {yas != null && <span>Yaş <b>{yas}</b></span>}
            {B && <span>{mod === 'test' ? 'Karşılaştırma' : 'Dönem'} <b>{A ? `${kisa(A)} → ` : ''}{kisa(B)}</b></span>}
          </div>

          {!B && <p>Bu dönem için veri yok.</p>}

          {B && sporcu && mod === 'test' && A && (
            <div className="r-ozet">
              <div><b>{kiyas.filter((r) => r.iyi).length}/{kiyas.length}</b><span>ölçümde gelişme</span></div>
              <div><b>{satirlar.filter((r) => r.rekor).length}</b><span>yeni kişisel rekor</span></div>
              <div>
                <b>{gunFarki(A, B) >= 28 ? Math.round(gunFarki(A, B) / 7) + ' hafta' : gunFarki(A, B) + ' gün'}</b>
                <span>iki test arasındaki süre</span>
              </div>
            </div>
          )}

          {B && bolum.testler && sporcu && testGruplari.filter((g) => g.kat !== 'Antropometri').length > 0 && (
            <div className="r-bolum">
              <h3>Test sonuçları</h3>
              <table className="r-tablo">
                <thead>
                  <tr>
                    <th>Test</th>
                    {mod === 'test' && A && <th>{kisa(A)}</th>}
                    <th>{kisa(B)}</th>
                    {mod === 'test' && A && <th>Değişim</th>}
                  </tr>
                </thead>
                {testGruplari.filter((g) => g.kat !== 'Antropometri').map((g) => (
                  <tbody key={g.kat}>
                    <tr className="r-kat"><td colSpan={mod === 'test' && A ? 4 : 2}>{g.kat}</td></tr>
                    {g.satirlar.map((r) => (
                      <tr key={r.anahtar}>
                        <td>
                          <b>{r.test}{r.taraf ? ` · ${TARAF_ADI[r.taraf]}` : ''}</b>
                          {TEST_ACIKLAMA[r.test] && <span className="r-acik">{TEST_ACIKLAMA[r.test]}</span>}
                        </td>
                        {mod === 'test' && A && <td className="r-sayi">{r.onceki != null ? sayiGoster(r.onceki) : '—'}</td>}
                        <td className="r-sayi">
                          {sayiGoster(r.son.deger)}
                          {r.rekor && <span className="r-rekor">Rekor</span>}
                          {r.son.normSeviye && <span className="r-acik">{r.son.normSeviye}</span>}
                          {!r.yeni && <span className="r-acik">bu dönem ölçülmedi</span>}
                        </td>
                        {mod === 'test' && A && (
                          <td>
                            {r.fark == null ? (
                              <span className="r-esit">—</span>
                            ) : Math.abs(r.fark) < 1e-9 ? (
                              <span className="r-esit">değişim yok</span>
                            ) : (
                              <>
                                <span className={r.iyi ? 'r-artı' : 'r-eksi'}>{r.iyi ? '▲ ' : '▼ '}{fmtFark(r)}</span>
                                <span className="r-acik">{degisimMetni(r.bilgi.iyi, r.onceki, r.son.deger)}</span>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
              <p className="r-not">Süre ile ölçülen testlerde düşük değer daha iyidir. Yeşil gelişmeyi, kırmızı gerilemeyi gösterir.</p>
            </div>
          )}

          {B && bolum.grafikler && sporcu && (() => {
            const g = satirlar
              .filter((r) => r.bilgi.kat !== 'Antropometri')
              .map((r) => ({ r, n: grafikNoktalari(veri.testler, r.anahtar, B) }))
              .filter((x) => x.n.length > 1);
            return g.length ? (
              <div className="r-bolum">
                <h3>Gelişim grafikleri</h3>
                <div className="r-grafikler">
                  {g.map(({ r, n }) => <MiniGrafik key={r.anahtar} baslik={r.test + (r.taraf ? ` · ${TARAF_ADI[r.taraf]}` : '')} noktalar={n} />)}
                </div>
              </div>
            ) : null;
          })()}

          {B && bolum.antrenman && ozet && (
            <div className="r-bolum">
              <h3>Antrenman özeti <small>{kisa(ozetBas)} – {kisa(B)}</small></h3>
              <div className="r-kpi">
                <div><b>{ozet.seans}</b><span>tamamlanan seans</span></div>
                <div><b>{ozet.katilim == null ? '–' : '%' + Math.round(ozet.katilim * 100)}</b><span>katılım oranı</span></div>
                <div><b>{ozet.dakika || '–'}</b><span>toplam antrenman dakikası</span></div>
                <div><b>{ozet.ortRpe == null ? '–' : sayiGoster(ozet.ortRpe, 1)}</b><span>ortalama zorluk (RPE, 1–10)</span></div>
                {ozet.ortWellness != null && <div><b>{sayiGoster(ozet.ortWellness, 1)}/5</b><span>ortalama hazır oluş</span></div>}
              </div>
            </div>
          )}

          {B && bolum.postur && (() => {
            const ps = (veri.posturler || []).filter((p) => p.tarih <= B);
            const pc = ps[0], pp = ps[1];
            if (!pc) return null;
            const ks = Object.keys(BULGU).filter((k) => pc.bulgular?.[k]?.sev || pp?.bulgular?.[k]?.sev);
            return (
              <div className="r-bolum">
                <h3>Postür değerlendirmesi <small>{kisa(pc.tarih)}{pp ? ` · önceki: ${kisa(pp.tarih)}` : ''}</small></h3>
                {!ks.length ? (
                  <p>Değerlendirmede belirgin bir postür bulgusu saptanmadı.</p>
                ) : (
                  <>
                    <ul className="r-liste">
                      {POSTUR.flatMap((g) => g.ogeler.map(([k]) => k)).filter((k) => ks.includes(k)).map((k) => {
                        const f = pc.bulgular?.[k];
                        const e = egilim(f, pp?.bulgular?.[k]);
                        return (
                          <li key={k}>
                            <b>{BULGU[k].ad}</b>: {f?.sev ? bulguMetni(f).toLocaleLowerCase('tr') : 'normal'}
                            {e === 'duzeldi' && <span className="r-artı"> — düzelme var</span>}
                            {(e === 'artti' || e === 'yeni') && <span className="r-eksi"> — takip ediliyor</span>}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="r-not">Bulgulara yönelik düzeltici egzersizler antrenman programına eklenmektedir.</p>
                  </>
                )}
              </div>
            );
          })()}

          {B && bolum.vucut && (vucut.length > 0 || kartOlculeri.length > 0) && (
            <div className="r-bolum">
              <h3>Vücut ölçüleri</h3>
              <table className="r-tablo">
                <tbody>
                  {vucut.map((r) => (
                    <tr key={r.anahtar}>
                      <td><b>{r.test}</b></td>
                      <td className="r-sayi">{r.onceki != null ? `${sayiGoster(r.onceki)} → ` : ''}{sayiGoster(r.son.deger)}</td>
                    </tr>
                  ))}
                  {kartOlculeri.map(([t, v]) => (
                    <tr key={t}>
                      <td><b>{t}</b></td>
                      <td className="r-sayi">{sayiGoster(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {B && bolum.yorum && (
            <div className="r-bolum">
              <h3>{sporcu ? 'Antrenör değerlendirmesi' : 'Değerlendirme'}</h3>
              <div className="r-metin">{yorum.degerlendirme || <span className="r-yer">Değerlendirmeyi soldaki alana yaz.</span>}</div>
              <h3 style={{ marginTop: 14 }}>Sonraki dönem hedefleri</h3>
              <div className="r-metin">{yorum.hedefler || <span className="r-yer">Hedefleri soldaki alana yaz.</span>}</div>
            </div>
          )}

          <div className="r-alt">
            <span>{marka.ad}{marka.koc ? ' · ' + marka.koc : ''}</span>
            <span>{hitap}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
