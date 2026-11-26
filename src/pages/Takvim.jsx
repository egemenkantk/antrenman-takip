import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { kisileriGetir, subeleriGetir } from '../veri';
import { gruplariGetir } from '../gruplar/veri';
import { tumProgramlar, gunOzelleriAralik } from '../bugun/veri';
import { degisiklikleriGetir } from '../takvim/degisiklik';
import { bugun, gunEkle, coz, ymd, HARF } from '../program/model';
import { gununKartlari } from '../takvim/gunHesap';
import { etkinlikleriGetir, etkinlikKaydet, etkinlikSil, ETKINLIK_TURU, ETKINLIK_SIMGE } from '../takvim/veri';
import EtkinlikFormu from '../takvim/EtkinlikFormu';

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const haftaBasi = (t) => gunEkle(t, -((coz(t).getDay() + 6) % 7));
const ayBasi = (t) => t.slice(0, 8) + '01';
const ayAdi = (t) => coz(t).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const gunNo = (t) => coz(t).getDate();
const aralikMetni = (a, b) =>
  `${coz(a).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${coz(b).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

function SeansSatiri({ c, onAc }) {
  const s = c.s;
  let alt = '';
  if (c.durum === 'iptal') alt = 'İptal / ertelendi';
  else if (c.durum === 'gitti') alt = `→ ${c.degisiklik.yeniTarih.slice(8, 10)}.${c.degisiklik.yeniTarih.slice(5, 7)} tarihine taşındı`;
  else if (c.durum === 'gelen') alt = `↪ ${c.degisiklik.tarih.slice(8, 10)}.${c.degisiklik.tarih.slice(5, 7)} dersinden taşındı`;
  else if (c.durum === 'saat') alt = `Saat değişti (${c.eskiSaat || '—'} → ${c.saat})`;
  else if (s?.dinlenme) alt = s.macGunu ? 'Maç günü' : 'Dinlenme';
  else if (s?.gun) alt = [s.md?.etiket, s.gun.baslik || (s.gunIdx != null ? `${HARF[s.gunIdx]} günü` : '')].filter(Boolean).join(' · ');
  return (
    <button
      className={'takvim-seans' + (s?.dinlenme ? ' dinlenme' : '') + (c.tip === 'grup' ? ' grup' : '') + (c.durum === 'iptal' || c.durum === 'gitti' ? ' iptal' : '') + (c.degisiklik ? ' degisen' : '')}
      onClick={onAc}
      title="Bugün ekranında aç"
    >
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
  const [degisiklikler, setDegisiklikler] = useState([]);
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
      const [o, e, d] = await Promise.all([gunOzelleriAralik(bas, bit), etkinlikleriGetir(gunEkle(bas, -7), gunEkle(bit, 7)), degisiklikleriGetir(bas, bit).catch(() => [])]);
      setOzeller(o);
      setDegisiklikler(d);
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
    for (const t of gunler) r[t] = gununKartlari({ ...temel, ozeller, etkinlikler, degisiklikler, tarih: t, sube, benimId: sadeceBenim ? ben.id : null });
    return r;
  }, [temel, ozeller, etkinlikler, degisiklikler, gunler, sube, sadeceBenim]);
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
          onKaydet={async (liste) => {
            if (form.id) await etkinlikKaydet(form, liste[0], ben.id);
            else for (const v of liste) await etkinlikKaydet(null, v, ben.id);
            setForm(null);
            setOdak(liste[0].tarih);
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
              {(gunKartlari[t] || []).map((c) => <SeansSatiri key={c.tip + c.id + (c.durum === 'gelen' ? 'g' : '')} c={c} onAc={() => onGunAc(t)} />)}
              {!(gunKartlari[t] || []).length && !gunEtkinlikleri(t).length && <span className="aciklama kucuk-yazi">—</span>}
            </section>
          ))}
        </div>
      )}

      {temel && mod === 'ay' && (
        <div className="ay-izgara">
          {GUNLER.map((g) => <div key={g} className="ay-bas">{g}</div>)}
          {gunler.map((t) => {
            const k = (gunKartlari[t] || []).filter((c) => (!c.s?.dinlenme || c.saat) && c.durum !== 'iptal' && c.durum !== 'gitti');
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
