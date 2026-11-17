// Ölçüm cihazı değişen testler: değişim tarihinden önceki ve sonraki sonuçlar birbiriyle karşılaştırılmaz.
// kurumlar/{id}.cihazDegisimi = { [test]: { tarih, not } }
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { bugun, kisaTarih } from '../program/model';
import { hataMesaji } from '../auth/hesap';
import { TEST_KATEGORILERI } from './tanimlar';
import { normVarMi } from './normlar';

export function useCihazDegisimleri() {
  const [harita, setHarita] = useState(null);
  const yukle = () =>
    getDoc(doc(db, 'kurumlar', KURUM_ID))
      .then((s) => setHarita(s.data()?.cihazDegisimi || {}))
      .catch(() => setHarita({}));
  useEffect(() => {
    yukle();
  }, []);
  return [harita, yukle];
}

// Bir sonucun hangi cihaz dönemine ait olduğu (değişimden önce: 0, sonra: 1)
export const cihazDonemi = (harita, test, tarih) => {
  const d = harita?.[test];
  return d && tarih >= d.tarih ? 1 : 0;
};
// İki tarih arasında cihaz değişti mi
export const cihazDegistiMi = (harita, test, onceTarih, sonraTarih) => {
  const d = harita?.[test];
  return !!(d && onceTarih < d.tarih && sonraTarih >= d.tarih);
};

export function CihazDegisimleri({ yonetici }) {
  const [harita, yukle] = useCihazDegisimleri();
  const [f, setF] = useState({ test: 'CMJ (cm)', tarih: bugun(), not: '' });
  const [hata, setHata] = useState('');
  if (!harita) return <p className="aciklama">Yükleniyor…</p>;

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    try {
      await setDoc(doc(db, 'kurumlar', KURUM_ID), { cihazDegisimi: { [f.test]: { tarih: f.tarih, not: f.not.trim() } } }, { merge: true });
      setF({ ...f, not: '' });
      await yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  }
  async function sil(test) {
    if (!window.confirm(`${test} için cihaz değişikliği kaydı kaldırılsın mı? Eski ve yeni sonuçlar yeniden karşılaştırılır.`)) return;
    try {
      await setDoc(doc(db, 'kurumlar', KURUM_ID), { cihazDegisimi: { [test]: deleteField() } }, { merge: true });
      await yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  }
  const liste = Object.entries(harita).sort((a, b) => a[0].localeCompare(b[0], 'tr'));

  return (
    <div>
      <p className="aciklama">
        Ölçüm aletinin değiştiği testlerde, değişim tarihinden önceki ve sonraki sonuçlar birbiriyle karşılaştırılmaz. Raporda bu testler için
        "önceki teste göre değişim" yerine dünya normuna göre değerlendirme yazılır.
      </p>
      {liste.length === 0 ? (
        <p className="aciklama">Henüz cihaz değişikliği girilmedi.</p>
      ) : (
        <ul className="sade-liste cihaz-liste">
          {liste.map(([test, d]) => (
            <li key={test}>
              <strong>{test}</strong> · {kisaTarih(d.tarih)} tarihinden itibaren yeni cihaz{d.not ? ` (${d.not})` : ''}
              {!normVarMi(test) && <small className="aciklama"> · bu test için dünya normu yok</small>}
              {yonetici && <button className="metin" onClick={() => sil(test)}>Kaldır</button>}
            </li>
          ))}
        </ul>
      )}
      {yonetici && (
        <form className="kart-form ic-form" onSubmit={kaydet}>
          <strong>Cihaz değişikliği ekle</strong>
          <div className="form-izgara">
            <label className="alan">
              <span>Test</span>
              <select value={f.test} onChange={(e) => setF({ ...f, test: e.target.value })}>
                {TEST_KATEGORILERI.map(([kat, l]) => (
                  <optgroup key={kat} label={kat}>
                    {l.map(([ad]) => <option key={ad} value={ad}>{ad}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="alan">
              <span>Yeni cihazla ilk ölçüm tarihi</span>
              <input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} />
            </label>
            <label className="alan">
              <span>Not (isteğe bağlı)</span>
              <input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} placeholder="Örn. ZıpZıp → Performanz" />
            </label>
          </div>
          {hata && <p className="hata">{hata}</p>}
          <div className="dugme-satiri">
            <button className="birincil kucuk" disabled={!f.tarih}>Kaydet</button>
          </div>
        </form>
      )}
    </div>
  );
}
