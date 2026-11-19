import { useEffect, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { donemBul, donemNo, odemeDurumu, tl, dersleriDagit, TUR_KISA, ortakPayi, bizeKalanTutar } from './model.js';
import { grupDonemKayitlari, grupKaydiOlustur, kisiOdemeleri, kisiPaketleri, bireyselKayitlar, odemeEkle, grupOzelFiyat, paketGuncelle, katilimGuncelle, donemDahilAyarla, DONEM_HARIC, KATILIM_ONCESI } from './veri';
import { orantiliUcret } from './model.js';
import { DurumRozeti, OdemeFormu, OdemeListesi } from './bilesenler';
import { AraHaftalar, GecmisAktarim, AktarimListesi } from './DonemAraclari';
import { kisiEkle, kisiGuncelle } from '../veri';
import { grupKaydet } from '../gruplar/veri';

// Sadece ödeme grubu: kişi kartı açmadan isim (+ kısa not) ile üye ekleme
function IsimleUyeEkle({ grup, tanim, benim, onEklendi }) {
  const [f, setF] = useState({ ad: '', not: '', katilim: '' });
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  async function ekle(e) {
    e.preventDefault();
    const ad = f.ad.trim();
    if (!ad || bekliyor) return;
    setHata('');
    setBekliyor(true);
    try {
      const id = await kisiEkle({ ad, not: f.not.trim(), sadeceOdeme: true, tip: 'sporcu', subeIds: grup.subeId ? [grup.subeId] : [], kocIds: [] }, benim);
      const uyeKatilim = f.katilim ? { ...(grup.uyeKatilim || {}), [id]: f.katilim } : grup.uyeKatilim || {};
      const uyeIds = [...(grup.uyeIds || []), id];
      await grupKaydet(grup, { uyeIds, uyeKatilim }, benim);
      // Şu anki dönemin kaydını hemen aç (sonradan katılımda ücret kalan haftalara göre)
      const simdiki = donemBul(grup.donemBaslangic, bugun(), grup.donemAralari);
      if (simdiki && !(f.katilim && f.katilim > simdiki.bit)) await grupKaydiOlustur({ ...grup, uyeIds, uyeKatilim }, simdiki, tanim, id, benim);
      setF({ ad: '', not: '', katilim: f.katilim });
      await onEklendi?.(ad);
    } catch (err) {
      setHata(hataMesaji(err));
    }
    setBekliyor(false);
  }
  return (
    <form className="kart-form ic-form" onSubmit={ekle}>
      <strong>İsimle üye ekle</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>Ad soyad</span>
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder="Örn. Ayşe Yılmaz" />
        </label>
        <label className="alan">
          <span>Kısa not (isteğe bağlı)</span>
          <input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} placeholder="Örn. kardeşi de grupta" />
        </label>
        <label className="alan">
          <span>Gruba katılım</span>
          <input type="date" value={f.katilim} onChange={(e) => setF({ ...f, katilim: e.target.value })} />
        </label>
      </div>
      <small className="ipucu">Katılım boşsa grubun başından beri üye sayılır. Kişi kartı açılmaz; Kişiler listesinde ve Bugün ekranında görünmez.</small>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={!f.ad.trim() || bekliyor}>{bekliyor ? 'Ekleniyor…' : 'Ekle'}</button>
      </div>
    </form>
  );
}

function NotDuzenle({ k, onBitti }) {
  const [not, setNot] = useState(k.not || '');
  const [hata, setHata] = useState('');
  return (
    <form
      className="ic-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await kisiGuncelle(k.id, { not: not.trim() });
          await onBitti(true);
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <label className="alan">
        <span>Not</span>
        <input value={not} onChange={(e) => setNot(e.target.value)} autoFocus />
      </label>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Kaydet</button>
        <button type="button" className="metin" onClick={() => onBitti(false)}>Vazgeç</button>
      </div>
    </form>
  );
}

function OzelUcretFormu({ grup, kisi, tanim, kayit, donem, benim, onBitti }) {
  const ozel = grup.ozelFiyatlar?.[kisi.id];
  const [fiyat, setFiyat] = useState(ozel?.fiyat ?? tanim.fiyat);
  const [not, setNot] = useState(ozel?.not || '');
  const [buDonem, setBuDonem] = useState(true);
  const [hata, setHata] = useState('');
  const kaydet = async (kaldir) => {
    setHata('');
    try {
      await grupOzelFiyat(grup.id, kisi.id, kaldir ? null : fiyat, not, benim);
      if (buDonem && kayit) {
        const tam = kaldir ? Number(tanim.fiyat) || 0 : Number(fiyat) || 0;
        const katilim = grup.uyeKatilim?.[kisi.id];
        const ortada = katilim && katilim > donem.bas && katilim <= donem.bit;
        await paketGuncelle(kayit, {
          uygulananFiyat: ortada ? orantiliUcret(tam, donem.bas, katilim) : tam,
          fiyatNotu: [kaldir ? '' : `Kişiye özel ücret${not ? ` (${not})` : ''}`, ortada ? 'Dönem ortası katılım (orantılı)' : ''].filter(Boolean).join(' · '),
        }, benim);
      }
      onBitti(true);
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  return (
    <div className="kart-form ic-form">
      <strong>Kişiye özel dönem ücreti</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>4 haftalık ücret (₺) · liste {tl(tanim.fiyat)}</span>
          <input type="number" min="0" value={fiyat} onChange={(e) => setFiyat(e.target.value)} />
        </label>
        <label className="alan">
          <span>Not (kardeş indirimi vb.)</span>
          <input value={not} onChange={(e) => setNot(e.target.value)} />
        </label>
      </div>
      {kayit && (
        <label className="onay-satir kucuk-yazi">
          <input type="checkbox" checked={buDonem} onChange={(e) => setBuDonem(e.target.checked)} /> Bu dönemin kaydına da uygula
        </label>
      )}
      <p className="aciklama kucuk-yazi">Sonraki dönemler bu ücretle açılır. Öğrenci ve veli liste fiyatını görmez.</p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" onClick={() => kaydet(false)}>Kaydet</button>
        {ozel && <button className="metin" onClick={() => kaydet(true)}>Liste fiyatına dön</button>}
        <button className="metin" onClick={() => onBitti(false)}>Vazgeç</button>
      </div>
    </div>
  );
}

function DahilDugmesi({ r, od, onDegis }) {
  if (!r) return null;
  const haric = r.durum === 'iptal' && (r.fiyatNotu === DONEM_HARIC || r.fiyatNotu === KATILIM_ONCESI);
  if (haric) return <button className="metin" onClick={() => onDegis(true)}>Döneme dahil et</button>;
  if (r.durum === 'iptal' || od.odenen > 0) return null;
  return <button className="metin" onClick={() => onDegis(false)}>Bu döneme dahil değil</button>;
}

function KatilimFormu({ grup, kisi, tanim, odemeler, benim, onBitti }) {
  const [tarih, setTarih] = useState(grup.uyeKatilim?.[kisi.id] || '');
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState('');
  const donemler = [];
  const son = (donemBul(grup.donemBaslangic, bugun(), grup.donemAralari)?.no ?? 0) + 1;
  for (let n = 0; n <= son; n++) donemler.push(donemNo(grup.donemBaslangic, n, grup.donemAralari));
  async function kaydet(t) {
    setHata('');
    setBekliyor(true);
    try {
      const r = await katilimGuncelle(grup, kisi.id, t, tanim, odemeler, benim);
      onBitti(true, r);
    } catch (e) {
      setHata(hataMesaji(e));
      setBekliyor(false);
    }
  }
  return (
    <div className="kart-form ic-form">
      <strong>{kisi.ad} · gruba katılım</strong>
      <div className="cip-grubu kucuk" role="group" aria-label="Katıldığı dönem">
        {donemler.map((d) => (
          <button
            type="button"
            key={d.no}
            className={'cip' + (tarih && tarih >= d.bas && tarih <= d.bit ? ' secili' : '')}
            onClick={() => setTarih(d.bas)}
          >
            {d.no + 1}. dönem · {kisaTarih(d.bas)}
          </button>
        ))}
      </div>
      <label className="alan">
        <span>Katılım tarihi (dönem ortasıysa o günü seç)</span>
        <input type="date" value={tarih} min={grup.donemBaslangic} onChange={(e) => setTarih(e.target.value)} />
      </label>
      <p className="aciklama kucuk-yazi">
        Bu tarihten önce biten dönemlerin ödemesi istenmez. Katıldığı dönem ortasıysa ücret kalan haftalara göre hesaplanır.
        Ödeme alınmış dönemlere dokunulmaz.
      </p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor || !tarih} onClick={() => kaydet(tarih)}>Kaydet</button>
        {grup.uyeKatilim?.[kisi.id] && (
          <button className="metin" disabled={bekliyor} onClick={() => kaydet('')}>Grup başından beri</button>
        )}
        <button className="metin" onClick={() => onBitti(false)}>Vazgeç</button>
      </div>
    </div>
  );
}

export default function GrupOdemeleri({ grup, kisiler, tanim, yonetici, yetki = {}, benim, koclar, onGrupDegisti }) {
  // Ek yetkiler: dönem/katılım ayarı (grupOdeme), kişiye özel ücret (ozelFiyat)
  const donemYetki = yonetici || !!yetki.donem;
  const fiyatYetki = yonetici || !!yetki.fiyat;
  const ilk = grup.donemBaslangic ? donemBul(grup.donemBaslangic, bugun(), grup.donemAralari) || donemNo(grup.donemBaslangic, 0, grup.donemAralari) : null;
  const [no, setNo] = useState(ilk?.no ?? 0);
  const [veri, setVeri] = useState(null);
  const [acik, setAcik] = useState(null); // {kisiId, mod: 'odeme'|'liste'}
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [aktarim, setAktarim] = useState(false);
  const donem = grup.donemBaslangic ? donemNo(grup.donemBaslangic, no, grup.donemAralari) : null;

  const yukle = async () => {
    if (!donem) return;
    try {
      const kayitlar = await grupDonemKayitlari(grup, donem);
      const [odemeler, paketler] = await Promise.all([
        Promise.all((grup.uyeIds || []).map((id) => kisiOdemeleri(id).catch(() => []))).then((l) => l.flat()),
        Promise.all((grup.uyeIds || []).map((id) => kisiPaketleri(id).catch(() => []))).then((l) => [...new Map(l.flat().map((p) => [p.id, p])).values()]),
      ]);
      setVeri({ kayitlar, odemeler, paketler });
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  useEffect(() => {
    setVeri(null);
    yukle();
  }, [grup.id, no, (grup.uyeIds || []).join(','), JSON.stringify(grup.donemAralari || [])]);

  async function dahilAyarla(k, r, dahil) {
    setHata('');
    setBilgi('');
    if (!dahil && !window.confirm(`${k.ad} ${donem.no + 1}. dönemden muaf tutulsun mu? Bu dönem için ödeme istenmez.`)) return;
    try {
      await donemDahilAyarla(grup, donem, tanim, k.id, r, dahil, benim);
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  if (!grup.donemBaslangic || !tanim) {
    return (
      <div className="bos-durum">
        <p>
          Dönem ödemeleri için grubun dönem ücreti paketi ve ilk dönem başlangıç tarihi seçilmeli.
          {yonetici ? ' "Grubu düzenle"den ekleyebilirsin.' : ' Yönetici ekleyebilir.'}
        </p>
      </div>
    );
  }

  const tumUyeler = (grup.uyeIds || []).map((id) => kisiler.find((k) => k.id === id) || { id, ad: 'Kişi' });
  // Bu dönemden sonra katılanlar bu dönemde gösterilmez ve ödeme istenmez
  const sonraKatilan = tumUyeler.filter((k) => grup.uyeKatilim?.[k.id] && grup.uyeKatilim[k.id] > donem.bit);
  const uyeler = tumUyeler.filter((k) => !sonraKatilan.includes(k));
  const eksikler = veri ? uyeler.filter((k) => !veri.kayitlar[k.id]) : [];
  const ozet = veri
    ? uyeler.reduce(
        (t, k) => {
          const r = veri.kayitlar[k.id];
          if (!r || r.durum === 'iptal') return t;
          const od = odemeDurumu(r, veri.odemeler);
          t.toplam += Number(r.uygulananFiyat) || 0;
          t.tahsil += od.odenen;
          if (od.durum === 'odendi') t.odeyen++;
          t.kayit++;
          return t;
        },
        { toplam: 0, tahsil: 0, odeyen: 0, kayit: 0 }
      )
    : null;
  const simdi = bugun();

  return (
    <div>
      <div className="donem-gezgin">
        <button className="ikincil kucuk" disabled={no === 0} onClick={() => setNo(no - 1)} aria-label="Önceki dönem">‹</button>
        <div>
          <strong>{no + 1}. dönem · {kisaTarih(donem.bas)} – {kisaTarih(donem.bit)}</strong>
          <span className="aciklama kucuk-yazi">
            {simdi < donem.bas ? 'Henüz başlamadı' : simdi > donem.bit ? 'Bitti' : 'Şu anki dönem'} · Dönem ücreti {tl(tanim.fiyat)}
          </span>
        </div>
        <button className="ikincil kucuk" onClick={() => setNo(no + 1)} aria-label="Sonraki dönem">›</button>
      </div>
      {yonetici && (
        <div className="donem-araclari">
          <AraHaftalar grup={grup} benim={benim} onDegisti={async () => { await onGrupDegisti?.(); }} />
          {!aktarim && <button className="metin" onClick={() => setAktarim(true)}>⇪ Geçmiş dönemleri aktar</button>}
          <AktarimListesi grup={grup} benim={benim} onDegisti={async () => { await onGrupDegisti?.(); await yukle(); }} />
        </div>
      )}
      {aktarim && (
        <GecmisAktarim
          grup={grup}
          kisiler={kisiler}
          tanim={tanim}
          benim={benim}
          onVazgec={() => setAktarim(false)}
          onBitti={async (mesaj) => {
            setAktarim(false);
            setBilgi(mesaj);
            await onGrupDegisti?.();
            await yukle();
          }}
        />
      )}
      {yonetici && grup.sadeceOdeme && (
        <IsimleUyeEkle grup={grup} tanim={tanim} benim={benim} onEklendi={async (ad) => { setBilgi(`${ad} eklendi.`); await onGrupDegisti?.(); }} />
      )}
      {hata && <p className="hata">{hata}</p>}
      {!veri && <p className="aciklama">Yükleniyor…</p>}
      {ozet && (
        <p className="aciklama">
          {ozet.odeyen}/{ozet.kayit} kişi ödedi ·{' '}
          {ortakPayi(grup) > 0
            ? <>Bize kalan {tl(bizeKalanTutar(ozet.tahsil, grup))} / {tl(bizeKalanTutar(ozet.toplam, grup))} · %{ortakPayi(grup)} ortağa</>
            : <>Tahsil edilen {tl(ozet.tahsil)} / {tl(ozet.toplam)}</>}
        </p>
      )}
      {sonraKatilan.length > 0 && (
        <p className="aciklama kucuk-yazi">
          Bu dönemden sonra katılanlar (bu dönem ödemesi yok): {sonraKatilan.map((k) => `${k.ad} (${kisaTarih(grup.uyeKatilim[k.id])})`).join(', ')}
        </p>
      )}
      {bilgi && <p className="bilgi">{bilgi}</p>}
      {donemYetki && eksikler.length > 0 && (
        <div className="uyari-kutu">
          <span>{eksikler.length} üyenin bu dönem kaydı yok.</span>{' '}
          <button
            className="birincil kucuk"
            onClick={async () => {
              setHata('');
              try {
                for (const k of eksikler) await grupKaydiOlustur(grup, donem, tanim, k.id, benim);
                await yukle();
              } catch (e) {
                setHata(hataMesaji(e));
              }
            }}
          >
            Dönem kayıtlarını aç
          </button>
          <span className="aciklama kucuk-yazi"> Dönem ortasında katılanların ücreti kalan haftalara göre hesaplanır. Normalde her dönem başında otomatik açılır.</span>
        </div>
      )}
      {veri && (
        <ul className="paket-listesi">
          {uyeler.map((k) => {
            const r = veri.kayitlar[k.id];
            const od = r ? odemeDurumu(r, veri.odemeler) : null;
            const ac = acik?.kisiId === k.id ? acik.mod : null;
            // Bu dönemden önceki ödenmemiş grup / aylık abonelik dönemleri (bu grup ya da başka)
            const eskiler = (veri.paketler || [])
              .filter((p) => p.kisiId === k.id && p.durum !== 'iptal' && (p.tur === 'grup' || p.tur === 'abonelikDonem') && p.donemBit && p.donemBit < donem.bas)
              .map((p) => ({ p, od: odemeDurumu(p, veri.odemeler) }))
              .filter((x) => x.od.kalan > 0)
              .sort((a, b) => (a.p.donemBas || '').localeCompare(b.p.donemBas || ''));
            const eskiAd = (p) => `${p.tur === 'grup' ? p.grupAdi || p.paketAdi || 'Grup' : p.paketAdi || 'Aylık abonelik'} · ${kisaTarih(p.donemBas)} – ${kisaTarih(p.donemBit)}`;
            const eskiAcik = acik?.kisiId === k.id && acik.mod === 'eski' ? eskiler.find((x) => x.p.id === acik.id) : null;
            return (
              <li key={k.id} className="paket-karti">
                <div className="paket-ust">
                  <div className="esnek">
                    <strong>{k.ad}</strong>
                    {k.sadeceOdeme && k.not && <span className="aciklama kucuk-yazi">{k.not}</span>}
                    {grup.uyeKatilim?.[k.id] && (
                      <span className="aciklama kucuk-yazi">Katılım {kisaTarih(grup.uyeKatilim[k.id])}</span>
                    )}
                    <span className="aciklama kucuk-yazi">
                      {r && r.durum === 'iptal' && (r.fiyatNotu === DONEM_HARIC || r.fiyatNotu === KATILIM_ONCESI)
                        ? r.fiyatNotu
                        : r
                        ? `${tl(r.uygulananFiyat)} · Ödenen ${tl(od.odenen)}${od.kalan > 0 ? ` · Kalan ${tl(od.kalan)}` : ''}${
                            fiyatYetki && r.fiyatNotu ? ` · ${r.fiyatNotu}` : ''
                          }`
                        : 'Bu dönem kaydı yok'}
                    </span>
                  </div>
                  {od && !(r.durum === 'iptal' && (r.fiyatNotu === DONEM_HARIC || r.fiyatNotu === KATILIM_ONCESI)) && <DurumRozeti durum={od.durum} />}
                </div>
                {eskiler.length > 0 && (
                  <p className="uyari-kutu kucuk-yazi">
                    ⚠ Önceki dönemde ödenmemiş: {eskiler.map((x) => `${eskiAd(x.p)} (${tl(x.od.kalan)})`).join(', ')}{' '}
                    {!eskiAcik && (
                      <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'eski', id: eskiler[0].p.id })}>
                        {eskiler.length > 1 ? 'En eski dönemin ödemesini al' : 'O dönemin ödemesini al'}
                      </button>
                    )}
                  </p>
                )}
                {eskiAcik && (
                  <OdemeFormu
                    baslik={`Ödeme al · ${eskiAd(eskiAcik.p)}`}
                    onrTutar={eskiAcik.od.kalan}
                    onVazgec={() => setAcik(null)}
                    onKaydet={async (v) => {
                      await odemeEkle({ ...v, kisiId: k.id, satilanPaketId: eskiAcik.p.id }, benim);
                      setAcik(null);
                      await yukle();
                    }}
                  />
                )}
                {r && !ac && (
                  <div className="dugme-satiri">
                    {od.kalan > 0 && r.durum !== 'iptal' && (
                      <button className="birincil kucuk" onClick={() => setAcik({ kisiId: k.id, mod: 'odeme' })}>Ödeme al</button>
                    )}
                    <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'liste' })}>Ödemeler</button>
                    {donemYetki && <DahilDugmesi r={r} od={od} onDegis={(dahil) => dahilAyarla(k, r, dahil)} />}
                    {donemYetki && (
                      <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'katilim' })}>Katılım</button>
                    )}
                    {fiyatYetki && (
                      <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'ozel' })}>
                        {grup.ozelFiyatlar?.[k.id] ? `Özel ücret: ${tl(grup.ozelFiyatlar[k.id].fiyat)}` : 'Özel ücret'}
                      </button>
                    )}
                    {yonetici && k.sadeceOdeme && (
                      <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'not' })}>{k.not ? 'Notu düzenle' : 'Not ekle'}</button>
                    )}
                  </div>
                )}
                {ac === 'not' && (
                  <NotDuzenle
                    k={k}
                    onBitti={async (degisti) => {
                      setAcik(null);
                      if (degisti) await onGrupDegisti?.();
                    }}
                  />
                )}
                {!r && donemYetki && !ac && (
                  <div className="dugme-satiri">
                    <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'katilim' })}>Katılım</button>
                    <button className="metin" onClick={() => dahilAyarla(k, null, false)}>Bu döneme dahil değil</button>
                  </div>
                )}
                {ac === 'katilim' && (
                  <KatilimFormu
                    grup={grup}
                    kisi={k}
                    tanim={tanim}
                    odemeler={veri.odemeler}
                    benim={benim}
                    onBitti={async (degisti, sonuc) => {
                      setAcik(null);
                      if (!degisti) return;
                      setBilgi(
                        `${k.ad}: katılım güncellendi.` +
                          (sonuc?.iptal ? ` ${sonuc.iptal} önceki dönem kaydı kaldırıldı.` : '') +
                          (sonuc?.odemeli ? ` ${sonuc.odemeli} önceki dönemde ödeme alınmış, o kayıtlar değiştirilmedi.` : '')
                      );
                      await onGrupDegisti?.();
                      await yukle();
                    }}
                  />
                )}
                {ac === 'ozel' && (
                  <OzelUcretFormu
                    grup={grup}
                    kisi={k}
                    tanim={tanim}
                    kayit={r}
                    donem={donem}
                    benim={benim}
                    onBitti={async (degisti) => {
                      setAcik(null);
                      if (degisti) {
                        await onGrupDegisti?.();
                        await yukle();
                      }
                    }}
                  />
                )}
                {r && ac === 'odeme' && (
                  <OdemeFormu
                    uyari={
                      eskiler.length > 0 ? (
                        <p className="uyari-kutu kucuk-yazi">
                          ⚠ Önceki dönemden ödenmemiş kayıt var: <strong>{eskiAd(eskiler[0].p)} ({tl(eskiler[0].od.kalan)})</strong>. Ödeme o döneme mi ait?{' '}
                          <button type="button" className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'eski', id: eskiler[0].p.id })}>
                            O dönemin ödemesini al
                          </button>
                        </p>
                      ) : null
                    }
                    onrTutar={od.kalan}
                    onVazgec={() => setAcik(null)}
                    onKaydet={async (v) => {
                      await odemeEkle({ ...v, kisiId: k.id, satilanPaketId: r.id }, benim);
                      setAcik(null);
                      await yukle();
                    }}
                  />
                )}
                {r && ac === 'liste' && (
                  <>
                    <OdemeListesi
                      odemeler={veri.odemeler.filter((o) => o.satilanPaketId === r.id)}
                      benim={benim}
                      koclar={koclar}
                      yonetici={yonetici}
                      onDegisti={yukle}
                    />
                    <button className="metin" onClick={() => setAcik(null)}>Kapat</button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="aciklama kucuk-yazi">
        Dönemin son günü ({kisaTarih(donem.bit)}) gruptaki öğrenci/veli hesaplarına ödeme hatırlatması, sana da kim ödedi/ödemedi özeti gider.
        Kişiye özel fiyatı yönetici kişinin "Paket ve ödeme" sekmesinden değiştirir.
      </p>
    </div>
  );
}

// Düet/trio: herkesin kendi ders sayılı paketi; burada sadece özet görünür
export function DuetOdemeleri({ grup, kisiler }) {
  const [satirlar, setSatirlar] = useState(null);
  useEffect(() => {
    Promise.all(
      (grup.uyeIds || []).map(async (id) => {
        const [paketler, odemeler, kayitlar] = await Promise.all([
          kisiPaketleri(id).catch(() => []),
          kisiOdemeleri(id).catch(() => []),
          bireyselKayitlar(id).catch(() => []),
        ]);
        const d = dersleriDagit(paketler, kayitlar);
        const ilgili = paketler.filter((p) => p.tur === grup.dersTuru && p.durum !== 'iptal');
        const kalanDers = ilgili.reduce((t, p) => t + (d.paketler[p.id]?.kalan || 0), 0);
        const borc = paketler
          .filter((p) => p.durum !== 'iptal' && (p.tur === grup.dersTuru || p.tur === 'ek'))
          .reduce((t, p) => t + odemeDurumu(p, odemeler).kalan, 0);
        return { id, ad: kisiler.find((k) => k.id === id)?.ad || 'Kişi', paketVar: ilgili.length > 0, kalanDers, borc };
      })
    ).then(setSatirlar);
  }, [grup.id]);
  if (!satirlar) return <p className="aciklama">Yükleniyor…</p>;
  return (
    <div>
      <p className="aciklama">
        Her üye kendi {TUR_KISA[grup.dersTuru].toLowerCase()} paketini alır; paket atama ve ödeme almak için kişinin kartındaki "Paket ve ödeme" sekmesini kullan.
      </p>
      <ul className="paket-listesi">
        {satirlar.map((x) => (
          <li key={x.id} className="paket-karti">
            <div className="paket-ust">
              <strong className="esnek">{x.ad}</strong>
              {!x.paketVar && <span className="odeme-rozet odenmedi">Paket yok</span>}
            </div>
            <span className="kucuk-yazi">
              {x.paketVar ? `${x.kalanDers} ders kaldı` : `${TUR_KISA[grup.dersTuru]} paketi atanmamış`}
              {x.borc > 0 ? ` · Kalan ödeme ${tl(x.borc)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
