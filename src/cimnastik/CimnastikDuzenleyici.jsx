// Cimnastik grubu için dönem teması ve ders planı: Isınma · Beceri · Ana bölüm · Oyun · Soğuma (süreli)
import { useState } from 'react';
import { BOLUMLER, BOLUM_RENK, CIM_SIRASI, HAFTA_GUNLERI, HARF, blokBitis, gunEkle, kisaTarih, gunHaftaGunu, toplamSure } from '../program/model';
import { TEMALAR, TEMA_SIRASI, temaGunu, sureDagit } from './model';

const GUN_ADI = Object.fromEntries(HAFTA_GUNLERI);
const kopya = (o) => JSON.parse(JSON.stringify(o));

function uyumla(b, dersSuresi) {
  const n = Math.max(1, (b.haftaGunleri || []).length);
  const gunler = [...(b.gunler || [])];
  while (gunler.length < n) gunler.push(gunler[0] ? kopya(gunler[0]) : { baslik: '', bolumler: [...CIM_SIRASI], icerik: {}, sure: sureDagit(dersSuresi) });
  gunler.length = n;
  return { ...b, gunler };
}

export function yeniCimnastikDonemi({ baslangic, haftaGunleri, dersSuresi, temaId = 'yuvarlanma' }) {
  const t = TEMALAR[temaId];
  const gunler = (haftaGunleri.length ? haftaGunleri : [2, 4]).map(() => temaGunu(temaId, dersSuresi));
  return {
    cimnastik: true,
    sade: false,
    faz: 'cimnastik',
    fazAdi: '',
    tema: t?.ad || '',
    ad: t?.ad || '',
    not: t?.not || '',
    baslangic,
    haftalar: 4,
    plan: 'hafta',
    haftaGunleri: haftaGunleri.length ? haftaGunleri : [2, 4],
    bolumler: [...CIM_SIRASI],
    gunler,
    ilerleme: [],
  };
}

export default function CimnastikDuzenleyici({ ilk, varsayilanBaslangic, varsayilanGunler = [], dersSuresi = 60, onKaydet, onVazgec }) {
  const [b, setB] = useState(() =>
    uyumla(ilk ? kopya(ilk) : yeniCimnastikDonemi({ baslangic: varsayilanBaslangic, haftaGunleri: varsayilanGunler, dersSuresi }), dersSuresi)
  );
  const [temaId, setTemaId] = useState(ilk ? '' : 'yuvarlanma');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const guncelle = (deg) => setB((x) => uyumla({ ...x, ...deg }, dersSuresi));

  function temaSec(id) {
    setTemaId(id);
    if (!id) return;
    const t = TEMALAR[id];
    if (b.gunler.some((g) => CIM_SIRASI.some((k) => String(g.icerik?.[k] || '').trim())) && ilk) {
      if (!window.confirm(`"${t.ad}" önerisi mevcut ders içeriklerinin yerine yazılsın mı?`)) return;
    }
    setB((x) => ({
      ...x,
      tema: t.ad,
      ad: !x.ad || x.ad === x.tema ? t.ad : x.ad,
      not: t.not,
      gunler: x.gunler.map((g) => ({ ...g, icerik: { ...t.icerik } })),
    }));
  }

  function gunGuncelle(i, deg) {
    setB((x) => {
      const gunler = [...x.gunler];
      gunler[i] = { ...gunler[i], ...deg };
      return { ...x, gunler };
    });
  }

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (!b.tema.trim()) return setHata('Dönem teması gerekli.');
    if (!b.baslangic) return setHata('Başlangıç tarihi gerekli.');
    if (!b.haftaGunleri.length) return setHata('En az bir ders günü seç.');
    const temiz = {
      ...b,
      tema: b.tema.trim(),
      ad: (b.ad || '').trim() || b.tema.trim(),
      bolumler: [...CIM_SIRASI],
      gunler: b.gunler.map((g) => ({
        ...g,
        bolumler: [...CIM_SIRASI],
        sure: Object.fromEntries(CIM_SIRASI.map((k) => [k, Number(g.sure?.[k]) || 0])),
      })),
      ilerleme: [],
    };
    setBekliyor(true);
    try {
      await onKaydet(temiz);
    } catch (err) {
      setHata(err?.code === 'permission-denied' ? 'Program düzenleme yetkin yok.' : 'Kaydedilemedi, tekrar dene.');
      setBekliyor(false);
    }
  }

  return (
    <form className="kart-form program-form" onSubmit={kaydet}>
      <h3>{ilk ? 'Dönemi düzenle' : 'Yeni dönem teması'}</h3>

      <div className="form-izgara">
        <label className="alan">
          <span>Hazır tema önerisi</span>
          <select value={temaId} onChange={(e) => temaSec(e.target.value)}>
            <option value="">{ilk ? 'Değiştirme' : 'Boş başla'}</option>
            {TEMA_SIRASI.map((id) => <option key={id} value={id}>{TEMALAR[id].ad}</option>)}
          </select>
          <small className="ipucu">Seçince dönemin hedefi ve ders içeriği önerisi gelir; dilediğin gibi değiştir.</small>
        </label>
        <label className="alan">
          <span>Dönem teması</span>
          <input value={b.tema} onChange={(e) => guncelle({ tema: e.target.value, ad: !b.ad || b.ad === b.tema ? e.target.value : b.ad })} placeholder="Örn. Denge ve dönüşler" />
        </label>
        <label className="alan">
          <span>Başlangıç</span>
          <input type="date" value={b.baslangic} onChange={(e) => guncelle({ baslangic: e.target.value })} />
        </label>
        <label className="alan">
          <span>Hafta sayısı</span>
          <input type="number" min="1" max="16" value={b.haftalar} onChange={(e) => guncelle({ haftalar: Math.max(1, Math.min(16, Number(e.target.value) || 1)) })} />
          <small className="ipucu">Bitiş: {b.baslangic ? kisaTarih(gunEkle(blokBitis(b), -1)) : '—'}</small>
        </label>
      </div>

      <label className="alan">
        <span>Dönemin hedefi (hocaya not)</span>
        <textarea rows={2} value={b.not || ''} onChange={(e) => guncelle({ not: e.target.value })} />
      </label>

      <div className="alan">
        <span>Ders günleri</span>
        <div className="cip-grubu">
          {HAFTA_GUNLERI.map(([v, ad]) => {
            const acik = b.haftaGunleri.includes(v);
            return (
              <button type="button" key={v} className={'cip' + (acik ? ' secili' : '')} aria-pressed={acik}
                onClick={() => guncelle({ haftaGunleri: acik ? b.haftaGunleri.filter((x) => x !== v) : [...b.haftaGunleri, v] })}>
                {ad}
              </button>
            );
          })}
        </div>
      </div>

      <div className="gun-duzen-izgara">
        {b.gunler.map((g, i) => {
          const toplam = toplamSure(g);
          return (
            <fieldset key={i} className="gun-duzen">
              <legend>
                <span className="harf">{HARF[i]}</span> {GUN_ADI[gunHaftaGunu(b, i)] || ''}
              </legend>
              <label className="alan">
                <span>Başlık</span>
                <input value={g.baslik || ''} onChange={(e) => gunGuncelle(i, { baslik: e.target.value })} placeholder="Örn. Takla istasyonları" />
              </label>
              {CIM_SIRASI.map((k) => (
                <div key={k} className="bolum-duzen" style={{ '--bc': BOLUM_RENK[k] }}>
                  <div className="bolum-duzen-ust">
                    <strong>{BOLUMLER[k].ad}</strong>
                    <label className="sure-giris">
                      <input type="number" min="0" max="120" inputMode="numeric" value={g.sure?.[k] ?? ''}
                        onChange={(e) => gunGuncelle(i, { sure: { ...g.sure, [k]: e.target.value === '' ? '' : Number(e.target.value) } })}
                        aria-label={`${BOLUMLER[k].ad} süresi (dakika)`} />
                      <span>dk</span>
                    </label>
                  </div>
                  <textarea rows={4} placeholder="Her satıra bir hareket / etkinlik" value={g.icerik?.[k] || ''}
                    onChange={(e) => gunGuncelle(i, { icerik: { ...g.icerik, [k]: e.target.value } })} />
                </div>
              ))}
              <p className={'aciklama kucuk-yazi' + (toplam && toplam !== dersSuresi ? ' uyari-yazi' : '')}>
                Toplam {toplam} dk{toplam !== dersSuresi ? ` · ders süresi ${dersSuresi} dk` : ''}
              </p>
              {i === 0 && b.gunler.length > 1 && (
                <button type="button" className="metin" onClick={() => setB((x) => ({ ...x, gunler: x.gunler.map((_, j) => (j === 0 ? x.gunler[0] : { ...kopya(x.gunler[0]) })) }))}>
                  Bu dersi diğer günlere kopyala
                </button>
              )}
            </fieldset>
          );
        })}
      </div>

      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}
