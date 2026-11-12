import { useState } from 'react';
import { MARKA } from '../config/marka';
import { useOturum } from '../auth/OturumContext';
import { cikis } from '../auth/hesap';
import Kullanicilar from './Kullanicilar';
import Kisiler from './Kisiler';
import Ayarlar from './Ayarlar';
import Gruplar from './Gruplar';
import Bugun from './Bugun';
import Testler from './Testler';
import Takvim from './Takvim';
import Kutuphaneler from './Kutuphaneler';

const ROL_ADI = { yonetici: 'Yönetici', koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli' };

// Rol bazında ana menü. Bölümler aşama aşama doldurulacak.
const BOLUMLER = {
  yonetici: [
    ['Bugün', 'Dersler, yoklama, wellness ve RPE', 1, 'bugun'],
    ['Kişiler', 'Sporcular ve PT danışanları', 1, 'kisiler'],
    ['Gruplar', 'Grup dersleri, üyeler ve grup programı', 1, 'gruplar'],
    ['Takvim', 'Haftalık ve aylık görünüm, maç ve etkinlikler', 1, 'takvim'],
    ['Kütüphaneler', 'Egzersizler ve program şablonları', 1, 'kutuphane'],
    ['Testler', 'Test günü ve Performanz raporları', 1, 'testler'],
    ['Paketler ve ödemeler', 'Paketler, dönemler, tahsilatlar', 2],
    ['Koçlar ve kullanıcılar', 'Hesaplar ve geçici şifreler', 1, 'kullanicilar'],
    ['Ayarlar', 'Şubeler', 1, 'ayarlar'],
  ],
  koc: [
    ['Bugün', 'Derslerin, yoklama, wellness ve RPE', 1, 'bugun'],
    ['Kişilerim', 'Sana atanan sporcu ve danışanlar', 1, 'kisiler'],
    ['Gruplarım', 'Grup derslerin', 1, 'gruplar'],
    ['Takvim', 'Haftalık ve aylık görünüm, maç ve etkinlikler', 1, 'takvim'],
    ['Testler', 'Test günü ve Performanz raporları', 1, 'testler'],
    ['Ödemeler', 'Öğrencilerinin paket ve ödemeleri', 2],
  ],
  ogrenci: [
    ['Takvimim', 'Ders günlerin ve saatlerin', 3],
    ['Programım', 'Ev egzersizlerin', 3],
    ['Gelişimim', 'Test sonuçların', 3],
    ['Paketim', 'Kalan ders ve ödemeler', 3],
  ],
  veli: [
    ['Takvim', 'Çocuğunun ders günleri', 3],
    ['Gelişim', 'Test sonuçları', 3],
    ['Paket ve ödemeler', 'Kalan ders ve ödemeler', 3],
  ],
};

export default function Panel() {
  const { durum } = useOturum();
  const k = durum.kullanici;
  const bolumler = BOLUMLER[k.rol] || [];
  const [sayfa, setSayfa] = useState(null);
  const [bugunTarihi, setBugunTarihi] = useState(null);

  return (
    <div className="panel">
      <header className="ust-bar">
        <div className="marka">
          <span className="logo-isaret kucuk" aria-hidden="true">{MARKA.ad.charAt(0)}</span>
          <strong>{MARKA.ad}</strong>
        </div>
        <div className="kullanici-bilgi">
          <span>{k.ad || k.id}</span>
          <small>{ROL_ADI[k.rol] || k.rol}</small>
          <button className="metin" onClick={cikis}>Çıkış</button>
        </div>
      </header>
      <main className="icerik">
        {sayfa === 'kullanicilar' ? (
          <Kullanicilar onGeri={() => setSayfa(null)} />
        ) : sayfa === 'kisiler' ? (
          <Kisiler onGeri={() => setSayfa(null)} />
        ) : sayfa === 'gruplar' ? (
          <Gruplar onGeri={() => setSayfa(null)} />
        ) : sayfa === 'testler' ? (
          <Testler onGeri={() => setSayfa(null)} />
        ) : sayfa === 'kutuphane' ? (
          <Kutuphaneler onGeri={() => setSayfa(null)} />
        ) : sayfa === 'takvim' ? (
          <Takvim onGeri={() => setSayfa(null)} onGunAc={(t) => { setBugunTarihi(t); setSayfa('bugun'); }} />
        ) : sayfa === 'bugun' ? (
          <Bugun
            key={bugunTarihi || 'bugun'}
            baslangicTarihi={bugunTarihi}
            onGeri={() => { const geri = bugunTarihi ? 'takvim' : null; setBugunTarihi(null); setSayfa(geri); }}
          />
        ) : sayfa === 'ayarlar' ? (
          <Ayarlar onGeri={() => setSayfa(null)} />
        ) : (
        <>
        <h2>Merhaba{k.ad ? `, ${k.ad.split(' ')[0]}` : ''}</h2>
        <p className="aciklama">Site kuruluyor. Bölümler aşama aşama açılacak.</p>
        <ul className="bolum-listesi">
          {bolumler.map(([ad, aciklama, asama, hedef]) =>
            hedef ? (
              <li key={ad}>
                <button className="bolum-karti acik" onClick={() => { setBugunTarihi(null); setSayfa(hedef); }}>
                  <div>
                    <strong>{ad}</strong>
                    <span>{aciklama}</span>
                  </div>
                  <em>Aç →</em>
                </button>
              </li>
            ) : (
              <li key={ad} className="bolum-karti">
                <div>
                  <strong>{ad}</strong>
                  <span>{aciklama}</span>
                </div>
                <em>Aşama {asama}</em>
              </li>
            )
          )}
        </ul>
        </>
        )}
      </main>
    </div>
  );
}
