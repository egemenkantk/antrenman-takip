import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { hataMesaji } from '../auth/hesap';
import { KALIPLAR, KALIP_ADI } from '../kutuphane/veri';
import { TEST_KATEGORILERI } from '../testler/tanimlar';
import { ASAMA_ADLARI } from './taslaklar';
import {
  BOLGELER,
  sakatlikTipleriGetir,
  sakatlikTipiKaydet,
  sakatlikTipiSil,
  sakatlikTaslaklariniEkle,
  branslariGetir,
  bransKaydet,
  bransKimligi,
  bransTaslaklariniEkle,
} from './veri';

const idsiz = ({ id, ...geri }) => geri;
const TUM_TESTLER = TEST_KATEGORILERI.flatMap(([, l]) => l.map(([ad]) => ad));
const satirlar = (m) => m.split('\n').map((x) => x.trim()).filter(Boolean);
const metin = (l) => (l || []).join('\n');
const kaynakMetni = (l) => (l || []).map((k) => (k.url ? `${k.ad} | ${k.url}` : k.ad)).join('\n');
const kaynakCoz = (m) =>
  satirlar(m).map((s) => {
    const [ad, url] = s.split('|').map((x) => x.trim());
    return { ad, url: url || '' };
  });

function Kaynaklar({ l }) {
  if (!l?.length) return null;
  return (
    <div className="kucuk-yazi">
      <strong>Kaynaklar</strong>
      <ul>
        {l.map((k, i) => (
          <li key={i}>{k.url ? <a href={k.url} target="_blank" rel="noreferrer">{k.ad}</a> : k.ad}</li>
        ))}
      </ul>
    </div>
  );
}

function SecimCipleri({ secenekler, secili, onChange }) {
  return (
    <div className="cip-grubu">
      {secenekler.map(([k, ad]) => (
        <button
          type="button"
          key={k}
          className={'cip' + (secili.includes(k) ? ' secili' : '')}
          aria-pressed={secili.includes(k)}
          onClick={() => onChange(secili.includes(k) ? secili.filter((x) => x !== k) : [...secili, k])}
        >
          {ad}
        </button>
      ))}
    </div>
  );
}

function TaslakBandi({ kayit, yazabilir, onOnayla }) {
  if (!kayit.taslak) return null;
  return (
    <p className="uyari-kutu kucuk-yazi">
      Taslak içerik: literatüre dayalı genel çerçeve, kontrol edilmeli.{' '}
      {yazabilir && <button className="metin" onClick={onOnayla}>Kontrol ettim</button>}
    </p>
  );
}

// ---------- Sakatlık ve rehabilitasyon ----------
function SakatlikFormu({ ilk, onKaydet, onVazgec }) {
  const [f, setF] = useState(() => ({
    ad: ilk?.ad || '',
    bolge: ilk?.bolge || '',
    aciklama: ilk?.aciklama || '',
    testler: ilk?.testler || [],
    kaynaklar: kaynakMetni(ilk?.kaynaklar),
    asamalar: ASAMA_ADLARI.map((ad, i) => {
      const a = ilk?.asamalar?.[i] || {};
      return {
        ad: a.ad || ad,
        hedefler: metin(a.hedefler),
        kriterler: metin(a.kriterler),
        kacinilacaklar: metin(a.kacinilacaklar),
        kacinilacakKaliplar: a.kacinilacakKaliplar || [],
        koc: metin(a.koc),
      };
    }),
  }));
  const [hata, setHata] = useState('');
  const asamaDegis = (i, v) => setF({ ...f, asamalar: f.asamalar.map((a, j) => (j === i ? { ...a, ...v } : a)) });
  return (
    <form
      className="kart-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.ad.trim()) return setHata('Ad gerekli.');
        setHata('');
        try {
          await onKaydet({
            ad: f.ad.trim(),
            bolge: f.bolge,
            aciklama: f.aciklama.trim(),
            testler: f.testler,
            kaynaklar: kaynakCoz(f.kaynaklar),
            asamalar: f.asamalar.map((a) => ({
              ad: a.ad.trim(),
              hedefler: satirlar(a.hedefler),
              kriterler: satirlar(a.kriterler),
              kacinilacaklar: satirlar(a.kacinilacaklar),
              kacinilacakKaliplar: a.kacinilacakKaliplar,
              koc: satirlar(a.koc),
            })),
            taslak: ilk?.taslak ?? false,
          });
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <h3>{ilk ? 'Sakatlığı düzenle' : 'Yeni sakatlık türü'}</h3>
      <div className="form-izgara">
        <label className="alan"><span>Ad</span><input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} /></label>
        <label className="alan">
          <span>Bölge</span>
          <select value={f.bolge} onChange={(e) => setF({ ...f, bolge: e.target.value })}>
            <option value="">Seç</option>
            {BOLGELER.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      </div>
      <label className="alan"><span>Açıklama ve uyarılar</span><textarea rows={3} value={f.aciklama} onChange={(e) => setF({ ...f, aciklama: e.target.value })} /></label>
      <div className="alan">
        <span>Takipte bakılacak testler (sakatlık öncesi ile karşılaştırılır)</span>
        <SecimCipleri secenekler={TUM_TESTLER.map((t) => [t, t])} secili={f.testler} onChange={(v) => setF({ ...f, testler: v })} />
      </div>
      {f.asamalar.map((a, i) => (
        <fieldset key={i} className="asama-alan">
          <legend>{i + 1}. aşama</legend>
          <label className="alan"><span>Aşama adı</span><input value={a.ad} onChange={(e) => asamaDegis(i, { ad: e.target.value })} /></label>
          <div className="form-izgara">
            <label className="alan"><span>Hedefler (her satır bir madde)</span><textarea rows={3} value={a.hedefler} onChange={(e) => asamaDegis(i, { hedefler: e.target.value })} /></label>
            <label className="alan"><span>Koç ne yapabilir</span><textarea rows={3} value={a.koc} onChange={(e) => asamaDegis(i, { koc: e.target.value })} /></label>
            <label className="alan"><span>Kaçınılacaklar</span><textarea rows={3} value={a.kacinilacaklar} onChange={(e) => asamaDegis(i, { kacinilacaklar: e.target.value })} /></label>
            <label className="alan"><span>Sonraki aşamaya geçiş kriterleri</span><textarea rows={3} value={a.kriterler} onChange={(e) => asamaDegis(i, { kriterler: e.target.value })} /></label>
          </div>
          <div className="alan">
            <span>Programda işaretlenecek hareket kalıpları</span>
            <SecimCipleri secenekler={KALIPLAR} secili={a.kacinilacakKaliplar} onChange={(v) => asamaDegis(i, { kacinilacakKaliplar: v })} />
          </div>
        </fieldset>
      ))}
      <label className="alan">
        <span>Kaynaklar (her satır: ad | bağlantı)</span>
        <textarea rows={3} value={f.kaynaklar} onChange={(e) => setF({ ...f, kaynaklar: e.target.value })} />
      </label>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Kaydet</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

export function SakatlikKutuphanesi({ yazabilir, yapan }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
  const [acik, setAcik] = useState(null);
  const [hata, setHata] = useState('');
  const yukle = () => sakatlikTipleriGetir(true).then(setListe).catch((e) => { setHata(hataMesaji(e)); setListe([]); });
  useEffect(() => {
    yukle();
  }, []);
  const calistir = async (is) => {
    setHata('');
    try {
      await is();
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  if (form) {
    return (
      <SakatlikFormu
        ilk={form.id ? form : null}
        onVazgec={() => setForm(null)}
        onKaydet={async (v) => { await sakatlikTipiKaydet(form.id || null, v, yapan); setForm(null); await yukle(); }}
      />
    );
  }
  return (
    <div>
      <p className="aciklama">
        Sakatlık türüne göre 4 aşamalı genel çerçeve: koruma → kuvvet ve hareket açıklığı → sahaya dönüş hazırlığı → performansa dönüş.
        Aşama geçişi tarihe değil kriterlere göre yapılır; kişinin fizyoterapistinin talimatı her zaman önce gelir.
      </p>
      {hata && <p className="hata">{hata}</p>}
      {yazabilir && (
        <div className="filtreler">
          <button className="birincil kucuk" onClick={() => setForm({})}>+ Sakatlık türü</button>
          {liste && liste.length === 0 && (
            <button className="ikincil kucuk" onClick={() => calistir(() => sakatlikTaslaklariniEkle(yapan))}>
              Taslakları ekle (ÖÇB, ayak bileği, hamstring, patellar tendinopati, omuz, bel)
            </button>
          )}
        </div>
      )}
      {liste === null && <p className="aciklama">Yükleniyor…</p>}
      {liste && liste.length === 0 && <div className="bos-durum"><p>Kütüphane boş.{yazabilir ? ' Taslakları ekleyerek başlayabilirsin.' : ''}</p></div>}
      <ul className="sakatlik-listesi">
        {(liste || []).map((t) => (
          <li key={t.id} className="sakatlik-karti soluk-degil">
            <button className="sakatlik-baslik" onClick={() => setAcik(acik === t.id ? null : t.id)} aria-expanded={acik === t.id}>
              <span className="esnek">
                <strong>{t.ad}</strong>
                <span className="aciklama kucuk-yazi">{t.bolge}{t.taslak ? ' · taslak' : ''}</span>
              </span>
            </button>
            {acik === t.id && (
              <div className="sakatlik-govde">
                <TaslakBandi kayit={t} yazabilir={yazabilir} onOnayla={() => calistir(() => sakatlikTipiKaydet(t.id, { ...idsiz(t), taslak: false }, yapan))} />
                {t.aciklama && <p>{t.aciklama}</p>}
                {(t.asamalar || []).map((a, i) => (
                  <div key={i} className="rehber">
                    <h4>{i + 1}. {a.ad}</h4>
                    <div className="rehber-izgara">
                      <div><strong>Hedefler</strong><ul>{a.hedefler.map((x, j) => <li key={j}>{x}</li>)}</ul></div>
                      <div><strong>Koç ne yapabilir</strong><ul>{a.koc.map((x, j) => <li key={j}>{x}</li>)}</ul></div>
                      {a.kacinilacaklar.length > 0 && (
                        <div>
                          <strong>Kaçınılacaklar</strong>
                          <ul>{a.kacinilacaklar.map((x, j) => <li key={j}>{x}</li>)}</ul>
                          {a.kacinilacakKaliplar?.length > 0 && (
                            <small className="aciklama">Programda işaretlenir: {a.kacinilacakKaliplar.map((k) => KALIP_ADI[k]).join(', ')}</small>
                          )}
                        </div>
                      )}
                      <div><strong>Geçiş kriterleri</strong><ul>{a.kriterler.map((x, j) => <li key={j}>{x}</li>)}</ul></div>
                    </div>
                  </div>
                ))}
                {t.testler?.length > 0 && <p className="kucuk-yazi"><strong>Takip testleri:</strong> {t.testler.join(', ')}</p>}
                <Kaynaklar l={t.kaynaklar} />
                {yazabilir && (
                  <div className="dugme-satiri">
                    <button className="ikincil kucuk" onClick={() => setForm(t)}>Düzenle</button>
                    <button
                      className="metin tehlike"
                      onClick={() => window.confirm(`"${t.ad}" kütüphaneden silinsin mi? Kişilerdeki kayıtlar kalır ama aşama rehberi görünmez.`) && calistir(() => sakatlikTipiSil(t.id))}
                    >
                      Sil
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Branş profilleri ----------
const BRANS_ALANLARI = [
  ['anaKaslar', 'Ana kas grupları'],
  ['kasCalismaSekli', 'Kas çalışma şekli'],
  ['enerjiSistemleri', 'Enerji sistemleri'],
  ['sikSakatliklar', 'Sık sakatlıklar'],
  ['sezonYapisi', 'Sezon yapısı'],
  ['oncelikler', 'Antrenman öncelikleri'],
  ['yasNotlari', 'Yaş grubuna göre notlar'],
];

function BransFormu({ ilk, onKaydet, onVazgec }) {
  const [f, setF] = useState(() => ({
    ad: ilk?.ad || '',
    ...Object.fromEntries(BRANS_ALANLARI.map(([k]) => [k, ilk?.[k] || ''])),
    oncelikliTestler: ilk?.oncelikliTestler || [],
    kaynaklar: kaynakMetni(ilk?.kaynaklar),
  }));
  const [hata, setHata] = useState('');
  return (
    <form
      className="kart-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.ad.trim()) return setHata('Branş adı gerekli.');
        setHata('');
        try {
          await onKaydet({
            ad: f.ad.trim(),
            ...Object.fromEntries(BRANS_ALANLARI.map(([k]) => [k, f[k].trim()])),
            oncelikliTestler: f.oncelikliTestler,
            kaynaklar: kaynakCoz(f.kaynaklar),
            taslak: ilk?.taslak ?? false,
          });
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <h3>{ilk ? `${ilk.ad} profilini düzenle` : 'Yeni branş profili'}</h3>
      <label className="alan"><span>Branş</span><input value={f.ad} disabled={!!ilk} onChange={(e) => setF({ ...f, ad: e.target.value })} /></label>
      {BRANS_ALANLARI.map(([k, ad]) => (
        <label key={k} className="alan"><span>{ad}</span><textarea rows={2} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
      ))}
      <div className="alan">
        <span>Öncelikli testler (kişinin Testler sekmesinde önerilir)</span>
        <SecimCipleri secenekler={TUM_TESTLER.map((t) => [t, t])} secili={f.oncelikliTestler} onChange={(v) => setF({ ...f, oncelikliTestler: v })} />
      </div>
      <label className="alan"><span>Kaynaklar (her satır: ad | bağlantı)</span><textarea rows={3} value={f.kaynaklar} onChange={(e) => setF({ ...f, kaynaklar: e.target.value })} /></label>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Kaydet</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

export function BransProfili({ b }) {
  return (
    <div className="brans-profili">
      {BRANS_ALANLARI.filter(([k]) => b[k]).map(([k, ad]) => (
        <p key={k}><strong>{ad}:</strong> {b[k]}</p>
      ))}
      {b.oncelikliTestler?.length > 0 && <p><strong>Öncelikli testler:</strong> {b.oncelikliTestler.join(', ')}</p>}
      <Kaynaklar l={b.kaynaklar} />
    </div>
  );
}

export function BransKutuphanesi({ yazabilir, yapan }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
  const [acik, setAcik] = useState(null);
  const [hata, setHata] = useState('');
  const yukle = () => branslariGetir(true).then(setListe).catch((e) => { setHata(hataMesaji(e)); setListe([]); });
  useEffect(() => {
    yukle();
  }, []);
  const calistir = async (is) => {
    setHata('');
    try {
      await is();
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  if (form) {
    return (
      <BransFormu
        ilk={form.id ? form : null}
        onVazgec={() => setForm(null)}
        onKaydet={async (v) => { await bransKaydet(form.id || bransKimligi(v.ad), v, yapan); setForm(null); await yukle(); }}
      />
    );
  }
  const eksikTaslak = liste && liste.length < 7;
  return (
    <div>
      <p className="aciklama">Sporcunun branşı seçiliyse profili kişi kartının Özet sekmesinde, öncelikli testler Testler sekmesinde görünür.</p>
      {hata && <p className="hata">{hata}</p>}
      {yazabilir && (
        <div className="filtreler">
          <button className="birincil kucuk" onClick={() => setForm({})}>+ Branş</button>
          {eksikTaslak && (
            <button className="ikincil kucuk" onClick={() => calistir(() => bransTaslaklariniEkle(yapan, liste))}>
              Taslak profilleri ekle (kayak, basketbol, futbol, voleybol, tenis, karting, cimnastik)
            </button>
          )}
        </div>
      )}
      {liste === null && <p className="aciklama">Yükleniyor…</p>}
      {liste && liste.length === 0 && <div className="bos-durum"><p>Henüz branş profili yok.</p></div>}
      <ul className="sakatlik-listesi">
        {(liste || []).map((b) => (
          <li key={b.id} className="sakatlik-karti brans-kart">
            <button className="sakatlik-baslik" onClick={() => setAcik(acik === b.id ? null : b.id)} aria-expanded={acik === b.id}>
              <span className="esnek">
                <strong>{b.ad}</strong>
                <span className="aciklama kucuk-yazi">{b.oncelikler?.slice(0, 90)}{b.oncelikler?.length > 90 ? '…' : ''}{b.taslak ? ' · taslak' : ''}</span>
              </span>
            </button>
            {acik === b.id && (
              <div className="sakatlik-govde">
                <TaslakBandi kayit={b} yazabilir={yazabilir} onOnayla={() => calistir(() => bransKaydet(b.id, { ...idsiz(b), taslak: false }, yapan))} />
                <BransProfili b={b} />
                {yazabilir && <div className="dugme-satiri"><button className="ikincil kucuk" onClick={() => setForm(b)}>Düzenle</button></div>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function useBrans(brans) {
  const [b, setB] = useState(null);
  useEffect(() => {
    if (!brans) return;
    branslariGetir().then((l) => setB(l.find((x) => x.id === bransKimligi(brans)) || null)).catch(() => {});
  }, [brans]);
  return b;
}

// Kişi kartı Özet: sporcunun branş profili (kapalı başlar)
export function BransOzeti({ brans }) {
  const b = useBrans(brans);
  if (!b) return null;
  return (
    <details className="kart-form ic-form brans-ozet">
      <summary><strong>{b.ad} profili</strong> <span className="aciklama kucuk-yazi">— kaslar, enerji sistemleri, öncelikler</span></summary>
      <BransProfili b={b} />
    </details>
  );
}

// Testler sekmesi: branşın öncelikli testleri ve son ölçüm tarihi
export function BransTestOnerisi({ brans, kisiId }) {
  const b = useBrans(brans);
  const [son, setSon] = useState({});
  useEffect(() => {
    if (!b?.oncelikliTestler?.length) return;
    getDocs(collection(db, 'kisiler', kisiId, 'testSonuclari'))
      .then((snap) => {
        const m = {};
        for (const d of snap.docs) {
          const t = d.data();
          if (!m[t.test] || t.tarih > m[t.test]) m[t.test] = t.tarih;
        }
        setSon(m);
      })
      .catch(() => {});
  }, [b, kisiId]);
  if (!b?.oncelikliTestler?.length) return null;
  return (
    <p className="kucuk-yazi brans-test">
      <strong>{b.ad} için öncelikli testler:</strong>{' '}
      {b.oncelikliTestler.map((t, i) => (
        <span key={t} className={son[t] ? '' : 'eksik-test'}>
          {i ? ', ' : ''}{t}{son[t] ? ` (${son[t].split('-').reverse().slice(0, 2).join('.')})` : ' — ölçülmedi'}
        </span>
      ))}
    </p>
  );
}
