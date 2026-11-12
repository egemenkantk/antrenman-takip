import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { subeleriGetir, kullanicilariGetir, kisileriGetir, TIP_ADI } from '../veri';
import { gruplariGetir, grupKaydet, grupDurum } from '../gruplar/veri';
import { HAFTA_GUNLERI } from '../program/model';
import ProgramSekmesi from '../program/ProgramSekmesi';
import GrupOdemeleri, { DuetOdemeleri } from '../paket/GrupOdemeleri';
import { paketTanimlariGetir, grupKaydiOlustur, grupDonemKayitlari } from '../paket/veri';
import { donemBul, tl, GRUP_DERS_TURU, TUR_KISA } from '../paket/model.js';
import { bugun } from '../program/model';

const GUN_ADI = Object.fromEntries(HAFTA_GUNLERI);
export const saatOzeti = (saatler = {}) =>
  HAFTA_GUNLERI.filter(([g]) => saatler[g] != null)
    .map(([g, ad]) => `${ad} ${saatler[g] || ''}`.trim())
    .join(' · ');

function GrupForm({ ilk, subeler, koclar, kisiler, tanimlar, onKaydet, onVazgec }) {
  const [f, setF] = useState({
    ad: ilk?.ad || '',
    subeId: ilk?.subeId || subeler[0]?.id || '',
    kocIds: ilk?.kocIds || [],
    saatler: ilk?.saatler || {},
    sure: ilk?.sure || 60,
    not: ilk?.not || '',
    uyeIds: ilk?.uyeIds || [],
    dersTuru: ilk?.dersTuru || 'grup',
    paketTanimId: ilk?.paketTanimId || '',
    donemBaslangic: ilk?.donemBaslangic || '',
  });
  const [ara, setAra] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const adaylar = useMemo(() => {
    const a = ara.trim().toLocaleLowerCase('tr');
    return kisiler.filter(
      (k) => k.aktif !== false && !f.uyeIds.includes(k.id) && (!a || k.ad.toLocaleLowerCase('tr').includes(a))
    );
  }, [kisiler, ara, f.uyeIds]);

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (!f.ad.trim()) return setHata('Grup adı gerekli.');
    if (!Object.keys(f.saatler).length) return setHata('En az bir ders günü seç.');
    setBekliyor(true);
    try {
      if (f.dersTuru !== 'grup') {
        f.paketTanimId = '';
        f.donemBaslangic = '';
      }
      if (f.paketTanimId && !f.donemBaslangic) {
        setBekliyor(false);
        return setHata('Dönem ücreti seçildiyse ilk dönemin başlangıç tarihi de girilmeli.');
      }
      // Sonradan eklenen üyelerin katılım tarihi: dönem ortası ücreti bundan hesaplanır
      const uyeKatilim = { ...(ilk?.uyeKatilim || {}) };
      if (ilk) for (const id of f.uyeIds) if (!(ilk.uyeIds || []).includes(id) && !uyeKatilim[id]) uyeKatilim[id] = bugun();
      await onKaydet({ ...f, ad: f.ad.trim(), sure: Number(f.sure) || 60, uyeKatilim });
    } catch (err) {
      setHata(hataMesaji(err));
      setBekliyor(false);
    }
  }

  return (
    <form className="kart-form" onSubmit={kaydet}>
      <h3>{ilk ? 'Grubu düzenle' : 'Yeni grup'}</h3>
      <div className="form-izgara">
        <label className="alan">
          <span>Grup adı</span>
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder="Örn. Salı-Perşembe 16:00" />
        </label>
        <label className="alan">
          <span>Şube</span>
          <select value={f.subeId} onChange={(e) => setF({ ...f, subeId: e.target.value })}>
            {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Seans süresi (dk)</span>
          <input type="number" min="10" max="240" value={f.sure} onChange={(e) => setF({ ...f, sure: e.target.value })} />
        </label>
      </div>

      <label className="alan">
        <span>Ders türü</span>
        <select value={f.dersTuru} onChange={(e) => setF({ ...f, dersTuru: e.target.value })}>
          {Object.entries(GRUP_DERS_TURU).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
        </select>
      </label>
      {f.dersTuru !== 'grup' ? (
        <small className="ipucu">
          {TUR_KISA[f.dersTuru]}: herkes kendi {TUR_KISA[f.dersTuru].toLowerCase()} paketini alır (kişi kartından). Yoklamada gelenlerin paketinden ders düşer; eksik katılımda fark ücretini sen eklersin.
        </small>
      ) : (
      <>
      <div className="form-izgara">
        <label className="alan">
          <span>Dönem ücreti (4 hafta)</span>
          <select value={f.paketTanimId} onChange={(e) => setF({ ...f, paketTanimId: e.target.value })}>
            <option value="">Seçilmedi</option>
            {tanimlar
              .filter((t) => t.tur === 'grup' && (t.aktif !== false || t.id === f.paketTanimId) && (!t.subeId || t.subeId === f.subeId))
              .map((t) => <option key={t.id} value={t.id}>{t.ad} · {tl(t.fiyat)}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>İlk dönemin başlangıcı</span>
          <input type="date" value={f.donemBaslangic} onChange={(e) => setF({ ...f, donemBaslangic: e.target.value })} />
        </label>
      </div>
      <small className="ipucu">Dönemler bu tarihten itibaren 4'er hafta ilerler. Grup paketlerini "Paketler ve ödemeler → Paket tanımları"ndan eklersin.</small>
      </>
      )}

      <div className="alan">
        <span>Ders günleri ve saatleri</span>
        <div className="gun-saat-izgara">
          {HAFTA_GUNLERI.map(([g, ad]) => {
            const acik = f.saatler[g] != null;
            return (
              <div key={g} className={'gun-saat' + (acik ? ' acik' : '')}>
                <label className="onay-kutusu">
                  <input
                    type="checkbox"
                    checked={acik}
                    onChange={(e) => {
                      const s = { ...f.saatler };
                      if (e.target.checked) s[g] = '';
                      else delete s[g];
                      setF({ ...f, saatler: s });
                    }}
                  />
                  <span>{ad}</span>
                </label>
                {acik && (
                  <input
                    type="time"
                    value={f.saatler[g]}
                    onChange={(e) => setF({ ...f, saatler: { ...f.saatler, [g]: e.target.value } })}
                    aria-label={`${ad} saati`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="alan">
        <span>Koç(lar)</span>
        <div className="cip-grubu">
          {koclar.map((k) => {
            const acik = f.kocIds.includes(k.id);
            return (
              <button
                type="button"
                key={k.id}
                className={'cip' + (acik ? ' secili' : '')}
                aria-pressed={acik}
                onClick={() => setF({ ...f, kocIds: acik ? f.kocIds.filter((x) => x !== k.id) : [...f.kocIds, k.id] })}
              >
                {k.ad}
              </button>
            );
          })}
        </div>
        <small className="ipucu">Grubun koçları üyelerin kartlarını görür ve yoklama girebilir.</small>
      </div>

      <div className="alan">
        <span>Üyeler ({f.uyeIds.length})</span>
        <div className="cip-grubu">
          {f.uyeIds.map((id) => {
            const k = kisiler.find((x) => x.id === id);
            return (
              <button
                type="button"
                key={id}
                className="cip secili"
                onClick={() => setF({ ...f, uyeIds: f.uyeIds.filter((x) => x !== id) })}
                aria-label={`${k?.ad || 'Kişi'} grubundan çıkar`}
              >
                {k?.ad || 'Silinmiş kişi'} ×
              </button>
            );
          })}
        </div>
        <input type="search" placeholder="Üye eklemek için isim ara" value={ara} onChange={(e) => setAra(e.target.value)} />
        {ara.trim() && (
          <div className="cip-grubu">
            {adaylar.slice(0, 12).map((k) => (
              <button type="button" key={k.id} className="cip" onClick={() => { setF({ ...f, uyeIds: [...f.uyeIds, k.id] }); setAra(''); }}>
                + {k.ad}
              </button>
            ))}
            {adaylar.length === 0 && <small className="ipucu">Eşleşen kişi yok.</small>}
          </div>
        )}
      </div>

      <label className="alan">
        <span>Not</span>
        <input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} placeholder="Seviye, salon, dikkat edilecekler" />
      </label>

      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

export default function Gruplar({ onGeri }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yonetici = ben.rol === 'yonetici';
  const programYetkisi = yonetici || (ben.ekYetkiler || []).includes('programDuzenle');
  const [gruplar, setGruplar] = useState(null);
  const [subeler, setSubeler] = useState([]);
  const [koclar, setKoclar] = useState([]);
  const [kisiler, setKisiler] = useState([]);
  const [tanimlar, setTanimlar] = useState([]);
  const [secili, setSecili] = useState(null);
  const [mod, setMod] = useState(null); // null | 'yeni' | 'duzenle'
  const [sekme, setSekme] = useState('uyeler');
  const [pasifler, setPasifler] = useState(false);
  const [hata, setHata] = useState('');

  async function yukle() {
    try {
      const [g, s, u, k, t] = await Promise.all([
        gruplariGetir(ben),
        subeleriGetir(),
        yonetici ? kullanicilariGetir() : Promise.resolve([]),
        kisileriGetir(ben),
        paketTanimlariGetir().catch(() => []),
      ]);
      setTanimlar(t);
      setGruplar(g);
      setSubeler(s);
      setKoclar(u.filter((x) => (x.rol === 'koc' || x.rol === 'yonetici') && x.aktif !== false));
      setKisiler(k);
    } catch (e) {
      setHata(hataMesaji(e));
      setGruplar([]);
    }
  }
  useEffect(() => {
    yukle();
  }, []);

  const kocAdi = (id) => (id === ben.id ? 'Sen' : koclar.find((k) => k.id === id)?.ad || '');
  const g = gruplar?.find((x) => x.id === secili);

  if (mod) {
    return (
      <div>
        <button className="metin geri" onClick={() => setMod(null)}>← Gruplar</button>
        <GrupForm
          ilk={mod === 'duzenle' ? g : null}
          subeler={subeler}
          koclar={koclar}
          kisiler={kisiler}
          tanimlar={tanimlar}
          onVazgec={() => setMod(null)}
          onKaydet={async (veri) => {
            const eski = mod === 'duzenle' ? g : null;
            const id = await grupKaydet(eski, veri, ben.id);
            // Dönem ortasında eklenen üyeler için bu dönemin kaydını hemen aç (orantılı ücret)
            const tanim = tanimlar.find((t) => t.id === veri.paketTanimId);
            const donem = tanim && donemBul(veri.donemBaslangic, bugun());
            const yeniler = eski ? veri.uyeIds.filter((x) => !(eski.uyeIds || []).includes(x)) : [];
            if (donem && yeniler.length) {
              const grup = { ...veri, id };
              const mevcut = await grupDonemKayitlari({ ...grup, uyeIds: yeniler }, donem);
              for (const kid of yeniler) if (!mevcut[kid]) await grupKaydiOlustur(grup, donem, tanim, kid, ben.id);
            }
            setMod(null);
            await yukle();
            setSecili(id);
          }}
        />
      </div>
    );
  }

  if (g) {
    const uyeler = (g.uyeIds || []).map((id) => kisiler.find((k) => k.id === id)).filter(Boolean);
    return (
      <div>
        <button className="metin geri" onClick={() => setSecili(null)}>← Gruplar</button>
        <h2>{g.ad}{g.aktif === false ? ' (pasif)' : ''}</h2>
        <p className="aciklama">
          {g.dersTuru && g.dersTuru !== 'grup' ? `${TUR_KISA[g.dersTuru]} · ` : ''}{saatOzeti(g.saatler)} · {g.sure} dk
          {g.kocIds?.length ? ` · ${g.kocIds.map(kocAdi).filter(Boolean).join(', ')}` : ''}
          {subeler.length > 1 ? ` · ${subeler.find((s) => s.id === g.subeId)?.ad || ''}` : ''}
        </p>
        {g.not && <p className="blok-not">{g.not}</p>}
        <nav className="sekmeler">
          {[['uyeler', `Üyeler (${uyeler.length})`], ['program', 'Grup programı'], ['odeme', 'Ödemeler']].map(([id, ad]) => (
            <button key={id} className={'sekme' + (sekme === id ? ' secili' : '')} onClick={() => setSekme(id)}>{ad}</button>
          ))}
        </nav>
        {sekme === 'uyeler' && (
          <>
            {uyeler.length === 0 ? (
              <p className="aciklama">Grupta üye yok.</p>
            ) : (
              <ul className="bolum-listesi">
                {uyeler.map((k) => (
                  <li key={k.id} className="bolum-karti">
                    {k.foto ? <img className="avatar kucuk-av" src={k.foto} alt="" /> : <div className="avatar kucuk-av" aria-hidden="true">{k.ad.charAt(0)}</div>}
                    <div className="esnek">
                      <strong>{k.ad}</strong>
                      <span>{TIP_ADI[k.tip]}{k.brans ? ` · ${k.brans}` : ''}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="aciklama kucuk-yazi">
              Grup programı ortaktır; her üyenin testleri, sağlık notları ve raporu kendi kartında kişisel kalır.
            </p>
          </>
        )}
        {sekme === 'program' && (
          <ProgramSekmesi sahipTip="grup" sahipId={g.id} sade={false} duzenleyebilir={programYetkisi} yapan={ben.id} />
        )}
        {sekme === 'odeme' && g.dersTuru && g.dersTuru !== 'grup' && (
          <DuetOdemeleri grup={g} kisiler={kisiler} />
        )}
        {sekme === 'odeme' && (!g.dersTuru || g.dersTuru === 'grup') && (
          <GrupOdemeleri
            grup={g}
            kisiler={kisiler}
            tanim={tanimlar.find((t) => t.id === g.paketTanimId)}
            yonetici={yonetici}
            benim={ben.id}
            koclar={koclar}
            onGrupDegisti={yukle}
          />
        )}
        {yonetici && (
          <div className="dugme-satiri" style={{ marginTop: 16 }}>
            <button className="ikincil kucuk" onClick={() => setMod('duzenle')}>Grubu düzenle</button>
            <button
              className="ikincil kucuk"
              onClick={async () => {
                const pasif = g.aktif !== false;
                if (!window.confirm(pasif ? `${g.ad} pasife alınsın mı? Kayıtları silinmez.` : `${g.ad} tekrar aktif edilsin mi?`)) return;
                await grupDurum(g, !pasif);
                await yukle();
              }}
            >
              {g.aktif === false ? 'Aktif et' : 'Pasife al'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const gorunen = (gruplar || []).filter((x) => (pasifler ? x.aktif === false : x.aktif !== false));
  return (
    <div>
      {onGeri && <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>}
      <div className="baslik-satiri">
        <h2>{yonetici ? 'Gruplar' : 'Gruplarım'}</h2>
        {yonetici && (
          <button className="birincil kucuk" onClick={() => setMod('yeni')} disabled={!subeler.length}>+ Yeni grup</button>
        )}
      </div>
      {hata && <p className="hata">{hata}</p>}
      <label className="onay-kutusu" style={{ margin: '10px 0' }}>
        <input type="checkbox" checked={pasifler} onChange={(e) => setPasifler(e.target.checked)} />
        <span>Pasif gruplar</span>
      </label>
      {gruplar === null && <p className="aciklama">Yükleniyor…</p>}
      {gruplar && gorunen.length === 0 && <p className="aciklama">{pasifler ? 'Pasif grup yok.' : 'Henüz grup yok.'}</p>}
      <ul className="bolum-listesi">
        {gorunen.map((x) => (
          <li key={x.id}>
            <button className="bolum-karti acik" onClick={() => { setSecili(x.id); setSekme('uyeler'); }}>
              <div className="esnek">
                <strong>{x.ad}</strong>
                <span>
                  {x.dersTuru && x.dersTuru !== 'grup' ? `${TUR_KISA[x.dersTuru]} · ` : ''}{saatOzeti(x.saatler)} · {(x.uyeIds || []).length} üye
                  {x.kocIds?.length ? ` · ${x.kocIds.map(kocAdi).filter(Boolean).join(', ')}` : ''}
                </span>
              </div>
              <em>Aç →</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
