import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { kisileriGetir, kisiGuncelle, tarihGoster } from '../veri';
import { gruplariGetir } from '../gruplar/veri';
import { bugun } from '../program/model';
import { TEST_KATEGORILERI, TESTLER, TARAF_ADI, sayiyaCevir, sayiGoster } from '../testler/tanimlar';
import { sonuclariKaydet } from '../testler/veri';
import { raporuOku, pdfMetinOgeleri } from '../testler/performanz';

const tumTestAdlari = TEST_KATEGORILERI.flatMap(([, l]) => l.map(([ad]) => ad));
const normalAd = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

// ---------- Test günü: birden fazla kişi × test için toplu giriş ----------
function TestGunu({ kisiler, gruplar, ben }) {
  const [tarih, setTarih] = useState(bugun());
  const [testler, setTestler] = useState([]);
  const [grup, setGrup] = useState('');
  const [secilenler, setSecilenler] = useState([]);
  const [ara, setAra] = useState('');
  const [degerler, setDegerler] = useState({}); // `${kisiId}|${test}|${taraf}` → metin
  const [mesaj, setMesaj] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const satirlar = useMemo(() => {
    const g = gruplar.find((x) => x.id === grup);
    const ids = g ? g.uyeIds || [] : secilenler;
    return ids.map((id) => kisiler.find((k) => k.id === id)).filter(Boolean);
  }, [grup, secilenler, kisiler, gruplar]);

  const sutunlar = testler.flatMap((t) => (TESTLER[t]?.tarafli ? [[t, 'sag'], [t, 'sol']] : [[t, null]]));
  const adaylar = kisiler.filter(
    (k) => k.aktif !== false && !secilenler.includes(k.id) && ara.trim() && normalAd(k.ad).includes(normalAd(ara))
  );

  async function kaydet() {
    setHata('');
    setMesaj('');
    const sonuclar = [];
    for (const k of satirlar) {
      for (const [t, taraf] of sutunlar) {
        const v = sayiyaCevir(degerler[`${k.id}|${t}|${taraf}`]);
        if (v == null) continue;
        sonuclar.push({ kisiId: k.id, test: t, tarih, deger: v, taraf, kaynak: 'elle' });
      }
    }
    if (!sonuclar.length) return setHata('Kaydedilecek değer yok.');
    setBekliyor(true);
    try {
      await sonuclariKaydet(sonuclar, ben.id);
      setMesaj(`${sonuclar.length} sonuç kaydedildi.`);
      setDegerler({});
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <div className="kart-form">
      <div className="form-izgara">
        <label className="alan">
          <span>Test tarihi</span>
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </label>
        <label className="alan">
          <span>Grup</span>
          <select value={grup} onChange={(e) => setGrup(e.target.value)}>
            <option value="">Kişileri tek tek seç</option>
            {gruplar.filter((g) => g.aktif !== false).map((g) => <option key={g.id} value={g.id}>{g.ad}</option>)}
          </select>
        </label>
      </div>

      {!grup && (
        <div className="alan">
          <span>Kişiler ({secilenler.length})</span>
          <div className="cip-grubu">
            {secilenler.map((id) => (
              <button type="button" key={id} className="cip secili" onClick={() => setSecilenler(secilenler.filter((x) => x !== id))}>
                {kisiler.find((k) => k.id === id)?.ad} ×
              </button>
            ))}
          </div>
          <input type="search" placeholder="Kişi eklemek için isim ara" value={ara} onChange={(e) => setAra(e.target.value)} />
          {adaylar.length > 0 && (
            <div className="cip-grubu">
              {adaylar.slice(0, 10).map((k) => (
                <button type="button" key={k.id} className="cip" onClick={() => { setSecilenler([...secilenler, k.id]); setAra(''); }}>
                  + {k.ad}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="alan">
        <span>Testler</span>
        {TEST_KATEGORILERI.map(([kat, l]) => (
          <div key={kat} className="test-kat">
            <small>{kat}</small>
            <div className="cip-grubu kucuk">
              {l.map(([ad]) => {
                const acik = testler.includes(ad);
                return (
                  <button
                    type="button"
                    key={ad}
                    className={'cip' + (acik ? ' secili' : '')}
                    aria-pressed={acik}
                    onClick={() => setTestler(acik ? testler.filter((x) => x !== ad) : [...testler, ad])}
                  >
                    {ad}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {satirlar.length > 0 && sutunlar.length > 0 && (
        <div className="tablo-kap">
          <table className="tablo giris-tablosu">
            <thead>
              <tr>
                <th>Kişi</th>
                {sutunlar.map(([t, taraf]) => <th key={t + taraf}>{t}{taraf ? ` · ${TARAF_ADI[taraf]}` : ''}</th>)}
              </tr>
            </thead>
            <tbody>
              {satirlar.map((k) => (
                <tr key={k.id}>
                  <th scope="row">{k.ad}</th>
                  {sutunlar.map(([t, taraf]) => {
                    const a = `${k.id}|${t}|${taraf}`;
                    return (
                      <td key={a}>
                        <input
                          inputMode="decimal"
                          value={degerler[a] || ''}
                          onChange={(e) => setDegerler({ ...degerler, [a]: e.target.value })}
                          aria-label={`${k.ad} ${t}${taraf ? ' ' + TARAF_ADI[taraf] : ''}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hata && <p className="hata">{hata}</p>}
      {mesaj && <p className="bilgi">{mesaj}</p>}
      <button className="birincil" onClick={kaydet} disabled={bekliyor || !satirlar.length || !sutunlar.length}>
        {bekliyor ? 'Kaydediliyor…' : 'Sonuçları kaydet'}
      </button>
    </div>
  );
}

// ---------- Performanz PDF raporlarını yükleme ----------
const BELIRSIZ_ANAHTAR = 'performanz-belirsiz-eslesme';
function belirsizEslesme() {
  try {
    return JSON.parse(localStorage.getItem(BELIRSIZ_ANAHTAR) || '{}');
  } catch {
    return {};
  }
}

function eslestir(r, kisiler) {
  const ad = normalAd(r.ad);
  const adaylar = kisiler.filter((k) => normalAd(k.ad) === ad || normalAd(k.performanzAdi) === ad);
  if (adaylar.length === 1) return adaylar[0].id;
  const yil = r.dogum?.slice(0, 4);
  const dogumla = adaylar.filter(
    (k) => (k.dogumTarihi && k.dogumTarihi === r.dogum) || (yil && String(k.dogumYili || k.dogumTarihi?.slice(0, 4)) === yil)
  );
  return dogumla.length === 1 ? dogumla[0].id : '';
}

function PerformanzYukle({ kisiler, ben, onKaydedildi }) {
  const [satirlar, setSatirlar] = useState([]);
  const [okunuyor, setOkunuyor] = useState(false);
  const [boyKilo, setBoyKilo] = useState(true);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [surukle, setSurukle] = useState(false);

  async function dosyalar(liste) {
    setHata('');
    setMesaj('');
    setOkunuyor(true);
    const es = belirsizEslesme();
    const yeni = [];
    for (const f of [...liste].filter((x) => /\.pdf$/i.test(x.name) || x.type === 'application/pdf')) {
      try {
        const r = raporuOku(await pdfMetinOgeleri(f));
        if (r.hata) {
          yeni.push({ dosya: f.name, hata: r.hata });
          continue;
        }
        for (const [i, o] of r.olcumler.entries()) {
          const belirsizAnahtar = r.belirsiz ? `${r.tur}|${r.mesafe || ''}` : null;
          yeni.push({
            anahtar: f.name + i,
            dosya: f.name,
            r,
            kisiId: eslestir(r, kisiler),
            test: o.test || (belirsizAnahtar && es[belirsizAnahtar]) || '',
            belirsizAnahtar,
            deger: o.deger,
            taraf: o.taraf || null,
            ana: !!o.ana,
            birim: o.ana ? r.birim : '',
            dahil: true,
          });
        }
      } catch (e) {
        yeni.push({ dosya: f.name, hata: 'Dosya okunamadı.' });
      }
    }
    setSatirlar((x) => [...x, ...yeni]);
    setOkunuyor(false);
  }

  const guncelle = (i, d) => setSatirlar((x) => x.map((s, j) => (j === i ? { ...s, ...d } : s)));
  const gecerli = satirlar.filter((s) => !s.hata && s.dahil && s.kisiId && s.test && s.deger != null && s.r?.tarih);

  async function kaydet() {
    setHata('');
    setMesaj('');
    setBekliyor(true);
    try {
      const es = belirsizEslesme();
      for (const s of gecerli) if (s.belirsizAnahtar) es[s.belirsizAnahtar] = s.test;
      try {
        localStorage.setItem(BELIRSIZ_ANAHTAR, JSON.stringify(es));
      } catch {
        /* tarayıcı depolama yoksa önemli değil */
      }
      await sonuclariKaydet(
        gecerli.map((s) => ({
          kisiId: s.kisiId,
          test: s.test,
          tarih: s.r.tarih,
          deger: s.deger,
          taraf: s.taraf,
          kaynak: 'performanz',
          detay: s.ana ? s.r.detay || {} : {},
          normSeviye: s.ana ? s.r.normSeviye || null : null,
          yasGrubu: s.r.yasGrubu || null,
          performanzTur: s.r.tur,
          dosyaAdi: s.dosya,
        })),
        ben.id
      );
      // Elle eşleştirilen adları ve (istenirse) boy/kilo bilgisini kişi kartına yaz
      const kisiyeYaz = {};
      for (const s of gecerli) {
        const k = kisiler.find((x) => x.id === s.kisiId);
        const v = kisiyeYaz[s.kisiId] || {};
        if (normalAd(k.ad) !== normalAd(s.r.ad)) v.performanzAdi = s.r.ad;
        if (boyKilo && (!v._tarih || s.r.tarih > v._tarih)) {
          if (s.r.boy) v.boy = s.r.boy;
          if (s.r.kilo) v.kilo = s.r.kilo;
          v._tarih = s.r.tarih;
        }
        kisiyeYaz[s.kisiId] = v;
      }
      for (const [id, { _tarih, ...v }] of Object.entries(kisiyeYaz)) if (Object.keys(v).length) await kisiGuncelle(id, v);
      setMesaj(`${gecerli.length} sonuç kaydedildi.`);
      setSatirlar([]);
      onKaydedildi?.();
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <div className="kart-form">
      <p className="aciklama kucuk-yazi">
        Performanz portalından indirdiğin test raporlarını (PDF) toplu olarak bırak. Sporcu adı ve doğum tarihiyle eşleştirilir;
        kaydetmeden önce kontrol edebilirsin. Aynı rapor ikinci kez yüklenirse kayıt çoğalmaz.
      </p>
      <label
        className={'birakma-alani' + (surukle ? ' uzerinde' : '')}
        onDragOver={(e) => { e.preventDefault(); setSurukle(true); }}
        onDragLeave={() => setSurukle(false)}
        onDrop={(e) => { e.preventDefault(); setSurukle(false); dosyalar(e.dataTransfer.files); }}
      >
        <input type="file" accept="application/pdf,.pdf" multiple onChange={(e) => { dosyalar(e.target.files); e.target.value = ''; }} />
        <span>{okunuyor ? 'Raporlar okunuyor…' : 'PDF dosyalarını buraya bırak ya da seçmek için tıkla'}</span>
      </label>

      {satirlar.length > 0 && (
        <div className="tablo-kap">
          <table className="tablo">
            <thead>
              <tr>
                <th></th>
                <th>Rapor</th>
                <th>Sporcu</th>
                <th>Test</th>
                <th>Sonuç</th>
                <th>Norm</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s, i) =>
                s.hata ? (
                  <tr key={i}>
                    <td></td>
                    <td>{s.dosya}</td>
                    <td colSpan={4} className="hata">{s.hata}</td>
                  </tr>
                ) : (
                  <tr key={s.anahtar}>
                    <td>
                      <input type="checkbox" checked={s.dahil} onChange={(e) => guncelle(i, { dahil: e.target.checked })} aria-label="Kaydet" />
                    </td>
                    <td>
                      <div>{s.r.ad}</div>
                      <small className="aciklama">{tarihGoster(s.r.tarih)} · {s.r.tur}</small>
                    </td>
                    <td>
                      <select value={s.kisiId} onChange={(e) => guncelle(i, { kisiId: e.target.value })} className={s.kisiId ? '' : 'eksik'}>
                        <option value="">Eşleştir…</option>
                        {kisiler.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
                      </select>
                    </td>
                    <td>
                      {s.belirsizAnahtar || !s.test ? (
                        <select value={s.test} onChange={(e) => guncelle(i, { test: e.target.value })} className={s.test ? '' : 'eksik'}>
                          <option value="">Hangi test? {s.r.mesafe ? `(${s.r.mesafe} m)` : ''}</option>
                          {tumTestAdlari.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <>{s.test}{s.taraf ? ` · ${TARAF_ADI[s.taraf]}` : ''}</>
                      )}
                    </td>
                    <td>{sayiGoster(s.deger)} {s.birim}</td>
                    <td>
                      {!s.ana ? '' : s.r.normSeviye ? <span className={'norm-rozet n-' + s.r.normSeviye}>{s.r.normSeviye}</span> : s.r.normTakimdan ? <small className="aciklama">norm yok</small> : '—'}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {satirlar.length > 0 && (
        <>
          <label className="onay-kutusu">
            <input type="checkbox" checked={boyKilo} onChange={(e) => setBoyKilo(e.target.checked)} />
            <span>Raporlardaki boy ve kiloyu kişi kartlarına da yaz</span>
          </label>
          <div className="dugme-satiri">
            <button className="birincil" onClick={kaydet} disabled={bekliyor || !gecerli.length}>
              {bekliyor ? 'Kaydediliyor…' : `${gecerli.length} sonucu kaydet`}
            </button>
            <button className="metin" onClick={() => setSatirlar([])}>Listeyi temizle</button>
          </div>
          {satirlar.some((s) => !s.hata && s.dahil && (!s.kisiId || !s.test)) && (
            <p className="aciklama kucuk-yazi">Sporcusu ya da testi seçilmemiş satırlar kaydedilmez.</p>
          )}
        </>
      )}
      {hata && <p className="hata">{hata}</p>}
      {mesaj && <p className="bilgi">{mesaj}</p>}
    </div>
  );
}

export default function Testler({ onGeri }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const [mod, setMod] = useState('performanz');
  const [kisiler, setKisiler] = useState(null);
  const [gruplar, setGruplar] = useState([]);
  const [hata, setHata] = useState('');

  const yukle = () =>
    Promise.all([kisileriGetir(ben), gruplariGetir(ben)])
      .then(([k, g]) => {
        setKisiler(k.filter((x) => x.aktif !== false));
        setGruplar(g);
      })
      .catch((e) => setHata(hataMesaji(e)));
  useEffect(() => {
    yukle();
  }, []);

  return (
    <div>
      <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>
      <h2>Testler</h2>
      <nav className="sekmeler">
        {[['performanz', 'Performanz raporu yükle'], ['gun', 'Test günü (elle giriş)']].map(([id, ad]) => (
          <button key={id} className={'sekme' + (mod === id ? ' secili' : '')} onClick={() => setMod(id)}>{ad}</button>
        ))}
      </nav>
      {hata && <p className="hata">{hata}</p>}
      {!kisiler && !hata && <p className="aciklama">Yükleniyor…</p>}
      {kisiler && mod === 'performanz' && <PerformanzYukle kisiler={kisiler} ben={ben} onKaydedildi={yukle} />}
      {kisiler && mod === 'gun' && <TestGunu kisiler={kisiler} gruplar={gruplar} ben={ben} />}
    </div>
  );
}
