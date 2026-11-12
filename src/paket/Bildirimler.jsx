import { useEffect, useState } from 'react';
import { bildirimlerim, bildirimOkundu } from './veri';

const zaman = (t) => {
  const d = t?.toDate ? t.toDate() : t ? new Date(t) : null;
  return d ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '';
};

// Üst çubuktaki bildirim zili: yalnızca site içi bildirimler
export default function Bildirimler({ benimId }) {
  const [liste, setListe] = useState([]);
  const [acik, setAcik] = useState(false);
  const yukle = () => bildirimlerim(benimId).then(setListe).catch(() => {});
  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [benimId]);
  const okunmamis = liste.filter((b) => !b.okundu);
  return (
    <div className="bildirim-kap">
      <button
        className="metin bildirim-zil"
        aria-label={`Bildirimler${okunmamis.length ? `, ${okunmamis.length} okunmamış` : ''}`}
        aria-expanded={acik}
        onClick={async () => {
          const ac = !acik;
          setAcik(ac);
          if (!ac && okunmamis.length) {
            await Promise.all(okunmamis.map((b) => bildirimOkundu(b.id).catch(() => {})));
            yukle();
          }
        }}
      >
        🔔{okunmamis.length > 0 && <span className="bildirim-sayi">{okunmamis.length}</span>}
      </button>
      {acik && (
        <div className="bildirim-panel" role="dialog" aria-label="Bildirimler">
          {liste.length === 0 ? (
            <p className="aciklama">Bildirim yok.</p>
          ) : (
            <ul>
              {liste.map((b) => (
                <li key={b.id} className={b.okundu ? '' : 'yeni'}>
                  <strong>{b.baslik}</strong>
                  <span>{b.metin}</span>
                  <small>{zaman(b.tarih)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
