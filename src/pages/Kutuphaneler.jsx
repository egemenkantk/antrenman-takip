import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { BOLUMLER, BOLUM_SIRASI, BOLUM_RENK, fazAdi } from '../program/model';
import { tumProgramlar } from '../bugun/veri';
import {
  egzersizleriGetir,
  egzersizKaydet,
  egzersizSil,
  egzersizleriTopluEkle,
  satirdanAd,
  normal,
  sablonlariGetir,
  sablonGuncelle,
  sablonSil,
} from '../kutuphane/veri';

const videoGecerli = (u) => !u || /^https?:\/\/\S+$/i.test(u.trim());

function EgzersizFormu({ ilk, onKaydet, onSil, onVazgec }) {
  const [f, setF] = useState({ ad: ilk?.ad || '', bolum: ilk?.bolum || 'kuvvet', video: ilk?.video || '', ipucu: ilk?.ipucu || '', dikkat: ilk?.dikkat || '' });
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  return (
    <form
      className="kart-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setHata('');
        if (!f.ad.trim()) return setHata('Egzersiz adı gerekli.');
        if (!videoGecerli(f.video)) return setHata('Video bağlantısı http:// ya da https:// ile başlamalı.');
        setBekliyor(true);
        try {
          await onKaydet({ ...f, ad: f.ad.trim(), video: f.video.trim() });
        } catch (err) {
          setHata(hataMesaji(err));
          setBekliyor(false);
        }
      }}
    >
      <h3>{ilk ? 'Egzersizi düzenle' : 'Yeni egzersiz'}</h3>
      <div className="form-izgara">
        <label className="alan"><span>Egzersiz adı</span><input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} /></label>
        <label className="alan">
          <span>Bölüm</span>
          <select value={f.bolum} onChange={(e) => setF({ ...f, bolum: e.target.value })}>
            {BOLUM_SIRASI.map((k) => <option key={k} value={k}>{BOLUMLER[k].ad}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Video bağlantısı (YouTube, Instagram, Drive…)</span>
          <input type="url" value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} placeholder="https://" />
        </label>
      </div>
      <label className="alan">
        <span>Uygulama ipucu</span>
        <textarea rows={2} value={f.ipucu} onChange={(e) => setF({ ...f, ipucu: e.target.value })} placeholder="Örn. dizler ayak ucu yönünde, sırt nötr" />
      </label>
      <label className="alan">
        <span>Dikkat edilecekler / kaçınılacak durumlar</span>
        <textarea rows={2} value={f.dikkat} onChange={(e) => setF({ ...f, dikkat: e.target.value })} placeholder="Örn. ön çapraz bağ rehabilitasyonunun erken döneminde yapılmaz" />
      </label>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
        {ilk && <button type="button" className="metin tehlike" onClick={onSil}>Sil</button>}
      </div>
    </form>
  );
}

// Mevcut programlardaki egzersiz adlarını toplayıp kütüphaneye önerir
function ProgramdanIceAl({ kutuphane, yapan, onBitti }) {
  const [oneriler, setOneriler] = useState(null);
  const [secili, setSecili] = useState({});
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState('');

  async function tara() {
    setHata('');
    try {
      const programlar = await tumProgramlar();
      const var_ = new Set(kutuphane.map((e) => normal(e.ad)));
      const bulunan = new Map();
      for (const p of programlar) {
        for (const g of p.gunler || []) {
          const parcalar = p.sade ? [['kuvvet', g.icerik?.liste]] : Object.entries(g.icerik || {});
          for (const [bolum, metin] of parcalar) {
            for (const satir of String(metin || '').split('\n')) {
              const ad = satirdanAd(satir);
              const n = normal(ad);
              if (!ad || ad.length < 3 || var_.has(n)) continue;
              const k = bulunan.get(n) || { ad, bolumler: {}, sayi: 0 };
              k.bolumler[bolum] = (k.bolumler[bolum] || 0) + 1;
              k.sayi++;
              bulunan.set(n, k);
            }
          }
        }
      }
      const l = [...bulunan.values()]
        .map((k) => ({ ad: k.ad, bolum: Object.entries(k.bolumler).sort((a, b) => b[1] - a[1])[0][0], sayi: k.sayi }))
        .filter((k) => BOLUMLER[k.bolum])
        .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, 'tr'));
      setOneriler(l);
      setSecili(Object.fromEntries(l.map((k) => [k.ad, true])));
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  if (!oneriler) {
    return (
      <div className="kart-form">
        <h3>Programlardan içe al</h3>
        <p className="aciklama kucuk-yazi">Mevcut programlarda geçen egzersiz adları toplanır, kütüphanede olmayanlar önerilir. İstediklerini seçip ekleyebilirsin; video ve ipuçlarını sonra tek tek girersin.</p>
        <button className="ikincil" onClick={tara}>Programları tara</button>
        {hata && <p className="hata">{hata}</p>}
      </div>
    );
  }
  const secilenler = oneriler.filter((k) => secili[k.ad]);
  return (
    <div className="kart-form">
      <h3>Programlardan bulunan egzersizler ({oneriler.length})</h3>
      {oneriler.length === 0 ? (
        <p className="aciklama">Programlardaki tüm egzersizler zaten kütüphanede.</p>
      ) : (
        <>
          <div className="tablo-kap">
            <table className="tablo">
              <thead><tr><th></th><th>Egzersiz</th><th>Bölüm</th><th>Geçtiği yer</th></tr></thead>
              <tbody>
                {oneriler.map((k, i) => (
                  <tr key={k.ad}>
                    <td><input type="checkbox" checked={!!secili[k.ad]} onChange={(e) => setSecili({ ...secili, [k.ad]: e.target.checked })} aria-label={k.ad} /></td>
                    <td>
                      <input className="tablo-girdi" value={k.ad} onChange={(e) => setOneriler(oneriler.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))} />
                    </td>
                    <td>
                      <select value={k.bolum} onChange={(e) => setOneriler(oneriler.map((x, j) => (j === i ? { ...x, bolum: e.target.value } : x)))}>
                        {BOLUM_SIRASI.map((b) => <option key={b} value={b}>{BOLUMLER[b].ad}</option>)}
                      </select>
                    </td>
                    <td>{k.sayi} kez</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dugme-satiri">
            <button
              className="birincil"
              disabled={bekliyor || !secilenler.length}
              onClick={async () => {
                setBekliyor(true);
                try {
                  await egzersizleriTopluEkle(secilenler.map((k) => ({ ad: k.ad.trim(), bolum: k.bolum, video: '', ipucu: '', dikkat: '' })), yapan);
                  onBitti();
                } catch (e) {
                  setHata(hataMesaji(e));
                  setBekliyor(false);
                }
              }}
            >
              {bekliyor ? 'Ekleniyor…' : `${secilenler.length} egzersizi ekle`}
            </button>
            <button className="metin" onClick={() => setOneriler(null)}>Vazgeç</button>
          </div>
        </>
      )}
      {hata && <p className="hata">{hata}</p>}
    </div>
  );
}

function Egzersizler({ yazabilir, yapan }) {
  const [liste, setListe] = useState(null);
  const [ara, setAra] = useState('');
  const [bolum, setBolum] = useState('');
  const [form, setForm] = useState(null);
  const [iceAl, setIceAl] = useState(false);
  const yukle = () => egzersizleriGetir(true).then(setListe).catch(() => setListe([]));
  useEffect(() => {
    yukle();
  }, []);

  const gorunen = useMemo(
    () => (liste || []).filter((e) => (!bolum || e.bolum === bolum) && (!ara.trim() || normal(e.ad).includes(normal(ara)))),
    [liste, ara, bolum]
  );

  if (form) {
    return (
      <EgzersizFormu
        ilk={form.id ? form : null}
        onVazgec={() => setForm(null)}
        onKaydet={async (v) => { await egzersizKaydet(form.id ? form : null, v, yapan); setForm(null); await yukle(); }}
        onSil={async () => {
          if (!window.confirm(`"${form.ad}" kütüphaneden silinsin mi? Programlardaki satırlar etkilenmez.`)) return;
          await egzersizSil(form.id);
          setForm(null);
          await yukle();
        }}
      />
    );
  }
  if (iceAl) return <ProgramdanIceAl kutuphane={liste || []} yapan={yapan} onBitti={() => { setIceAl(false); yukle(); }} />;

  return (
    <div>
      <div className="filtreler">
        <input type="search" placeholder="Egzersiz ara" value={ara} onChange={(e) => setAra(e.target.value)} aria-label="Egzersiz ara" />
        <select value={bolum} onChange={(e) => setBolum(e.target.value)} aria-label="Bölüm">
          <option value="">Tüm bölümler</option>
          {BOLUM_SIRASI.map((k) => <option key={k} value={k}>{BOLUMLER[k].ad}</option>)}
        </select>
        {yazabilir && <button className="birincil kucuk" onClick={() => setForm({})}>+ Egzersiz</button>}
        {yazabilir && <button className="ikincil kucuk" onClick={() => setIceAl(true)}>Programlardan içe al</button>}
      </div>
      {liste === null && <p className="aciklama">Yükleniyor…</p>}
      {liste && liste.length === 0 && (
        <div className="bos-durum">
          <p>Kütüphane boş. "Programlardan içe al" ile mevcut programlarındaki egzersizleri tek seferde ekleyebilirsin.</p>
        </div>
      )}
      <ul className="egzersiz-listesi">
        {gorunen.map((e) => (
          <li key={e.id} style={{ '--bc': BOLUM_RENK[e.bolum] || '#6b7785' }}>
            <div className="esnek">
              <strong>{e.ad}</strong>
              <span className="aciklama kucuk-yazi">{BOLUMLER[e.bolum]?.ad || e.bolum}{e.ipucu ? ` · ${e.ipucu}` : ''}</span>
            </div>
            {e.video && <a href={e.video} target="_blank" rel="noreferrer" className="video-bag" aria-label={`${e.ad} videosu`}>▶ Video</a>}
            {yazabilir && <button className="metin" onClick={() => setForm(e)}>Düzenle</button>}
          </li>
        ))}
      </ul>
      {liste && liste.length > 0 && <p className="aciklama kucuk-yazi">{gorunen.length} / {liste.length} egzersiz</p>}
    </div>
  );
}

function Sablonlar({ yazabilir }) {
  const [liste, setListe] = useState(null);
  const yukle = () => sablonlariGetir().then(setListe).catch(() => setListe([]));
  useEffect(() => {
    yukle();
  }, []);
  if (liste === null) return <p className="aciklama">Yükleniyor…</p>;
  if (!liste.length) {
    return (
      <div className="bos-durum">
        <p>Henüz kendi şablonun yok. Bir kişinin ya da grubun Program sekmesinde bloğu açıp "Şablon olarak kaydet" diyebilirsin.</p>
      </div>
    );
  }
  return (
    <ul className="bolum-listesi">
      {liste.map((s) => (
        <li key={s.id} className="bolum-karti">
          <div className="esnek">
            <strong>{s.ad}</strong>
            <span>
              {s.sade ? 'PT haftalık plan' : 'Sporcu bloğu'} · {fazAdi(s)} · {s.haftalar} hafta · {(s.gunler || []).length} gün
            </span>
          </div>
          {yazabilir && (
            <div className="dugme-satiri">
              <button
                className="metin"
                onClick={async () => {
                  const ad = window.prompt('Şablonun yeni adı', s.ad);
                  if (!ad?.trim()) return;
                  await sablonGuncelle(s.id, { ad: ad.trim() });
                  yukle();
                }}
              >
                Yeniden adlandır
              </button>
              <button
                className="metin tehlike"
                onClick={async () => {
                  if (!window.confirm(`"${s.ad}" şablonu silinsin mi? Bu şablondan oluşturulmuş programlar etkilenmez.`)) return;
                  await sablonSil(s.id);
                  yukle();
                }}
              >
                Sil
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Kutuphaneler({ onGeri }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yazabilir = ben.rol === 'yonetici' || (ben.ekYetkiler || []).includes('programDuzenle');
  const [sekme, setSekme] = useState('egzersiz');
  return (
    <div>
      <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>
      <h2>Kütüphaneler</h2>
      <nav className="sekmeler">
        {[['egzersiz', 'Egzersizler'], ['sablon', 'Program şablonları'], ['brans', 'Branş profilleri'], ['sakatlik', 'Sakatlık ve rehabilitasyon']].map(([id, ad]) => (
          <button key={id} className={'sekme' + (sekme === id ? ' secili' : '')} onClick={() => setSekme(id)}>{ad}</button>
        ))}
      </nav>
      {sekme === 'egzersiz' && <Egzersizler yazabilir={yazabilir} yapan={ben.id} />}
      {sekme === 'sablon' && <Sablonlar yazabilir={yazabilir} />}
      {(sekme === 'brans' || sekme === 'sakatlik') && (
        <div className="bos-durum">
          <p>
            {sekme === 'brans'
              ? 'Branş profilleri (kayak, basketbol, karting, futbol, voleybol, tenis) Aşama 4\'te gelecek.'
              : 'Sakatlık ve rehabilitasyon kütüphanesi Aşama 4\'te gelecek.'}
          </p>
        </div>
      )}
    </div>
  );
}
