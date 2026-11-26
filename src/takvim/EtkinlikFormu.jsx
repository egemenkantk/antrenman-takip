// Etkinlik (maç, turnuva, test günü…) formu. Yeni etkinlikte "Birden fazla tarih": aynı kişiler/gruplar için
// fikstür — satır satır tarih/saat/başlık ya da WhatsApp'tan yapıştırma. onKaydet her zaman bir liste alır.
import { useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih, coz } from '../program/model';
import { ETKINLIK_TURU, ETKINLIK_SIMGE } from './veri';
import { fiksturOku } from './fikstur';

const gunAdi = (t) => coz(t).toLocaleDateString('tr-TR', { weekday: 'short' });

export default function EtkinlikFormu({ ilk, varsayilan, kisiler, gruplar, onKaydet, onSil, onVazgec }) {
  const [f, setF] = useState({
    tur: ilk?.tur || varsayilan?.tur || 'mac',
    ad: ilk?.ad || '',
    tarih: ilk?.tarih || bugun(),
    saat: ilk?.saat || '',
    yer: ilk?.yer || '',
    kapsam: ilk?.kapsam || 'secili',
    grupIds: ilk?.grupIds || varsayilan?.grupIds || [],
    kisiIds: ilk?.kisiIds || varsayilan?.kisiIds || [],
    not: ilk?.not || '',
  });
  const [coklu, setCoklu] = useState(false);
  const [satirlar, setSatirlar] = useState([{ tarih: '', saat: '', ad: '' }]);
  const [yapistir, setYapistir] = useState('');
  const [okunamayan, setOkunamayan] = useState([]);
  const [ara, setAra] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const adaylar = ara.trim()
    ? kisiler.filter((k) => k.aktif !== false && !f.kisiIds.includes(k.id) && k.ad.toLocaleLowerCase('tr').includes(ara.trim().toLocaleLowerCase('tr')))
    : [];
  const doluSatirlar = satirlar.filter((s) => s.tarih).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));

  function oku() {
    const r = fiksturOku(yapistir, bugun());
    if (!r.satirlar.length) return setHata('Yapıştırılan metinde tarih bulunamadı. Tarihler 07.12.2026, 7.12 ya da 7 Aralık gibi yazılmalı.');
    setHata('');
    setSatirlar([...doluSatirlar, ...r.satirlar].sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)));
    setOkunamayan(r.okunamayan);
    setYapistir('');
  }
  const satirDegis = (i, alan, v) => setSatirlar(satirlar.map((s, j) => (j === i ? { ...s, [alan]: v } : s)));

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (f.kapsam === 'secili' && !f.grupIds.length && !f.kisiIds.length) return setHata('Etkinliğin kimleri kapsadığını seç ya da "Herkes"i işaretle.');
    const ortak = { tur: f.tur, yer: f.yer, kapsam: f.kapsam, not: f.not, grupIds: f.kapsam === 'herkes' ? [] : f.grupIds, kisiIds: f.kapsam === 'herkes' ? [] : f.kisiIds };
    let liste;
    if (coklu) {
      if (!doluSatirlar.length) return setHata('En az bir tarih girin.');
      liste = doluSatirlar.map((s) => ({ ...ortak, tarih: s.tarih, saat: s.saat || '', ad: (s.ad || f.ad).trim() }));
    } else {
      if (!f.tarih) return setHata('Tarih gerekli.');
      liste = [{ ...ortak, tarih: f.tarih, saat: f.saat, ad: f.ad.trim() }];
    }
    setBekliyor(true);
    try {
      await onKaydet(liste);
    } catch (err) {
      setHata(hataMesaji(err));
      setBekliyor(false);
    }
  }

  return (
    <form className="kart-form" onSubmit={kaydet}>
      <h3>{ilk ? 'Etkinliği düzenle' : 'Yeni etkinlik'}</h3>
      <div className="secim-cubugu" role="radiogroup" aria-label="Etkinlik türü">
        {Object.entries(ETKINLIK_TURU).map(([v, ad]) => (
          <button type="button" key={v} role="radio" aria-checked={f.tur === v} className={'secim' + (f.tur === v ? ' secili' : '')} onClick={() => setF({ ...f, tur: v })}>
            {ETKINLIK_SIMGE[v]} {ad}
          </button>
        ))}
      </div>
      {!ilk && (
        <div className="secim-cubugu" role="radiogroup" aria-label="Tarih sayısı">
          {[[false, 'Tek tarih'], [true, 'Birden fazla tarih (fikstür)']].map(([v, ad]) => (
            <button type="button" key={ad} role="radio" aria-checked={coklu === v} className={'secim' + (coklu === v ? ' secili' : '')} onClick={() => setCoklu(v)}>
              {ad}
            </button>
          ))}
        </div>
      )}
      <div className="form-izgara">
        <label className="alan">
          <span>{coklu ? 'Başlık (satırda başlık yoksa)' : 'Başlık'}</span>
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder={f.tur === 'mac' ? 'Örn. Lig maçı' : ''} />
        </label>
        {!coklu && <label className="alan"><span>Tarih</span><input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} /></label>}
        {!coklu && <label className="alan"><span>Saat (isteğe bağlı)</span><input type="time" value={f.saat} onChange={(e) => setF({ ...f, saat: e.target.value })} /></label>}
        <label className="alan"><span>Yer</span><input value={f.yer} onChange={(e) => setF({ ...f, yer: e.target.value })} /></label>
      </div>

      {coklu && (
        <div className="alan fikstur">
          <span>Fikstürü yapıştır (WhatsApp mesajı)</span>
          <textarea
            rows={4}
            value={yapistir}
            onChange={(e) => setYapistir(e.target.value)}
            placeholder={'Örn.\n07.12 Cumartesi 14:00 Beşiktaş deplasman\n14.12 11.30 Fenerbahçe'}
          />
          <div className="dugme-satiri">
            <button type="button" className="ikincil kucuk" disabled={!yapistir.trim()} onClick={oku}>Tarihleri oku</button>
          </div>
          {okunamayan.length > 0 && (
            <small className="ipucu">Tarih bulunamadığı için atlanan satırlar: {okunamayan.join(' · ')}</small>
          )}
          <span>Tarihler ({doluSatirlar.length})</span>
          <div className="fikstur-satirlar">
            {satirlar.map((s, i) => (
              <div key={i} className="fikstur-satir">
                <input type="date" value={s.tarih} onChange={(e) => satirDegis(i, 'tarih', e.target.value)} aria-label="Tarih" />
                <span className="aciklama kucuk-yazi fikstur-gun">{s.tarih ? gunAdi(s.tarih) : ''}</span>
                <input type="time" value={s.saat} onChange={(e) => satirDegis(i, 'saat', e.target.value)} aria-label="Saat" />
                <input value={s.ad} onChange={(e) => satirDegis(i, 'ad', e.target.value)} placeholder={f.ad || 'Başlık'} aria-label="Başlık" />
                <button type="button" className="metin" aria-label="Satırı sil" onClick={() => setSatirlar(satirlar.length > 1 ? satirlar.filter((_, j) => j !== i) : [{ tarih: '', saat: '', ad: '' }])}>×</button>
              </div>
            ))}
          </div>
          <div className="dugme-satiri">
            <button type="button" className="metin" onClick={() => setSatirlar([...satirlar, { tarih: '', saat: '', ad: '' }])}>+ Tarih ekle</button>
          </div>
        </div>
      )}

      <div className="alan">
        <span>Kimleri kapsıyor?</span>
        <div className="secim-cubugu" role="radiogroup" aria-label="Kapsam">
          {[['secili', 'Seçili grup / kişiler'], ['herkes', 'Herkes']].map(([v, ad]) => (
            <button type="button" key={v} role="radio" aria-checked={f.kapsam === v} className={'secim' + (f.kapsam === v ? ' secili' : '')} onClick={() => setF({ ...f, kapsam: v })}>
              {ad}
            </button>
          ))}
        </div>
      </div>
      {f.kapsam === 'secili' && (
        <>
          {gruplar.length > 0 && (
            <div className="alan">
              <span>Gruplar</span>
              <div className="cip-grubu">
                {gruplar.filter((g) => g.aktif !== false && !g.sadeceOdeme).map((g) => {
                  const acik = f.grupIds.includes(g.id);
                  return (
                    <button type="button" key={g.id} className={'cip' + (acik ? ' secili' : '')} aria-pressed={acik} onClick={() => setF({ ...f, grupIds: acik ? f.grupIds.filter((x) => x !== g.id) : [...f.grupIds, g.id] })}>
                      {g.ad}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="alan">
            <span>Kişiler ({f.kisiIds.length})</span>
            <div className="cip-grubu">
              {f.kisiIds.map((id) => (
                <button type="button" key={id} className="cip secili" onClick={() => setF({ ...f, kisiIds: f.kisiIds.filter((x) => x !== id) })}>
                  {kisiler.find((k) => k.id === id)?.ad || 'Kişi'} ×
                </button>
              ))}
            </div>
            <input type="search" placeholder="Kişi eklemek için isim ara" value={ara} onChange={(e) => setAra(e.target.value)} />
            {adaylar.length > 0 && (
              <div className="cip-grubu">
                {adaylar.slice(0, 10).map((k) => (
                  <button type="button" key={k.id} className="cip" onClick={() => { setF({ ...f, kisiIds: [...f.kisiIds, k.id] }); setAra(''); }}>+ {k.ad}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <label className="alan"><span>Not</span><input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} /></label>
      {(f.tur === 'mac' || f.tur === 'turnuva') && (
        <p className="aciklama kucuk-yazi">Maç ve turnuvalar, "maç gününe göre" planlanmış bloklarda seansların yerini belirler (MD-4, MD-2…).</p>
      )}
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : coklu ? `${doluSatirlar.length} etkinliği kaydet` : 'Kaydet'}
        </button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
        {ilk && onSil && (
          <button type="button" className="metin tehlike" onClick={onSil}>Sil</button>
        )}
      </div>
      {coklu && doluSatirlar.length > 0 && (
        <p className="aciklama kucuk-yazi">İlk: {kisaTarih(doluSatirlar[0].tarih)} · son: {kisaTarih(doluSatirlar[doluSatirlar.length - 1].tarih)}</p>
      )}
    </form>
  );
}
