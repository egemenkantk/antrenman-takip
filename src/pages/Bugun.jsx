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

const satirlar = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);
const KATILIM_ADI = Object.fromEntries(KATILIM);

function Avatar({ k }) {
  return k.foto ? <img className="avatar kucuk-av" src={k.foto} alt="" /> : <div className="avatar kucuk-av" aria-hidden="true">{k.ad.charAt(0)}</div>;
}

function Plan({ s }) {
  if (!s) return <p className="aciklama kucuk-yazi">Bu gün için programda seans yok.</p>;
  if (s.dinlenme) {
    return (
      <p className="dinlenme">
        {s.ozel ? 'Bugüne özel: dinlenme günü' : s.macTakvimi ? 'Maç gününe göre planlı blok (takvim bölümüyle gelecek)' : 'Dinlenme günü'}
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
        <ul className="egzersizler">{satirlar(s.gun.icerik?.liste).map((x, i) => <li key={i}>{x}</li>)}</ul>
      ) : (
        gunBolumleri(b, s.gun).map((k) => {
          const d = BOLUMLER[k]?.doz ? dozaj(s.rx, s.gunIdx, k) : '';
          const h = satirlar(s.gun.icerik?.[k]);
          if (!h.length && !d) return null;
          return (
            <div key={k} className="bolum" style={{ '--bc': BOLUM_RENK[k] }}>
              <h5>{BOLUMLER[k]?.ad || k}{d && <span className="doz">{d}</span>}</h5>
              {h.length > 0 && <ul className="egzersizler">{h.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            </div>
          );
        })
      )}
      {s.rx?.not && !s.ozel && <p className="aciklama kucuk-yazi">Hafta notu: {s.rx.not}</p>}
    </div>
  );
}

function TamamlaFormu({ ilk, onKaydet, onVazgec }) {
  const [katilim, setKatilim] = useState(ilk?.katilim || 'geldi');
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
              await onKaydet({ katilim, rpe: katilim === 'geldi' ? rpe : null, sure: katilim === 'geldi' ? Number(sure) || null : null, not });
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
    Object.fromEntries(uyeler.map((k) => [k.id, { katilim: kayitlar[k.id]?.katilim || 'geldi', rpe: kayitlar[k.id]?.rpe ?? null }]))
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

export default function Bugun({ onGeri }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yonetici = ben.rol === 'yonetici';
  const [tarih, setTarih] = useState(bugun());
  const [temel, setTemel] = useState(null); // { kisiler, gruplar, programlar, subeler }
  const [ozeller, setOzeller] = useState([]);
  const [gunluk, setGunluk] = useState({}); // anahtar → belge
  const [sube, setSube] = useState('');
  const [sadeceBenim, setSadeceBenim] = useState(!yonetici);
  const [acik, setAcik] = useState(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    Promise.all([kisileriGetir(ben), gruplariGetir(ben), tumProgramlar(), subeleriGetir()])
      .then(([kisiler, gruplar, programlar, subeler]) => setTemel({ kisiler, gruplar, programlar, subeler }))
      .catch((e) => setHata(hataMesaji(e)));
  }, []);

  const hg = coz(tarih).getDay();

  const kartlar = useMemo(() => {
    if (!temel) return [];
    const blokları = (id) => temel.programlar.filter((p) => p.sahipId === id).sort((a, b) => a.baslangic.localeCompare(b.baslangic));
    const ozelOf = (id) => ozeller.find((o) => o.sahipId === id) || null;
    const sonuc = [];
    for (const g of temel.gruplar) {
      if (g.aktif === false) continue;
      if (sube && g.subeId !== sube) continue;
      if (sadeceBenim && !(g.kocIds || []).includes(ben.id)) continue;
      const ozel = ozelOf(g.id);
      const s = gununSeansi(blokları(g.id), tarih, ozel);
      const saat = g.saatler?.[hg];
      if (saat == null && !ozel && !(s && !s.dinlenme && s.gun)) continue;
      const uyeler = (g.uyeIds || []).map((id) => temel.kisiler.find((k) => k.id === id)).filter((k) => k && k.aktif !== false);
      sonuc.push({ tip: 'grup', id: g.id, ad: g.ad, saat: saat || '', sure: g.sure, s, ozel, uyeler, g });
    }
    for (const k of temel.kisiler) {
      if (k.aktif === false) continue;
      if (sube && !(k.subeIds || []).includes(sube)) continue;
      if (sadeceBenim && !(k.kocIds || []).includes(ben.id)) continue;
      const ozel = ozelOf(k.id);
      const s = gununSeansi(blokları(k.id), tarih, ozel);
      const saat = k.haftalikSaatler?.[hg];
      if (saat == null && !ozel && !(s && !s.dinlenme && s.gun)) continue;
      sonuc.push({ tip: 'kisi', id: k.id, ad: k.ad, saat: saat || '', s, ozel, k });
    }
    return sonuc.sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99') || a.ad.localeCompare(b.ad, 'tr'));
  }, [temel, ozeller, tarih, sube, sadeceBenim]);

  // Tarih değişince güne özel değişiklikleri ve günlük kayıtları yükle
  async function gunuYukle() {
    try {
      setOzeller(await gunOzelleriGetir(tarih));
    } catch {
      setOzeller([]);
    }
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
      <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>
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
                          <span className="kim"><Avatar k={k} /> {k.ad}</span>
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
                          await Promise.all(
                            c.uyeler.map((k) => {
                              const r = {
                                ...ortak,
                                katilim: satir[k.id].katilim,
                                rpe: satir[k.id].katilim === 'geldi' ? satir[k.id].rpe : null,
                                sure: satir[k.id].katilim === 'geldi' ? sure : null,
                              };
                              return antrenmanKaydet(k.id, grupKayitId(tarih, c.id), r, ben.id).then(() =>
                                guncelleGunluk('g:' + c.id + ':' + k.id, r)
                              );
                            })
                          );
                          setAcik(null);
                        })
                      }
                    />
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
