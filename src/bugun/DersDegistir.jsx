import { useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { gunEkle, kisaTarih } from '../program/model';
import { degisiklikKaydet, degisiklikSil } from '../takvim/degisiklik';

const ISLEMLER = [
  ['saat', 'Bugün başka saatte'],
  ['tasi', 'Başka güne taşı'],
  ['iptal', 'İptal / ertelendi (tarih belli değil)'],
];

// Sabit saatli dersi yalnızca bu tarih için değiştirir; haftalık düzen aynı kalır
export default function DersDegistir({ kart, tarih, yapan, onBitti, onVazgec }) {
  const d = kart.degisiklik;
  const [f, setF] = useState({
    islem: d?.islem || 'saat',
    yeniSaat: d?.yeniSaat || kart.eskiSaat || kart.saat || '',
    yeniTarih: d?.islem === 'tasi' ? d.yeniTarih : gunEkle(tarih, 1),
    not: d?.not || '',
  });
  const [hata, setHata] = useState('');
  const kaydet = async () => {
    if (f.islem === 'saat' && !f.yeniSaat) return setHata('Yeni saati gir.');
    if (f.islem === 'tasi' && (!f.yeniTarih || f.yeniTarih === tarih)) return setHata('Farklı bir gün seç.');
    setHata('');
    try {
      await degisiklikKaydet({ sahipTip: kart.tip, sahipId: kart.id, sahipAd: kart.ad, tarih, eskiSaat: kart.eskiSaat || kart.saat }, f, yapan);
      onBitti();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  return (
    <div className="kart-form ic-form ders-degistir">
      <strong>Dersi değiştir · {kisaTarih(tarih)}{kart.eskiSaat ? ` ${kart.eskiSaat}` : ''}</strong>
      <p className="aciklama kucuk-yazi">Sadece bu tarihteki ders değişir; haftalık sabit saatler aynı kalır.</p>
      <div className="secim-cubugu" role="radiogroup" aria-label="Değişiklik">
        {ISLEMLER.map(([k, ad]) => (
          <button key={k} type="button" role="radio" aria-checked={f.islem === k} className={'secim' + (f.islem === k ? ' secili' : '')} onClick={() => setF({ ...f, islem: k })}>
            {ad}
          </button>
        ))}
      </div>
      <div className="form-izgara">
        {f.islem === 'tasi' && (
          <label className="alan">
            <span>Yeni gün</span>
            <input type="date" value={f.yeniTarih} onChange={(e) => setF({ ...f, yeniTarih: e.target.value })} />
          </label>
        )}
        {f.islem !== 'iptal' && (
          <label className="alan">
            <span>Saat</span>
            <input type="time" value={f.yeniSaat} onChange={(e) => setF({ ...f, yeniSaat: e.target.value })} />
          </label>
        )}
        <label className="alan">
          <span>Not (isteğe bağlı)</span>
          <input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} placeholder="Örn. okul gezisi, veli istedi" />
        </label>
      </div>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" onClick={kaydet}>Kaydet</button>
        {d && (
          <button
            className="metin"
            onClick={async () => {
              try {
                await degisiklikSil(kart.id, d.tarih);
                onBitti();
              } catch (e) {
                setHata(hataMesaji(e));
              }
            }}
          >
            Değişikliği geri al
          </button>
        )}
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// Karttaki kısa etiket
export function DegisiklikEtiketi({ kart }) {
  const d = kart.degisiklik;
  if (!d) return null;
  const metin =
    kart.durum === 'gelen' ? `↪ ${kisaTarih(d.tarih)}${d.eskiSaat ? ` ${d.eskiSaat}` : ''} dersinden taşındı`
    : kart.durum === 'gitti' ? `→ ${kisaTarih(d.yeniTarih)}${d.yeniSaat ? ` ${d.yeniSaat}` : ''} tarihine taşındı`
    : kart.durum === 'iptal' ? 'İptal / ertelendi'
    : `Saat değişti: ${d.eskiSaat || '—'} → ${d.yeniSaat}`;
  return (
    <small className={'degisiklik-etiket ' + kart.durum}>
      {metin}{d.not ? ` · ${d.not}` : ''}
    </small>
  );
}
