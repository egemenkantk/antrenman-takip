import { useState } from 'react';
import { MARKA } from '../config/marka';
import { telefonuDuzenle, girisYap, sifreSifirla, hataMesaji } from '../auth/hesap';

// Ekranlar: giris | unuttum
export default function Giris() {
  const [ekran, setEkran] = useState('giris');
  const [telefonGirdi, setTelefonGirdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [benihatirla, setBenihatirla] = useState(true);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const telefon = telefonuDuzenle(telefonGirdi);

  async function calistir(is) {
    setHata('');
    setBilgi('');
    if (!telefon) {
      setHata('Telefon numarasını 05xx xxx xx xx şeklinde girin.');
      return;
    }
    setBekliyor(true);
    try {
      await is();
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setBekliyor(false);
    }
  }

  function ekranDegistir(e) {
    setEkran(e);
    setHata('');
    setBilgi('');
  }

  const telefonAlani = (
    <label className="alan">
      <span>Telefon numarası</span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="05xx xxx xx xx"
        value={telefonGirdi}
        onChange={(e) => setTelefonGirdi(e.target.value)}
      />
    </label>
  );

  return (
    <main className="giris-sayfa">
      <div className="giris-kart">
        <header className="giris-baslik">
          <img className="logo-buyuk" src={MARKA.logo} alt={MARKA.ad} />
          <p>{MARKA.altBaslik}</p>
        </header>

        {ekran === 'giris' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              calistir(() => girisYap(telefon, sifre, benihatirla));
            }}
          >
            {telefonAlani}
            <label className="alan">
              <span>Şifre</span>
              <input
                type="password"
                autoComplete="current-password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
              />
            </label>
            <label className="onay-kutusu">
              <input type="checkbox" checked={benihatirla} onChange={(e) => setBenihatirla(e.target.checked)} />
              <span>Beni hatırla</span>
            </label>
            {hata && <p className="hata">{hata}</p>}
            <button className="birincil" disabled={bekliyor}>
              {bekliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </button>
            <p className="aciklama kucuk-yazi">
              İlk kez mi giriyorsun? Koçunun sana gönderdiği geçici şifreyle gir; ardından kendi şifreni belirleyeceksin.
            </p>
            <div className="baglantilar">
              <button type="button" className="metin" onClick={() => ekranDegistir('unuttum')}>
                Şifremi unuttum
              </button>
            </div>
          </form>
        )}

        {ekran === 'unuttum' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              calistir(async () => {
                const sonuc = await sifreSifirla(telefon);
                setBilgi(
                  sonuc.durum === 'eposta'
                    ? `Şifre yenileme bağlantısı ${sonuc.adres} adresine gönderildi. Gelen kutunu (ve gereksiz klasörünü) kontrol et.`
                    : 'Bu numaraya kayıtlı bir e-posta yok. Yeni şifre için koçunla iletişime geç.'
                );
              });
            }}
          >
            <p className="aciklama">
              Hesabına e-posta eklediysen şifre yenileme bağlantısı gönderilir. Eklemediysen koçun sana yeni bir geçici şifre verir.
            </p>
            {telefonAlani}
            {hata && <p className="hata">{hata}</p>}
            {bilgi && <p className="bilgi">{bilgi}</p>}
            <button className="birincil" disabled={bekliyor}>
              {bekliyor ? 'Kontrol ediliyor…' : 'Devam'}
            </button>
            <div className="baglantilar">
              <button type="button" className="metin" onClick={() => ekranDegistir('giris')}>
                ← Girişe dön
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
