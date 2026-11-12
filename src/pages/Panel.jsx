import { useEffect, useMemo, useState } from 'react';
import { MARKA } from '../config/marka';
import { useOturum } from '../auth/OturumContext';
import { cikis } from '../auth/hesap';
import { kisileriGetir, HEDEF_ADI } from '../veri';
import Kullanicilar from './Kullanicilar';
import Kisiler from './Kisiler';
import Ayarlar from './Ayarlar';
import Gruplar from './Gruplar';
import Bugun from './Bugun';
import Testler from './Testler';
import Takvim from './Takvim';
import Kutuphaneler from './Kutuphaneler';
import Odemeler from './Odemeler';
import Bildirimler from '../paket/Bildirimler';
import Portal from '../portal/Portal';

const ROL_ADI = { yonetici: 'Yönetici', koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli' };

// Sol menü (Sporcu Kartı düzeni): sayfa kimliği, simge, ad
const MENU = {
  yonetici: [
    ['bugun', '📋', 'Bugün'],
    ['kisiler', '🏃', 'Kişiler'],
    ['gruplar', '👥', 'Gruplar'],
    ['takvim', '📅', 'Takvim'],
    ['testler', '📊', 'Testler'],
    ['kutuphane', '📚', 'Kütüphaneler'],
    ['odemeler', '💳', 'Paketler ve ödemeler'],
    ['kullanicilar', '🧑‍🏫', 'Koçlar ve kullanıcılar'],
    ['ayarlar', '⚙️', 'Ayarlar'],
  ],
  koc: [
    ['bugun', '📋', 'Bugün'],
    ['kisiler', '🏃', 'Kişilerim'],
    ['gruplar', '👥', 'Gruplarım'],
    ['takvim', '📅', 'Takvim'],
    ['testler', '📊', 'Testler'],
    ['odemeler', '💳', 'Ödemeler'],
  ],
};

const basHarf = (ad) =>
  (ad || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR');

export function KisiAvatar({ k, sinif = 'avatar kucuk-av' }) {
  return k.foto ? <img className={sinif} src={k.foto} alt="" loading="lazy" /> : <span className={sinif} aria-hidden="true">{basHarf(k.ad)}</span>;
}

// Sol menüdeki kişi listesi: ara ve tek dokunuşla kişi kartını aç
function KisiListesi({ ben, seciliId, onSec, yenile }) {
  const [kisiler, setKisiler] = useState([]);
  const [ara, setAra] = useState('');
  useEffect(() => {
    kisileriGetir(ben).then((l) => setKisiler(l.filter((x) => x.aktif !== false))).catch(() => {});
  }, [ben.id, yenile]);
  const gorunen = useMemo(() => {
    const a = ara.trim().toLocaleLowerCase('tr');
    return kisiler.filter((x) => !a || x.ad.toLocaleLowerCase('tr').includes(a));
  }, [kisiler, ara]);
  return (
    <>
      <input className="yan-ara" type="search" placeholder="Kişi ara" value={ara} onChange={(e) => setAra(e.target.value)} aria-label="Kişi ara" />
      <ul className="yan-kisiler">
        {gorunen.map((x) => (
          <li key={x.id}>
            <button aria-current={x.id === seciliId} onClick={() => onSec(x.id)}>
              <KisiAvatar k={x} />
              <span className="esnek">
                <strong>
                  {x.ad}
                  {(x.aktifSakatliklar || []).length > 0 && <span className="sakatlik-nokta" title="Aktif sakatlık"> ⚠</span>}
                </strong>
                <small>{x.tip === 'pt' ? HEDEF_ADI[x.hedef] || 'PT danışanı' : x.brans || 'Sporcu'}</small>
              </span>
            </button>
          </li>
        ))}
        {kisiler.length > 0 && gorunen.length === 0 && <li className="aciklama kucuk-yazi">Eşleşen kişi yok.</li>}
      </ul>
    </>
  );
}

export default function Panel() {
  const { durum } = useOturum();
  const k = durum.kullanici;
  const portal = k.rol === 'ogrenci' || k.rol === 'veli';
  const menu = MENU[k.rol] || [];
  const [sayfa, setSayfa] = useState('bugun');
  const [bugunTarihi, setBugunTarihi] = useState(null);
  const [kisiId, setKisiId] = useState(null);
  const [kisiAnahtar, setKisiAnahtar] = useState(0);
  const [menuAcik, setMenuAcik] = useState(false);

  const git = (s) => {
    setBugunTarihi(null);
    setKisiId(null);
    setSayfa(s);
    setMenuAcik(false);
    window.scrollTo(0, 0);
  };
  const kisiAc = (id) => {
    setKisiId(id);
    setKisiAnahtar((n) => n + 1);
    setSayfa('kisiler');
    setMenuAcik(false);
    window.scrollTo(0, 0);
  };

  const ust = (
    <header className="ust-bar">
      <div className="marka">
        {!portal && (
          <button className="menu-dugme" onClick={() => setMenuAcik(!menuAcik)} aria-label="Menü" aria-expanded={menuAcik}>☰</button>
        )}
        <button className="logo-dugme" onClick={() => git('bugun')} aria-label={`${MARKA.ad} ana sayfa`}>
          <img className="logo-kucuk" src={MARKA.logo} alt="" />
        </button>
        <strong className="marka-ad">{MARKA.ad}</strong>
      </div>
      <div className="kullanici-bilgi">
        <span>{k.ad || k.id}</span>
        <small>{ROL_ADI[k.rol] || k.rol}</small>
        <Bildirimler benimId={k.id} />
        <button className="metin" onClick={cikis}>Çıkış</button>
      </div>
    </header>
  );

  if (portal) {
    return (
      <div className="panel">
        {ust}
        <main className="icerik">
          <Portal ben={k} />
        </main>
      </div>
    );
  }

  return (
    <div className="panel">
      {ust}
      <div className="uygulama">
        <aside className={'yan-menu' + (menuAcik ? ' acik' : '')}>
          <nav className="yan-nav" aria-label="Ana menü">
            {menu.map(([id, simge, ad]) => (
              <button key={id} aria-current={sayfa === id && !(id === 'kisiler' && kisiId)} onClick={() => git(id)}>
                <span aria-hidden="true">{simge}</span> {ad}
              </button>
            ))}
          </nav>
          <KisiListesi ben={k} seciliId={sayfa === 'kisiler' ? kisiId : null} onSec={kisiAc} yenile={kisiAnahtar} />
        </aside>
        {menuAcik && <div className="yan-perde" onClick={() => setMenuAcik(false)} aria-hidden="true" />}
        <main className="icerik">
          {sayfa === 'kullanicilar' ? (
            <Kullanicilar />
          ) : sayfa === 'kisiler' ? (
            <Kisiler key={kisiAnahtar} acilisKisiId={kisiId} />
          ) : sayfa === 'gruplar' ? (
            <Gruplar />
          ) : sayfa === 'testler' ? (
            <Testler />
          ) : sayfa === 'kutuphane' ? (
            <Kutuphaneler />
          ) : sayfa === 'takvim' ? (
            <Takvim onGunAc={(t) => { setBugunTarihi(t); setSayfa('bugun'); }} />
          ) : sayfa === 'odemeler' ? (
            <Odemeler />
          ) : sayfa === 'ayarlar' ? (
            <Ayarlar />
          ) : (
            <Bugun
              key={bugunTarihi || 'bugun'}
              baslangicTarihi={bugunTarihi}
              onGeri={bugunTarihi ? () => { setBugunTarihi(null); setSayfa('takvim'); } : undefined}
            />
          )}
        </main>
      </div>
    </div>
  );
}
