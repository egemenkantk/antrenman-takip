import { useState } from 'react';
import { MARKA } from '../config/marka';
import { useOturum } from '../auth/OturumContext';
import { sifreBelirle, hataMesaji, cikis } from '../auth/telefonGiris';

export default function SifreBelirle() {
  const { durum, setSifreYenile, yenile } = useOturum();
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const yeniden = durum.asama === 'hazir';

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (sifre.length < 6) return setHata('Şifre en az 6 karakter olmalı.');
    if (sifre !== tekrar) return setHata('Şifreler aynı değil.');
    setBekliyor(true);
    try {
      await sifreBelirle(durum.fbKullanici, durum.fbKullanici.phoneNumber, sifre);
      setSifreYenile(false);
      await yenile();
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <main className="giris-sayfa">
      <div className="giris-kart">
        <header className="giris-baslik">
          <div className="logo-isaret" aria-hidden="true">{MARKA.ad.charAt(0)}</div>
          <h1>{yeniden ? 'Yeni şifre' : `Hoş geldin${durum.kullanici?.ad ? ', ' + durum.kullanici.ad : ''}`}</h1>
          <p>
            {yeniden
              ? 'Yeni şifreni belirle.'
              : 'Bundan sonra telefon numaran ve bu şifreyle gireceksin.'}
          </p>
        </header>
        <form onSubmit={kaydet}>
          <label className="alan">
            <span>Şifre (en az 6 karakter)</span>
            <input type="password" autoComplete="new-password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
          </label>
          <label className="alan">
            <span>Şifre tekrar</span>
            <input type="password" autoComplete="new-password" value={tekrar} onChange={(e) => setTekrar(e.target.value)} />
          </label>
          {hata && <p className="hata">{hata}</p>}
          <button className="birincil" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
          </button>
          <div className="baglantilar">
            <button type="button" className="metin" onClick={() => { setSifreYenile(false); cikis(); }}>
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
