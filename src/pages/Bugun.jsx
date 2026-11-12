import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { kisileriGetir, subeleriGetir } from '../veri';
import { gruplariGetir } from '../gruplar/veri';
import {
  BOLUMLER,
  BOLUM_RENK,
  HARF,
  bugun,
  gunEkle,
  coz,
  uzunTarih,
  gunBolumleri,
  dozaj,
  gununSeansi,
  seansOzeti,
  fazAdi,
  fazRengi,
} from '../program/model';
import {
  tumProgramlar,
  gunOzelleriGetir,
  gunOzelKaydet,
  gunOzelSil,
  wellnessKaydet,
  antrenmanKaydet,
  bireyselKayitId,
  grupKayitId,
} from '../bugun/veri';
import { WellnessFormu, WellnessRozeti, RpeSecici, KatilimSecici, KATILIM } from '../bugun/Formlar';
import GunOzelDuzenleyici from '../bugun/GunOzelDuzenleyici';
import { gununKartlari } from '../takvim/gunHesap';
import { useKutuphane, EgzersizSatiri } from '../kutuphane/bilesenler';
import { etkinlikleriGetir, kapsiyor, ETKINLIK_TURU, ETKINLIK_SIMGE } from '../takvim/veri';
import { ekUcretEkle, farkKarari } from '../paket/veri';
import { sakatlikTipleriGetir, riskliKaliplar, sakatlikEtiketi } from '../saglik/veri';
import { RiskliKaliplar } from '../kutuphane/bilesenler';

// Aktif sakatlığı olanlar için ders sonu 0–10 ağrı skoru
function AgriSecici({ deger, onChange }) {
  return (
    <div>
      <span className="alan-baslik">Ağrı (0–10)</span>
      <div className="rpe-secici agri" role="radiogroup" aria-label="Ağrı skoru">
        {Array.from({ length: 11 }, (_, i) => i).map((v) => (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={deger === v}
            className={'rpe-btn' + (deger === v ? ' secili' : '') + (v >= 5 ? ' yuksek' : '')}
            onClick={() => onChange(deger === v ? null : v)}
          >
            {v}
          </button>
        ))}
      </div>
      {deger >= 5 && <p className="uyari-yazi kucuk-yazi">Ağrı yüksek: yükü azalt, fizyoterapistle görüş.</p>}
    </div>
  );
}
const sakatMi = (k) => (k?.aktifSakatliklar || []).length > 0;
import { TUR_KISA } from '../paket/model.js';

// Düet/trioda eksik katılım: gelenlere fark ücreti (tutarı yönetici girer)
function FarkKutusu({ fark, ben, onBitti }) {
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState(
    `Fark ücreti – ${fark.grupAdi}, ${fark.gelenler.length} kişi katıldı`
  );
  const [hata, setHata] = useState('');
  const kayitId = grupKayitId(fark.tarih, fark.grupId);
  if (!fark.yonetici) {
    return (
      <p className="uyari-kutu kucuk-yazi">
        {TUR_KISA[fark.dersTuru]} dersine {fark.gelenler.length}/{fark.grupBoyu} kişi geldi. Ders gelenlerin paketinden düştü; fark ücretini yönetici ekler.{' '}
        <button className="metin" onClick={onBitti}>Tamam</button>
      </p>
    );
  }
  return (
    <div className="uyari-kutu">
      <strong>{TUR_KISA[fark.dersTuru]} dersine {fark.gelenler.length}/{fark.grupBoyu} kişi geldi.</strong>
      <p className="kucuk-yazi">Ders gelenlerin paketinden düştü. Fark ücreti eklemek istersen kişi başı tutarı gir:</p>
      <div className="form-izgara">
        <label className="alan">
          <span>Kişi başı fark (₺)</span>
          <input type="number" min="0" inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} />
        </label>
        <label className="alan">
          <span>Açıklama (öğrenci/veli görür)</span>
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </label>
      </div>
      <p className="kucuk-yazi aciklama">Gelenler: {fark.gelenler.map((k) => k.ad).join(', ')}</p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button
          className="birincil kucuk"
          onClick={async () => {
            if (!(Number(tutar) > 0)) return setHata('Tutar girilmeli.');
            setHata('');
            try {
              for (const k of fark.gelenler) {
                await ekUcretEkle({ kisiId: k.id, tarih: fark.tarih, tutar: Number(tutar), aciklama, ilgiliKayitId: kayitId }, ben.id);
              }
              onBitti();
            } catch (e) {
              setHata(hataMesaji(e));
            }
          }}
        >
          Fark ücretini ekle
        </button>
        <button
          className="metin"
          onClick={async () => {
            try {
              for (const k of fark.gelenler) await farkKarari(k.id, kayitId);
              onBitti();
            } catch (e) {
              setHata(hataMesaji(e));
            }
          }}
        >
          Fark ücreti yok
        </button>
        <button className="metin" onClick={onBitti}>Sonra karar ver</button>
      </div>
    </div>
  );
}

const satirlar = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);
const KATILIM_ADI = Object.fromEntries(KATILIM);

function Avatar({ k }) {
  return k.foto ? <img className="avatar kucuk-av" src={k.foto} alt="" /> : <div className="avatar kucuk-av" aria-hidden="true">{k.ad.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}</div>;
}

function Plan({ s }) {
  const kutuphane = useKutuphane();
  if (!s) return <p className="aciklama kucuk-yazi">Bu gün için programda seans yok.</p>;
  if (s.dinlenme) {
    return (
      <p className="dinlenme">
        {s.ozel ? 'Bugüne özel: dinlenme günü' : s.macGunu ? '🏟 Maç günü' : s.macTakvimi ? 'Maç gününe göre planlı blok; yakında maç yok' : 'Dinlenme günü'}
        {!s.ozel && !s.macGunu && s.md?.etiket ? ` · ${s.md.etiket}` : ''}
        {s.ozelNot ? ` · ${s.ozelNot}` : ''}
      </p>
    );
  }
  const b = s.blok;
  return (
    <div className="plan">
      {b?.ad && (
        <p className="plan-bas">
          <span className="harf kucuk">{HARF[s.gunIdx]}</span>
          <span>
            {s.gun.baslik || `${HARF[s.gunIdx]} günü`}
            <small>
              {' '}· {b.ad}, {s.hafta + 1}. hafta{' '}
              <span className="faz" style={{ background: fazRengi(b) }}>{fazAdi(b)}</span>
            </small>
          </span>
        </p>
      )}
      {s.ozel && <span className="ozel-cip">✎ Bugüne özel{s.ozelNot ? ` · ${s.ozelNot}` : ''}</span>}
      {b?.sade ? (
        <ul className="egzersizler">{satirlar(s.gun.icerik?.liste).map((x, i) => <EgzersizSatiri key={i} satir={x} kutuphane={kutuphane} />)}</ul>
      ) : (
        gunBolumleri(b, s.gun).map((k) => {
          const d = BOLUMLER[k]?.doz ? dozaj(s.rx, s.gunIdx, k) : '';
          const h = satirlar(s.gun.icerik?.[k]);
          if (!h.length && !d) return null;
          return (
            <div key={k} className="bolum" style={{ '--bc': BOLUM_RENK[k] }}>
              <h5>{BOLUMLER[k]?.ad || k}{d && <span className="doz">{d}</span>}</h5>
              {h.length > 0 && <ul className="egzersizler">{h.map((x, i) => <EgzersizSatiri key={i} satir={x} kutuphane={kutuphane} />)}</ul>}
            </div>
          );
        })
      )}
      {s.rx?.not && !s.ozel && <p className="aciklama kucuk-yazi">Hafta notu: {s.rx.not}</p>}
    </div>
  );
}

function TamamlaFormu({ ilk, agriSor, onKaydet, onVazgec }) {
  const [katilim, setKatilim] = useState(ilk?.katilim || 'geldi');
  const [agri, setAgri] = useState(ilk?.agri ?? null);
  const [rpe, setRpe] = useState(ilk?.rpe ?? null);
  const [sure, setSure] = useState(ilk?.sure ?? 60);
  const [not, setNot] = useState(ilk?.not || '');
  const [bekliyor, setBekliyor] = useState(false);
  return (
    <div className="ic-form">
      <KatilimSecici deger={katilim} onChange={setKatilim} />
      {katilim === 'geldi' && (
        <>
          <span className="alan-baslik">RPE (algılanan zorluk)</span>
          <RpeSecici deger={rpe} onChange={setRpe} />
          <label className="alan">
            <span>Süre (dk)</span>
            <input type="number" min="5" max="300" value={sure} onChange={(e) => setSure(e.target.value)} />
          </label>
          {agriSor && <AgriSecici deger={agri} onChange={setAgri} />}
        </>
      )}
      <label className="alan">
        <span>Ders sonu notu</span>
        <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Örn. sol diz hafif ağrı, squat derinliği arttı" />
      </label>
      <div className="dugme-satiri">
        <button
          type="button"
          className="birincil kucuk"
          disabled={bekliyor}
          onClick={async () => {
            setBekliyor(true);
            try {
              await onKaydet({ katilim, rpe: katilim === 'geldi' ? rpe : null, sure: katilim === 'geldi' ? Number(sure) || null : null, not, ...(agriSor ? { agri: katilim === 'geldi' ? agri : null } : {}) });
            } finally {
              setBekliyor(false);
            }
          }}
        >
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

function GrupYoklama({ uyeler, kayitlar, onKaydet, onVazgec }) {
  const [satir, setSatir] = useState(() =>
    Object.fromEntries(uyeler.map((k) => [k.id, { katilim: kayitlar[k.id]?.katilim || 'geldi', rpe: kayitlar[k.id]?.rpe ?? null, agri: kayitlar[k.id]?.agri ?? null }]))
  );
  const ilkSure = Object.values(kayitlar).find((x) => x?.sure)?.sure ?? 60;
  const [sure, setSure] = useState(ilkSure);
  const [not, setNot] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  return (
    <div className="ic-form">
      {uyeler.map((k) => (
        <div key={k.id} className="yoklama-satir">
          <div className="kim"><Avatar k={k} /><strong>{k.ad}</strong></div>
          <KatilimSecici deger={satir[k.id].katilim} onChange={(v) => setSatir({ ...satir, [k.id]: { ...satir[k.id], katilim: v } })} />
          {satir[k.id].katilim === 'geldi' && (
            <RpeSecici deger={satir[k.id].rpe} onChange={(v) => setSatir({ ...satir, [k.id]: { ...satir[k.id], rpe: v } })} />
          )}
          {satir[k.id].katilim === 'geldi' && sakatMi(k) && (
            <AgriSecici deger={satir[k.id].agri} onChange={(v) => setSatir({ ...satir, [k.id]: { ...satir[k.id], agri: v } })} />
          )}
        </div>
      ))}
      <div className="form-izgara">
        <label className="alan">
          <span>Süre (dk)</span>
          <input type="number" min="5" max="300" value={sure} onChange={(e) => setSure(e.target.value)} />
        </label>
        <label className="alan">
          <span>Ortak not</span>
          <input value={not} onChange={(e) => setNot(e.target.value)} />
        </label>
      </div>
      <div className="dugme-satiri">
        <button
          type="button"
          className="birincil kucuk"
          disabled={bekliyor}
          onClick={async () => {
            setBekliyor(true);
            try {
              await onKaydet(satir, Number(sure) || null, not);
            } finally {
              setBekliyor(false);
            }
          }}
        >
          {bekliyor ? 'Kaydediliyor…' : 'Yoklamayı kaydet'}
        </button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

function KayitOzeti({ r }) {
  if (!r) return null;
  if (r.katilim && r.katilim !== 'geldi') return <span className={'katilim-ozet ' + r.katilim}>{KATILIM_ADI[r.katilim]}</span>;
  return (
    <span className="katilim-ozet geldi">
      ✓ Tamamlandı{r.rpe != null ? ` · RPE ${r.rpe}` : ''}{r.sure ? ` · ${r.sure} dk` : ''}
    </span>
  );
}

export default function Bugun({ onGeri, baslangicTarihi }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yonetici = ben.rol === 'yonetici';
  const [tarih, setTarih] = useState(baslangicTarihi || bugun());
  const [temel, setTemel] = useState(null); // { kisiler, gruplar, programlar, subeler }
  const [ozeller, setOzeller] = useState([]);
  const [etkinlikler, setEtkinlikler] = useState([]);
  const [gunluk, setGunluk] = useState({}); // anahtar → belge
  const [sube, setSube] = useState('');
  const [sadeceBenim, setSadeceBenim] = useState(!yonetici);
  const [acik, setAcik] = useState(null);
  const [fark, setFark] = useState(null);
  const [sakatlikTipleri, setSakatlikTipleri] = useState([]);
  useEffect(() => {
    sakatlikTipleriGetir().then(setSakatlikTipleri).catch(() => {});
  }, []);
  const [hata, setHata] = useState('');

  useEffect(() => {
    Promise.all([kisileriGetir(ben), gruplariGetir(ben), tumProgramlar(), subeleriGetir()])
      .then(([kisiler, gruplar, programlar, subeler]) => setTemel({ kisiler, gruplar, programlar, subeler }))
      .catch((e) => setHata(hataMesaji(e)));
  }, []);

  const hg = coz(tarih).getDay();

  const kartlar = useMemo(() => {
    if (!temel) return [];
    return gununKartlari({ ...temel, ozeller, etkinlikler, tarih, sube, benimId: sadeceBenim ? ben.id : null });
  }, [temel, ozeller, etkinlikler, tarih, sube, sadeceBenim]);

  // Tarih değişince güne özel değişiklikleri ve günlük kayıtları yükle
  async function gunuYukle() {
    try {
      setOzeller(await gunOzelleriGetir(tarih));
    } catch {
      setOzeller([]);
    }
    // Maç gününe göre planlama için ±7 gün etkinlikler
    etkinlikleriGetir(gunEkle(tarih, -7), gunEkle(tarih, 7)).then(setEtkinlikler).catch(() => setEtkinlikler([]));
  }
  useEffect(() => {
    setAcik(null);
    setGunluk({});
    gunuYukle();
  }, [tarih]);

  useEffect(() => {
    if (!kartlar.length) return;
    let iptal = false;
    const istekler = [];
    for (const c of kartlar) {
      const kisiler = c.tip === 'grup' ? c.uyeler : [c.k];
      for (const k of kisiler) {
        istekler.push(['w:' + k.id, doc(db, 'kisiler', k.id, 'wellness', tarih)]);
        istekler.push(
          c.tip === 'grup'
            ? ['g:' + c.id + ':' + k.id, doc(db, 'kisiler', k.id, 'antrenmanKayitlari', grupKayitId(tarih, c.id))]
            : ['b:' + k.id, doc(db, 'kisiler', k.id, 'antrenmanKayitlari', bireyselKayitId(tarih))]
        );
      }
    }
    Promise.all(istekler.map(([a, r]) => getDoc(r).then((s) => [a, s.exists() ? s.data() : null]).catch(() => [a, null]))).then(
      (l) => !iptal && setGunluk(Object.fromEntries(l))
    );
    return () => {
      iptal = true;
    };
  }, [kartlar.map((c) => c.id).join(','), tarih]);

  const guncelleGunluk = (anahtar, v) => setGunluk((x) => ({ ...x, [anahtar]: v }));

  async function hataliOlabilir(is) {
    setHata('');
    try {
      await is();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  function gunOzelIslemleri(c) {
    const sahipTip = c.tip === 'grup' ? 'grup' : 'kisi';
    return {
      onKaydet: (v) => hataliOlabilir(async () => { await gunOzelKaydet(sahipTip, c.id, tarih, v, ben.id); setAcik(null); await gunuYukle(); }),
      onDinlenme: (not) => hataliOlabilir(async () => { await gunOzelKaydet(sahipTip, c.id, tarih, { dinlenme: true, not }, ben.id); setAcik(null); await gunuYukle(); }),
      onPlanaDon: () => hataliOlabilir(async () => { await gunOzelSil(c.id, tarih); setAcik(null); await gunuYukle(); }),
    };
  }

  return (
    <div>
      {onGeri && <button className="metin geri" onClick={onGeri}>← Takvim</button>}
      <div className="bugun-bas">
        <div>
          <h2>{tarih === bugun() ? 'Bugün' : uzunTarih(tarih)}</h2>
          {tarih === bugun() && <p className="aciklama">{uzunTarih(tarih)}</p>}
        </div>
        <div className="gun-gezinti">
          <button className="ikincil kucuk" onClick={() => setTarih(gunEkle(tarih, -1))} aria-label="Önceki gün">‹</button>
          <input type="date" value={tarih} onChange={(e) => e.target.value && setTarih(e.target.value)} aria-label="Tarih" />
          <button className="ikincil kucuk" onClick={() => setTarih(gunEkle(tarih, 1))} aria-label="Sonraki gün">›</button>
          {tarih !== bugun() && <button className="metin" onClick={() => setTarih(bugun())}>Bugün</button>}
        </div>
      </div>

      <div className="filtreler">
        {temel?.subeler?.length > 1 && (
          <select value={sube} onChange={(e) => setSube(e.target.value)} aria-label="Şube">
            <option value="">Tüm şubeler</option>
            {temel.subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        )}
        <label className="onay-kutusu">
          <input type="checkbox" checked={sadeceBenim} onChange={(e) => setSadeceBenim(e.target.checked)} />
          <span>Sadece benim derslerim</span>
        </label>
      </div>
      {hata && <p className="hata">{hata}</p>}
      {etkinlikler.some((e) => e.tarih === tarih) && (
        <div className="etkinlik-bandi">
          {etkinlikler.filter((e) => e.tarih === tarih).map((e) => (
            <span key={e.id} className="etkinlik-cip">
              {ETKINLIK_SIMGE[e.tur]} {e.saat ? e.saat + ' · ' : ''}{e.ad || ETKINLIK_TURU[e.tur]}
            </span>
          ))}
        </div>
      )}
      {!temel && !hata && <p className="aciklama">Yükleniyor…</p>}
      {temel && kartlar.length === 0 && (
        <div className="bos-durum">
          <p>Bu gün için planlı ders yok. Kişilerin antrenman saatlerini kişi kartından, grupların saatlerini grup ayarlarından girebilirsin.</p>
        </div>
      )}

      <div className="seans-izgara">
        {kartlar.map((c) => {
          const anahtar = c.tip + ':' + c.id;
          const islem = gunOzelIslemleri(c);
          return (
            <article key={anahtar} className="seans-karti">
              <header className="seans-bas">
                <div className={'saat-kutu' + (c.saat ? '' : ' bos')}>
                  {c.saat || '—'}
                  {c.sure ? <small>{c.sure} dk</small> : null}
                </div>
                {c.tip === 'kisi' ? <Avatar k={c.k} /> : <div className="avatar kucuk-av grup-av" aria-hidden="true">👥</div>}
                <div className="esnek">
                  <h3>{c.ad}</h3>
                  {c.tip === 'grup' && <small className="aciklama">{c.uyeler.length} üye</small>}
                  {c.tip === 'kisi' && (c.k?.aktifSakatliklar || []).map((a) => (
                    <small key={a.id} className="sakatlik-uyari kucuk">⚠ {sakatlikEtiketi(a)}</small>
                  ))}
                  {c.tip === 'grup' && c.uyeler.some(sakatMi) && (
                    <small className="sakatlik-uyari kucuk">⚠ Sakatlığı olan: {c.uyeler.filter(sakatMi).map((k) => k.ad.split(' ')[0]).join(', ')}</small>
                  )}
                </div>
                <button className="metin" onClick={() => setAcik(acik === 'ozel:' + anahtar ? null : 'ozel:' + anahtar)}>✎ Bugüne özel</button>
              </header>

              {acik === 'ozel:' + anahtar ? (
                <GunOzelDuzenleyici
                  seans={c.s}
                  tarih={tarih}
                  ad={c.ad}
                  varMi={!!c.ozel}
                  {...islem}
                  onVazgec={() => setAcik(null)}
                />
              ) : c.tip === 'kisi' && sakatMi(c.k) ? (
                <RiskliKaliplar.Provider value={riskliKaliplar(c.k, sakatlikTipleri)}>
                  <Plan s={c.s} />
                </RiskliKaliplar.Provider>
              ) : (
                <Plan s={c.s} />
              )}

              {c.tip === 'kisi' && (
                <div className="seans-alt">
                  <div className="satir-arasi">
                    {gunluk['w:' + c.id] ? <WellnessRozeti w={gunluk['w:' + c.id]} /> : <span className="aciklama kucuk-yazi">Wellness girilmedi</span>}
                    <button className="metin" onClick={() => setAcik(acik === 'w:' + c.id ? null : 'w:' + c.id)}>
                      {gunluk['w:' + c.id] ? 'Düzenle' : 'Wellness gir'}
                    </button>
                  </div>
                  {acik === 'w:' + c.id && (
                    <WellnessFormu
                      ilk={gunluk['w:' + c.id]}
                      onVazgec={() => setAcik(null)}
                      onKaydet={(v) => hataliOlabilir(async () => { await wellnessKaydet(c.id, tarih, v, ben.id); guncelleGunluk('w:' + c.id, v); setAcik(null); })}
                    />
                  )}
                  <div className="satir-arasi">
                    <KayitOzeti r={gunluk['b:' + c.id]} />
                    <button className={gunluk['b:' + c.id] ? 'metin' : 'birincil kucuk'} onClick={() => setAcik(acik === 't:' + c.id ? null : 't:' + c.id)}>
                      {gunluk['b:' + c.id] ? 'Düzenle' : 'Antrenmanı tamamla'}
                    </button>
                  </div>
                  {acik === 't:' + c.id && (
                    <TamamlaFormu
                      ilk={gunluk['b:' + c.id]}
                      agriSor={sakatMi(c.k)}
                      onVazgec={() => setAcik(null)}
                      onKaydet={(v) =>
                        hataliOlabilir(async () => {
                          const kayit = {
                            ...v,
                            tarih,
                            tur: c.s?.gun?.baslik || 'Bireysel seans',
                            seansTipi: 'bireysel',
                            icerik: seansOzeti(c.s),
                            blokId: c.s?.blok?.id || null,
                            hafta: c.s?.hafta ?? null,
                            gunIdx: c.s?.gunIdx ?? null,
                          };
                          await antrenmanKaydet(c.id, bireyselKayitId(tarih), kayit, ben.id);
                          guncelleGunluk('b:' + c.id, kayit);
                          setAcik(null);
                        })
                      }
                    />
                  )}
                </div>
              )}

              {c.tip === 'grup' && (
                <div className="seans-alt">
                  <ul className="uye-satirlari">
                    {c.uyeler.map((k) => (
                      <li key={k.id}>
                        <div className="satir-arasi">
                          <span className="kim"><Avatar k={k} /> {k.ad}{sakatMi(k) && <span className="sakatlik-nokta" title={k.aktifSakatliklar.map(sakatlikEtiketi).join(", ")}> ⚠</span>}</span>
                          <span className="uye-durum">
                            {gunluk['w:' + k.id] ? <WellnessRozeti w={gunluk['w:' + k.id]} /> : (
                              <button className="metin" onClick={() => setAcik(acik === 'w:' + k.id ? null : 'w:' + k.id)}>+ wellness</button>
                            )}
                            <KayitOzeti r={gunluk['g:' + c.id + ':' + k.id]} />
                          </span>
                        </div>
                        {acik === 'w:' + k.id && (
                          <WellnessFormu
                            ilk={gunluk['w:' + k.id]}
                            onVazgec={() => setAcik(null)}
                            onKaydet={(v) => hataliOlabilir(async () => { await wellnessKaydet(k.id, tarih, v, ben.id); guncelleGunluk('w:' + k.id, v); setAcik(null); })}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                  {c.uyeler.length > 0 && acik !== 'y:' + c.id && (
                    <button className="birincil kucuk" onClick={() => setAcik('y:' + c.id)}>
                      {c.uyeler.some((k) => gunluk['g:' + c.id + ':' + k.id]) ? 'Yoklamayı düzenle' : 'Yoklama ve RPE gir'}
                    </button>
                  )}
                  {acik === 'y:' + c.id && (
                    <GrupYoklama
                      uyeler={c.uyeler}
                      kayitlar={Object.fromEntries(c.uyeler.map((k) => [k.id, gunluk['g:' + c.id + ':' + k.id]]))}
                      onVazgec={() => setAcik(null)}
                      onKaydet={(satir, sure, not) =>
                        hataliOlabilir(async () => {
                          const ortak = {
                            tarih,
                            tur: c.s?.gun?.baslik || c.ad,
                            seansTipi: 'grup',
                            grupId: c.id,
                            grupAdi: c.ad,
                            icerik: seansOzeti(c.s),
                            blokId: c.s?.blok?.id || null,
                            hafta: c.s?.hafta ?? null,
                            gunIdx: c.s?.gunIdx ?? null,
                            not,
                          };
                          const dersTuru = c.g?.dersTuru === 'duet' || c.g?.dersTuru === 'trio' ? c.g.dersTuru : null;
                          const gelenler = c.uyeler.filter((k) => satir[k.id].katilim === 'geldi');
                          if (dersTuru) Object.assign(ortak, { dersTuru, gelenSayisi: gelenler.length, grupBoyu: c.uyeler.length });
                          await Promise.all(
                            c.uyeler.map((k) => {
                              const r = {
                                ...ortak,
                                katilim: satir[k.id].katilim,
                                rpe: satir[k.id].katilim === 'geldi' ? satir[k.id].rpe : null,
                                ...(sakatMi(k) ? { agri: satir[k.id].katilim === 'geldi' ? satir[k.id].agri : null } : {}),
                                sure: satir[k.id].katilim === 'geldi' ? sure : null,
                              };
                              return antrenmanKaydet(k.id, grupKayitId(tarih, c.id), r, ben.id).then(() =>
                                guncelleGunluk('g:' + c.id + ':' + k.id, r)
                              );
                            })
                          );
                          setAcik(null);
                          if (dersTuru && gelenler.length > 0 && gelenler.length < c.uyeler.length) {
                            setFark({ grupId: c.id, grupAdi: c.ad, tarih, dersTuru, gelenler, grupBoyu: c.uyeler.length, yonetici });
                          }
                        })
                      }
                    />
                  )}
                  {fark?.grupId === c.id && fark.tarih === tarih && <FarkKutusu fark={fark} ben={ben} onBitti={() => setFark(null)} />}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
