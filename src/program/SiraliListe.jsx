// Tutamaçla (⋮⋮) sürükleyerek sıralanan dikey liste — fare ve dokunmatik ekranda çalışır.
import { useRef, useState } from 'react';

export default function SiraliListe({ ogeler, anahtar, onSirala, cizim }) {
  const kap = useRef(null);
  const [surukle, setSurukle] = useState(null); // sürüklenen öğenin anahtarı

  function basla(e, k) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSurukle(k);
    document.body.classList.add('siralaniyor');
  }
  function hareket(e) {
    if (surukle == null || !kap.current) return;
    const cocuklar = [...kap.current.children];
    const y = e.clientY;
    let hedef = cocuklar.length - 1;
    for (let i = 0; i < cocuklar.length; i++) {
      const r = cocuklar[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        hedef = i;
        break;
      }
    }
    const simdiki = ogeler.findIndex((o) => anahtar(o) === surukle);
    if (hedef !== simdiki && simdiki >= 0) {
      const yeni = [...ogeler];
      const [o] = yeni.splice(simdiki, 1);
      yeni.splice(hedef, 0, o);
      onSirala(yeni);
    }
  }
  function bitir() {
    setSurukle(null);
    document.body.classList.remove('siralaniyor');
  }

  return (
    <div ref={kap} className="sirali-liste">
      {ogeler.map((o) => {
        const k = anahtar(o);
        return (
          <div key={k} className={'sirali-oge' + (surukle === k ? ' suruklenen' : '')}>
            {cizim(
              o,
              <button
                type="button"
                className="tutamac"
                aria-label="Sürükleyerek sırala"
                onPointerDown={(e) => basla(e, k)}
                onPointerMove={hareket}
                onPointerUp={bitir}
                onPointerCancel={bitir}
              >
                ⋮⋮
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
