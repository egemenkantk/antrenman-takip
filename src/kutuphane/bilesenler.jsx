import { useEffect, useId, useState } from 'react';
import { egzersizleriGetir, egzersizBul } from './veri';

// Kütüphaneyi bir kez yükler (önbellekli)
export function useKutuphane() {
  const [l, setL] = useState([]);
  useEffect(() => {
    let iptal = false;
    egzersizleriGetir().then((x) => !iptal && setL(x)).catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);
  return l;
}

// Program satırı: kütüphanede videosu varsa ▶ bağlantısı, ipucu varsa üzerine gelince görünür
export function EgzersizSatiri({ satir, kutuphane }) {
  const e = egzersizBul(satir, kutuphane);
  return (
    <li title={e?.ipucu || undefined}>
      {satir}
      {e?.video && (
        <a className="video-bag kucuk" href={e.video} target="_blank" rel="noreferrer" aria-label={`${e.ad} videosu`} onClick={(ev) => ev.stopPropagation()}>
          ▶
        </a>
      )}
      {e?.ipucu && <span className="ipucu-isaret" aria-hidden="true"> ⓘ</span>}
    </li>
  );
}

// Düzenleyicide: kütüphaneden öneriyle satır ekleme kutusu
export function EgzersizEkle({ kutuphane, bolum, onEkle }) {
  const id = useId();
  const [v, setV] = useState('');
  const liste = kutuphane.filter((e) => !bolum || e.bolum === bolum);
  if (!kutuphane.length) return null;
  const ekle = () => {
    if (!v.trim()) return;
    onEkle(v.trim());
    setV('');
  };
  return (
    <div className="egz-ekle">
      <input
        list={id}
        value={v}
        placeholder="+ Kütüphaneden egzersiz ekle"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            ekle();
          }
        }}
        aria-label="Kütüphaneden egzersiz ekle"
      />
      <datalist id={id}>{liste.map((e) => <option key={e.id} value={e.ad} />)}</datalist>
      {v.trim() && <button type="button" className="ikincil kucuk" onClick={ekle}>Ekle</button>}
    </div>
  );
}
