import { useEffect, useState } from 'react';
import { subeleriGetir, subeEkle, subeGuncelle, kullanicilariGetir } from '../veri';
import Aktarim, { ProgramAktarimi, PosturAktarimi } from './Aktarim';
import { hataMesaji } from '../auth/hesap';

const ONERILEN = [
  { ad: 'Sporcu Performans ve Cimnastik Merkezi', adres: '' },
  { ad: 'Pilates Salonu', adres: '' },
];

function SubeSatiri({ sube, onKaydet }) {
  const [duzenle, setDuzenle] = useState(false);
  const [ad, setAd] = useState(sube.ad || '');
  const [adres, setAdres] = useState(sube.adres || '');
  if (!duzenle) {
    return (
      <li className="bolum-karti">
        <div>
          <strong>{sube.ad}</strong>
          <span>{sube.adres || 'Adres girilmemiş'}</span>
        </div>
        <button className="ikincil kucuk" onClick={() => setDuzenle(true)}>Düzenle</button>
      </li>
    );
  }
  return (
    <li className="kart-form">
      <label className="alan">
        <span>Şube adı</span>
        <input value={ad} onChange={(e) => setAd(e.target.value)} />
      </label>
      <label className="alan">
        <span>Adres</span>
        <input value={adres} onChange={(e) => setAdres(e.target.value)} />
      </label>
      <div className="dugme-satiri">
        <button
          className="birincil kucuk"
          onClick={async () => {
            if (!ad.trim()) return;
            await onKaydet(sube.id, { ad: ad.trim(), adres: adres.trim() });
            setDuzenle(false);
          }}
        >
          Kaydet
        </button>
        <button className="metin" onClick={() => setDuzenle(false)}>Vazgeç</button>
      </div>
    </li>
  );
}

export default function Ayarlar({ onGeri }) {
  const [subeler, setSubeler] = useState(null);
  const [yeni, setYeni] = useState({ ad: '', adres: '' });
  const [hata, setHata] = useState('');
  const [koclar, setKoclar] = useState([]);

  useEffect(() => {
    kullanicilariGetir()
      .then((u) => setKoclar(u.filter((k) => (k.rol === 'koc' || k.rol === 'yonetici') && k.aktif !== false)))
      .catch(() => {});
  }, []);

  const yukle = () => subeleriGetir().then(setSubeler).catch((e) => setHata(hataMesaji(e)));
  useEffect(() => {
    yukle();
  }, []);

  async function calistir(is) {
    setHata('');
    try {
      await is();
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  return (
    <div>
      <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>
      <h2>Ayarlar</h2>
      <h3>Şubeler</h3>
      <p className="aciklama">Paketler, gruplar ve dersler bir şubeye bağlanır. Koçlar tüm şubelerde çalışabilir.</p>
      {hata && <p className="hata">{hata}</p>}
      {subeler === null && <p className="aciklama">Yükleniyor…</p>}

      {subeler && subeler.length === 0 && (
        <div className="kart-form">
          <p className="aciklama">Henüz şube yok. Konuştuğumuz iki şubeyi tek tıkla ekleyebilirsin; adlarını sonra düzenleyebilirsin.</p>
          <ul className="sade-liste">
            {ONERILEN.map((s) => <li key={s.ad}>{s.ad}</li>)}
          </ul>
          <button
            className="birincil"
            onClick={() => calistir(async () => { for (const s of ONERILEN) await subeEkle(s); })}
          >
            İki şubeyi ekle
          </button>
        </div>
      )}

      {subeler && subeler.length > 0 && (
        <ul className="bolum-listesi">
          {subeler.map((s) => (
            <SubeSatiri key={s.id} sube={s} onKaydet={(id, v) => calistir(() => subeGuncelle(id, v))} />
          ))}
        </ul>
      )}

      {subeler && subeler.length > 0 && (
        <form
          className="kart-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!yeni.ad.trim()) return setHata('Şube adı gerekli.');
            calistir(async () => {
              await subeEkle({ ad: yeni.ad.trim(), adres: yeni.adres.trim() });
              setYeni({ ad: '', adres: '' });
            });
          }}
        >
          <h3>Yeni şube</h3>
          <div className="form-izgara">
            <label className="alan">
              <span>Şube adı</span>
              <input value={yeni.ad} onChange={(e) => setYeni({ ...yeni, ad: e.target.value })} />
            </label>
            <label className="alan">
              <span>Adres</span>
              <input value={yeni.adres} onChange={(e) => setYeni({ ...yeni, adres: e.target.value })} />
            </label>
          </div>
          <button className="ikincil">Şube ekle</button>
        </form>
      )}

      {subeler && subeler.length > 0 && <Aktarim subeler={subeler} koclar={koclar} />}
      {subeler && subeler.length > 0 && <ProgramAktarimi koclar={koclar} subeler={subeler} />}
      {subeler && subeler.length > 0 && <PosturAktarimi />}
    </div>
  );
}
