import { useEffect, useMemo, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, gunEkle, coz, kisaTarih, uzunTarih, HAFTA_GUNLERI } from '../program/model';
import { tarihGoster } from '../veri';
import { WellnessFormu, WellnessRozeti } from '../bugun/Formlar';
import { wellnessKaydet } from '../bugun/veri';
import { TestlerSekmesi } from '../pages/KisiKayitlari';
import { useKutuphane, EgzersizSatiri } from '../kutuphane/bilesenler';
import { ETKINLIK_TURU, ETKINLIK_SIMGE } from '../takvim/veri';
import { tl, YONTEM_ADI } from '../paket/model.js';
import { portalVerisiGetir, kisiGetir, evProgramiGetir, evYapilanlar, evYapildiKaydet, wellnessGetir } from './veri';

const GUN_ADI = Object.fromEntries(HAFTA_GUNLERI);

// Haftalık ders listesi: bireysel saatler + üyesi olduğu gruplar
function dersPlani(v) {
  const l = [];
  for (const [g, saat] of Object.entries(v.kisi.haftalikSaatler || {})) l.push({ gun: Number(g), saat: saat || '', ad: 'Bireysel antrenman' });
  for (const gr of v.gruplar) for (const [g, saat] of Object.entries(gr.saatler || {})) l.push({ gun: Number(g), saat: saat || '', ad: gr.ad, sube: gr.sube });
  return l;
}
function siradakiDersler(plan, adet = 3) {
  const simdi = new Date();
  const saatSimdi = `${String(simdi.getHours()).padStart(2, '0')}:${String(simdi.getMinutes()).padStart(2, '0')}`;
  const sonuc = [];
  for (let i = 0; i < 14 && sonuc.length < adet; i++) {
    const t = gunEkle(bugun(), i);
    const gun = coz(t).getDay();
    plan
      .filter((d) => d.gun === gun && !(i === 0 && d.saat && d.saat < saatSimdi))
      .sort((a, b) => a.saat.localeCompare(b.saat))
      .forEach((d) => sonuc.push({ ...d, tarih: t }));
  }
  return sonuc.slice(0, adet);
}

function BugunFormu({ kisi, ben, veli, dersGunu, salt }) {
  const tarih = bugun();
  const [w, setW] = useState(undefined);
  const [ac, setAc] = useState(false);
  const [hata, setHata] = useState('');
  useEffect(() => {
    setW(undefined);
    wellnessGetir(kisi.id, tarih).then(setW).catch(() => setW(null));
  }, [kisi.id]);
  if (w === undefined) return null;
  const benimki = w && w.dolduran === ben.id;
  return (
    <section className={'portal-kart' + (!w && dersGunu ? ' vurgulu' : '')}>
      <h3>Bugünkü form</h3>
      {w && !ac && (
        <p className="aciklama">
          Dolduruldu <WellnessRozeti w={w} />
          {benimki && <> · <button className="metin" onClick={() => setAc(true)}>Düzelt</button></>}
          {!benimki && ' · antrenör ya da diğer hesap tarafından'}
        </p>
      )}
      {!w && salt && <p className="aciklama">Bugün doldurulmadı.</p>}
      {!w && !ac && !salt && (
        <>
          <p className="aciklama">
            {dersGunu ? 'Bugün antrenman var. ' : ''}Uyku, enerji, kas ağrısı, stres ve ruh halini 1 dakikada işaretle.
            {veli ? ` Formu ${kisi.ad.split(' ')[0]} kendisi doldursun; telefonu yoksa senin telefonundan doldurabilir.` : ''}
          </p>
          <button className="birincil" onClick={() => setAc(true)}>Formu doldur</button>
        </>
      )}
      {ac && (
        <WellnessFormu
          ilk={benimki ? w : null}
          onVazgec={() => setAc(false)}
          onKaydet={async (v) => {
            setHata('');
            try {
              await wellnessKaydet(kisi.id, tarih, { ...v, dolduranRol: ben.rol }, ben.id);
              setW({ ...v, dolduran: ben.id });
              setAc(false);
            } catch (e) {
              setHata(hataMesaji(e));
            }
          }}
        />
      )}
      {hata && <p className="hata">{hata}</p>}
    </section>
  );
}

function AnaSayfa({ v, ben, veli, git, salt }) {
  const plan = dersPlani(v);
  const siradaki = siradakiDersler(plan);
  const bugunDers = siradaki.some((d) => d.tarih === bugun());
  const bireysel = v.paketler.filter((p) => p.kalanDers > 0 || (p.tur === 'abonelik' && p.donemBas));
  const borc = v.paketler.reduce((t, p) => t + p.kalan, 0);
  return (
    <div className="portal-izgara">
      <section className="portal-kart">
        <h3>Sıradaki ders</h3>
        {siradaki.length === 0 ? (
          <p className="aciklama">Planlı ders saati yok.</p>
        ) : (
          <ul className="sade-liste">
            {siradaki.map((d, i) => (
              <li key={i}>
                <strong>{d.tarih === bugun() ? 'Bugün' : d.tarih === gunEkle(bugun(), 1) ? 'Yarın' : uzunTarih(d.tarih)}</strong>
                {d.saat ? ` ${d.saat}` : ''} · {d.ad}
              </li>
            ))}
          </ul>
        )}
      </section>
      <BugunFormu kisi={v.kisi} ben={ben} veli={veli} dersGunu={bugunDers} salt={salt} />
      {(bireysel.length > 0 || borc > 0) && (
        <section className="portal-kart">
          <h3>Paket</h3>
          {bireysel.map((p) => (
            <p key={p.id}><strong>{p.tur === 'abonelik' ? p.abonelik.kalan : p.kalanDers}</strong> ders kaldı · {p.ad}{p.tur === 'abonelik' ? ' (bu ay)' : ''}</p>
          ))}
          {borc > 0 && <p>Kalan ödeme <strong>{tl(borc)}</strong></p>}
          <button className="metin" onClick={() => git('paket')}>Ayrıntı →</button>
        </section>
      )}
      {v.etkinlikler.length > 0 && (
        <section className="portal-kart">
          <h3>Yaklaşan</h3>
          <ul className="sade-liste">
            {v.etkinlikler.slice(0, 3).map((e, i) => (
              <li key={i}>{ETKINLIK_SIMGE[e.tur]} {kisaTarih(e.tarih)}{e.saat ? ` ${e.saat}` : ''} · {e.ad || ETKINLIK_TURU[e.tur]}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Takvimim({ v }) {
  const plan = dersPlani(v);
  return (
    <div>
      <h3>Haftalık ders saatleri</h3>
      {plan.length === 0 ? (
        <p className="aciklama">Planlı ders saati yok.</p>
      ) : (
        <ul className="sade-liste">
          {HAFTA_GUNLERI.filter(([g]) => plan.some((d) => d.gun === g)).map(([g, ad]) => (
            <li key={g}>
              <strong>{ad}</strong>{' '}
              {plan
                .filter((d) => d.gun === g)
                .sort((a, b) => a.saat.localeCompare(b.saat))
                .map((d) => `${d.saat || ''} ${d.ad}${d.sube ? ` (${d.sube})` : ''}`.trim())
                .join(' · ')}
            </li>
          ))}
        </ul>
      )}
      <p className="aciklama kucuk-yazi">Erteleme ve iptal için antrenörüne WhatsApp'tan yaz.</p>
      <h3>Maç, turnuva ve test günleri</h3>
      {v.etkinlikler.length === 0 ? (
        <p className="aciklama">Önümüzdeki 2 ayda planlı etkinlik yok.</p>
      ) : (
        <ul className="sade-liste">
          {v.etkinlikler.map((e, i) => (
            <li key={i}>
              {ETKINLIK_SIMGE[e.tur]} <strong>{uzunTarih(e.tarih)}</strong>{e.saat ? ` ${e.saat}` : ''} · {e.ad || ETKINLIK_TURU[e.tur]}
              {e.yer ? ` · ${e.yer}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Programim({ kisiId, ben, salt }) {
  const kutuphane = useKutuphane();
  const [p, setP] = useState(undefined);
  const [yapilan, setYapilan] = useState({});
  const [hata, setHata] = useState('');
  const tarih = bugun();
  const haftaBasi = gunEkle(tarih, -((coz(tarih).getDay() + 6) % 7));
  const yukle = async () => {
    try {
      const [e, y] = await Promise.all([evProgramiGetir(kisiId), evYapilanlar(kisiId, haftaBasi)]);
      setP(e);
      setYapilan(Object.fromEntries(y.map((x) => [x.tarih, x])));
    } catch (err) {
      setHata(hataMesaji(err));
      setP(null);
    }
  };
  useEffect(() => {
    yukle();
  }, [kisiId]);
  if (p === undefined) return <p className="aciklama">Yükleniyor…</p>;
  if (!p || p.aktif === false || !p.egzersizler?.length) {
    return <div className="bos-durum"><p>Henüz ev programın yok. Antrenörün hazırlayınca burada görünecek.</p></div>;
  }
  const bugunku = yapilan[tarih]?.yapilanlar || [];
  const haftaGun = Object.values(yapilan).filter((x) => (x.yapilanlar || []).length > 0).length;
  const isaretle = async (ad) => {
    const yeni = bugunku.includes(ad) ? bugunku.filter((x) => x !== ad) : [...bugunku, ad];
    setHata('');
    try {
      await evYapildiKaydet(kisiId, tarih, yeni, ben.id);
      setYapilan({ ...yapilan, [tarih]: { tarih, yapilanlar: yeni } });
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  return (
    <div>
      <p className="aciklama">
        Bu hafta {haftaGun}/{p.haftalikGun || 3} gün. Yaptıklarını işaretle; videosu olan egzersizde ▶'a dokun.
      </p>
      {p.not && <p className="blok-not">{p.not}</p>}
      <ul className="ev-portal-listesi">
        {p.egzersizler.map((e, i) => (
          <li key={i}>
            <label className="onay-satir">
              <input type="checkbox" disabled={salt} checked={bugunku.includes(e.ad)} onChange={() => isaretle(e.ad)} />
              <span className="esnek">
                <ul className="satir-ici-liste"><EgzersizSatiri satir={`${e.ad}${e.doz ? ` — ${e.doz}` : ''}`} kutuphane={kutuphane} /></ul>
                {e.not && <small className="aciklama">{e.not}</small>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {hata && <p className="hata">{hata}</p>}
    </div>
  );
}

function Paketim({ v }) {
  const aktif = v.paketler.filter((p) => p.tur === 'abonelik' || p.kalan > 0 || p.kalanDers > 0 || ((p.tur === 'grup' || p.tur === 'abonelikDonem') && p.donemBit >= bugun()));
  const eski = v.paketler.filter((p) => !aktif.includes(p));
  const kart = (p) => p.tur === 'abonelik' ? (
    <li key={p.id} className="paket-karti">
      <div className="paket-ust">
        <div className="esnek">
          <strong>{p.ad}</strong>
          <span className="aciklama kucuk-yazi">
            Aylık abonelik · {tarihGoster(p.baslangic)} başlangıç
            {p.abonelik.taahhutAy ? ` · en az ${p.abonelik.taahhutAy} ay (şu an ${p.abonelik.ay}. ay)` : ''}
          </span>
        </div>
      </div>
      {p.donemBas && (
        <div className="ders-sayac">
          <div className="ilerleme-cubuk" aria-hidden="true">
            <span style={{ width: `${Math.min(100, ((p.abonelik.geldi + p.abonelik.yanan) / (p.abonelik.hak || 1)) * 100)}%` }} />
          </div>
          <span>
            Bu ay ({kisaTarih(p.donemBas)} – {kisaTarih(p.donemBit)}): {p.abonelik.hak} dersten {p.abonelik.geldi} yapıldı
            {p.abonelik.ertelenen ? ` · ${p.abonelik.ertelenen} ertelendi` : ''}
            {p.abonelik.yanan ? ` · ${p.abonelik.yanan} habersiz` : ''} · <strong>{p.abonelik.kalan} kaldı</strong>
          </span>
        </div>
      )}
    </li>
  ) : (
    <li key={p.id} className="paket-karti">
      <div className="paket-ust">
        <div className="esnek">
          <strong>{p.ad}</strong>
          <span className="aciklama kucuk-yazi">
            {p.tur === 'grup' || p.tur === 'abonelikDonem' ? `Dönem ${kisaTarih(p.donemBas)} – ${kisaTarih(p.donemBit)}` : p.tur === 'ek' ? tarihGoster(p.baslangic) : `${tarihGoster(p.baslangic)} başlangıç`}
          </span>
        </div>
      </div>
      {p.dersSayisi != null && (
        <div className="ders-sayac">
          <div className="ilerleme-cubuk" aria-hidden="true">
            <span style={{ width: `${Math.min(100, ((p.kullanilan || 0) / (p.dersSayisi || 1)) * 100)}%` }} />
          </div>
          <span>{p.dersSayisi} dersten {p.kullanilan} yapıldı · <strong>{p.kalanDers} kalan</strong></span>
        </div>
      )}
      <div className="paket-tutar">
        <span>Ücret <strong>{tl(p.fiyat)}</strong></span>
        <span>Ödenen <strong>{tl(p.odenen)}</strong></span>
        <span>Kalan <strong className={p.kalan > 0 ? 'uyari-yazi' : ''}>{tl(p.kalan)}</strong></span>
      </div>
    </li>
  );
  return (
    <div>
      {aktif.length === 0 ? <div className="bos-durum"><p>Aktif paket yok.</p></div> : <ul className="paket-listesi">{aktif.map(kart)}</ul>}
      <p className="aciklama kucuk-yazi">Ödemeler sitede alınmaz; antrenörüne yaptığın ödemeler burada görünür.</p>
      {v.odemeler.length > 0 && (
        <>
          <h3>Ödeme geçmişi</h3>
          <ul className="sade-liste">
            {v.odemeler.map((o, i) => (
              <li key={i}>{tarihGoster(o.tarih)} · <strong>{tl(o.tutar)}</strong> · {YONTEM_ADI[o.yontem] || o.yontem}</li>
            ))}
          </ul>
        </>
      )}
      {eski.length > 0 && (
        <details>
          <summary>Biten paketler ({eski.length})</summary>
          <ul className="paket-listesi">{eski.map(kart)}</ul>
        </details>
      )}
    </div>
  );
}

const SAYFALAR = [
  ['ana', 'Ana sayfa'],
  ['takvim', 'Takvim'],
  ['program', 'Ev programı'],
  ['gelisim', 'Gelişim'],
  ['paket', 'Paket ve ödemeler'],
];

// Öğrenci/danışan ve veli ekranı. Yönetici bir kişinin portalını önizleyebilir (onizlemeKisiId).
export default function Portal({ ben, onizlemeKisiId }) {
  const kisiIds = onizlemeKisiId ? [onizlemeKisiId] : ben.bagliKisiler || [];
  const veli = ben.rol === 'veli';
  const [secili, setSecili] = useState(kisiIds[0] || null);
  const [adlar, setAdlar] = useState({});
  const [sayfa, setSayfa] = useState('ana');
  const [v, setV] = useState(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (kisiIds.length < 2) return;
    Promise.all(kisiIds.map((id) => kisiGetir(id).catch(() => null))).then((l) =>
      setAdlar(Object.fromEntries(l.filter(Boolean).map((k) => [k.id, k.ad])))
    );
  }, [kisiIds.join()]);

  useEffect(() => {
    if (!secili) return;
    setV(null);
    setHata('');
    portalVerisiGetir(secili).then(setV).catch((e) => setHata(hataMesaji(e)));
  }, [secili]);

  const ilkAd = useMemo(() => (v?.kisi.ad || '').split(' ')[0], [v]);

  if (!kisiIds.length) {
    return (
      <div className="bos-durum">
        <p>Hesabın henüz bir sporcuya ya da danışana bağlanmadı. Antrenörüne haber verirsen bağlayacak.</p>
      </div>
    );
  }

  return (
    <div>
      {kisiIds.length > 1 && (
        <div className="cip-grubu" style={{ marginBottom: 12 }} role="group" aria-label="Çocuk seç">
          {kisiIds.map((id) => (
            <button key={id} className={'cip' + (id === secili ? ' secili' : '')} aria-pressed={id === secili} onClick={() => setSecili(id)}>
              {adlar[id] || '…'}
            </button>
          ))}
        </div>
      )}
      {onizlemeKisiId && <p className="uyari-kutu kucuk-yazi">Önizleme: öğrenci ve velinin gördüğü ekran. Liste fiyatı, koç notları ve diğer kişiler görünmez.</p>}
      {!onizlemeKisiId && <h2>{veli ? v?.kisi.ad || '' : `Merhaba${ilkAd ? `, ${ilkAd}` : ''}`}</h2>}
      <nav className="sekmeler" aria-label="Portal bölümleri">
        {SAYFALAR.map(([id, ad]) => (
          <button key={id} className={'sekme' + (sayfa === id ? ' secili' : '')} onClick={() => setSayfa(id)}>{ad}</button>
        ))}
      </nav>
      {hata && <p className="hata">{hata}</p>}
      {!v && !hata && <p className="aciklama">Yükleniyor…</p>}
      {v && sayfa === 'ana' && <AnaSayfa v={v} ben={ben} veli={veli} git={setSayfa} salt={!!onizlemeKisiId} />}
      {v && sayfa === 'takvim' && <Takvimim v={v} />}
      {v && sayfa === 'program' && <Programim kisiId={v.kisi.id} ben={ben} salt={!!onizlemeKisiId} />}
      {v && sayfa === 'gelisim' && <TestlerSekmesi kisiId={v.kisi.id} duzenleyebilir={false} yapan={ben.id} />}
      {v && sayfa === 'paket' && <Paketim v={v} />}
    </div>
  );
}
