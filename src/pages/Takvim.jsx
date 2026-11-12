import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { kisileriGetir, subeleriGetir } from '../veri';
import { gruplariGetir } from '../gruplar/veri';
import { tumProgramlar, gunOzelleriAralik } from '../bugun/veri';
import { bugun, gunEkle, coz, ymd, HARF } from '../program/model';
import { gununKartlari } from '../takvim/gunHesap';
import { etkinlikleriGetir, etkinlikKaydet, etkinlikSil, ETKINLIK_TURU, ETKINLIK_SIMGE } from '../takvim/veri';

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const haftaBasi = (t) => gunEkle(t, -((coz(t).getDay() + 6) % 7));
const ayBasi = (t) => t.slice(0, 8) + '01';
const ayAdi = (t) => coz(t).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const gunNo = (t) => coz(t).getDate();
const aralikMetni = (a, b) =>
  `${coz(a).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${coz(b).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

function EtkinlikFormu({ ilk, kisiler, gruplar, onKaydet, onSil, onVazgec }) {
  const [f, setF] = useState({
    tur: ilk?.tur || 'mac',
    ad: ilk?.ad || '',
    tarih: ilk?.tarih || bugun(),
    saat: ilk?.saat || '',
    yer: ilk?.yer || '',
    kapsam: ilk?.kapsam || 'secili',
    grupIds: ilk?.grupIds || [],
    kisiIds: ilk?.kisiIds || [],
    not: ilk?.not || '',
  });
  const [ara, setAra] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const adaylar = ara.trim()
    ? kisiler.filter((k) => k.aktif !== false && !f.kisiIds.includes(k.id) && k.ad.toLocaleLowerCase('tr').includes(ara.trim().toLocaleLowerCase('tr')))
    : [];

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (!f.tarih) return setHata('Tarih gerekli.');
    if (f.kapsam === 'secili' && !f.grupIds.length && !f.kisiIds.length) return setHata('Etkinliğin kimleri kapsadığını seç ya da "Herkes"i işaretle.');
    setBekliyor(true);
    try {
      await onKaydet({ ...f, ad: f.ad.trim(), grupIds: f.kapsam === 'herkes' ? [] : f.grupIds, kisiIds: f.kapsam === 'herkes' ? [] : f.kisiIds });
    } catch (err) {
      setHata(hataMesaji(err));
      setBekliyor(false);
    }
  }

  return (
    <form className="kart-form" onSubmit={kaydet}>
      <h3>{ilk ? 'Etkinliği düzenle' : 'Yeni etkinlik'}</h3>
      <div className="secim-cubugu" role="radiogroup" aria-label="Etkinlik türü">
        {Object.entries(ETKINLIK_TURU).map(([v, ad]) => (
          <button type="button" key={v} role="radio" aria-checked={f.tur === v} className={'secim' + (f.tur === v ? ' secili' : '')} onClick={() => setF({ ...f, tur: v })}>
            {ETKINLIK_SIMGE[v]} {ad}
          </button>
        ))}
      </div>
      <div className="form-izgara">
        <label className="alan"><span>Başlık</span><input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder={f.tur === 'mac' ? 'Örn. Lig maçı – deplasman' : ''} /></label>
        <label className="alan"><span>Tarih</span><input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} /></label>
        <label className="alan"><span>Saat (isteğe bağlı)</span><input type="time" value={f.saat} onChange={(e) => setF({ ...f, saat: e.target.value })} /></label>
        <label className="alan"><span>Yer</span><input value={f.yer} onChange={(e) => setF({ ...f, yer: e.target.value })} /></label>
      </div>
      <div className="alan">
        <span>Kimleri kapsıyor?</span>
        <div className="secim-cubugu" role="radiogroup" aria-label="Kapsam">
          {[['secili', 'Seçili grup / kişiler'], ['herkes', 'Herkes']].map(([v, ad]) => (
            <button type="button" key={v} role="radio" aria-checked={f.kapsam === v} className={'secim' + (f.kapsam === v ? ' secili' : '')} onClick={() => setF({ ...f, kapsam: v })}>
              {ad}
            </button>
          ))}
        </div>
      </div>
      {f.kapsam === 'secili' && (
        <>
          {gruplar.length > 0 && (
            <div className="alan">
              <span>Gruplar</span>
              <div className="cip-grubu">
                {gruplar.filter((g) => g.aktif !== false).map((g) => {
                  const acik = f.grupIds.includes(g.id);
                  return (
                    <button type="button" key={g.id} className={'cip' + (acik ? ' secili' : '')} aria-pressed={acik} onClick={() => setF({ ...f, grupIds: acik ? f.grupIds.filter((x) => x !== g.id) : [...f.grupIds, g.id] })}>
                      {g.ad}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="alan">
            <span>Kişiler ({f.kisiIds.length})</span>
            <div className="cip-grubu">
              {f.kisiIds.map((id) => (
                <button type="button" key={id} className="cip secili" onClick={() => setF({ ...f, kisiIds: f.kisiIds.filter((x) => x !== id) })}>
                  {kisiler.find((k) => k.id === id)?.ad || 'Kişi'} ×
                </button>
              ))}
            </div>
            <input type="search" placeholder="Kişi eklemek için isim ara" value={ara} onChange={(e) => setAra(e.target.value)} />
            {adaylar.length > 0 && (
              <div className="cip-grubu">
                {adaylar.slice(0, 10).map((k) => (
                  <button type="button" key={k.id} className="cip" onClick={() => { setF({ ...f, kisiIds: [...f.kisiIds, k.id] }); setAra(''); }}>+ {k.ad}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <label className="alan"><span>Not</span><input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} /></label>
      {(f.tur === 'mac' || f.tur === 'turnuva') && (
        <p className="aciklama kucuk-yazi">Maç ve turnuvalar, "maç gününe göre" planlanmış bloklarda seansların yerini belirler (MD-4, MD-2…).</p>
      )}
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
        {ilk && (
          <button type="button" className="metin tehlike" onClick={onSil}>Sil</button>
        )}
      </div>
    </form>
  );
}

function SeansSatiri({ c, onAc }) {
  const s = c.s;
  let alt = '';
  if (s?.dinlenme) alt = s.macGunu ? 'Maç günü' : 'Dinlenme';
  else if (s?.gun) alt = [s.md?.etiket, s.gun.baslik || (s.gunIdx != null ? `${HARF[s.gunIdx]} günü` : '')].filter(Boolean).join(' · ');
  return (
    <button className={'takvim-seans' + (s?.dinlenme ? ' dinlenme' : '') + (c.tip === 'grup' ? ' grup' : '')} onClick={onAc} title="Bugün ekranında aç">
      <span className="ts-saat">{c.saat || '—'}</span>
      <span className="ts-ad">
        {c.tip === 'grup' ? '👥 ' : ''}
        {c.ad}
        {c.ozel ? ' ✎' : ''}
      </span>
      {alt && <span className="ts-alt">{alt}</span>}
    </button>
  );
}

export default function Takvim({ onGeri, onGunAc }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yonetici = ben.rol === 'yonetici';
  const [mod, setMod] = useState('hafta');
  const [odak, setOdak] = useState(bugun());
  const [temel, setTemel] = useState(null);
  const [ozeller, setOzeller] = useState([]);
  const [etkinlikler, setEtkinlikler] = useState([]);
  const [sube, setSube] = useState('');
  const [sadeceBenim, setSadeceBenim] = useState(!yonetici);
  const [form, setForm] = useState(null); // null | {} (yeni) | etkinlik
  const [hata, setHata] = useState('');

  const [bas, bit] = useMemo(() => {
    if (mod === 'hafta') {
      const b = haftaBasi(odak);
      return [b, gunEkle(b, 6)];
    }
    const b = haftaBasi(ayBasi(odak));
    return [b, gunEkle(b, 41)];
  }, [mod, odak]);
  const gunler = useMemo(() => Array.from({ length: mod === 'hafta' ? 7 : 42 }, (_, i) => gunEkle(bas, i)), [bas, mod]);

  useEffect(() => {
    Promise.all([kisileriGetir(ben), gruplariGetir(ben), tumProgramlar(), subeleriGetir()])
      .then(([kisiler, gruplar, programlar, subeler]) => setTemel({ kisiler, gruplar, programlar, subeler }))
      .catch((e) => setHata(hataMesaji(e)));
  }, []);

  async function araligiYukle() {
    try {
      const [o, e] = await Promise.all([gunOzelleriAralik(bas, bit), etkinlikleriGetir(gunEkle(bas, -7), gunEkle(bit, 7))]);
      setOzeller(o);
      setEtkinlikler(e);
    } catch (err) {
      setHata(hataMesaji(err));
    }
  }
  useEffect(() => {
    araligiYukle();
  }, [bas, bit]);

  const gunKartlari = useMemo(() => {
    if (!temel) return {};
    const r = {};
    for (const t of gunler) r[t] = gununKartlari({ ...temel, ozeller, etkinlikler, tarih: t, sube, benimId: sadeceBenim ? ben.id : null });
    return r;
  }, [temel, ozeller, etkinlikler, gunler, sube, sadeceBenim]);
  const gunEtkinlikleri = (t) => etkinlikler.filter((e) => e.tarih === t);

  function kaydir(yon) {
    if (mod === 'hafta') setOdak(gunEkle(odak, yon * 7));
    else {
      const d = coz(ayBasi(odak));
      d.setMonth(d.getMonth() + yon);
      setOdak(ymd(d));
    }
  }

  if (form) {
    return (
      <div>
        <button className="metin geri" onClick={() => setForm(null)}>← Takvim</button>
        <EtkinlikFormu
          ilk={form.id ? form : null}
          kisiler={temel?.kisiler || []}
          gruplar={temel?.gruplar || []}
          onVazgec={() => setForm(null)}
          onKaydet={async (v) => {
            await etkinlikKaydet(form.id ? form : null, v, ben.id);
            setForm(null);
            setOdak(v.tarih);
            await araligiYukle();
          }}
          onSil={async () => {
            if (!window.confirm(`"${form.ad || ETKINLIK_TURU[form.tur]}" silinsin mi?`)) return;
            await etkinlikSil(form.id);
            setForm(null);
            await araligiYukle();
          }}
        />
      </div>
    );
  }

  const bugunT = bugun();
  return (
    <div>
      {onGeri && <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>}
      <div className="bugun-bas">
        <div>
          <h2>Takvim</h2>
          <p className="aciklama">{mod === 'hafta' ? aralikMetni(bas, bit) : ayAdi(odak)}</p>
        </div>
        <div className="gun-gezinti">
          <div className="secim-cubugu" role="radiogroup" aria-label="Görünüm">
            {[['hafta', 'Hafta'], ['ay', 'Ay']].map(([v, ad]) => (
              <button key={v} role="radio" aria-checked={mod === v} className={'secim' + (mod === v ? ' secili' : '')} onClick={() => setMod(v)}>{ad}</button>
            ))}
          </div>
          <button className="ikincil kucuk" onClick={() => kaydir(-1)} aria-label="Önceki">‹</button>
          <button className="ikincil kucuk" onClick={() => setOdak(bugunT)}>Bugün</button>
          <button className="ikincil kucuk" onClick={() => kaydir(1)} aria-label="Sonraki">›</button>
          <button className="birincil kucuk" onClick={() => setForm({})}>+ Etkinlik</button>
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

      {temel && mod === 'hafta' && (
        <div className="hafta-izgara">
          {gunler.map((t, i) => (
            <section key={t} className={'hafta-gun' + (t === bugunT ? ' bugun' : '')}>
              <button className="hafta-gun-bas" onClick={() => onGunAc(t)} title="Bugün ekranında aç">
                <b>{GUNLER[i]}</b> <span>{gunNo(t)}</span>
              </button>
              {gunEtkinlikleri(t).map((e) => (
                <button key={e.id} className={'etkinlik-cip tur-' + e.tur} onClick={() => setForm(e)}>
                  {ETKINLIK_SIMGE[e.tur]} {e.saat ? e.saat + ' ' : ''}{e.ad || ETKINLIK_TURU[e.tur]}
                </button>
              ))}
              {(gunKartlari[t] || []).map((c) => <SeansSatiri key={c.tip + c.id} c={c} onAc={() => onGunAc(t)} />)}
              {!(gunKartlari[t] || []).length && !gunEtkinlikleri(t).length && <span className="aciklama kucuk-yazi">—</span>}
            </section>
          ))}
        </div>
      )}

      {temel && mod === 'ay' && (
        <div className="ay-izgara">
          {GUNLER.map((g) => <div key={g} className="ay-bas">{g}</div>)}
          {gunler.map((t) => {
            const k = (gunKartlari[t] || []).filter((c) => !c.s?.dinlenme || c.saat);
            const ayDisi = t.slice(0, 7) !== odak.slice(0, 7);
            return (
              <button
                key={t}
                className={'ay-gun' + (ayDisi ? ' disi' : '') + (t === bugunT ? ' bugun' : '')}
                onClick={() => { setOdak(t); setMod('hafta'); }}
              >
                <span className="ay-no">{gunNo(t)}</span>
                {gunEtkinlikleri(t).map((e) => (
                  <span key={e.id} className={'ay-etkinlik tur-' + e.tur}>{ETKINLIK_SIMGE[e.tur]} {e.ad || ETKINLIK_TURU[e.tur]}</span>
                ))}
                {k.length > 0 && <span className="ay-ders">{k.length} ders</span>}
              </button>
            );
          })}
        </div>
      )}
      <p className="aciklama kucuk-yazi" style={{ marginTop: 10 }}>
        Bir güne ya da derse tıklayınca o gün Bugün ekranında açılır; orada yoklama girebilir, dersi bugüne özel değiştirebilir, iptal ya da dinlenme günü yapabilirsin.
      </p>
    </div>
  );
}
