import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { fazAdi } from '../program/model';
import { tumProgramlar } from '../bugun/veri';
import { BransKutuphanesi, SakatlikKutuphanesi } from '../saglik/Kutuphane';
import {
  egzersizleriGetir,
  egzersizKaydet,
  egzersizSil,
  egzersizleriTopluEkle,
  egzersizleriTopluSil,
  KALIPLAR,
  KALIP_ADI,
  satirdanAd,
  normal,
  sablonlariGetir,
  sablonGuncelle,
  sablonSil,
} from '../kutuphane/veri';

const videoGecerli = (u) => !u || /^https?:\/\/\S+$/i.test(u.trim());

function EgzersizFormu({ ilk, onKaydet, onSil, onVazgec }) {
  const [f, setF] = useState({ ad: ilk?.ad || '', kalip: ilk?.kalip || '', video: ilk?.video || '', ipucu: ilk?.ipucu || '', dikkat: ilk?.dikkat || '' });
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
          <span>Hareket kalıbı (isteğe bağlı)</span>
          <select value={f.kalip} onChange={(e) => setF({ ...f, kalip: e.target.value })}>
            <option value="">Seçilmedi</option>
            {KALIPLAR.map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
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
          const parcalar = p.sade ? [g.icerik?.liste] : Object.values(g.icerik || {});
          for (const metin of parcalar) {
            for (const satir of String(metin || '').split('\n')) {
              const ad = satirdanAd(satir);
              const n = normal(ad);
              if (!ad || ad.length < 3 || var_.has(n)) continue;
              const k = bulunan.get(n) || { ad, sayi: 0 };
              k.sayi++;
              bulunan.set(n, k);
            }
          }
        }
      }
      const l = [...bulunan.values()]
        .map((k) => ({ ad: k.ad, kalip: '', sayi: k.sayi }))
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
              <thead><tr><th></th><th>Egzersiz</th><th>Hareket kalıbı</th><th>Geçtiği yer</th></tr></thead>
              <tbody>
                {oneriler.map((k, i) => (
                  <tr key={k.ad}>
                    <td><input type="checkbox" checked={!!secili[k.ad]} onChange={(e) => setSecili({ ...secili, [k.ad]: e.target.checked })} aria-label={k.ad} /></td>
                    <td>
                      <input className="tablo-girdi" value={k.ad} onChange={(e) => setOneriler(oneriler.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))} />
                    </td>
                    <td>
                      <select value={k.kalip} onChange={(e) => setOneriler(oneriler.map((x, j) => (j === i ? { ...x, kalip: e.target.value } : x)))}>
                        <option value="">—</option>
                        {KALIPLAR.map(([b, ad]) => <option key={b} value={b}>{ad}</option>)}
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
                  await egzersizleriTopluEkle(secilenler.map((k) => ({ ad: k.ad.trim(), kalip: k.kalip, video: '', ipucu: '', dikkat: '' })), yapan);
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
  const [kalip, setKalip] = useState('');
  const [form, setForm] = useState(null);
  const [iceAl, setIceAl] = useState(false);
  const [secim, setSecim] = useState(null); // null: seçim kapalı, Set: seçili id'ler
  const [hata, setHata] = useState('');
  const yukle = () => egzersizleriGetir(true).then(setListe).catch(() => setListe([]));
  useEffect(() => {
    yukle();
  }, []);

  const gorunen = useMemo(
    () =>
      (liste || []).filter(
        (e) => (!kalip || (kalip === '-' ? !e.kalip : e.kalip === kalip)) && (!ara.trim() || normal(e.ad).includes(normal(ara)))
      ),
    [liste, ara, kalip]
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

  const sec = (id) => setSecim((s) => {
    const y = new Set(s);
    y.has(id) ? y.delete(id) : y.add(id);
    return y;
  });

  return (
    <div>
      <div className="filtreler">
        <input type="search" placeholder="Egzersiz ara" value={ara} onChange={(e) => setAra(e.target.value)} aria-label="Egzersiz ara" />
        <select value={kalip} onChange={(e) => setKalip(e.target.value)} aria-label="Hareket kalıbı">
          <option value="">Tüm hareketler</option>
          {KALIPLAR.map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
          <option value="-">Kalıbı seçilmemiş</option>
        </select>
        {yazabilir && !secim && <button className="birincil kucuk" onClick={() => setForm({})}>+ Egzersiz</button>}
        {yazabilir && !secim && <button className="ikincil kucuk" onClick={() => setIceAl(true)}>Programlardan içe al</button>}
        {yazabilir && !secim && liste?.length > 0 && <button className="ikincil kucuk" onClick={() => setSecim(new Set())}>Seç ve sil</button>}
      </div>
      {secim && (
        <div className="secim-cubugu-satir">
          <span>{secim.size} seçili</span>
          <button className="metin" onClick={() => setSecim(new Set(gorunen.map((e) => e.id)))}>Görünenlerin hepsini seç</button>
          <button className="metin" onClick={() => setSecim(new Set())}>Seçimi temizle</button>
          <button
            className="birincil kucuk tehlike-dolu"
            disabled={!secim.size}
            onClick={async () => {
              if (!window.confirm(`${secim.size} egzersiz kütüphaneden silinsin mi? Programlardaki satırlar etkilenmez.`)) return;
              setHata('');
              try {
                await egzersizleriTopluSil([...secim]);
                setSecim(null);
                await yukle();
              } catch (e) {
                setHata(hataMesaji(e));
              }
            }}
          >
            Seçilenleri sil
          </button>
          <button className="metin" onClick={() => setSecim(null)}>Vazgeç</button>
        </div>
      )}
      {hata && <p className="hata">{hata}</p>}
      {liste === null && <p className="aciklama">Yükleniyor…</p>}
      {liste && liste.length === 0 && (
        <div className="bos-durum">
          <p>Kütüphane boş. "Programlardan içe al" ile mevcut programlarındaki egzersizleri tek seferde ekleyebilirsin.</p>
        </div>
      )}
      <ul className="egzersiz-listesi">
        {gorunen.map((e) => (
          <li key={e.id}>
            {secim && (
              <input type="checkbox" checked={secim.has(e.id)} onChange={() => sec(e.id)} aria-label={`${e.ad} seç`} />
            )}
            <div className="esnek">
              <strong>{e.ad}</strong>
              <span className="aciklama kucuk-yazi">
                {[KALIP_ADI[e.kalip], e.ipucu].filter(Boolean).join(' · ') || 'Video ve ipucu eklenmemiş'}
              </span>
            </div>
            {e.video && <a href={e.video} target="_blank" rel="noreferrer" className="video-bag" aria-label={`${e.ad} videosu`}>▶ Video</a>}
            {yazabilir && !secim && <button className="metin" onClick={() => setForm(e)}>Düzenle</button>}
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
      {onGeri && <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>}
      <h2>Kütüphaneler</h2>
      <nav className="sekmeler">
        {[['egzersiz', 'Egzersizler'], ['sablon', 'Program şablonları'], ['brans', 'Branş profilleri'], ['sakatlik', 'Sakatlık ve rehabilitasyon']].map(([id, ad]) => (
          <button key={id} className={'sekme' + (sekme === id ? ' secili' : '')} onClick={() => setSekme(id)}>{ad}</button>
        ))}
      </nav>
      {sekme === 'egzersiz' && <Egzersizler yazabilir={yazabilir} yapan={ben.id} />}
      {sekme === 'sablon' && <Sablonlar yazabilir={yazabilir} />}
      {sekme === 'brans' && <BransKutuphanesi yazabilir={ben.rol === 'yonetici'} yapan={ben.id} />}
      {sekme === 'sakatlik' && <SakatlikKutuphanesi yazabilir={ben.rol === 'yonetici'} yapan={ben.id} />}
    </div>
  );
}
