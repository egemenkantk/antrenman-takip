import { useState } from 'react';

export const WELLNESS_SORULARI = [
  ['uyku', 'Uyku kalitesi', ['Çok kötü', 'Kötü', 'Normal', 'İyi', 'Çok iyi']],
  ['enerji', 'Enerji', ['Çok yorgun', 'Yorgun', 'Normal', 'Dinç', 'Çok dinç']],
  ['kasAgrisi', 'Kas ağrısı', ['Çok ağrılı', 'Ağrılı', 'Normal', 'Hafif', 'Hiç yok']],
  ['stres', 'Stres', ['Çok yüksek', 'Yüksek', 'Normal', 'Düşük', 'Çok düşük']],
  ['ruhHali', 'Ruh hali', ['Çok kötü', 'Kötü', 'Normal', 'İyi', 'Çok iyi']],
];

// 1–5 ölçeği, yüksek = iyi. Ortalama → hazır oluş
export function wellnessPuani(w) {
  if (!w) return null;
  const d = WELLNESS_SORULARI.map(([k]) => w[k]).filter((v) => typeof v === 'number');
  if (!d.length) return null;
  const ort = d.reduce((a, b) => a + b, 0) / d.length;
  const dusuk = WELLNESS_SORULARI.filter(([k]) => typeof w[k] === 'number' && w[k] <= 2).map(([, ad]) => ad);
  return { ort, seviye: ort >= 4 ? 'iyi' : ort >= 3 ? 'orta' : 'dusuk', dusuk };
}

export function WellnessRozeti({ w }) {
  const p = wellnessPuani(w);
  if (!p) return null;
  return (
    <span className={'hazirlik ' + p.seviye} title={p.dusuk.length ? 'Düşük: ' + p.dusuk.join(', ') : ''}>
      Hazır oluş {p.ort.toFixed(1).replace('.', ',')}
      {p.dusuk.length ? ` · ${p.dusuk.join(', ')}` : ''}
    </span>
  );
}

function Olcek({ ad, etiketler, deger, onChange }) {
  return (
    <div className="olcek-satir">
      <span className="olcek-ad">{ad}</span>
      <div className="olcek" role="radiogroup" aria-label={ad}>
        {etiketler.map((e, i) => (
          <button
            type="button"
            key={i}
            role="radio"
            aria-checked={deger === i + 1}
            className={'olcek-btn' + (deger === i + 1 ? ' secili' : '')}
            onClick={() => onChange(i + 1)}
          >
            <b>{i + 1}</b>
            <small>{e}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function WellnessFormu({ ilk, onKaydet, onVazgec }) {
  const [w, setW] = useState({ uykuSaati: '', not: '', ...(ilk || {}) });
  const [bekliyor, setBekliyor] = useState(false);
  const tamam = WELLNESS_SORULARI.every(([k]) => typeof w[k] === 'number');
  return (
    <div className="ic-form">
      {WELLNESS_SORULARI.map(([k, ad, et]) => (
        <Olcek key={k} ad={ad} etiketler={et} deger={w[k]} onChange={(v) => setW({ ...w, [k]: v })} />
      ))}
      <div className="form-izgara">
        <label className="alan">
          <span>Uyku süresi (saat)</span>
          <input type="number" min="0" max="16" step="0.5" value={w.uykuSaati ?? ''} onChange={(e) => setW({ ...w, uykuSaati: e.target.value })} />
        </label>
        <label className="alan">
          <span>Not</span>
          <input value={w.not || ''} onChange={(e) => setW({ ...w, not: e.target.value })} />
        </label>
      </div>
      <div className="dugme-satiri">
        <button
          type="button"
          className="birincil kucuk"
          disabled={!tamam || bekliyor}
          onClick={async () => {
            setBekliyor(true);
            try {
              await onKaydet({
                ...Object.fromEntries(WELLNESS_SORULARI.map(([k]) => [k, w[k]])),
                uykuSaati: w.uykuSaati === '' ? null : Number(w.uykuSaati),
                not: w.not || '',
              });
            } finally {
              setBekliyor(false);
            }
          }}
        >
          {bekliyor ? 'Kaydediliyor…' : 'Wellness kaydet'}
        </button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

export function RpeSecici({ deger, onChange }) {
  return (
    <div>
      <div className="rpe-secici" role="radiogroup" aria-label="RPE">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={deger === v}
            className={'rpe-btn' + (deger === v ? ' secili' : '')}
            onClick={() => onChange(deger === v ? null : v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="rpe-olcek"><span>Çok hafif</span><span>Maksimal</span></div>
    </div>
  );
}

export const KATILIM = [
  ['geldi', 'Geldi'],
  ['gelmedi', 'Gelmedi'],
  ['izinli', 'İzinli'],
];
export function KatilimSecici({ deger, onChange }) {
  return (
    <div className="katilim" role="radiogroup" aria-label="Katılım">
      {KATILIM.map(([v, ad]) => (
        <button
          type="button"
          key={v}
          role="radio"
          aria-checked={deger === v}
          className={'katilim-btn ' + v + (deger === v ? ' secili' : '')}
          onClick={() => onChange(v)}
        >
          {ad}
        </button>
      ))}
    </div>
  );
}
