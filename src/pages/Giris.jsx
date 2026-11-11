import { useState } from 'react';
import { MARKA } from '../config/marka';
import { useOturum } from '../auth/OturumContext';
import {
  telefonuDuzenle,
  sifreyleGiris,
  smsGonder,
  smsDogrula,
  hataMesaji,
} from '../auth/telefonGiris';

// Ekranlar: sifre (normal giriş) | smsTelefon | smsKod
// smsAmac: 'ilk' (ilk giriş) | 'unuttum'
export default function Giris() {
  const { setSifreYenile } = useOturum();
  const [ekran, setEkran] = useState('sifre');
  const [smsAmac, setSmsAmac] = useState('ilk');
  const [telefonGirdi, setTelefonGirdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [kod, setKod] = useState('');
  const [benihatirla, setBenihatirla] = useState(true);
  const [onay, setOnay] = useState(null);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const telefon = telefonuDuzenle(telefonGirdi);

  async function calistir(is) {
    setHata('');
    setBekliyor(true);
    try {
      await is();
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setBekliyor(false);
    }
  }

  function smsAkisinaGec(amac) {
    setSmsAmac(amac);
    setEkran('smsTelefon');
    setHata('');
    setKod('');
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

  const hatirla = (
    <label className="onay-kutusu">
      <input type="checkbox" checked={benihatirla} onChange={(e) => setBenihatirla(e.target.checked)} />
      <span>Beni hatırla</span>
    </label>
  );

  return (
    <main className="giris-sayfa">
      <div className="giris-kart">
        <header className="giris-baslik">
          <div className="logo-isaret" aria-hidden="true">{MARKA.ad.charAt(0)}</div>
          <h1>{MARKA.ad}</h1>
          <p>{MARKA.altBaslik}</p>
        </header>

        {ekran === 'sifre' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!telefon) return setHata('Telefon numarasını 05xx xxx xx xx şeklinde girin.');
              calistir(() => sifreyleGiris(telefon, sifre, benihatirla));
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
            {hatirla}
            {hata && <p className="hata">{hata}</p>}
            <button className="birincil" disabled={bekliyor}>
              {bekliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </button>
            <div className="baglantilar">
              <button type="button" className="metin" onClick={() => smsAkisinaGec('ilk')}>
                İlk kez mi giriyorsunuz?
              </button>
              <button type="button" className="metin" onClick={() => smsAkisinaGec('unuttum')}>
                Şifremi unuttum
              </button>
            </div>
          </form>
        )}

        {ekran === 'smsTelefon' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!telefon) return setHata('Telefon numarasını 05xx xxx xx xx şeklinde girin.');
              calistir(async () => {
                setOnay(await smsGonder(telefon, 'sms-buton', benihatirla));
                setEkran('smsKod');
              });
            }}
          >
            <p className="aciklama">
              {smsAmac === 'ilk'
                ? 'Numaranıza bir doğrulama kodu göndereceğiz. Ardından kendi şifrenizi belirleyeceksiniz.'
                : 'Numaranıza bir doğrulama kodu göndereceğiz. Ardından yeni şifrenizi belirleyeceksiniz.'}
            </p>
            {telefonAlani}
            {hatirla}
            {hata && <p className="hata">{hata}</p>}
            <button id="sms-buton" className="birincil" disabled={bekliyor}>
              {bekliyor ? 'Gönderiliyor…' : 'Kod gönder'}
            </button>
            <div className="baglantilar">
              <button type="button" className="metin" onClick={() => { setEkran('sifre'); setHata(''); }}>
                ← Şifreyle girişe dön
              </button>
            </div>
          </form>
        )}

        {ekran === 'smsKod' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              calistir(async () => {
                if (smsAmac === 'unuttum') setSifreYenile(true);
                try {
                  await smsDogrula(onay, kod, telefon);
                } catch (err) {
                  setSifreYenile(false);
                  throw err;
                }
              });
            }}
          >
            <p className="aciklama">{telefonGirdi} numarasına gelen 6 haneli kodu girin.</p>
            <label className="alan">
              <span>Doğrulama kodu</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            {hata && <p className="hata">{hata}</p>}
            <button className="birincil" disabled={bekliyor || kod.length < 6}>
              {bekliyor ? 'Doğrulanıyor…' : 'Doğrula'}
            </button>
            <div className="baglantilar">
              <button type="button" className="metin" onClick={() => setEkran('smsTelefon')}>
                Kod gelmedi, tekrar gönder
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
