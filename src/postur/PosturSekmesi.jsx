import { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { tarihGoster } from '../veri';
import { POSTUR, BULGU, SECMELI, TARAF, SIDDET, BOLGE, bulguMetni, egilim } from './tanimlar';
import { programlariGetir, programGuncelle } from '../program/veri';
import { BOLUMLER, BOLUM_SIRASI, HARF, bugun, blokDurumu, gunBolumleri } from '../program/model';

const kopya = (o) => JSON.parse(JSON.stringify(o));

export async function posturleriGetir(kisiId) {
  const snap = await getDocs(collection(db, 'kisiler', kisiId, 'posturDegerlendirmeleri'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
}

export function VucutSemasi({ bulgular }) {
  const isaretler = [];
  for (const [k, f] of Object.entries(bulgular || {})) {
    const P = BULGU[k];
    if (!P || !f?.sev) continue;
    const r = BOLGE[P.bolge];
    const noktalar = !P.tarafli || !f.side ? [r.c] : f.side === 'B' ? [r.R || r.c, r.L || r.c] : [r[f.side] || r.c];
    noktalar.forEach(([x, y], i) =>
      isaretler.push(
        <circle key={k + i} cx={x} cy={y} r="7" fill={f.sev === 2 ? '#c8341f' : '#b7791f'} stroke="#fff" strokeWidth="2">
          <title>{P.ad}: {bulguMetni(f)}</title>
        </circle>
      )
    );
  }
  return (
    <svg viewBox="0 0 140 300" className="vucut-semasi" role="img" aria-label="Postür bulguları vücut şeması">
      <g fill="#dce3ea" stroke="#cbd2da" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="70" cy="24" r="16" />
        <rect x="63" y="38" width="14" height="12" rx="3" />
        <rect x="42" y="50" width="56" height="100" rx="16" />
        <path d="M44 58 L28 148" stroke="#dce3ea" strokeWidth="11" fill="none" />
        <path d="M96 58 L112 148" stroke="#dce3ea" strokeWidth="11" fill="none" />
        <path d="M58 148 L56 278" stroke="#dce3ea" strokeWidth="15" fill="none" />
        <path d="M82 148 L84 278" stroke="#dce3ea" strokeWidth="15" fill="none" />
        <ellipse cx="54" cy="286" rx="11" ry="5" />
        <ellipse cx="86" cy="286" rx="11" ry="5" />
      </g>
      <text x="22" y="16" fontSize="10" fill="#5d6b7b">Sağ</text>
      <text x="104" y="16" fontSize="10" fill="#5d6b7b">Sol</text>
      {isaretler}
    </svg>
  );
}

function DegerlendirmeFormu({ son, onKaydet, onVazgec }) {
  const [tarih, setTarih] = useState(bugun());
  const [not, setNot] = useState('');
  const [b, setB] = useState(() => kopya(son?.bulgular || {}));
  const [gorunurSecmeli, setGorunurSecmeli] = useState(() => SECMELI.filter((k) => son?.bulgular?.[k]?.sev));
  const [bekliyor, setBekliyor] = useState(false);
  const set = (k, d) => setB((x) => {
    const y = { ...x, [k]: { ...(x[k] || {}), ...d } };
    if (!y[k].sev) delete y[k];
    return y;
  });

  return (
    <div className="kart-form">
      <div className="form-izgara">
        <label className="alan"><span>Değerlendirme tarihi</span><input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></label>
        <label className="alan"><span>Not</span><input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Koşullar, genel izlenim" /></label>
      </div>
      {son && <p className="aciklama kucuk-yazi">Form son değerlendirmenin değerleriyle dolu geliyor; sadece değişenleri güncelle.</p>}
      <div className="postur-izgara">
        {POSTUR.map((g) => (
          <fieldset key={g.gorunum} className="postur-grup">
            <legend>{g.gorunum}</legend>
            {g.ogeler.map(([k, ad, tarafli]) => {
              const secmeli = SECMELI.includes(k);
              if (secmeli && !gorunurSecmeli.includes(k)) return null;
              const f = b[k] || {};
              return (
                <div key={k} className="postur-satir">
                  <span>
                    {ad}
                    {secmeli && (
                      <button type="button" className="kaldir" aria-label={`${ad} bulgusunu kaldır`} onClick={() => { setGorunurSecmeli(gorunurSecmeli.filter((x) => x !== k)); set(k, { sev: 0 }); }}>×</button>
                    )}
                  </span>
                  <select value={f.sev || 0} onChange={(e) => set(k, { sev: Number(e.target.value) })} aria-label={`${ad} şiddet`}>
                    <option value={0}>Normal</option>
                    <option value={1}>Hafif</option>
                    <option value={2}>Belirgin</option>
                  </select>
                  {tarafli ? (
                    <select value={f.side || ''} onChange={(e) => set(k, { side: e.target.value || null })} aria-label={`${ad} taraf`} disabled={!f.sev}>
                      <option value="">Taraf</option>
                      {Object.entries(TARAF).map(([v, a]) => <option key={v} value={v}>{a}</option>)}
                    </select>
                  ) : <span />}
                </div>
              );
            })}
            {g.gorunum === 'Arkadan' && gorunurSecmeli.length < SECMELI.length && (
              <select
                className="secmeli-ekle"
                value=""
                onChange={(e) => e.target.value && setGorunurSecmeli([...gorunurSecmeli, e.target.value])}
                aria-label="Diğer skapula bulgusu ekle"
              >
                <option value="">+ Diğer skapula bulgusu ekle…</option>
                {SECMELI.filter((k) => !gorunurSecmeli.includes(k)).map((k) => <option key={k} value={k}>{BULGU[k].ad}</option>)}
              </select>
            )}
          </fieldset>
        ))}
      </div>
      <div className="dugme-satiri">
        <button
          className="birincil"
          disabled={bekliyor || !tarih}
          onClick={async () => {
            setBekliyor(true);
            try {
              await onKaydet({ tarih, not, bulgular: b });
            } finally {
              setBekliyor(false);
            }
          }}
        >
          {bekliyor ? 'Kaydediliyor…' : 'Değerlendirmeyi kaydet'}
        </button>
        {onVazgec && <button className="metin" onClick={onVazgec}>Vazgeç</button>}
      </div>
    </div>
  );
}

// Son değerlendirmenin düzeltici egzersizlerini kişinin aktif ya da planlı bloğuna ekler
function DuzelticiOneriler({ kisi, bulgular, programYetkisi, yapan }) {
  const egzersizler = [...new Set(Object.entries(bulgular).filter(([, f]) => f?.sev).flatMap(([k]) => BULGU[k]?.egz || []))];
  const [secili, setSecili] = useState(egzersizler);
  const [bloklar, setBloklar] = useState(null);
  const [bolum, setBolum] = useState('mobilite');
  const [gunler, setGunler] = useState(null);
  const [mesaj, setMesaj] = useState('');

  useEffect(() => {
    programlariGetir(kisi.id).then(setBloklar).catch(() => setBloklar([]));
  }, [kisi.id]);

  if (!egzersizler.length) return null;
  const hedef = (bloklar || []).find((b) => blokDurumu(b) === 'simdi') || (bloklar || []).find((b) => blokDurumu(b) === 'planli');
  const seciliGunler = gunler ?? (hedef ? hedef.gunler.map((_, i) => i) : []);
  const anahtar = egzersizler.join('|');

  async function ekle() {
    const b = kopya(hedef);
    const yeni = secili;
    b.gunler = b.gunler.map((g, i) => {
      if (!seciliGunler.includes(i)) return g;
      if (b.sade) {
        const mevcut = String(g.icerik?.liste || '').split('\n').filter(Boolean);
        return { ...g, icerik: { ...g.icerik, liste: [...mevcut, ...yeni.filter((e) => !mevcut.includes(e))].join('\n') } };
      }
      const bl = gunBolumleri(b, g);
      const mevcut = String(g.icerik?.[bolum] || '').split('\n').filter(Boolean);
      return {
        ...g,
        bolumler: bl.includes(bolum) ? bl : BOLUM_SIRASI.filter((x) => [...bl, bolum].includes(x)),
        icerik: { ...g.icerik, [bolum]: [...mevcut, ...yeni.filter((e) => !mevcut.includes(e))].join('\n') },
      };
    });
    if (!b.sade && !b.bolumler.includes(bolum)) b.bolumler = BOLUM_SIRASI.filter((x) => [...b.bolumler, bolum].includes(x));
    try {
      await programGuncelle(hedef.id, b, yapan);
      setMesaj(`${yeni.length} egzersiz "${hedef.ad}" programına eklendi.`);
      setBloklar(await programlariGetir(kisi.id));
    } catch {
      setMesaj('Programa eklenemedi.');
    }
  }

  return (
    <section className="kart-form" key={anahtar}>
      <h3>Düzeltici egzersiz önerileri</h3>
      <p className="aciklama kucuk-yazi">Son değerlendirmedeki bulgulara göre. İstediklerini seç, programa eklensin.</p>
      <div className="cip-grubu kucuk">
        {egzersizler.map((e) => {
          const acik = secili.includes(e);
          return (
            <button type="button" key={e} className={'cip' + (acik ? ' secili' : '')} aria-pressed={acik} onClick={() => setSecili(acik ? secili.filter((x) => x !== e) : [...secili, e])}>
              {e}
            </button>
          );
        })}
      </div>
      {!programYetkisi ? (
        <p className="aciklama kucuk-yazi">Programa eklemek için program düzenleme yetkisi gerekli.</p>
      ) : bloklar === null ? null : !hedef ? (
        <p className="aciklama kucuk-yazi">
          Önerileri eklemek için önce Program sekmesinden aktif ya da planlanmış bir {kisi.tip === 'pt' ? 'plan' : 'blok'} oluştur.
          {kisi.grupKocIds?.length ? ' Grup programı değişmez; grup üyeleri için bireysel blok oluşturulmalı.' : ''}
        </p>
      ) : (
        <>
          <div className="form-izgara">
            {!hedef.sade && (
              <label className="alan">
                <span>Bölüm</span>
                <select value={bolum} onChange={(e) => setBolum(e.target.value)}>
                  {['mobilite', 'core', 'denge', 'isinma', 'kuvvet'].map((k) => <option key={k} value={k}>{BOLUMLER[k].ad}</option>)}
                </select>
              </label>
            )}
            <div className="alan">
              <span>Günler</span>
              <div className="cip-grubu kucuk">
                {hedef.gunler.map((g, i) => {
                  const acik = seciliGunler.includes(i);
                  return (
                    <button type="button" key={i} className={'cip' + (acik ? ' secili' : '')} aria-pressed={acik} onClick={() => setGunler(acik ? seciliGunler.filter((x) => x !== i) : [...seciliGunler, i])}>
                      {HARF[i]}{g.baslik ? ` · ${g.baslik}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="dugme-satiri">
            <button className="birincil kucuk" onClick={ekle} disabled={!secili.length || !seciliGunler.length}>
              Seçilenleri "{hedef.ad}" programına ekle
            </button>
          </div>
        </>
      )}
      {mesaj && <p className="bilgi">{mesaj}</p>}
    </section>
  );
}

export default function PosturSekmesi({ kisi, yapan, programYetkisi }) {
  const [liste, setListe] = useState(null);
  const [secili, setSecili] = useState(null);
  const [form, setForm] = useState(false);
  const [hata, setHata] = useState('');

  const yukle = async (id) => {
    try {
      const l = await posturleriGetir(kisi.id);
      setListe(l);
      setSecili(id || l[0]?.id || null);
    } catch {
      setListe([]);
    }
  };
  useEffect(() => {
    yukle();
  }, [kisi.id]);

  async function kaydet(v) {
    setHata('');
    try {
      const ref = doc(collection(db, 'kisiler', kisi.id, 'posturDegerlendirmeleri'));
      await setDoc(ref, { ...v, kurumId: KURUM_ID, kaydeden: yapan, kayit: serverTimestamp() });
      setForm(false);
      await yukle(ref.id);
    } catch {
      setHata('Kaydedilemedi.');
    }
  }

  if (liste === null) return <p className="aciklama">Yükleniyor…</p>;
  if (!liste.length || form) {
    return (
      <div>
        {!liste.length && (
          <p className="aciklama">
            Önden, yandan ve arkadan değerlendir. Her bulgu için şiddet ve taraf seç; normal olanları olduğu gibi bırak.
          </p>
        )}
        <DegerlendirmeFormu son={liste[0]} onKaydet={kaydet} onVazgec={liste.length ? () => setForm(false) : null} />
        {hata && <p className="hata">{hata}</p>}
      </div>
    );
  }

  const idx = Math.max(0, liste.findIndex((x) => x.id === secili));
  const cur = liste[idx];
  const once = liste[idx + 1];
  const anahtarlar = Object.keys(BULGU).filter((k) => cur.bulgular?.[k]?.sev || once?.bulgular?.[k]?.sev);

  return (
    <div className="kayit-bolumleri">
      <div className="baslik-satiri">
        <p className="aciklama">
          {liste.length} değerlendirme · {idx === 0 ? 'son' : 'seçili'}: {tarihGoster(cur.tarih)}
          {once ? ` · karşılaştırma: ${tarihGoster(once.tarih)}` : ''}
        </p>
        <button className="birincil kucuk" onClick={() => setForm(true)}>Yeni değerlendirme</button>
      </div>

      <div className="postur-gorunum">
        <VucutSemasi bulgular={cur.bulgular} />
        <div>
          {anahtarlar.length === 0 ? (
            <p><span className="norm-rozet n-İyi">Bulgu yok</span> Tüm bölgeler normal olarak işaretlendi.</p>
          ) : (
            POSTUR.map((g) => {
              const ks = anahtarlar.filter((k) => BULGU[k].gorunum === g.gorunum);
              if (!ks.length) return null;
              return (
                <div key={g.gorunum} className="bulgu-grubu">
                  <h4>{g.gorunum}</h4>
                  <ul className="bulgu-listesi">
                    {ks.map((k) => {
                      const f = cur.bulgular?.[k];
                      const e = egilim(f, once?.bulgular?.[k]);
                      return (
                        <li key={k}>
                          <b>{BULGU[k].ad}</b>
                          {f?.sev ? (
                            <span className={'bulgu-rozet s' + f.sev}>{bulguMetni(f)}</span>
                          ) : (
                            <span className="bulgu-rozet s0">Normal</span>
                          )}
                          {e === 'duzeldi' && <span className="egilim iyi">↓ düzeldi (önce {SIDDET[once.bulgular[k].sev].toLocaleLowerCase('tr')})</span>}
                          {e === 'artti' && <span className="egilim kotu">↑ arttı</span>}
                          {e === 'yeni' && <span className="egilim kotu">↑ yeni bulgu</span>}
                          {e === 'ayni' && <span className="aciklama kucuk-yazi">aynı</span>}
                          {f?.sev && BULGU[k].yonlendir ? (
                            <span className="yonlendir">Uzman değerlendirmesi önerilir (Adams testi, ortopedi)</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
          {cur.not && <p className="aciklama kucuk-yazi">📝 {cur.not}</p>}
        </div>
      </div>

      {idx === 0 && <DuzelticiOneriler key={cur.id} kisi={kisi} bulgular={cur.bulgular || {}} programYetkisi={programYetkisi} yapan={yapan} />}

      <div>
        <h4 style={{ margin: '0 0 6px' }}>Değerlendirme geçmişi</h4>
        <div className="cip-grubu kucuk">
          {liste.map((x) => (
            <button key={x.id} className={'cip' + (x.id === cur.id ? ' secili' : '')} onClick={() => setSecili(x.id)}>
              {tarihGoster(x.tarih)} · {Object.values(x.bulgular || {}).filter((f) => f?.sev).length} bulgu
            </button>
          ))}
        </div>
        <button
          className="metin tehlike"
          style={{ marginTop: 8 }}
          onClick={async () => {
            if (!window.confirm(`${tarihGoster(cur.tarih)} tarihli değerlendirme silinsin mi?`)) return;
            await deleteDoc(doc(db, 'kisiler', kisi.id, 'posturDegerlendirmeleri', cur.id));
            await yukle();
          }}
        >
          Seçili değerlendirmeyi sil
        </button>
      </div>
    </div>
  );
}
