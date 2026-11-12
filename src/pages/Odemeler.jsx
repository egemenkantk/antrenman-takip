import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji, donemKontrolCalistir } from '../auth/hesap';
import { subeleriGetir, kullanicilariGetir, kisileriGetir, tarihGoster } from '../veri';
import { bugun, kisaTarih } from '../program/model';
import { odemeDurumu, dersleriDagit, tl, TUR_ADI, TUR_KISA, KITLE_ADI, YONTEM_ADI, YONTEMLER, dersSayili } from '../paket/model.js';
import { paketTanimlariGetir, paketTanimKaydet, tumPaketVerisi, cokluKisiVerisi, bireyselKayitlar } from '../paket/veri';
import { DurumRozeti, kocAdi } from '../paket/bilesenler';

// ---------- Paket tanımları (yalnızca yönetici) ----------
function TanimFormu({ ilk, subeler, onKaydet, onVazgec }) {
  const [f, setF] = useState({
    ad: ilk?.ad || '',
    subeId: ilk?.subeId || subeler[0]?.id || '',
    tur: ilk?.tur || 'bireysel',
    kitle: ilk?.kitle || 'sporcu',
    dersSayisi: ilk?.dersSayisi || 8,
    fiyat: ilk?.fiyat ?? '',
  });
  const [hata, setHata] = useState('');
  return (
    <form
      className="kart-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.ad.trim()) return setHata('Paket adı gerekli.');
        if (!(Number(f.fiyat) >= 0) || f.fiyat === '') return setHata('Fiyat girilmeli.');
        if (dersSayili(f.tur) && !(Number(f.dersSayisi) > 0)) return setHata('Ders sayısı girilmeli.');
        setHata('');
        try {
          await onKaydet({
            ad: f.ad.trim(),
            subeId: f.subeId,
            tur: f.tur,
            kitle: f.kitle,
            dersSayisi: dersSayili(f.tur) ? Number(f.dersSayisi) : null,
            fiyat: Number(f.fiyat),
          });
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <h3>{ilk ? 'Paketi düzenle' : 'Yeni paket'}</h3>
      <div className="form-izgara">
        <label className="alan">
          <span>Paket adı</span>
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder="Örn. Bireysel 8 ders – sporcu" />
        </label>
        <label className="alan">
          <span>Şube</span>
          <select value={f.subeId} onChange={(e) => setF({ ...f, subeId: e.target.value })}>
            {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Tür</span>
          <select value={f.tur} onChange={(e) => setF({ ...f, tur: e.target.value })} disabled={!!ilk}>
            {Object.entries(TUR_ADI).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Kitle</span>
          <select value={f.kitle} onChange={(e) => setF({ ...f, kitle: e.target.value })}>
            {Object.entries(KITLE_ADI).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
          </select>
        </label>
        {dersSayili(f.tur) && (
          <label className="alan">
            <span>Ders sayısı</span>
            <input type="number" min="1" value={f.dersSayisi} onChange={(e) => setF({ ...f, dersSayisi: e.target.value })} />
          </label>
        )}
        <label className="alan">
          <span>{f.tur === 'grup' ? '4 haftalık dönem ücreti (₺)' : f.tur === 'bireysel' ? 'Paket fiyatı (₺)' : 'Kişi başı paket fiyatı (₺)'}</span>
          <input type="number" min="0" value={f.fiyat} onChange={(e) => setF({ ...f, fiyat: e.target.value })} />
        </label>
      </div>
      {ilk && <p className="aciklama kucuk-yazi">Fiyat değişikliği yalnızca bundan sonraki satışlara ve dönemlere uygulanır; eski kayıtlar değişmez.</p>}
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Kaydet</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

function Tanimlar({ subeler, yapan }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const yukle = () => paketTanimlariGetir().then(setListe).catch((e) => { setHata(hataMesaji(e)); setListe([]); });
  useEffect(() => {
    yukle();
  }, []);
  if (form) {
    return (
      <TanimFormu
        ilk={form.id ? form : null}
        subeler={subeler}
        onVazgec={() => setForm(null)}
        onKaydet={async (v) => { await paketTanimKaydet(form.id ? form : null, v, yapan); setForm(null); await yukle(); }}
      />
    );
  }
  return (
    <div>
      <div className="filtreler">
        <button className="birincil kucuk" onClick={() => setForm({})}>+ Paket</button>
        <button
          className="ikincil kucuk"
          title="Her sabah 08:00'de kendiliğinden çalışır"
          onClick={async () => {
            setHata('');
            setBilgi('Kontrol ediliyor…');
            try {
              const r = await donemKontrolCalistir();
              setBilgi(`Dönem kontrolü tamam: ${r.acilan} yeni dönem kaydı açıldı${r.hatirlatma ? `, ${r.hatirlatma} hatırlatma gönderildi` : ''}.`);
            } catch (e) {
              setBilgi('');
              setHata(hataMesaji(e));
            }
          }}
        >
          Grup dönemlerini şimdi kontrol et
        </button>
      </div>
      {hata && <p className="hata">{hata}</p>}
      {bilgi && <p className="aciklama">{bilgi}</p>}
      {liste === null && <p className="aciklama">Yükleniyor…</p>}
      {liste && liste.length === 0 && (
        <div className="bos-durum"><p>Henüz paket yok. Bireysel/PT, düet ve trio paketleri ders sayılıdır (kişi başı) ve süresi yoktur; grup paketi 4 haftalık dönem ücretidir ve gruba bağlanır.</p></div>
      )}
      {subeler.map((s) => {
        const grup = (liste || []).filter((t) => (t.subeId || '') === s.id);
        if (!grup.length) return null;
        return (
          <section key={s.id}>
            <h3>{s.ad}</h3>
            <div className="tablo-kap">
              <table className="tablo">
                <thead><tr><th>Paket</th><th>Tür</th><th>Kitle</th><th>Ders</th><th>Fiyat</th><th></th></tr></thead>
                <tbody>
                  {grup.map((t) => (
                    <tr key={t.id} className={t.aktif === false ? 'soluk' : ''}>
                      <th>{t.ad}{t.aktif === false ? ' (satıştan kalktı)' : ''}</th>
                      <td>{TUR_KISA[t.tur]}</td>
                      <td>{KITLE_ADI[t.kitle]}</td>
                      <td>{t.tur === 'grup' ? '4 hafta' : t.dersSayisi}</td>
                      <td>{tl(t.fiyat)}</td>
                      <td>
                        <button className="metin" onClick={() => setForm(t)}>Düzenle</button>
                        <button
                          className="metin"
                          onClick={async () => { await paketTanimKaydet(t, { aktif: t.aktif === false }, yapan); await yukle(); }}
                        >
                          {t.aktif === false ? 'Satışa al' : 'Satıştan kaldır'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------- Açık alacaklar ve azalan paketler ----------
function Alacaklar({ veri, kisiler }) {
  const [tur, setTur] = useState('');
  const kisiAdi = (id) => kisiler.find((k) => k.id === id)?.ad || 'Kişi';
  const satirlar = veri.paketler
    .filter((p) => p.durum !== 'iptal' && (!tur || p.tur === tur))
    .map((p) => ({ p, od: odemeDurumu(p, veri.odemeler) }))
    .filter((x) => x.od.kalan > 0 && (x.p.tur !== 'grup' || x.p.donemBas <= bugun()))
    .sort((a, b) => (a.p.baslangic || '').localeCompare(b.p.baslangic || ''));
  const toplam = satirlar.reduce((t, x) => t + x.od.kalan, 0);
  return (
    <div>
      <div className="filtreler">
        <select value={tur} onChange={(e) => setTur(e.target.value)} aria-label="Tür">
          <option value="">Grup ve bireysel</option>
          <option value="grup">Grup dönemleri</option>
          <option value="bireysel">Bireysel / PT</option>
          <option value="duet">Düet</option>
          <option value="trio">Trio</option>
          <option value="ek">Ek ücretler</option>
        </select>
        <span className="aciklama">Toplam bekleyen <strong>{tl(toplam)}</strong> · {satirlar.length} kayıt</span>
      </div>
      {satirlar.length === 0 ? (
        <div className="bos-durum"><p>Bekleyen ödeme yok.</p></div>
      ) : (
        <div className="tablo-kap">
          <table className="tablo">
            <thead><tr><th>Kişi</th><th>Paket / dönem</th><th>Fiyat</th><th>Ödenen</th><th>Kalan</th><th></th></tr></thead>
            <tbody>
              {satirlar.map(({ p, od }) => (
                <tr key={p.id}>
                  <th>{kisiAdi(p.kisiId)}</th>
                  <td>{p.tur === 'grup' ? `${p.grupAdi || p.paketAdi} · ${kisaTarih(p.donemBas)}–${kisaTarih(p.donemBit)}` : p.tur === 'ek' ? `${p.paketAdi} · ${kisaTarih(p.baslangic)}` : `${TUR_KISA[p.tur]} · ${p.paketAdi}`}</td>
                  <td>{tl(p.uygulananFiyat)}</td>
                  <td>{tl(od.odenen)}</td>
                  <td><strong>{tl(od.kalan)}</strong></td>
                  <td><DurumRozeti durum={od.durum} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="aciklama kucuk-yazi">Ödeme almak için kişinin kartındaki "Paket ve ödeme" sekmesini ya da grubun "Ödemeler" sekmesini kullan.</p>
    </div>
  );
}

function AzalanPaketler({ veri, kisiler }) {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    const ids = [...new Set(veri.paketler.filter((p) => dersSayili(p.tur) && p.durum !== 'iptal').map((p) => p.kisiId))];
    Promise.all(
      ids.map(async (id) => {
        const kayitlar = await bireyselKayitlar(id).catch(() => []);
        const d = dersleriDagit(veri.paketler.filter((p) => p.kisiId === id), kayitlar);
        const aktif = veri.paketler.filter((p) => p.kisiId === id && dersSayili(p.tur) && p.durum !== 'iptal');
        const kalan = aktif.reduce((t, p) => t + (d.paketler[p.id]?.kalan || 0), 0);
        return { id, kalan, paketsiz: d.paketsizDersler.length };
      })
    ).then((r) => setListe(r.filter((x) => x.kalan <= 2).sort((a, b) => a.kalan - b.kalan)));
  }, [veri]);
  if (liste === null) return <p className="aciklama">Hesaplanıyor…</p>;
  if (!liste.length) return <div className="bos-durum"><p>Bitmek üzere olan bireysel paket yok.</p></div>;
  return (
    <ul className="sade-liste">
      {liste.map((x) => (
        <li key={x.id}>
          <strong>{kisiler.find((k) => k.id === x.id)?.ad || 'Kişi'}</strong> —{' '}
          {x.kalan === 0 ? 'paket bitti' : `${x.kalan} ders kaldı`}
          {x.paketsiz ? ` · ${x.paketsiz} ders pakete düşmedi` : ''}
        </li>
      ))}
    </ul>
  );
}

// ---------- Tahsilatlar ----------
function ayBasi() {
  const t = bugun();
  return t.slice(0, 8) + '01';
}
function Tahsilatlar({ veri, kisiler, koclar, benim, yonetici }) {
  const [bas, setBas] = useState(ayBasi());
  const [bit, setBit] = useState(bugun());
  const [koc, setKoc] = useState('');
  const [yontem, setYontem] = useState('');
  const liste = veri.odemeler
    .filter((o) => !o.silindi && o.tarih >= bas && o.tarih <= bit && (!koc || o.tahsilEdenKocId === koc) && (!yontem || o.yontem === yontem))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  const toplam = liste.reduce((t, o) => t + (Number(o.tutar) || 0), 0);
  const kocToplam = {};
  liste.forEach((o) => { kocToplam[o.tahsilEdenKocId] = (kocToplam[o.tahsilEdenKocId] || 0) + (Number(o.tutar) || 0); });
  const paket = (id) => veri.paketler.find((p) => p.id === id);
  const tahsilEdenler = [...new Set(veri.odemeler.map((o) => o.tahsilEdenKocId))];
  return (
    <div>
      <div className="filtreler">
        <label className="alan satir-ici"><span>Başlangıç</span><input type="date" value={bas} onChange={(e) => setBas(e.target.value)} /></label>
        <label className="alan satir-ici"><span>Bitiş</span><input type="date" value={bit} onChange={(e) => setBit(e.target.value)} /></label>
        {yonetici && (
          <select value={koc} onChange={(e) => setKoc(e.target.value)} aria-label="Tahsil eden">
            <option value="">Tüm koçlar</option>
            {tahsilEdenler.map((id) => <option key={id} value={id}>{kocAdi(id, benim, koclar)}</option>)}
          </select>
        )}
        <select value={yontem} onChange={(e) => setYontem(e.target.value)} aria-label="Yöntem">
          <option value="">Tüm yöntemler</option>
          {YONTEMLER.map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
        </select>
      </div>
      <p>
        Toplam <strong>{tl(toplam)}</strong> · {liste.length} ödeme
        {yonetici && Object.keys(kocToplam).length > 1 && (
          <span className="aciklama"> · {Object.entries(kocToplam).map(([id, t]) => `${kocAdi(id, benim, koclar)}: ${tl(t)}`).join(' · ')}</span>
        )}
      </p>
      {liste.length > 0 && (
        <div className="tablo-kap">
          <table className="tablo">
            <thead><tr><th>Tarih</th><th>Kişi</th><th>Paket</th><th>Tutar</th><th>Yöntem</th><th>Alan</th></tr></thead>
            <tbody>
              {liste.map((o) => {
                const p = paket(o.satilanPaketId);
                return (
                  <tr key={o.id}>
                    <td>{tarihGoster(o.tarih)}</td>
                    <th>{kisiler.find((k) => k.id === o.kisiId)?.ad || 'Kişi'}</th>
                    <td>{p ? (p.tur === 'grup' ? `${p.grupAdi || p.paketAdi} · ${kisaTarih(p.donemBas)}` : p.paketAdi) : ''}</td>
                    <td>{tl(o.tutar)}</td>
                    <td>{YONTEM_ADI[o.yontem] || o.yontem}</td>
                    <td>{kocAdi(o.tahsilEdenKocId, benim, koclar)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Odemeler({ onGeri }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yonetici = ben.rol === 'yonetici';
  const [sekme, setSekme] = useState('alacak');
  const [veri, setVeri] = useState(null);
  const [kisiler, setKisiler] = useState([]);
  const [subeler, setSubeler] = useState([]);
  const [koclar, setKoclar] = useState([]);
  const [hata, setHata] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [k, s, u] = await Promise.all([
          kisileriGetir(ben),
          subeleriGetir(),
          yonetici ? kullanicilariGetir() : Promise.resolve([]),
        ]);
        setKisiler(k);
        setSubeler(s);
        setKoclar(u.filter((x) => x.rol === 'koc' || x.rol === 'yonetici'));
        setVeri(yonetici ? await tumPaketVerisi() : await cokluKisiVerisi(k.map((x) => x.id)));
      } catch (e) {
        setHata(hataMesaji(e));
        setVeri({ paketler: [], odemeler: [] });
      }
    })();
  }, [sekme === 'tanim']);

  const sekmeler = useMemo(
    () => [
      ['alacak', 'Bekleyen ödemeler'],
      ['azalan', 'Azalan paketler'],
      ['tahsilat', 'Tahsilatlar'],
      ...(yonetici ? [['tanim', 'Paket tanımları']] : []),
    ],
    [yonetici]
  );

  return (
    <div>
      <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>
      <h2>{yonetici ? 'Paketler ve ödemeler' : 'Ödemeler'}</h2>
      <p className="aciklama">
        {yonetici
          ? 'Ödemeler sitede alınmaz, yalnızca kaydedilir. Koçlar kendi öğrencilerinin ödemelerini görür ve kaydeder; kişiye özel fiyatı ve silmeyi yalnızca sen yaparsın.'
          : 'Kendi öğrencilerinin paketleri ve ödemeleri. Ödeme almak için kişinin kartını ya da grubun Ödemeler sekmesini kullan.'}
      </p>
      <nav className="sekmeler">
        {sekmeler.map(([id, ad]) => (
          <button key={id} className={'sekme' + (sekme === id ? ' secili' : '')} onClick={() => setSekme(id)}>{ad}</button>
        ))}
      </nav>
      {hata && <p className="hata">{hata}</p>}
      {sekme === 'tanim' && yonetici && <Tanimlar subeler={subeler} yapan={ben.id} />}
      {sekme !== 'tanim' && !veri && <p className="aciklama">Yükleniyor…</p>}
      {sekme === 'alacak' && veri && <Alacaklar veri={veri} kisiler={kisiler} />}
      {sekme === 'azalan' && veri && <AzalanPaketler veri={veri} kisiler={kisiler} />}
      {sekme === 'tahsilat' && veri && <Tahsilatlar veri={veri} kisiler={kisiler} koclar={koclar} benim={ben.id} yonetici={yonetici} />}
    </div>
  );
}
