// Test takibi (kime hangi test uygulandı, hangisi eksik) ve test verileri (karşılaştırma, sıralama)
// Yalnızca koç ve yönetici görür; öğrenci/veli portalında yer almaz.
import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { hataMesaji } from '../auth/hesap';
import { kisiGuncelle, tarihGoster, BRANSLAR, HEDEFLER } from '../veri';
import { bugun, gunEkle, kisaTarih } from '../program/model';
import { ayEkle } from '../paket/model.js';
import { TEST_KATEGORILERI, TESTLER, TARAF_ADI, testBilgisi, testSirasi, degerGoster } from './tanimlar';
import { kisininSonuclari } from './veri';
import { normDegerlendir, normMetni, normVarMi, SEVIYELER, KAYNAKLAR } from './normlar';
import { useCihazDegisimleri } from './cihaz';

const TUM = TEST_KATEGORILERI.flatMap(([, l]) => l.map(([ad]) => ad));
const CINSIYET = { K: 'Kız / kadın', E: 'Erkek' };
const dogumYili = (k) => (k.dogumTarihi ? Number(k.dogumTarihi.slice(0, 4)) : Number(k.dogumYili) || null);

// ---------- Ortak: sonuçları yükle, 3 aylık test dönemi ----------
export function useSonuclar(kisiler) {
  const [sonuclar, setSonuclar] = useState(null);
  const yukle = async () => {
    const l = await Promise.all(kisiler.map((k) => kisininSonuclari(k.id).then((r) => r.map((x) => ({ ...x, kisiId: k.id }))).catch(() => [])));
    setSonuclar(l.flat());
  };
  useEffect(() => {
    setSonuclar(null);
    yukle();
  }, [kisiler.map((k) => k.id).join()]);
  return [sonuclar, yukle];
}

// Dönemler 3 ay: kurum ayarındaki başlangıçtan (yoksa yılın çeyreklerinden) ileri/geri kayar
function useDonemCapasi() {
  const [capa, setCapa] = useState(null);
  useEffect(() => {
    getDoc(doc(db, 'kurumlar', KURUM_ID))
      .then((s) => setCapa(s.data()?.testDonemiBaslangic || `${bugun().slice(0, 4)}-01-01`))
      .catch(() => setCapa(`${bugun().slice(0, 4)}-01-01`));
  }, []);
  const kaydet = async (t) => {
    setCapa(t);
    await setDoc(doc(db, 'kurumlar', KURUM_ID), { testDonemiBaslangic: t }, { merge: true });
  };
  return [capa, kaydet];
}
export function testDonemi(capa, tarih, kaydir = 0) {
  let n = 0;
  while (ayEkle(capa, (n + 1) * 3) <= tarih) n++;
  while (ayEkle(capa, n * 3) > tarih) n--;
  n += kaydir;
  const bas = ayEkle(capa, n * 3);
  return { bas, bit: gunEkle(ayEkle(capa, (n + 1) * 3), -1) };
}

function DonemSecici({ capa, kaydir, setKaydir, yonetici, onCapa }) {
  const d = testDonemi(capa, bugun(), kaydir);
  const [ayar, setAyar] = useState(false);
  return (
    <div className="donem-gezgin">
      <button className="ikincil kucuk" onClick={() => setKaydir(kaydir - 1)} aria-label="Önceki dönem">‹</button>
      <div>
        <strong>Test dönemi: {kisaTarih(d.bas)} – {kisaTarih(d.bit)} {d.bit.slice(0, 4)}</strong>
        <span className="aciklama kucuk-yazi">
          3 aylık dönem{kaydir === 0 ? ' · şu anki' : ''}
          {yonetici && !ayar && <> · <button className="metin" onClick={() => setAyar(true)}>dönem başlangıcını ayarla</button></>}
        </span>
        {ayar && (
          <span className="kucuk-yazi">
            Dönemler bu tarihten 3'er ay ilerler:{' '}
            <input type="date" defaultValue={capa} onChange={(e) => e.target.value && onCapa(e.target.value)} />{' '}
            <button className="metin" onClick={() => setAyar(false)}>Tamam</button>
          </span>
        )}
      </div>
      <button className="ikincil kucuk" onClick={() => setKaydir(kaydir + 1)} aria-label="Sonraki dönem">›</button>
    </div>
  );
}

// ---------- Test planı seçici (kişiye özel test listesi) ----------
export function TestPlaniSecici({ secili, onChange }) {
  return (
    <div className="plan-secici">
      {TEST_KATEGORILERI.map(([kat, l]) => (
        <div key={kat}>
          <small className="aciklama">{kat}</small>
          <div className="cip-grubu">
            {l.map(([ad]) => {
              const s = secili.includes(ad);
              return (
                <button type="button" key={ad} className={'cip' + (s ? ' secili' : '')} aria-pressed={s} onClick={() => onChange(s ? secili.filter((x) => x !== ad) : [...secili, ad])}>
                  {ad}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Kişi kartı Testler sekmesinin üstünde: kişinin test planı
export function KisiTestPlani({ kisi, duzenleyebilir, onDegisti }) {
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState(kisi.testPlani || []);
  const [hata, setHata] = useState('');
  const plan = (kisi.testPlani || []).slice().sort((a, b) => testSirasi(a) - testSirasi(b));
  if (!acik) {
    return (
      <div className="test-plani-ozet">
        <span>
          <strong>Test planı:</strong> {plan.length ? plan.join(' · ') : 'atanmamış'}
        </span>
        {duzenleyebilir && <button className="metin" onClick={() => { setSecili(kisi.testPlani || []); setAcik(true); }}>{plan.length ? 'Düzenle' : 'Test planı ata'}</button>}
      </div>
    );
  }
  return (
    <div className="kart-form ic-form">
      <strong>{kisi.ad} için uygulanacak testler</strong>
      <p className="aciklama kucuk-yazi">Testler sayfasındaki "Test takibi"nde her 3 aylık dönemde bu testlerin yapılıp yapılmadığı görünür.</p>
      <TestPlaniSecici secili={secili} onChange={setSecili} />
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button
          className="birincil kucuk"
          onClick={async () => {
            try {
              await kisiGuncelle(kisi.id, { testPlani: secili });
              setAcik(false);
              onDegisti?.();
            } catch (e) {
              setHata(hataMesaji(e));
            }
          }}
        >
          Kaydet
        </button>
        <button className="metin" onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
    </div>
  );
}

// ---------- Ortak süzgeçler ----------
function Suzgecler({ f, setF, kisiler, gruplar, subeler, yil = true, kitleSabit = false }) {
  const yillar = [...new Set(kisiler.map(dogumYili).filter(Boolean))].sort();
  const branslar = [...new Set([...BRANSLAR, ...kisiler.map((k) => k.brans).filter(Boolean)])];
  return (
    <div className="filtreler suzgec">
      <select value={f.grup} onChange={(e) => setF({ ...f, grup: e.target.value })} aria-label="Grup">
        <option value="">Tüm gruplar</option>
        {gruplar.map((g) => <option key={g.id} value={g.id}>{g.ad}</option>)}
      </select>
      {subeler.length > 1 && (
        <select value={f.sube} onChange={(e) => setF({ ...f, sube: e.target.value })} aria-label="Şube">
          <option value="">Tüm şubeler</option>
          {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </select>
      )}
      {!kitleSabit && (
        <select value={f.tip} onChange={(e) => setF({ ...f, tip: e.target.value })} aria-label="Kitle">
          <option value="">Sporcu ve PT</option>
          <option value="sporcu">Sporcular</option>
          <option value="pt">PT danışanları</option>
        </select>
      )}
      {f.tip !== 'pt' ? (
        <select value={f.brans} onChange={(e) => setF({ ...f, brans: e.target.value })} aria-label="Branş">
          <option value="">Tüm branşlar</option>
          {branslar.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      ) : (
        <select value={f.hedef || ''} onChange={(e) => setF({ ...f, hedef: e.target.value })} aria-label="Hedef">
          <option value="">Tüm hedefler</option>
          {HEDEFLER.map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
        </select>
      )}
      <select value={f.cinsiyet} onChange={(e) => setF({ ...f, cinsiyet: e.target.value })} aria-label="Cinsiyet">
        <option value="">Tüm cinsiyetler</option>
        {Object.entries(CINSIYET).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
      </select>
      {yil && yillar.length > 0 && (
        <span className="yil-araligi">
          Doğum yılı
          <select value={f.yilMin} onChange={(e) => setF({ ...f, yilMin: e.target.value })} aria-label="En küçük doğum yılı">
            <option value="">—</option>
            {yillar.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          –
          <select value={f.yilMax} onChange={(e) => setF({ ...f, yilMax: e.target.value })} aria-label="En büyük doğum yılı">
            <option value="">—</option>
            {yillar.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </span>
      )}
    </div>
  );
}
const BOS_SUZGEC = { grup: '', sube: '', tip: '', brans: '', hedef: '', cinsiyet: '', yilMin: '', yilMax: '' };
function suz(kisiler, gruplar, f) {
  const g = gruplar.find((x) => x.id === f.grup);
  return kisiler.filter((k) => {
    const y = dogumYili(k);
    return (
      (!g || (g.uyeIds || []).includes(k.id)) &&
      (!f.sube || (k.subeIds || []).includes(f.sube)) &&
      (!f.tip || k.tip === f.tip) &&
      (!f.brans || k.brans === f.brans) &&
      (!f.hedef || k.hedef === f.hedef) &&
      (!f.cinsiyet || k.cinsiyet === f.cinsiyet) &&
      (!f.yilMin || (y && y >= Number(f.yilMin))) &&
      (!f.yilMax || (y && y <= Number(f.yilMax)))
    );
  });
}

// ---------- 1) Test takibi ----------
export function TestTakibi({ kisiler, gruplar, subeler, yonetici, onTestGunu }) {
  const [capa, setCapa] = useDonemCapasi();
  const [kaydir, setKaydir] = useState(0);
  const [f, setF] = useState(BOS_SUZGEC);
  const [secim, setSecim] = useState(new Set());
  const [planAc, setPlanAc] = useState(false);
  const [plan, setPlan] = useState([]);
  const [yerel, setYerel] = useState({}); // kaydedilen planlar (sayfa yenilenmeden görünsün)
  const [hata, setHata] = useState('');
  const gorunen = useMemo(() => suz(kisiler, gruplar, f).map((k) => (yerel[k.id] ? { ...k, testPlani: yerel[k.id] } : k)), [kisiler, gruplar, f, yerel]);
  const [sonuclar] = useSonuclar(gorunen);
  if (!capa) return <p className="aciklama">Yükleniyor…</p>;
  const d = testDonemi(capa, bugun(), kaydir);

  const sutunlar = [...new Set(gorunen.flatMap((k) => k.testPlani || []))].sort((a, b) => testSirasi(a) - testSirasi(b));
  const durum = (k, test) => {
    if (!(k.testPlani || []).includes(test)) return 'yok';
    const l = (sonuclar || []).filter((s) => s.kisiId === k.id && s.test === test);
    const donemde = l.filter((s) => s.tarih >= d.bas && s.tarih <= d.bit);
    if (TESTLER[test]?.tarafli) {
      const taraflar = new Set(donemde.map((s) => s.taraf));
      if (taraflar.has('sag') && taraflar.has('sol')) return { tamam: true, tarih: donemde.map((s) => s.tarih).sort().pop() };
      if (taraflar.size) return { yarim: true, tarih: donemde.map((s) => s.tarih).sort().pop() };
    } else if (donemde.length) return { tamam: true, tarih: donemde.map((s) => s.tarih).sort().pop() };
    const once = l.filter((s) => s.tarih < d.bas).map((s) => s.tarih).sort().pop();
    return { eksik: true, once };
  };
  let toplam = 0;
  let yapilan = 0;
  const eksikKisiler = new Set();
  for (const k of gorunen) for (const t of k.testPlani || []) {
    toplam++;
    const s = durum(k, t);
    if (s.tamam) yapilan++;
    else eksikKisiler.add(k.id);
  }
  const plansiz = gorunen.filter((k) => !(k.testPlani || []).length);

  return (
    <div>
      <DonemSecici capa={capa} kaydir={kaydir} setKaydir={setKaydir} yonetici={yonetici} onCapa={(t) => setCapa(t).catch((e) => setHata(hataMesaji(e)))} />
      <Suzgecler f={f} setF={setF} kisiler={kisiler} gruplar={gruplar} subeler={subeler} />
      {hata && <p className="hata">{hata}</p>}
      {sonuclar === null ? (
        <p className="aciklama">Sonuçlar yükleniyor…</p>
      ) : (
        <>
          <p>
            <strong>{yapilan}/{toplam}</strong> planlı test yapıldı · <strong>{gorunen.length - eksikKisiler.size - plansiz.length}</strong> kişi tamam ·{' '}
            <strong className={eksikKisiler.size ? 'uyari-yazi' : ''}>{eksikKisiler.size}</strong> kişide eksik var
            {plansiz.length > 0 && <span className="aciklama"> · {plansiz.length} kişiye test planı atanmamış</span>}
          </p>
          <div className="secim-cubugu-satir">
            <span>{secim.size} kişi seçili</span>
            <button className="metin" onClick={() => setSecim(new Set(gorunen.map((k) => k.id)))}>Hepsini seç</button>
            <button className="metin" onClick={() => setSecim(new Set([...eksikKisiler]))}>Eksiği olanları seç</button>
            <button className="metin" onClick={() => setSecim(new Set())}>Temizle</button>
            <button className="ikincil kucuk" disabled={!secim.size} onClick={() => { setPlan([]); setPlanAc(true); }}>Test planı ata</button>
            <button
              className="birincil kucuk"
              disabled={!secim.size}
              onClick={() => {
                const sec = gorunen.filter((k) => secim.has(k.id));
                const testler = [...new Set(sec.flatMap((k) => (k.testPlani || []).filter((t) => !durum(k, t).tamam)))].sort((a, b) => testSirasi(a) - testSirasi(b));
                onTestGunu(sec.map((k) => k.id), testler);
              }}
            >
              Eksikleri test gününe aktar
            </button>
          </div>
          {planAc && (
            <div className="kart-form ic-form">
              <strong>{secim.size} kişiye test planı</strong>
              <p className="aciklama kucuk-yazi">Seçtiğin testler bu kişilerin mevcut planının yerine geçer. Kişiye özel değişikliği sonra kişi kartından yapabilirsin.</p>
              <TestPlaniSecici secili={plan} onChange={setPlan} />
              <div className="dugme-satiri">
                <button
                  className="birincil kucuk"
                  onClick={async () => {
                    setHata('');
                    try {
                      const y = { ...yerel };
                      for (const id of secim) {
                        await kisiGuncelle(id, { testPlani: plan });
                        y[id] = plan;
                      }
                      setYerel(y);
                      setPlanAc(false);
                    } catch (e) {
                      setHata(hataMesaji(e));
                    }
                  }}
                >
                  Kaydet
                </button>
                <button className="metin" onClick={() => setPlanAc(false)}>Vazgeç</button>
              </div>
            </div>
          )}
          {sutunlar.length === 0 ? (
            <div className="bos-durum"><p>Bu kişilerin test planı yok. Kişileri seçip "Test planı ata" de ya da kişi kartının Testler sekmesinden ata.</p></div>
          ) : (
            <div className="tablo-kap">
              <table className="tablo takip-tablo">
                <thead>
                  <tr>
                    <th></th>
                    <th>Kişi</th>
                    {sutunlar.map((t) => <th key={t} className="dikey">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {gorunen.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <input type="checkbox" checked={secim.has(k.id)} onChange={() => { const s = new Set(secim); s.has(k.id) ? s.delete(k.id) : s.add(k.id); setSecim(s); }} aria-label={`${k.ad} seç`} />
                      </td>
                      <th>{k.ad}</th>
                      {sutunlar.map((t) => {
                        const s = durum(k, t);
                        if (s === 'yok') return <td key={t} className="t-yok" title="Planda yok">·</td>;
                        if (s.tamam) return <td key={t} className="t-tamam" title={`Yapıldı · ${tarihGoster(s.tarih)}`}>✓ <small>{kisaTarih(s.tarih)}</small></td>;
                        if (s.yarim) return <td key={t} className="t-yarim" title="Yalnızca bir taraf ölçüldü">½</td>;
                        return <td key={t} className="t-eksik" title={s.once ? `Bu dönem yok · son ölçüm ${tarihGoster(s.once)}` : 'Hiç ölçülmedi'}>✗{s.once && <small> {kisaTarih(s.once)}</small>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="aciklama kucuk-yazi">✓ bu dönemde yapıldı · ✗ eksik (yanında önceki ölçüm tarihi) · ½ sağ/sol testte yalnızca bir taraf · "·" kişinin planında yok.</p>
        </>
      )}
    </div>
  );
}

// ---------- 2) Test verileri: sıralama, istatistik, karşılaştırma ----------
const GRUPLAMA_SPORCU = { kisi: 'Kişi kişi', yil: 'Doğum yılı', yil2: '2 yıllık yaş grubu', brans: 'Branş', grup: 'Grup', cinsiyet: 'Cinsiyet' };
const GRUPLAMA_PT = { kisi: 'Kişi kişi', yas10: 'Yaş grubu (10 yıllık)', hedef: 'Hedef', grup: 'Grup', cinsiyet: 'Cinsiyet' };

function istatistik(degerler) {
  if (!degerler.length) return null;
  const s = [...degerler].sort((a, b) => a - b);
  const ort = s.reduce((t, v) => t + v, 0) / s.length;
  const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const sd = Math.sqrt(s.reduce((t, v) => t + (v - ort) ** 2, 0) / s.length);
  return { n: s.length, ort, med, min: s[0], max: s[s.length - 1], sd };
}

// Yatay çubuklar: genel ortalama dikey çizgiyle gösterilir; her satırda ortalamaya göre fark yazar.
// Süre gibi "düşük daha iyi" testlerde çubuk boyu değeri gösterir, sıralama en iyiden başlar.
function Cubuklar({ satirlar, test, genelOrt, dusukIyi }) {
  if (!satirlar.length) return null;
  const max = Math.max(...satirlar.map((r) => r.ort), genelOrt || 0) || 1;
  const fark = (v) => {
    if (genelOrt == null || !genelOrt) return null;
    const y = ((v - genelOrt) / Math.abs(genelOrt)) * 100;
    if (Math.abs(y) < 0.5) return { metin: 'ortalamada', sinif: '' };
    const iyi = dusukIyi ? y < 0 : y > 0;
    return { metin: `ortalamanın %${Math.abs(y).toFixed(0)} ${y > 0 ? 'üstünde' : 'altında'}`, sinif: iyi ? 'iyi' : 'kotu' };
  };
  return (
    <div className="cubuk-grafik">
      {genelOrt != null && (
        <div className="cubuk-satir cubuk-baslik">
          <span />
          <span className="cubuk-iz bos"><b style={{ left: `${(genelOrt / max) * 100}%` }}>genel ortalama {degerGoster(test, genelOrt)}</b></span>
          <span />
        </div>
      )}
      {satirlar.map((r) => {
        const fk = fark(r.ort);
        return (
          <div key={r.ad} className="cubuk-satir">
            <span className="cubuk-ad">
              {r.ad}
              <small>{r.n === 1 && r.kisi ? ` · ${r.kisi}` : r.n > 1 ? ` · ${r.n} kişi` : ''}</small>
            </span>
            <span className="cubuk-iz">
              <i style={{ width: `${(r.ort / max) * 100}%` }} />
              {genelOrt != null && <em style={{ left: `${(genelOrt / max) * 100}%` }} aria-hidden="true" />}
            </span>
            <span className="cubuk-deger">
              <strong>{degerGoster(test, r.ort)}</strong>
              {fk && <small className={fk.sinif}>{fk.metin}</small>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TestVerileri({ kisiler, gruplar, subeler }) {
  const [capa] = useDonemCapasi();
  const [cihaz] = useCihazDegisimleri();
  const [test0, setTest] = useState('CMJ (cm)');
  const [taraf, setTaraf] = useState('sag');
  const [aralik, setAralik] = useState('donem'); // donem | onceki | yil | tum
  const [hangi, setHangi] = useState('son'); // son | enIyi
  // Sporcular ve PT danışanları istatistikte hiç karışmaz
  const [kitle, setKitle] = useState('sporcu');
  const [f0, setF] = useState(BOS_SUZGEC);
  const f = { ...f0, tip: kitle };
  const GRUPLAMA = kitle === 'pt' ? GRUPLAMA_PT : GRUPLAMA_SPORCU;
  const [grupla0, setGrupla] = useState('kisi');
  const grupla = GRUPLAMA[grupla0] ? grupla0 : 'kisi';
  const gorunen = useMemo(() => suz(kisiler, gruplar, f), [kisiler, gruplar, f0, kitle]);
  const [sonuclar] = useSonuclar(kisiler);
  // Seçimde yalnızca bu kitlede verisi olan testler görünür
  const kullanilan = useMemo(() => {
    const ids = new Set(kisiler.filter((k) => k.tip === kitle).map((k) => k.id));
    return new Set((sonuclar || []).filter((s) => ids.has(s.kisiId)).map((s) => s.test));
  }, [sonuclar, kisiler, kitle]);
  const secenekler = [...kullanilan].sort((a, b) => testSirasi(a) - testSirasi(b) || a.localeCompare(b, 'tr'));
  const test = kullanilan.has(test0) ? test0 : secenekler[0] || test0;
  const bilgi = testBilgisi(test);
  const tarafli = TESTLER[test]?.tarafli;

  if (!capa) return <p className="aciklama">Yükleniyor…</p>;
  const d0 = testDonemi(capa, bugun(), 0);
  const d1 = testDonemi(capa, bugun(), -1);
  const [bas, bit] =
    aralik === 'donem' ? [d0.bas, d0.bit] : aralik === 'onceki' ? [d1.bas, d1.bit] : aralik === 'yil' ? [gunEkle(bugun(), -365), bugun()] : ['0000', '9999'];
  const iyi = (a, b) => (bilgi.iyi === 'dusuk' ? a < b : a > b);

  const satirlar = sonuclar
    ? gorunen
        .map((k) => {
          const l = sonuclar.filter((s) => s.kisiId === k.id && s.test === test && (!tarafli || s.taraf === taraf) && s.tarih >= bas && s.tarih <= bit);
          if (!l.length) return null;
          const sec = hangi === 'son' ? l.sort((a, b) => a.tarih.localeCompare(b.tarih)).pop() : l.reduce((m, s) => (iyi(s.deger, m.deger) ? s : m));
          return { k, deger: sec.deger, tarih: sec.tarih, yil: dogumYili(k), norm: normDegerlendir(test, sec.deger, k, sec.tarih) };
        })
        .filter(Boolean)
        .sort((a, b) => (bilgi.iyi === 'dusuk' ? a.deger - b.deger : b.deger - a.deger))
    : [];
  const normlu = normVarMi(test) && satirlar.some((r) => r.norm);
  const cihazUyarisi = !!(cihaz?.[test] && satirlar.some((r) => r.tarih < cihaz[test].tarih) && satirlar.some((r) => r.tarih >= cihaz[test].tarih));
  // Yüzdelik dilim: seçili gruptaki sıraya göre (1. = en iyi)
  const n = satirlar.length;
  satirlar.forEach((r, i) => (r.dilim = n > 1 ? Math.round(((n - 1 - i) / (n - 1)) * 100) : 100));
  const ist = istatistik(satirlar.map((r) => r.deger));

  const grupAdi = (r) =>
    grupla === 'kisi' ? r.k.ad
    : grupla === 'hedef' ? HEDEFLER.find(([k]) => k === r.k.hedef)?.[1] || 'Belirtilmemiş'
    : grupla === 'yas10' ? (r.yil ? `${Math.floor((Number(bugun().slice(0, 4)) - r.yil) / 10) * 10}'lı yaşlar` : 'Bilinmiyor')
    : grupla === 'yil' ? String(r.yil || 'Bilinmiyor')
    : grupla === 'yil2' ? (r.yil ? `${r.yil - (r.yil % 2)}–${r.yil - (r.yil % 2) + 1}` : 'Bilinmiyor')
    : grupla === 'brans' ? r.k.brans || (r.k.tip === 'pt' ? 'PT' : 'Belirtilmemiş')
    : grupla === 'cinsiyet' ? CINSIYET[r.k.cinsiyet] || 'Belirtilmemiş'
    : grupla === 'tip' ? (r.k.tip === 'pt' ? 'PT danışanı' : 'Sporcu')
    : gruplar.filter((g) => (g.uyeIds || []).includes(r.k.id)).map((g) => g.ad).join(', ') || 'Grupsuz';
  const kume = {};
  satirlar.forEach((r) => (kume[grupAdi(r)] ||= []).push(r));
  const dusukIyi = bilgi.iyi === 'dusuk';
  const grupSatirlari = Object.entries(kume)
    .map(([ad, l]) => ({ ad, n: l.length, kisi: grupla !== 'kisi' && l.length === 1 ? l[0].k.ad : null, ort: l.reduce((t, x) => t + x.deger, 0) / l.length }))
    .sort((a, b) =>
      grupla === 'kisi' ? (dusukIyi ? a.ort - b.ort : b.ort - a.ort) : grupla === 'yil' || grupla === 'yil2' ? a.ad.localeCompare(b.ad, 'tr') : dusukIyi ? a.ort - b.ort : b.ort - a.ort
    );
  const tekKisilik = grupla !== 'kisi' && grupSatirlari.length > 1 && grupSatirlari.every((g) => g.n === 1);

  // Zaman içinde: son 4 test döneminin ortalaması (aynı süzgeçlerle)
  const donemler = [-3, -2, -1, 0].map((i) => testDonemi(capa, bugun(), i));
  const trend = sonuclar
    ? donemler.map((dn) => {
        const l = gorunen
          .map((k) => sonuclar.filter((s) => s.kisiId === k.id && s.test === test && (!tarafli || s.taraf === taraf) && s.tarih >= dn.bas && s.tarih <= dn.bit).sort((a, b) => a.tarih.localeCompare(b.tarih)).pop())
          .filter(Boolean)
          .map((s) => s.deger);
        const st = istatistik(l);
        return { ad: `${kisaTarih(dn.bas)} – ${kisaTarih(dn.bit)}`, n: st?.n || 0, ort: st?.ort || 0 };
      })
    : [];

  const indir = () => {
    const bas2 = ['Sıra', 'Ad', 'Doğum yılı', 'Cinsiyet', 'Branş', 'Gruplar', test + (tarafli ? ` (${TARAF_ADI[taraf]})` : ''), 'Tarih', 'Yüzdelik dilim'];
    const l = satirlar.map((r, i) => [
      i + 1, r.k.ad, r.yil || '', CINSIYET[r.k.cinsiyet] || '', r.k.brans || '',
      gruplar.filter((g) => (g.uyeIds || []).includes(r.k.id)).map((g) => g.ad).join(' / '),
      degerGoster(test, r.deger), r.tarih, r.dilim,
    ]);
    const csv = [bas2, ...l].map((s) => s.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${test.replace(/[^\wçğıöşüÇĞİÖŞÜ]+/g, '-')}-${bugun()}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="secim-cubugu kitle-secici" role="group" aria-label="Kitle">
        {[['sporcu', 'Sporcular'], ['pt', 'PT danışanları']].map(([k, ad]) => (
          <button key={k} className={'secim' + (kitle === k ? ' secili' : '')} aria-pressed={kitle === k} onClick={() => setKitle(k)}>
            {ad} <small>({kisiler.filter((x) => x.tip === k).length})</small>
          </button>
        ))}
      </div>
      <div className="filtreler">
        <select value={test} onChange={(e) => setTest(e.target.value)} aria-label="Test" disabled={!secenekler.length}>
          {!secenekler.length && <option value={test}>Henüz test verisi yok</option>}
          {[...TEST_KATEGORILERI.map(([kat]) => kat), 'Diğer'].map((kat) => {
            const l = secenekler.filter((t) => (TUM.includes(t) ? testBilgisi(t).kat : 'Diğer') === kat);
            return l.length ? (
              <optgroup key={kat} label={kat}>
                {l.map((ad) => <option key={ad} value={ad}>{ad}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
        {tarafli && (
          <select value={taraf} onChange={(e) => setTaraf(e.target.value)} aria-label="Taraf">
            <option value="sag">Sağ</option>
            <option value="sol">Sol</option>
          </select>
        )}
        <select value={aralik} onChange={(e) => setAralik(e.target.value)} aria-label="Tarih aralığı">
          <option value="donem">Bu test dönemi ({kisaTarih(d0.bas)} – {kisaTarih(d0.bit)})</option>
          <option value="onceki">Önceki dönem ({kisaTarih(d1.bas)} – {kisaTarih(d1.bit)})</option>
          <option value="yil">Son 12 ay</option>
          <option value="tum">Tüm zamanlar</option>
        </select>
        <select value={hangi} onChange={(e) => setHangi(e.target.value)} aria-label="Hangi ölçüm">
          <option value="son">Son ölçüm</option>
          <option value="enIyi">En iyi ölçüm</option>
        </select>
      </div>
      <Suzgecler f={f} setF={(x) => setF({ ...x, tip: '' })} kisiler={kisiler.filter((k) => k.tip === kitle)} gruplar={gruplar} subeler={subeler} kitleSabit />
      {sonuclar === null ? (
        <p className="aciklama">Sonuçlar yükleniyor…</p>
      ) : !ist ? (
        <div className="bos-durum"><p>Bu süzgeçlerle {test} sonucu yok.</p></div>
      ) : (
        <>
          <div className="ist-kutulari">
            <div><b>{ist.n}</b><span>kişi</span></div>
            <div><b>{degerGoster(test, ist.ort)}</b><span>ortalama</span></div>
            <div><b>{degerGoster(test, ist.med)}</b><span>medyan</span></div>
            <div><b>{degerGoster(test, bilgi.iyi === 'dusuk' ? ist.min : ist.max)}</b><span>en iyi</span></div>
            <div><b>{degerGoster(test, bilgi.iyi === 'dusuk' ? ist.max : ist.min)}</b><span>en düşük</span></div>
            {test !== 'Beep test (seviye/mekik)' && <div><b>±{degerGoster(test, ist.sd)}</b><span>standart sapma</span></div>}
          </div>

          <h3>Karşılaştırma</h3>
          <div className="filtreler">
            <span className="aciklama">Göster:</span>
            {Object.entries(GRUPLAMA).map(([k, ad]) => (
              <button key={k} className={'cip' + (grupla === k ? ' secili' : '')} aria-pressed={grupla === k} onClick={() => setGrupla(k)}>{ad}</button>
            ))}
          </div>
          <p className="aciklama kucuk-yazi">
            {grupla === 'kisi'
              ? `Seçili ${ist.n} kişi en iyiden en düşüğe. Dikey çizgi hepsinin ortalaması.`
              : `Her çubuk o ${GRUPLAMA[grupla].toLocaleLowerCase('tr')} içindeki kişilerin ortalaması; dikey çizgi seçili ${ist.n} kişinin genel ortalaması.`}
            {dusukIyi ? ' Bu testte düşük değer daha iyi (kısa çubuk daha iyi).' : ''}
          </p>
          {tekKisilik && (
            <p className="uyari-kutu kucuk-yazi">
              Her grupta yalnızca bir kişi var; ortalama karşılaştırması anlamlı değil. "Kişi kişi" ya da "2 yıllık yaş grubu" daha anlaşılır olur.
            </p>
          )}
          <Cubuklar satirlar={grupSatirlari} test={test} genelOrt={ist.ort} dusukIyi={dusukIyi} />

          {normlu && (
            <>
              <h3>Dünya normuna göre</h3>
              <div className="norm-ozet">
                {SEVIYELER.map((ad, i) => {
                  const n = satirlar.filter((r) => r.norm?.seviyeNo === i).length;
                  return n ? <span key={ad} className={'r-seviye s' + i}>{ad}: {n}</span> : null;
                }).reverse()}
                {satirlar.some((r) => !r.norm) && <span className="aciklama kucuk-yazi">{satirlar.filter((r) => !r.norm).length} kişi değerlendirilemedi (yaş/cinsiyet eksik ya da yaşına norm yok)</span>}
              </div>
              <p className="aciklama kucuk-yazi">
                Her kişi kendi yaşı ve cinsiyetine göre değerlendirilir. Kaynak: {[...new Set(satirlar.filter((r) => r.norm).map((r) => KAYNAKLAR[r.norm.kaynak].kisa))].join(', ')}.
              </p>
            </>
          )}
          {cihazUyarisi && (
            <p className="uyari-kutu kucuk-yazi">
              Bu testte ölçüm cihazı {kisaTarih(cihaz[test].tarih)} tarihinde değişti. Seçili aralıkta iki cihazın ölçümleri birlikte var; karşılaştırırken dikkat edin.
            </p>
          )}

          <h3>Zaman içinde (son 4 test dönemi, ortalama)</h3>
          <p className="aciklama kucuk-yazi">Aynı süzgeçlerdeki kişilerin her dönemdeki ortalaması ve o dönem ölçülen kişi sayısı.</p>
          <Cubuklar satirlar={trend.filter((t) => t.n)} test={test} dusukIyi={dusukIyi} />

          <div className="baslik-satiri">
            <h3>Sıralama</h3>
            <button className="ikincil kucuk" onClick={indir}>Excel için indir (CSV)</button>
          </div>
          <div className="tablo-kap">
            <table className="tablo">
              <thead>
                <tr><th>#</th><th>Kişi</th><th>Doğum yılı</th><th>Branş</th><th>Değer</th><th>Tarih</th><th>Yüzdelik dilim</th>{normlu && <th>Dünya normu</th>}</tr>
              </thead>
              <tbody>
                {satirlar.map((r, i) => (
                  <tr key={r.k.id}>
                    <td>{i + 1}</td>
                    <th>{r.k.ad}</th>
                    <td>{r.yil || '—'}</td>
                    <td>{r.k.brans || (r.k.tip === 'pt' ? 'PT' : '—')}</td>
                    <td><strong>{degerGoster(test, r.deger)}</strong></td>
                    <td>{kisaTarih(r.tarih)}</td>
                    <td><span className={'dilim d' + Math.min(3, Math.floor(r.dilim / 25))}>%{r.dilim}</span></td>
                    {normlu && <td>{r.norm ? <span className={'r-seviye s' + r.norm.seviyeNo} title={normMetni(r.norm)}>{r.norm.seviye}</span> : <span className="aciklama">—</span>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="aciklama kucuk-yazi">
            Sporcular ve PT danışanları ayrı hesaplanır. Yüzdelik dilim, seçili süzgeçlerdeki kişiler arasındaki yeri gösterir (%100 = en iyi). Farklı yaşları birlikte görmek için doğum yılı aralığını geniş seç. Bu ekran öğrenci ve velilere görünmez.
          </p>
        </>
      )}
    </div>
  );
}
