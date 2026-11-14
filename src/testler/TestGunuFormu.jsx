import { useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun } from '../program/model';
import { TEST_KATEGORILERI, TEST_ACIKLAMA, TARAF_ADI, sayiyaCevir, degerCevir, BEEP_TEST } from './tanimlar';

// Kişi kartında Sporcu Kartı tarzı test girişi: kategori başlıkları altında tüm testler,
// her testin kısa açıklaması; boş bırakılan testler kaydedilmez.
export default function TestGunuFormu({ ilkTarih, mevcut = [], kullanilanlar, onKaydet, onVazgec }) {
  const [tarih, setTarih] = useState(ilkTarih || bugun());
  const [not, setNot] = useState('');
  const [d, setD] = useState({}); // `${test}|${taraf|seviye}` → metin
  const [ozel, setOzel] = useState([{ ad: '', deger: '', dusuk: false }]);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const kutu = (anahtar, etiket) => (
    <label className="test-kutu" key={anahtar}>
      <span>{etiket}</span>
      <input inputMode={anahtar.startsWith(BEEP_TEST) ? 'text' : 'decimal'} placeholder={anahtar.startsWith(BEEP_TEST) ? '8/5' : undefined} value={d[anahtar] || ''} onChange={(e) => setD({ ...d, [anahtar]: e.target.value })} />
    </label>
  );

  async function kaydet() {
    const l = [];
    for (const [, testler] of TEST_KATEGORILERI) {
      for (const [ad, , tarafli, seviyeli] of testler) {
        for (const taraf of tarafli ? ['sag', 'sol'] : [null]) {
          const v = degerCevir(ad, d[`${ad}|${taraf}`]);
          if (v == null) continue;
          const sv = seviyeli ? sayiyaCevir(d[`${ad}|seviye`]) : null;
          l.push({ test: ad, tarih, deger: v, taraf, kaynak: 'elle', ...(sv != null ? { seviye: sv } : {}), ...(not.trim() ? { not: not.trim() } : {}) });
        }
      }
    }
    for (const o of ozel) {
      const v = sayiyaCevir(o.deger);
      if (!o.ad.trim() || v == null) continue;
      l.push({ test: o.ad.trim(), tarih, deger: v, taraf: null, kaynak: 'elle', ozelYon: o.dusuk ? 'dusuk' : 'yuksek', ...(not.trim() ? { not: not.trim() } : {}) });
    }
    if (!l.length) return setHata('En az bir test değeri gir.');
    // Aynı gün aynı test zaten girildiyse üzerine yazılacağını sor (farklı testler sorunsuz eklenir)
    const cakisan = l.filter((x) => mevcut.some((m) => m.kaynak === 'elle' && m.tarih === x.tarih && m.test === x.test && (m.taraf || null) === (x.taraf || null)));
    if (cakisan.length && !window.confirm(`${cakisan.map((x) => x.test + (x.taraf ? ` (${TARAF_ADI[x.taraf]})` : '')).join(', ')} için bu tarihte zaten değer var. Yeni değer eskisinin yerine geçsin mi?`)) return;
    setHata('');
    setBekliyor(true);
    try {
      await onKaydet(l);
    } catch (e) {
      setHata(hataMesaji(e));
      setBekliyor(false);
    }
  }

  return (
    <div className="kart-form test-gunu-formu">
      <h3>Test sonucu gir</h3>
      <p className="aciklama kucuk-yazi">Önceki bir test gününe ekliyorsan tarihi o güne ayarla; aynı güne farklı testler istediğin kadar eklenebilir.</p>
      <div className="form-izgara">
        <label className="alan">
          <span>Test tarihi</span>
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </label>
        <label className="alan">
          <span>Not (isteğe bağlı)</span>
          <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Koşullar: zemin, hava, ayakkabı, zamanlama yöntemi" />
        </label>
      </div>
      {TEST_KATEGORILERI.map(([kat, testler]) => (
        <details key={kat} className="test-kategori" open={testler.some(([ad]) => kullanilanlar.has(ad)) || (!kullanilanlar.size && ['Sürat', 'Sıçrama'].includes(kat))}>
          <summary>{kat}</summary>
          <div className="test-izgara">
            {testler.map(([ad, , tarafli, seviyeli]) => (
              <div key={ad} className="test-oge">
                <strong>{ad}</strong>
                {TEST_ACIKLAMA[ad] && <small>{TEST_ACIKLAMA[ad]}</small>}
                <div className="test-kutular">
                  {tarafli
                    ? ['sag', 'sol'].map((t) => kutu(`${ad}|${t}`, TARAF_ADI[t]))
                    : kutu(`${ad}|null`, 'Değer')}
                  {seviyeli && kutu(`${ad}|seviye`, 'Seviye')}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
      <details className="test-kategori">
        <summary>Diğer / özel testler</summary>
        {ozel.map((o, i) => (
          <div key={i} className="form-izgara">
            <label className="alan">
              <span>Test adı ve birimi</span>
              <input value={o.ad} onChange={(e) => setOzel(ozel.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))} placeholder="Örn. Sağlık topu atma (m)" />
            </label>
            <label className="alan">
              <span>Değer</span>
              <input inputMode="decimal" value={o.deger} onChange={(e) => setOzel(ozel.map((x, j) => (j === i ? { ...x, deger: e.target.value } : x)))} />
            </label>
            <label className="onay-satir">
              <input type="checkbox" checked={o.dusuk} onChange={(e) => setOzel(ozel.map((x, j) => (j === i ? { ...x, dusuk: e.target.checked } : x)))} />
              Düşük değer daha iyi (süre gibi)
            </label>
          </div>
        ))}
        <button type="button" className="metin" onClick={() => setOzel([...ozel, { ad: '', deger: '', dusuk: false }])}>+ Bir özel test daha</button>
      </details>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor} onClick={kaydet}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}
