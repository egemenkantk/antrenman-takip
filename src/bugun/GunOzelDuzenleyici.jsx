// Bir seansı yalnızca seçili tarih için değiştirir; blok/sezon planı değişmez.
import { useState } from 'react';
import { BOLUMLER, BOLUM_SIRASI, BOLUM_RENK, gunBolumleri, dozaj, uzunTarih, HARF } from '../program/model';
import SiraliListe from '../program/SiraliListe';

export default function GunOzelDuzenleyici({ seans, tarih, ad, varMi, onKaydet, onDinlenme, onPlanaDon, onVazgec }) {
  const sade = !!seans?.blok?.sade;
  const ilkBolumler = seans?.gun ? gunBolumleri(seans.blok, seans.gun) : [];
  const [baslik, setBaslik] = useState(seans?.gun?.baslik || '');
  const [bolumler, setBolumler] = useState(ilkBolumler);
  const [icerik, setIcerik] = useState({ ...(seans?.gun?.icerik || {}) });
  const [doz, setDoz] = useState(() =>
    Object.fromEntries(ilkBolumler.filter((k) => BOLUMLER[k]?.doz).map((k) => [k, dozaj(seans?.rx, seans?.gunIdx, k)]))
  );
  const [not, setNot] = useState(seans?.ozelNot || '');
  const [bekliyor, setBekliyor] = useState(false);

  async function calistir(is) {
    setBekliyor(true);
    try {
      await is();
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <div className="ic-form gun-ozel">
      <p className="aciklama kucuk-yazi">
        {ad} · {uzunTarih(tarih)}
        {seans?.blok?.ad ? ` · plan: ${seans.blok.ad}, ${seans.hafta + 1}. hafta, ${HARF[seans.gunIdx]} günü` : ''}.
        Değişiklik yalnızca bu tarihe uygulanır; program değişmez.
      </p>
      <label className="alan">
        <span>Seans başlığı</span>
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Örn. Kamp dönüşü hafif seans" />
      </label>
      {sade ? (
        <label className="alan">
          <span>Egzersizler</span>
          <textarea rows={6} value={icerik.liste || ''} onChange={(e) => setIcerik({ ...icerik, liste: e.target.value })} />
        </label>
      ) : (
        <>
          <div className="cip-grubu kucuk">
            {BOLUM_SIRASI.map((k) => (
              <button
                type="button"
                key={k}
                className={'cip bolum-cip' + (bolumler.includes(k) ? ' secili' : '')}
                style={{ '--bc': BOLUM_RENK[k] }}
                aria-pressed={bolumler.includes(k)}
                onClick={() => setBolumler(bolumler.includes(k) ? bolumler.filter((x) => x !== k) : [...bolumler, k])}
              >
                {BOLUMLER[k].ad}
              </button>
            ))}
          </div>
          <SiraliListe
            ogeler={bolumler}
            anahtar={(k) => k}
            onSirala={setBolumler}
            cizim={(k, tutamac) => (
              <div className="bolum-duzen" style={{ '--bc': BOLUM_RENK[k] }}>
                <div className="bolum-duzen-ust"><strong>{BOLUMLER[k].ad}</strong>{tutamac}</div>
                <div className="iki-sutun">
                  <textarea
                    rows={3}
                    placeholder="Her satıra bir hareket"
                    value={icerik[k] || ''}
                    onChange={(e) => setIcerik({ ...icerik, [k]: e.target.value })}
                  />
                  {BOLUMLER[k].doz && (
                    <input
                      placeholder={BOLUMLER[k].ipucu}
                      value={doz[k] || ''}
                      onChange={(e) => setDoz({ ...doz, [k]: e.target.value })}
                      aria-label={`${BOLUMLER[k].ad} dozajı`}
                    />
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}
      <label className="alan">
        <span>Not</span>
        <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Örn. kamp dönüşü, hacim yarıya indirildi" />
      </label>
      <div className="dugme-satiri">
        <button
          type="button"
          className="birincil kucuk"
          disabled={bekliyor}
          onClick={() =>
            calistir(() =>
              onKaydet({
                dinlenme: false,
                sade,
                baslik,
                bolumler: sade ? [] : bolumler,
                icerik: sade ? { liste: icerik.liste || '' } : Object.fromEntries(bolumler.map((k) => [k, icerik[k] || ''])),
                doz: sade ? {} : Object.fromEntries(bolumler.filter((k) => BOLUMLER[k]?.doz).map((k) => [k, doz[k] || ''])),
                not,
                blokId: seans?.blok?.id || null,
              })
            )
          }
        >
          Bu güne kaydet
        </button>
        <button type="button" className="ikincil kucuk" disabled={bekliyor} onClick={() => calistir(() => onDinlenme(not))}>
          Dinlenme günü yap
        </button>
        {varMi && (
          <button type="button" className="ikincil kucuk" disabled={bekliyor} onClick={() => calistir(onPlanaDon)}>
            Plana dön
          </button>
        )}
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}
