import { useState } from 'react';
import { MARKA } from '../config/marka';
import { useOturum } from '../auth/OturumContext';
import { sifremiDegistir, epostaGuncelle, hataMesaji, cikis } from '../auth/hesap';

// İlk girişte (veya geçici şifreyle girişte) kendi şifresini belirleme.
// E-postası yoksa isteğe bağlı ekleyebilir: şifresini unutursa kendisi sıfırlar.
export default function SifreBelirle() {
  const { durum, yenile } = useOturum();
  const k = durum.kullanici;
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (sifre.length < 6) return setHata('Şifre en az 6 karakter olmalı.');
    if (sifre !== tekrar) return setHata('Şifreler aynı değil.');
    setBekliyor(true);
    try {
      if (!k.eposta && eposta.trim()) await epostaGuncelle(eposta.trim());
      await sifremiDegistir(sifre);
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
          <img className="logo-buyuk" src={MARKA.logo} alt={MARKA.ad} />
          <h1>Hoş geldin{k?.ad ? ', ' + k.ad.split(' ')[0] : ''}</h1>
          <p>Kendi şifreni belirle. Bundan sonra telefon numaran ve bu şifreyle gireceksin.</p>
        </header>
        <form onSubmit={kaydet}>
          <label className="alan">
            <span>Yeni şifre (en az 6 karakter)</span>
            <input type="password" autoComplete="new-password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
          </label>
          <label className="alan">
            <span>Yeni şifre tekrar</span>
            <input type="password" autoComplete="new-password" value={tekrar} onChange={(e) => setTekrar(e.target.value)} />
          </label>
          {!k?.eposta && (
            <label className="alan">
              <span>E-posta (isteğe bağlı)</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="ornek@gmail.com"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
              />
              <small className="ipucu">Eklersen şifreni unuttuğunda kendin yenileyebilirsin.</small>
            </label>
          )}
          {hata && <p className="hata">{hata}</p>}
          <button className="birincil" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
          </button>
          <div className="baglantilar">
            <button type="button" className="metin" onClick={cikis}>
              Çıkış
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
