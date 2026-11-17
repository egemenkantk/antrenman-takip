// Cimnastik beceri takibi. Yalnızca ekip görür (kisiler/{id}/ozel/beceriler; öğrenci/veli okuyamaz).
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { bugun, kisaTarih } from '../program/model';
import { BECERI_GRUPLARI, DURUMLAR, beceriAnahtar, sonrakiDurum } from './model';

const DURUM_ADI = Object.fromEntries(DURUMLAR);
const ref = (kisiId) => doc(db, 'kisiler', kisiId, 'ozel', 'beceriler');

async function beceriGetir(kisiId) {
  const s = await getDoc(ref(kisiId));
  return s.exists() ? s.data() : { durum: {}, ekler: [] };
}

function durumYaz(kisiId, anahtar, d, yapan) {
  return setDoc(
    ref(kisiId),
    { durum: { [anahtar]: d ? { d, t: bugun(), y: yapan } : null }, guncelleme: serverTimestamp() },
    { merge: true }
  );
}

function DurumDugmesi({ deger, onClick, etiket }) {
  const d = deger?.d || '';
  return (
    <button
      type="button"
      className={'beceri-durum ' + (d || 'yok')}
      onClick={onClick}
      title={`${etiket}: ${DURUM_ADI[d]}${deger?.t ? ` · ${kisaTarih(deger.t)}` : ''} (değiştirmek için dokun)`}
      aria-label={`${etiket}: ${DURUM_ADI[d]}`}
    >
      {d === 'yapabiliyor' ? '✓' : d === 'calisiyor' ? '…' : ''}
    </button>
  );
}

function Lejant() {
  return (
    <p className="aciklama kucuk-yazi beceri-lejant">
      <span className="beceri-durum yok" />{' '} başlanmadı · <span className="beceri-durum calisiyor">…</span> çalışıyor ·{' '}
      <span className="beceri-durum yapabiliyor">✓</span> yapabiliyor — dokundukça sırayla değişir. Veliler görmez.
    </p>
  );
}

export function KisiBecerileri({ kisiId, yapan }) {
  const [v, setV] = useState(null);
  const [hata, setHata] = useState('');
  const [yeni, setYeni] = useState('');
  useEffect(() => {
    beceriGetir(kisiId).then(setV).catch(() => setHata('Beceriler yüklenemedi.'));
  }, [kisiId]);
  if (!v) return hata ? <p className="hata">{hata}</p> : <p className="aciklama">Yükleniyor…</p>;

  async function degistir(ad) {
    const a = beceriAnahtar(ad);
    const d = sonrakiDurum(v.durum?.[a]?.d || '');
    const onceki = v;
    setV({ ...v, durum: { ...v.durum, [a]: d ? { d, t: bugun(), y: yapan } : null } });
    try {
      await durumYaz(kisiId, a, d, yapan);
    } catch {
      setV(onceki);
      setHata('Kaydedilemedi.');
    }
  }
  async function ekle(e) {
    e.preventDefault();
    const ad = yeni.trim();
    if (!ad) return;
    const ekler = [...new Set([...(v.ekler || []), ad])];
    try {
      await setDoc(ref(kisiId), { ekler }, { merge: true });
      setV({ ...v, ekler });
      setYeni('');
    } catch {
      setHata('Eklenemedi.');
    }
  }

  const gruplar = [...BECERI_GRUPLARI, ...(v.ekler?.length ? [['Eklenen beceriler', v.ekler]] : [])];
  const tumu = gruplar.flatMap(([, l]) => l);
  const yapilan = tumu.filter((ad) => v.durum?.[beceriAnahtar(ad)]?.d === 'yapabiliyor').length;
  return (
    <div>
      {hata && <p className="hata">{hata}</p>}
      <p className="aciklama"><strong>{yapilan}</strong> / {tumu.length} beceri yapabiliyor</p>
      <Lejant />
      <div className="beceri-izgara">
        {gruplar.map(([baslik, l]) => (
          <section key={baslik} className="kart-form beceri-grup">
            <h4>{baslik}</h4>
            <ul className="beceri-liste">
              {l.map((ad) => {
                const deger = v.durum?.[beceriAnahtar(ad)];
                return (
                  <li key={ad}>
                    <DurumDugmesi deger={deger} etiket={ad} onClick={() => degistir(ad)} />
                    <span>{ad}</span>
                    {deger?.t && <small className="aciklama">{kisaTarih(deger.t)}</small>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <form className="satir-form" onSubmit={ekle}>
        <input value={yeni} onChange={(e) => setYeni(e.target.value)} placeholder="Listede olmayan beceri ekle" aria-label="Yeni beceri" />
        <button className="ikincil kucuk" disabled={!yeni.trim()}>Ekle</button>
      </form>
    </div>
  );
}

export function GrupBecerileri({ uyeler, yapan }) {
  const [veri, setVeri] = useState(null);
  const [kategori, setKategori] = useState(0);
  const [hata, setHata] = useState('');
  useEffect(() => {
    Promise.all(uyeler.map((k) => beceriGetir(k.id).then((d) => [k.id, d]).catch(() => [k.id, { durum: {} }]))).then((l) =>
      setVeri(Object.fromEntries(l))
    );
  }, [uyeler.map((k) => k.id).join()]);
  if (!uyeler.length) return <p className="aciklama">Grupta üye yok.</p>;
  if (!veri) return <p className="aciklama">Yükleniyor…</p>;

  const [, beceriler] = BECERI_GRUPLARI[kategori];
  async function degistir(kisiId, ad) {
    const a = beceriAnahtar(ad);
    const d = sonrakiDurum(veri[kisiId]?.durum?.[a]?.d || '');
    const onceki = veri;
    setVeri({ ...veri, [kisiId]: { ...veri[kisiId], durum: { ...veri[kisiId]?.durum, [a]: d ? { d, t: bugun(), y: yapan } : null } } });
    try {
      await durumYaz(kisiId, a, d, yapan);
    } catch {
      setVeri(onceki);
      setHata('Kaydedilemedi.');
    }
  }

  return (
    <div>
      {hata && <p className="hata">{hata}</p>}
      <div className="cip-grubu" role="group" aria-label="Beceri grubu">
        {BECERI_GRUPLARI.map(([ad], i) => (
          <button key={ad} type="button" className={'cip' + (i === kategori ? ' secili' : '')} aria-pressed={i === kategori} onClick={() => setKategori(i)}>
            {ad}
          </button>
        ))}
      </div>
      <Lejant />
      <div className="tablo-kap">
        <table className="beceri-tablo">
          <thead>
            <tr>
              <th>Sporcu</th>
              {beceriler.map((b) => <th key={b}><span>{b}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {uyeler.map((k) => (
              <tr key={k.id}>
                <th scope="row">{k.ad}</th>
                {beceriler.map((b) => (
                  <td key={b}>
                    <DurumDugmesi deger={veri[k.id]?.durum?.[beceriAnahtar(b)]} etiket={`${k.ad} · ${b}`} onClick={() => degistir(k.id, b)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Yapabilen</th>
              {beceriler.map((b) => (
                <td key={b}>{uyeler.filter((k) => veri[k.id]?.durum?.[beceriAnahtar(b)]?.d === 'yapabiliyor').length}/{uyeler.length}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="aciklama kucuk-yazi">Kişiye özel eklenen beceriler sporcunun kendi kartındaki Beceriler sekmesinde.</p>
    </div>
  );
}
