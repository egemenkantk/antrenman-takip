import { useState } from 'react';
import { hataMesaji, telefonuGoster } from '../auth/hesap';
import { bugun } from '../program/model';
import { tarihGoster } from '../veri';
import { YONTEMLER, YONTEM_ADI, DURUM_ADI, tl } from './model.js';
import { odemeDuzelt, odemeSil } from './veri';

export function DurumRozeti({ durum }) {
  return <span className={'odeme-rozet ' + durum}>{DURUM_ADI[durum]}</span>;
}

export function OdemeFormu({ ilk, onrTutar, onKaydet, onVazgec, baslik = 'Ödeme al' }) {
  const [f, setF] = useState({
    tutar: ilk?.tutar ?? (onrTutar || ''),
    tarih: ilk?.tarih || bugun(),
    yontem: ilk?.yontem || 'nakit',
    not: ilk?.not || '',
  });
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  return (
    <form
      className="kart-form ic-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!(Number(f.tutar) > 0)) return setHata('Tutar girilmeli.');
        setHata('');
        setBekliyor(true);
        try {
          await onKaydet({ ...f, tutar: Number(f.tutar) });
        } catch (err) {
          setHata(hataMesaji(err));
          setBekliyor(false);
        }
      }}
    >
      <strong>{baslik}</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>Tutar (₺)</span>
          <input type="number" inputMode="decimal" min="0" step="any" value={f.tutar} onChange={(e) => setF({ ...f, tutar: e.target.value })} />
        </label>
        <label className="alan">
          <span>Tarih</span>
          <input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} />
        </label>
        <label className="alan">
          <span>Yöntem</span>
          <select value={f.yontem} onChange={(e) => setF({ ...f, yontem: e.target.value })}>
            {YONTEMLER.map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Not (isteğe bağlı)</span>
          <input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} />
        </label>
      </div>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

export const kocAdi = (id, benim, koclar = []) =>
  id === benim ? 'Sen' : koclar.find((k) => k.id === id)?.ad || (id ? telefonuGoster(id) : '');

// Bir paketin ödemeleri: düzeltme (koç ve yönetici), silme (yalnızca yönetici, iz bırakır)
export function OdemeListesi({ odemeler, benim, koclar, yonetici, onDegisti }) {
  const [duzenle, setDuzenle] = useState(null);
  const [hata, setHata] = useState('');
  const gorunen = odemeler.filter((o) => !o.silindi).sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  const silinen = odemeler.filter((o) => o.silindi);
  if (!odemeler.length) return <p className="aciklama kucuk-yazi">Henüz ödeme yok.</p>;
  return (
    <div>
      {hata && <p className="hata">{hata}</p>}
      <ul className="odeme-listesi">
        {gorunen.map((o) =>
          duzenle === o.id ? (
            <li key={o.id}>
              <OdemeFormu
                baslik="Ödemeyi düzelt"
                ilk={o}
                onVazgec={() => setDuzenle(null)}
                onKaydet={async (v) => { await odemeDuzelt(o, v, benim); setDuzenle(null); await onDegisti(); }}
              />
            </li>
          ) : (
            <li key={o.id}>
              <span className="esnek">
                <strong>{tl(o.tutar)}</strong> · {tarihGoster(o.tarih)} · {YONTEM_ADI[o.yontem] || o.yontem}
                <span className="aciklama kucuk-yazi">
                  {' '}· Alan: {kocAdi(o.tahsilEdenKocId, benim, koclar)}
                  {o.not ? ` · ${o.not}` : ''}
                  {o.duzeltmeGecmisi?.length ? ` · ${o.duzeltmeGecmisi.length} kez düzeltildi` : ''}
                </span>
              </span>
              <button className="metin" onClick={() => setDuzenle(o.id)}>Düzelt</button>
              {yonetici && (
                <button
                  className="metin tehlike"
                  onClick={async () => {
                    const neden = window.prompt(`${tl(o.tutar)} tutarındaki ödeme silinsin mi? Kayıt geçmişte kalır. Neden (isteğe bağlı):`);
                    if (neden === null) return;
                    setHata('');
                    try {
                      await odemeSil(o, neden, benim);
                      await onDegisti();
                    } catch (e) {
                      setHata(hataMesaji(e));
                    }
                  }}
                >
                  Sil
                </button>
              )}
            </li>
          )
        )}
      </ul>
      {yonetici && silinen.length > 0 && (
        <details className="kucuk-yazi">
          <summary>Silinen ödemeler ({silinen.length})</summary>
          <ul className="sade-liste">
            {silinen.map((o) => (
              <li key={o.id}>
                <s>{tl(o.tutar)} · {tarihGoster(o.tarih)}</s> {o.silmeNedeni ? `— ${o.silmeNedeni}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
