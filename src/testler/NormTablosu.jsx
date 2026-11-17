// Testler > Dünya normları: kaynak tablolarını yaş ve cinsiyete göre gösterir (rapordaki değerlendirmeyle aynı veri)
import { useState } from 'react';
import { NORMLU_TESTLER, normTablolari, KAYNAKLAR, SEVIYELER } from './normlar';
import { testSirasi } from './tanimlar';

const SEVIYE_ARALIK = ['20\'nin altı', '20–40', '40–60', '60–80', '80 ve üstü'];

export default function NormTablosu() {
  const testler = [...NORMLU_TESTLER].sort((a, b) => testSirasi(a) - testSirasi(b));
  const [test, setTest] = useState(testler[0]);
  const [cins, setCins] = useState('E');
  const tablolar = normTablolari(test);
  const sure = /\(sn\)/.test(test);

  return (
    <div>
      <p className="aciklama">
        Raporda ve test verilerinde kullanılan dünya normları. Değerler bizim ölçümlerimize göre gösterilir (otur-uzan 22 cm'lik kutumuza, beep test seviye/mekik biçimine çevrildi).
      </p>
      <div className="filtreler">
        <select value={test} onChange={(e) => setTest(e.target.value)} aria-label="Test">
          {testler.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="secim-cubugu" role="group" aria-label="Cinsiyet">
          {[['E', 'Erkek'], ['K', 'Kız']].map(([k, ad]) => (
            <button key={k} className={'secim' + (cins === k ? ' secili' : '')} aria-pressed={cins === k} onClick={() => setCins(k)}>{ad}</button>
          ))}
        </div>
      </div>

      {tablolar.map((t) => (
        <section key={t.kaynak + t.basliklar.join()} className="norm-tablo-kart">
          <h3>{KAYNAKLAR[t.kaynak].kisa}</h3>
          <p className="aciklama kucuk-yazi">{KAYNAKLAR[t.kaynak].uzun}</p>
          {t.satirlar[cins].length === 0 ? (
            <p className="aciklama">{cins === 'K' && test === 'Barfiks (tekrar)' ? 'Kızlar için barfiks normu yok (uluslararası testlerde kızlara bükülü kol asılma uygulanır).' : 'Bu cinsiyet için veri yok.'}</p>
          ) : (
            <div className="tablo-kap">
              <table className="tablo norm-tablo">
                <thead>
                  <tr>
                    <th>Yaş</th>
                    {t.basliklar.map((b, i) => (
                      <th key={b} className={t.tur === 'yuzdelik' && t.yuzdelikler[i] === 50 ? 'norm-orta' : ''}>
                        {t.tur === 'yuzdelik' ? (t.yuzdelikler[i] === 50 ? 'P50 · ortalama' : b) : b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.satirlar[cins].map(([yas, d]) => (
                    <tr key={yas}>
                      <th scope="row">{yas}</th>
                      {d.map((v, i) => <td key={i} className={t.tur === 'yuzdelik' && t.yuzdelikler[i] === 50 ? 'norm-orta' : ''}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {t.tur === 'yuzdelik' ? (
            <p className="aciklama kucuk-yazi">
              P50: yaşıtlarının yarısı bu değerin altında, yarısı üstünde. P{t.yuzdelikler[3]}: yaşıtlarının %{t.yuzdelikler[3]}'inden iyi.{sure ? ' Süre testlerinde düşük değer daha iyidir.' : ''}
            </p>
          ) : (
            <p className="aciklama kucuk-yazi">
              Yalnızca ortalama verilir. Değerlendirme: ortalamadan %3'ten az fark "Ortalama", %3–10 iyi yönde "Ortalamanın üstünde", %10'dan fazla "Çok iyi" (kötü yönde de aynı şekilde).
              {sure ? ' Düşük süre daha iyidir.' : ''}
            </p>
          )}
        </section>
      ))}

      <section className="norm-tablo-kart">
        <h3>Seviyeler</h3>
        <div className="norm-ozet">
          {SEVIYELER.map((ad, i) => (
            <span key={ad} className={'r-seviye s' + i}>{ad} · yüzdelik {SEVIYE_ARALIK[i]}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
