import { useEffect, useMemo, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { tarihGoster } from '../veri';
import { aktarimKesimi, odemeDurumu, dersleriDagit, tl, KITLE_ADI, TUR_KISA, dersSayili, eksikKatilim, kayitTuru, abonelikDonemBul, abonelikDersleri, taahhutBilgisi, YONTEMLER, dersBasiUcret, tutarli } from './model.js';
import {
  kisiPaketleri,
  kisiOdemeleri,
  abonelikAta,
  abonelikDonemleriniAc,
  bireyselKayitlar,
  paketTanimlariGetir,
  paketAta,
  paketGuncelle,
  paketSil,
  odemeEkle,
  dersDusmeKarari,
  ekUcretEkle,
  farkKarari,
} from './veri';
import { DurumRozeti, OdemeFormu, OdemeListesi, kocAdi } from './bilesenler';
import { antrenmanKaydet } from '../bugun/veri';

// Geçmiş tarihli bireysel ders (siteye geçiş döneminde teyit ederek elle girilir)
function GecmisDersFormu({ p, kayitlar, yonetici, benim, koclar, onBitti, onVazgec }) {
  const [tarih, setTarih] = useState('');
  const [katilim, setKatilim] = useState('geldi');
  const [dersiVeren, setDersiVeren] = useState(benim);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const var_ = tarih && kayitlar.some((k) => k.id === tarih);
  async function kaydet(e) {
    e.preventDefault();
    if (!tarih) return setHata('Tarih seçin.');
    if (tarih > bugun()) return setHata('İleri tarih girilemez.');
    if (var_ && !window.confirm('Bu tarihte bireysel ders kaydı zaten var. Üzerine yazılsın mı?')) return;
    setHata('');
    setBekliyor(true);
    try {
      await antrenmanKaydet(p.kisiId, tarih, {
        tarih,
        katilim,
        ...(katilim === 'gelmedi' ? { derstenDussun: true } : {}),
        seansTipi: 'bireysel',
        tur: 'Bireysel seans',
        dersiVeren,
        not: 'Elle girildi (geçmiş ders)',
      }, benim);
      onBitti();
    } catch (err) {
      setHata(hataMesaji(err));
      setBekliyor(false);
    }
  }
  return (
    <form className="kart-form ic-form" onSubmit={kaydet}>
      <strong>Geçmiş ders gir</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>Ders tarihi</span>
          <input type="date" max={bugun()} value={tarih} onChange={(e) => setTarih(e.target.value)} />
          {var_ && <small className="uyari-yazi">Bu tarihte kayıt var.</small>}
        </label>
        <label className="alan">
          <span>Katılım</span>
          <select value={katilim} onChange={(e) => setKatilim(e.target.value)}>
            <option value="geldi">Geldi</option>
            <option value="gelmedi">Gelmedi (paketten düşsün)</option>
          </select>
        </label>
        {yonetici && koclar?.length > 0 && (
          <label className="alan">
            <span>Dersi veren koç</span>
            <select value={dersiVeren} onChange={(e) => setDersiVeren(e.target.value)}>
              {koclar.map((k) => <option key={k.id} value={k.id}>{kocAdi(k.id, benim, koclar)}</option>)}
            </select>
          </label>
        )}
      </div>
      <p className="aciklama kucuk-yazi">
        {aktarimKesimi(p) && tarih && tarih < aktarimKesimi(p)
          ? 'Bu tarih paketin aktarımından önce: ders paketten düşmez (aktarımda sayıldı), yalnızca dersi veren koçun o ayki özel ders listesine yazılır.'
          : 'Ders bu paketten düşer ve dersi veren koçun o ayki özel ders listesine yazılır.'}
      </p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

// Siteden önce yapılan ders sayısını düzeltme (aktarım sonrası çift sayımı önlemek için)
function OncekiDersDuzelt({ p, benim, onBitti, onVazgec }) {
  const [n, setN] = useState(Number(p.oncekiDers) || 0);
  const [hata, setHata] = useState('');
  return (
    <div className="kart-form ic-form">
      <label className="alan">
        <span>Siteden önce yapılan ders</span>
        <input type="number" min="0" max={(Number(p.dersSayisi) || 1) - 1} value={n} onChange={(e) => setN(e.target.value)} />
      </label>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button
          className="birincil kucuk"
          onClick={async () => {
            try {
              await paketGuncelle(p, { oncekiDers: Math.max(0, Number(n) || 0) }, benim);
              onBitti();
            } catch (e) {
              setHata(hataMesaji(e));
            }
          }}
        >
          Kaydet
        </button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

function PaketAtaFormu({ kisi, tanimlar, yonetici: fiyatYetki, onKaydet, onVazgec, devam = false }) {
  const yonetici = fiyatYetki;
  // Devam eden paket aktarımı: siteye geçmeden önce yapılan dersler ve alınan ödeme
  const [onceki, setOnceki] = useState('');
  const bitmis = devam === 'bitmis';
  const [bitis, setBitis] = useState('');
  const [bekliyor, setBekliyor] = useState(false); // çift tıklamayla iki paket açılmasın
  const [odenen, setOdenen] = useState('');
  const [odemeTarihi, setOdemeTarihi] = useState(bugun());
  const [yontem, setYontem] = useState('nakit');
  const uygun = tanimlar.filter(
    (t) => t.aktif !== false && (devam ? dersSayili(t.tur) : dersSayili(t.tur) || t.tur === 'abonelik') && (!t.kitle || t.kitle === kisi.tip)
  );
  const digerleri = tanimlar.filter((t) => t.aktif !== false && (dersSayili(t.tur) || t.tur === 'abonelik') && t.kitle && t.kitle !== kisi.tip);
  // Seçim, listede görünen seçeneklerden biri olmalı: kişinin türüne uygun paket yoksa (ya da tanımlar sonradan yüklendiyse)
  // ekranda ilk seçenek görünüp seçim boş kalıyor ve "Paket seç." hatası veriyordu
  const [secim, setTanimId] = useState(uygun[0]?.id || '');
  const tanimId = [...uygun, ...digerleri].some((t) => t.id === secim) ? secim : uygun[0]?.id || digerleri[0]?.id || '';
  const tanim = tanimlar.find((t) => t.id === tanimId);
  const [baslangic, setBaslangic] = useState(bugun());
  const [fiyat, setFiyat] = useState(tanim?.fiyat ?? '');
  const [not, setNot] = useState('');
  const [hata, setHata] = useState('');
  useEffect(() => setFiyat(tanim?.fiyat ?? ''), [tanimId]);

  if (!tanimlar.some((t) => (dersSayili(t.tur) || t.tur === 'abonelik') && t.aktif !== false)) {
    return (
      <div className="kart-form">
        <p className="aciklama">Henüz bireysel, düet ya da trio paket tanımı yok. Yönetici "Paketler ve ödemeler → Paket tanımları"ndan ekleyebilir.</p>
        <button className="metin" onClick={onVazgec}>Kapat</button>
      </div>
    );
  }
  return (
    <form
      className="kart-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!tanim) return setHata(devam ? 'Ders sayılı (bireysel, düet, trio) bir paket tanımı gerekli.' : 'Paket seç.');
        if (bekliyor) return;
        setHata('');
        setBekliyor(true);
        try {
          // Bitmiş pakette bütün dersler yapılmıştır; aralıktaki site kayıtları pakete yazılır ama tekrar düşmez
          const n = bitmis ? Number(tanim.dersSayisi) || 0 : Number(onceki) || 0;
          if (bitmis && (!bitis || bitis < baslangic)) return setBekliyor(false), setHata('Son ders tarihi, başlangıçtan sonra olmalı.');
          if (devam && !bitmis && (n < 0 || n >= (Number(tanim.dersSayisi) || 0))) return setBekliyor(false), setHata(`Yapılan ders 0 ile ${(Number(tanim.dersSayisi) || 1) - 1} arasında olmalı.`);
          await onKaydet({
            kisi, tanim, baslangic, uygulananFiyat: yonetici ? Number(fiyat) : tanim.fiyat, fiyatNotu: yonetici ? not : '',
            ...(devam ? { devam: { oncekiDers: n, bitisTarihi: bitmis ? bitis : null, odenen: Number(odenen) || 0, odemeTarihi, yontem } } : {}),
          });
        } catch (err) {
          setHata(hataMesaji(err));
          setBekliyor(false);
        }
      }}
    >
      <h3>{bitmis ? 'Bitmiş paketi gir' : devam ? 'Devam eden paketi gir' : 'Paket ata'}</h3>
      {devam && !bitmis && <p className="aciklama kucuk-yazi">Siteye geçmeden önce başlamış paket: kaç dersinin yapıldığını ve ne kadar ödendiğini girin. Kalan ders buradan devam eder.</p>}
      {bitmis && (
        <p className="aciklama kucuk-yazi">
          Dersleri bitmiş paket: başlangıç ve son ders tarihini girin. Bu aralıkta sitede tamamlanan dersler bu pakete yazılır, ders başı değeri koç listesinde hesaplanır;
          paket bitmiş sayılır, yeni dersler sonraki pakete düşer.
        </p>
      )}
      <div className="form-izgara">
        <label className="alan">
          <span>Paket</span>
          <select value={tanimId} onChange={(e) => setTanimId(e.target.value)}>
            {uygun.map((t) => <option key={t.id} value={t.id}>{TUR_KISA[t.tur]} · {t.ad} · {t.tur === 'abonelik' ? `ayda ${t.dersSayisi} ders` : `${t.dersSayisi} ders`}</option>)}
            {digerleri.length > 0 && (
              <optgroup label="Diğer kitle">
                {digerleri.map((t) => <option key={t.id} value={t.id}>{t.ad} · {KITLE_ADI[t.kitle]}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <label className="alan">
          <span>{tanim?.tur === 'abonelik' ? 'Başlangıç (her ay bu gün ödeme)' : 'Başlangıç'}</span>
          <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
        </label>
        <label className="alan">
          <span>{tanim?.tur === 'abonelik' ? 'Aylık ücret (₺)' : 'Fiyat (₺)'}{yonetici ? ' — kişiye özel değiştirebilirsin' : ''}</span>
          <input type="number" min="0" value={fiyat} disabled={!yonetici} onChange={(e) => setFiyat(e.target.value)} />
        </label>
        {yonetici && (
          <label className="alan">
            <span>Fiyat notu (kardeş indirimi vb.)</span>
            <input value={not} onChange={(e) => setNot(e.target.value)} />
          </label>
        )}
        {bitmis && (
          <label className="alan">
            <span>Son ders tarihi</span>
            <input type="date" value={bitis} max={bugun()} onChange={(e) => setBitis(e.target.value)} />
          </label>
        )}
        {devam && (
          <>
            {!bitmis && <label className="alan">
              <span>Şimdiye kadar yapılan ders</span>
              <input type="number" min="0" max={(Number(tanim?.dersSayisi) || 1) - 1} value={onceki} onChange={(e) => setOnceki(e.target.value)} placeholder="Örn. 5" />
              <small className="ipucu">
                Bugüne kadar yapılan bütün dersleri yazın; sitede girilmiş geçmiş dersler paketten tekrar düşmez (yalnızca koç listesine yazılır).
                {tanim && onceki !== '' ? ` Kalan: ${Math.max(0, (Number(tanim.dersSayisi) || 0) - (Number(onceki) || 0))} ders` : ''}
              </small>
            </label>}
            <label className="alan">
              <span>Şimdiye kadar ödenen (₺)</span>
              <input type="number" min="0" value={odenen} onChange={(e) => setOdenen(e.target.value)} placeholder="0" />
            </label>
            {Number(odenen) > 0 && (
              <>
                <label className="alan">
                  <span>Ödemenin alındığı tarih</span>
                  <input type="date" value={odemeTarihi} onChange={(e) => setOdemeTarihi(e.target.value)} />
                </label>
                <label className="alan">
                  <span>Yöntem</span>
                  <select value={yontem} onChange={(e) => setYontem(e.target.value)}>
                    {YONTEMLER.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
                  </select>
                </label>
              </>
            )}
          </>
        )}
      </div>
      <p className="aciklama kucuk-yazi">
        {tanim?.tur === 'abonelik'
          ? `Her ay başlangıç gününde yeni dönem ve ödeme kaydı açılır; ayda ${tanim.dersSayisi} ders hakkı (haftada ${tanim.haftalikDers || 3}). Habersiz gelmeme hakkı yer, "izinli / ertelendi" yemez.${tanim.taahhutAy ? ` En az ${tanim.taahhutAy} ay taahhüt.` : ''}`
          : tanim?.tur === 'bireysel' || !tanim
          ? 'Bu tarihten sonraki "geldi" işaretli bireysel dersler bu paketten düşer.'
          : `Bu tarihten sonra ${TUR_KISA[tanim.tur].toLowerCase()} grubunda "geldi" işaretlenen dersler bu paketten düşer; eşi gelmezse fark ücretini sen eklersin.`}{' '}
        {tanim?.tur !== 'abonelik' && 'Paketin bitiş tarihi yok.'}
      </p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : devam ? 'Kaydet' : 'Ata'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

export function EkUcretFormu({ ilk, onKaydet, onVazgec }) {
  const [f, setF] = useState({ tarih: ilk?.tarih || bugun(), tutar: '', aciklama: ilk?.aciklama || '' });
  const [hata, setHata] = useState('');
  return (
    <form
      className="kart-form ic-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!(Number(f.tutar) > 0)) return setHata('Tutar girilmeli.');
        setHata('');
        try {
          await onKaydet({ ...f, tutar: Number(f.tutar), aciklama: f.aciklama.trim() || 'Ek ücret' });
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <strong>Ek ücret</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>Tarih</span>
          <input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} />
        </label>
        <label className="alan">
          <span>Tutar (₺)</span>
          <input type="number" min="0" inputMode="decimal" value={f.tutar} onChange={(e) => setF({ ...f, tutar: e.target.value })} />
        </label>
        <label className="alan">
          <span>Açıklama (öğrenci/veli görür)</span>
          <input value={f.aciklama} onChange={(e) => setF({ ...f, aciklama: e.target.value })} placeholder="Örn. Fark ücreti – eşi gelmedi, bireysel ders" />
        </label>
      </div>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Ekle</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

function AbonelikKarti({ a, donemler, odemeler, kayitlar, yonetici, fiyatYetki, benim, koclar, onDegisti, setHata }) {
  const [acik, setAcik] = useState(false);
  const [mod, setMod] = useState(null); // 'odeme' | 'ucret' | 'ek'
  const [ucret, setUcret] = useState(a.aylikUcret);
  const [ekDers, setEkDers] = useState('');
  const simdi = abonelikDonemBul(a.baslangic, bugun());
  const buDonem = simdi && donemler.find((d) => d.donemBas === simdi.bas);
  const ders = simdi ? abonelikDersleri(simdi, kayitlar, (Number(buDonem?.dersHakki) || a.aylikDers) + (Number(buDonem?.ekDers) || 0)) : null;
  const od = buDonem ? odemeDurumu(buDonem, odemeler) : null;
  const t = taahhutBilgisi(a, bugun());
  const bitti = a.durum === 'iptal';
  const calistir = async (is) => {
    setHata('');
    try {
      await is();
      setMod(null);
      await onDegisti();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  return (
    <li className={'paket-karti' + (bitti ? ' soluk' : '')}>
      <div className="paket-ust">
        <div className="esnek">
          <strong>{a.paketAdi}</strong>
          <span className="aciklama kucuk-yazi">
            Aylık abonelik · {tarihGoster(a.baslangic)} başlangıç · her ay {Number(a.baslangic.slice(8, 10))}'inde ödeme
            {bitti && a.bitis ? ` · ${tarihGoster(a.bitis)} tarihinde sonlandı` : ''}
          </span>
        </div>
        {od && <DurumRozeti durum={od.durum} />}
      </div>
      {t.en > 0 && !bitti && (
        <p className="kucuk-yazi taahhut-bilgi">Taahhüt: en az {t.en} ay · şu an {t.ay}. ay{t.doldu ? ' (taahhüt süresi doldu)' : ` · ${tarihGoster(t.bitis)} tarihine kadar`}</p>
      )}
      {simdi && ders && !bitti && (
        <div className="ders-sayac">
          <div className="ilerleme-cubuk" aria-hidden="true">
            <span style={{ width: `${Math.min(100, ((ders.geldi + ders.yanan) / (ders.hak || 1)) * 100)}%` }} />
          </div>
          <span>
            Bu dönem ({kisaTarih(simdi.bas)} – {kisaTarih(simdi.bit)}): {ders.hak} dersten {ders.geldi} yapıldı
            {ders.yanan ? ` · ${ders.yanan} habersiz (yandı)` : ''}
            {ders.ertelenen ? ` · ${ders.ertelenen} ertelendi` : ''} · <strong>{ders.kalan} kaldı</strong>
          </span>
        </div>
      )}
      {buDonem && od && (
        <div className="paket-tutar">
          <span>Bu ay <strong>{tl(buDonem.uygulananFiyat)}</strong></span>
          <span>Ödenen <strong>{tl(od.odenen)}</strong></span>
          <span>Kalan <strong className={od.kalan > 0 ? 'uyari-yazi' : ''}>{tl(od.kalan)}</strong></span>
        </div>
      )}
      {mod === 'odeme' && buDonem && (
        <OdemeFormu
          onrTutar={od.kalan || ''}
          onVazgec={() => setMod(null)}
          onKaydet={(v) => calistir(() => odemeEkle({ ...v, kisiId: a.kisiId, satilanPaketId: buDonem.id }, benim))}
        />
      )}
      {mod === 'ucret' && (
        <div className="kart-form ic-form">
          <label className="alan">
            <span>Kişiye özel aylık ücret (₺) · liste {tl(a.aylikListe)}</span>
            <input type="number" min="0" value={ucret} onChange={(e) => setUcret(e.target.value)} />
          </label>
          <p className="aciklama kucuk-yazi">Sonraki aylar bu ücretle açılır. Bu ayın tutarını değiştirmek için aşağıdaki aylardan "Fiyatı düzenle"yi kullan.</p>
          <div className="dugme-satiri">
            <button className="birincil kucuk" onClick={() => calistir(() => paketGuncelle(a, { aylikUcret: Number(ucret) || 0 }, benim))}>Kaydet</button>
            <button className="metin" onClick={() => setMod(null)}>Vazgeç</button>
          </div>
        </div>
      )}
      {mod === 'ek' && buDonem && (
        <div className="kart-form ic-form">
          <label className="alan">
            <span>Bu döneme ek ders hakkı (ör. geçen aydan ertelenen dersler)</span>
            <input type="number" min="0" max="20" value={ekDers} onChange={(e) => setEkDers(e.target.value)} />
          </label>
          <div className="dugme-satiri">
            <button className="birincil kucuk" onClick={() => calistir(() => paketGuncelle(buDonem, { ekDers: Number(ekDers) || 0 }, benim))}>Kaydet</button>
            <button className="metin" onClick={() => setMod(null)}>Vazgeç</button>
          </div>
        </div>
      )}
      {!mod && (
        <div className="dugme-satiri">
          {buDonem && od?.kalan > 0 && !bitti && <button className="birincil kucuk" onClick={() => setMod('odeme')}>Ödeme al</button>}
          <button className="ikincil kucuk" onClick={() => setAcik(!acik)}>{acik ? 'Ayları gizle' : 'Aylar ve ödemeler'}</button>
          {(yonetici || fiyatYetki) && !bitti && <button className="metin" onClick={() => setMod('ucret')}>Aylık ücreti düzenle</button>}
          {yonetici && !bitti && buDonem && (
            <button className="metin" onClick={() => { setEkDers(buDonem.ekDers || ''); setMod('ek'); }}>Ek ders hakkı</button>
          )}
          {yonetici && (
            <button
              className="metin"
              onClick={() => {
                if (bitti) return calistir(() => paketGuncelle(a, { durum: 'aktif', bitis: null }, benim));
                const uyari = t.en && !t.doldu ? `Taahhüt henüz dolmadı (en az ${t.en} ay, şu an ${t.ay}. ay). ` : '';
                if (!window.confirm(`${uyari}Abonelik bugün itibarıyla sonlandırılsın mı? Yeni aylar açılmaz; geçmiş ödemeler kalır.`)) return;
                calistir(() => paketGuncelle(a, { durum: 'iptal', bitis: bugun() }, benim));
              }}
            >
              {bitti ? 'Yeniden başlat' : 'Aboneliği sonlandır'}
            </button>
          )}
        </div>
      )}
      {acik && (
        <div className="paket-ayrinti">
          {[...donemler].sort((x, y) => y.donemBas.localeCompare(x.donemBas)).map((d) => (
            <PaketKarti key={d.id} p={d} dagitim={null} odemeler={odemeler} yonetici={yonetici} fiyatYetki={fiyatYetki} benim={benim} koclar={koclar} onDegisti={onDegisti} setHata={setHata} />
          ))}
          {ders && ders.dersler.length > 0 && (
            <p className="kucuk-yazi">
              Bu dönemin dersleri:{' '}
              {ders.dersler.map((x) => `${kisaTarih(x.tarih)}${x.katilim === 'gelmedi' ? ' (gelmedi)' : x.katilim === 'izinli' ? ' (ertelendi)' : ''}`).join(' · ')}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

// Bireysel paketten düet/trio dersi düşsün mü, ders başı kaç TL
function KapsarFormu({ paket, onKaydet, onVazgec }) {
  const birim = Math.round(dersBasiUcret(paket));
  const [ucret, setUcret] = useState(Number(paket.ozelDersUcreti) || birim);
  return (
    <div className="kart-form ic-form">
      <label className="alan">
        <span>Düet/trio dersi başına düşecek tutar (₺)</span>
        <input type="number" min="0" value={ucret} onChange={(e) => setUcret(e.target.value)} />
      </label>
      <small className="ipucu">
        Bu paketin bireysel ders ücreti {tl(birim)}. Düet/trio dersleri, kendi türünde paket yoksa bu paketten bu tutarla düşer; kalan tutar buna göre hesaplanır.
      </small>
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={!(Number(ucret) > 0)} onClick={() => onKaydet({ ozelDersKapsar: true, ozelDersUcreti: Number(ucret) })}>Kaydet</button>
        {paket.ozelDersKapsar && (
          <button className="metin" onClick={() => onKaydet({ ozelDersKapsar: false })}>Düet/trio dersleri bu paketten düşmesin</button>
        )}
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// Paket başlangıcı: bu tarihten önceki dersler pakete düşmez
function BaslangicFormu({ paket, onKaydet, onVazgec }) {
  const [tarih, setTarih] = useState(paket.baslangic || bugun());
  return (
    <div className="kart-form ic-form">
      <label className="alan">
        <span>Paket başlangıcı</span>
        <input type="date" value={tarih} max={paket.bitisTarihi || undefined} onChange={(e) => setTarih(e.target.value)} />
      </label>
      <small className="ipucu">Bu tarihten itibaren yapılan dersler (bireysel{paket.tur !== 'bireysel' ? `, ${TUR_KISA[paket.tur].toLowerCase()}` : ''}) bu paketten düşer.</small>
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={!tarih} onClick={() => onKaydet({ baslangic: tarih })}>Kaydet</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

function FiyatFormu({ paket, onKaydet, onVazgec }) {
  const [fiyat, setFiyat] = useState(paket.uygulananFiyat);
  const [not, setNot] = useState(paket.fiyatNotu || '');
  return (
    <div className="kart-form ic-form">
      <div className="form-izgara">
        <label className="alan">
          <span>Kişiye özel fiyat (₺) · liste: {tl(paket.listeFiyati)}</span>
          <input type="number" min="0" value={fiyat} onChange={(e) => setFiyat(e.target.value)} />
        </label>
        <label className="alan">
          <span>Fiyat notu</span>
          <input value={not} onChange={(e) => setNot(e.target.value)} />
        </label>
      </div>
      <div className="dugme-satiri">
        <button className="birincil kucuk" onClick={() => onKaydet({ uygulananFiyat: Number(fiyat) || 0, fiyatNotu: not })}>Kaydet</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// Önceki dönemlerden ödemesi eksik kalan grup / aylık abonelik kayıtları
function eskiBorclariBul(paketler, odemeler) {
  return paketler
    .filter((p) => p.durum !== 'iptal' && (p.tur === 'grup' || p.tur === 'abonelikDonem') && p.donemBit && p.donemBit < bugun())
    .map((p) => ({ p, od: odemeDurumu(p, odemeler) }))
    .filter((x) => x.od.kalan > 0)
    .sort((a, b) => (a.p.donemBas || '').localeCompare(b.p.donemBas || ''));
}
const borcAdi = (p) => `${p.tur === 'grup' ? p.grupAdi || p.paketAdi || 'Grup' : p.paketAdi || 'Aylık abonelik'} · ${kisaTarih(p.donemBas)} – ${kisaTarih(p.donemBit)}`;

function EskiBorcUyarisi({ borclar, odemeIcin, setOdemeIcin, benim, onDegisti, setHata }) {
  if (!borclar.length) return null;
  return (
    <div className="uyari-kutu eski-borc" id="eski-borclar">
      <strong>⚠ Önceki dönemlerde ödenmemiş {borclar.length} kayıt var</strong>
      <ul className="sade-liste">
        {borclar.map(({ p, od }) => (
          <li key={p.id}>
            {borcAdi(p)} · <strong>{tl(od.kalan)}</strong> bekliyor{od.odenen > 0 ? ' (kısmi)' : ''}{' '}
            {odemeIcin !== p.id && <button className="metin" onClick={() => setOdemeIcin(p.id)}>Ödeme al</button>}
            {odemeIcin === p.id && (
              <OdemeFormu
                baslik={`Ödeme al · ${borcAdi(p)}`}
                onrTutar={od.kalan}
                onVazgec={() => setOdemeIcin(null)}
                onKaydet={async (v) => {
                  setHata('');
                  await odemeEkle({ ...v, kisiId: p.kisiId, satilanPaketId: p.id }, benim);
                  setOdemeIcin(null);
                  await onDegisti();
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaketKarti({ p, dagitim, odemeler, yonetici, fiyatYetki, benim, koclar, onDegisti, setHata, eskiBorclar = [], eskiOdemeAc, kayitlar = [] }) {
  const [acik, setAcik] = useState(false);
  const [mod, setMod] = useState(null); // 'odeme' | 'fiyat'
  const od = odemeDurumu(p, odemeler);
  const d = dagitim?.paketler[p.id];
  const calistir = async (is) => {
    setHata('');
    try {
      await is();
      setMod(null);
      await onDegisti();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  return (
    <li className={'paket-karti' + (p.durum === 'iptal' ? ' soluk' : '')}>
      <div className="paket-ust">
        <div className="esnek">
          <strong>{p.tur === 'grup' ? p.grupAdi || p.paketAdi : p.paketAdi}</strong>
          <span className="aciklama kucuk-yazi">
            {p.tur === 'grup'
              ? `Grup dönemi ${kisaTarih(p.donemBas)} – ${kisaTarih(p.donemBit)}`
              : p.tur === 'ek'
              ? `Ek ücret · ${tarihGoster(p.baslangic)}`
              : p.tur === 'abonelikDonem'
              ? `Abonelik ayı ${kisaTarih(p.donemBas)} – ${kisaTarih(p.donemBit)}${p.ekDers ? ` · +${p.ekDers} ek ders` : ''}`
              : `${TUR_KISA[p.tur] || 'Bireysel'} · ${tarihGoster(p.baslangic)} başlangıç${p.bitisTarihi ? ` · ${tarihGoster(p.bitisTarihi)} bitti` : ''}${p.ozelDersKapsar ? ` · düet/trio dersleri de düşer${Number(p.ozelDersUcreti) > 0 ? ` (ders başı ${tl(p.ozelDersUcreti)})` : ''}` : ''}`}
          </span>
        </div>
        <DurumRozeti durum={od.durum} />
      </div>
      {dersSayili(p.tur) && d && (
        <div className="ders-sayac">
          <div className="ilerleme-cubuk" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (d.kullanilan / (p.dersSayisi || 1)) * 100)}%` }} />
          </div>
          <span className={d.kalan <= 2 && p.durum !== 'iptal' ? 'uyari-yazi' : ''}>
            {p.dersSayisi} dersten {d.kullanilan} yapıldı{Number(p.oncekiDers) ? ` (${p.oncekiDers}'i siteden önce)` : ''} · <strong>{d.kalan} kalan</strong>
            {Number(p.uygulananFiyat) > 0 && (
              <>
                {' '}· ders başı {tl(Math.round(dersBasiUcret(p)))}
                {d.eksikDers ? ` (${d.eksikDers} ders eksik katılım ücretiyle düştü)` : ''} · kalan tutar <strong>{tl(d.kalanTl)}</strong>
              </>
            )}
          </span>
        </div>
      )}
      <div className="paket-tutar">
        <span>Fiyat <strong>{tl(p.uygulananFiyat)}</strong></span>
        <span>Ödenen <strong>{tl(od.odenen)}</strong></span>
        <span>Kalan <strong className={od.kalan > 0 ? 'uyari-yazi' : ''}>{tl(od.kalan)}</strong></span>
      </div>
      {(yonetici || fiyatYetki) && (Number(p.listeFiyati) !== Number(p.uygulananFiyat) || p.fiyatNotu) && (
        <p className="aciklama kucuk-yazi">
          {p.tur === 'grup' && p.tamUcret ? `Dönem ücreti ${tl(p.tamUcret)}` : `Liste fiyatı ${tl(p.listeFiyati)}`}
          {p.fiyatNotu ? ` · ${p.fiyatNotu}` : ''}
        </p>
      )}
      {mod === 'gecmisDers' && (
        <GecmisDersFormu p={p} kayitlar={kayitlar} yonetici={yonetici} benim={benim} koclar={koclar} onVazgec={() => setMod(null)} onBitti={async () => { setMod(null); await onDegisti(); }} />
      )}
      {mod === 'onceki' && <OncekiDersDuzelt p={p} benim={benim} onVazgec={() => setMod(null)} onBitti={async () => { setMod(null); await onDegisti(); }} />}
      {mod === 'odeme' && (
        <OdemeFormu
          onrTutar={od.kalan || ''}
          onVazgec={() => setMod(null)}
          onKaydet={(v) => calistir(() => odemeEkle({ ...v, kisiId: p.kisiId, satilanPaketId: p.id }, benim))}
          uyari={(() => {
            const onceki = eskiBorclar.find((x) => x.p.id !== p.id && (x.p.donemBas || '') < (p.donemBas || p.baslangic || '9999'));
            if (!onceki) return null;
            return (
              <p className="uyari-kutu kucuk-yazi">
                ⚠ Önceki dönemden ödenmemiş kayıt var: <strong>{borcAdi(onceki.p)} ({tl(onceki.od.kalan)})</strong>. Ödeme o döneme mi ait?{' '}
                <button type="button" className="metin" onClick={() => { setMod(null); eskiOdemeAc(onceki.p.id); }}>
                  O dönemin ödemesini al
                </button>
              </p>
            );
          })()}
        />
      )}
      {mod === 'kapsar' && (
        <KapsarFormu paket={p} onVazgec={() => setMod(null)} onKaydet={(v) => calistir(() => paketGuncelle(p, v, benim))} />
      )}
      {mod === 'baslangic' && (
        <BaslangicFormu paket={p} onVazgec={() => setMod(null)} onKaydet={(v) => calistir(() => paketGuncelle(p, v, benim))} />
      )}
      {mod === 'fiyat' && (
        <FiyatFormu paket={p} onVazgec={() => setMod(null)} onKaydet={(v) => calistir(() => paketGuncelle(p, v, benim))} />
      )}
      {!mod && (
        <div className="dugme-satiri">
          {p.durum !== 'iptal' && <button className="birincil kucuk" onClick={() => setMod('odeme')}>Ödeme al</button>}
          {p.tur === 'bireysel' && p.durum !== 'iptal' && <button className="metin" onClick={() => setMod('gecmisDers')}>+ Geçmiş ders gir</button>}
          {yonetici && p.tur === 'bireysel' && p.durum !== 'iptal' && (
            <button
              className="metin"
              onClick={() => setMod('kapsar')}
            >
              {p.ozelDersKapsar ? 'Düet/trio ders ücreti' : 'Düet/trio dersleri de bu paketten düşsün'}
            </button>
          )}
          {yonetici && dersSayili(p.tur) && (Number(p.oncekiDers) > 0 || p.aktarim) && (
            <button className="metin" onClick={() => setMod('onceki')}>Siteden önceki dersleri düzelt</button>
          )}
          <button className="ikincil kucuk" onClick={() => setAcik(!acik)}>{acik ? 'Ayrıntıyı gizle' : 'Ayrıntı'}</button>
          {(yonetici || fiyatYetki) && p.durum !== 'iptal' && <button className="metin" onClick={() => setMod('fiyat')}>Fiyatı düzenle</button>}
          {yonetici && dersSayili(p.tur) && p.durum !== 'iptal' && <button className="metin" onClick={() => setMod('baslangic')}>Başlangıcı değiştir</button>}
          {yonetici && (
            <button
              className="metin"
              onClick={() => {
                const iptal = p.durum !== 'iptal';
                if (iptal && !window.confirm('Paket iptal edilsin mi? Ödemeleri silinmez; iptal edilen paketten ders düşmez.')) return;
                calistir(() => paketGuncelle(p, { durum: iptal ? 'iptal' : 'aktif' }, benim));
              }}
            >
              {p.durum === 'iptal' ? 'İptali geri al' : 'İptal et'}
            </button>
          )}
          {yonetici && p.durum === 'iptal' && (dersSayili(p.tur) || p.tur === 'ek') && (
            <button
              className="metin tehlike"
              onClick={() => {
                const n = odemeler.filter((o) => o.satilanPaketId === p.id && !o.silindi).length;
                const tutar = odemeler.filter((o) => o.satilanPaketId === p.id && !o.silindi).reduce((t, o) => t + (Number(o.tutar) || 0), 0);
                if (!window.confirm(`Bu paket kalıcı olarak silinsin mi?${n ? `\n\nBağlı ${n} ödeme (${tl(tutar)}) de silinir ve tahsilatlardan düşer.` : ''}\n\nYanlışlıkla girilen paketler içindir; geri alınamaz.`)) return;
                calistir(() => paketSil(p, benim));
              }}
            >
              Paketi sil
            </button>
          )}
        </div>
      )}
      {acik && (
        <div className="paket-ayrinti">
          <h4>Ödemeler</h4>
          <OdemeListesi odemeler={odemeler.filter((o) => o.satilanPaketId === p.id)} benim={benim} koclar={koclar} yonetici={yonetici} onDegisti={onDegisti} />
          {dersSayili(p.tur) && d && (
            <>
              <h4>Bu paketten düşen dersler</h4>
              {d.dersler.length === 0 ? (
                <p className="aciklama kucuk-yazi">Henüz ders düşmedi.</p>
              ) : (
                <p className="kucuk-yazi">
                  {d.dersler
                    .map((x) => kisaTarih(x.tarih) + (x.katilim === 'gelmedi' ? ' (gelmedi)' : '') + (eksikKatilim(x) ? ` (${x.gelenSayisi}/${x.grupBoyu} kişi)` : ''))
                    .join(' · ')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function PaketSekmesi({ kisi, yonetici, fiyatYetki = false, benim, koclar }) {
  const [veri, setVeri] = useState(null);
  const [ata, setAta] = useState(false);
  const [ek, setEk] = useState(null); // {tarih, aciklama, ilgiliKayitId}
  const [bitenler, setBitenler] = useState(false);
  const [odemeIcin, setOdemeIcin] = useState(null);
  const [hata, setHata] = useState('');

  const yukle = async () => {
    try {
      const [paketler, odemeler, kayitlar, tanimlar] = await Promise.all([
        kisiPaketleri(kisi.id),
        kisiOdemeleri(kisi.id),
        bireyselKayitlar(kisi.id),
        paketTanimlariGetir(),
      ]);
      // Aktif aboneliklerde bugüne kadar açılmamış ay kaydı varsa aç (her sabah sunucu da açar)
      const aktifAbonelik = paketler.filter((p) => p.tur === 'abonelik' && p.durum !== 'iptal');
      for (const a of aktifAbonelik) {
        await abonelikDonemleriniAc(a, benim, paketler.filter((p) => p.aboneId === a.id)).catch(() => {});
      }
      const son = aktifAbonelik.length ? await kisiPaketleri(kisi.id) : paketler;
      setVeri({ paketler: son, odemeler, kayitlar, tanimlar });
    } catch (e) {
      setHata(hataMesaji(e));
      setVeri({ paketler: [], odemeler: [], kayitlar: [], tanimlar: [] });
    }
  };
  useEffect(() => {
    yukle();
  }, [kisi.id]);

  const dagitim = useMemo(() => (veri ? dersleriDagit(veri.paketler, veri.kayitlar) : null), [veri]);
  if (!veri) return <p className="aciklama">Yükleniyor…</p>;

  const sirali = [...veri.paketler]
    // Gruba katılmadan önceki dönem kayıtları kişinin listesinde gösterilmez
    .filter((p) => p.tur !== 'abonelik' && p.tur !== 'abonelikDonem' && !(p.durum === 'iptal' && p.fiyatNotu === 'Katılımdan önceki dönem'))
    .sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || ''));
  const abonelikler = veri.paketler.filter((p) => p.tur === 'abonelik');
  const bitmis = (p) => {
    if (p.durum === 'iptal') return true;
    const od = odemeDurumu(p, veri.odemeler);
    if (od.kalan > 0) return false;
    if (p.tur === 'grup') return p.donemBit < bugun();
    if (p.tur === 'ek') return true;
    return dagitim.paketler[p.id]?.kalan === 0;
  };
  const acikPaketler = sirali.filter((p) => !bitmis(p));
  const eskiBorclar = eskiBorclariBul(veri.paketler, veri.odemeler);
  const eskiOdemeAc = (id) => {
    setOdemeIcin(id);
    setTimeout(() => document.getElementById('eski-borclar')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };
  const bitenPaketler = sirali.filter(bitmis);
  const toplamKalan = veri.paketler.reduce((t, p) => t + (p.durum === 'iptal' ? 0 : odemeDurumu(p, veri.odemeler).kalan), 0);
  // Eksik katılımlı düet/trio dersleri: fark ücreti eklenmemiş ve "gerek yok" denmemiş olanlar
  const ekKayitlari = new Set(veri.paketler.filter((p) => p.tur === 'ek' && p.ilgiliKayitId).map((p) => p.ilgiliKayitId));
  const eksikler = veri.kayitlar
    // Tutarla düşen (eksik katılım ücreti tanımlı) paketlerde fark ücreti gerekmez
    .filter((k) => eksikKatilim(k) && !k.farkGerekYok && !ekKayitlari.has(k.id))
    .filter((k) => !veri.paketler.some((p) => tutarli(p) && dagitim?.paketler[p.id]?.dersler.some((x) => x.id === k.id)))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  const farkGerekYok = async (k) => {
    try {
      await farkKarari(kisi.id, k.id);
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  const gelmediler = veri.kayitlar
    .filter((k) => k.katilim === 'gelmedi' && kayitTuru(k))
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, 10);

  const kart = (p) => (
    <PaketKarti key={p.id} p={p} dagitim={dagitim} odemeler={veri.odemeler} kayitlar={veri.kayitlar} yonetici={yonetici} fiyatYetki={fiyatYetki} benim={benim} koclar={koclar} onDegisti={yukle} setHata={setHata} eskiBorclar={eskiBorclar} eskiOdemeAc={eskiOdemeAc} />
  );

  return (
    <div>
      <div className="paket-ozet-bant">
        <span>Toplam kalan ödeme <strong className={toplamKalan > 0 ? 'uyari-yazi' : ''}>{tl(toplamKalan)}</strong></span>
        <span className="dugme-satiri">
          {!ata && <button className="ikincil kucuk" onClick={() => setAta(true)}>+ Paket ata</button>}
          {!ata && <button className="ikincil kucuk" onClick={() => setAta('devam')}>⇪ Devam eden paketi gir</button>}
          {!ata && <button className="ikincil kucuk" onClick={() => setAta('bitmis')}>⇪ Bitmiş paketi gir</button>}
          {yonetici && !ek && <button className="ikincil kucuk" onClick={() => setEk({})}>+ Ek ücret</button>}
        </span>
      </div>
      {hata && <p className="hata">{hata}</p>}
      <EskiBorcUyarisi borclar={eskiBorclar} odemeIcin={odemeIcin} setOdemeIcin={setOdemeIcin} benim={benim} onDegisti={yukle} setHata={setHata} />
      {ata && (
        <PaketAtaFormu
          kisi={kisi}
          tanimlar={veri.tanimlar}
          yonetici={yonetici || fiyatYetki}
          devam={ata === 'devam' || ata === 'bitmis' ? ata : false}
          onVazgec={() => setAta(false)}
          onKaydet={async (v) => {
            if (v.tanim.tur === 'abonelik') await abonelikAta({ ...v, aylikUcret: v.uygulananFiyat }, benim);
            else if (v.devam) {
              const id = await paketAta({ ...v, oncekiDers: v.devam.oncekiDers, bitisTarihi: v.devam.bitisTarihi }, benim);
              if (v.devam.odenen > 0) {
                await odemeEkle({ kisiId: kisi.id, satilanPaketId: id, tutar: v.devam.odenen, tarih: v.devam.odemeTarihi, yontem: v.devam.yontem, not: 'Aktarım · devam eden paket', ekAlanlar: { aktarim: true } }, benim);
              }
            } else await paketAta(v, benim);
            setAta(false);
            await yukle();
          }}
        />
      )}
      {ek && (
        <EkUcretFormu
          ilk={ek}
          onVazgec={() => setEk(null)}
          onKaydet={async (v) => {
            await ekUcretEkle({ kisiId: kisi.id, ...v, ilgiliKayitId: ek.ilgiliKayitId }, benim);
            setEk(null);
            await yukle();
          }}
        />
      )}
      {yonetici && eksikler.length > 0 && (
        <div className="uyari-kutu kucuk-yazi">
          <strong>Eşi/eşleri gelmeyen dersler</strong> — fark ücreti eklenmemiş:
          <ul className="sade-liste">
            {eksikler.map((x) => (
              <li key={x.id}>
                {tarihGoster(x.tarih)} · {x.grupAdi} · {x.gelenSayisi}/{x.grupBoyu} kişi geldi{' '}
                <button
                  className="metin"
                  onClick={() =>
                    setEk({
                      tarih: x.tarih,
                      ilgiliKayitId: x.id,
                      aciklama: `Fark ücreti – ${x.grupAdi}, ${x.gelenSayisi} kişi katıldı`,
                    })
                  }
                >
                  Fark ücreti ekle
                </button>
                <button className="metin" onClick={() => farkGerekYok(x)}>Gerek yok</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {dagitim.paketsizDersler.length > 0 && (
        <p className="uyari-kutu kucuk-yazi">
          {dagitim.paketsizDersler.length} ders hiçbir pakete düşmedi (paket bitmiş ya da atanmamış):{' '}
          {dagitim.paketsizDersler.slice(-6).map((x) => `${kisaTarih(x.tarih)} ${TUR_KISA[x.tur] || ''}`.trim()).join(', ')}
        </p>
      )}
      {acikPaketler.length === 0 && abonelikler.length === 0 && !ata && (
        <div className="bos-durum"><p>Açık paket yok. Grup dönemleri grubun "Ödemeler" sekmesinden açılır; aylık abonelik, bireysel, düet ve trio paketlerini buradan atarsın.</p></div>
      )}
      {abonelikler.length > 0 && (
        <ul className="paket-listesi">
          {abonelikler.map((a) => (
            <AbonelikKarti
              key={a.id}
              a={a}
              donemler={veri.paketler.filter((p) => p.tur === 'abonelikDonem' && p.aboneId === a.id)}
              odemeler={veri.odemeler}
              kayitlar={veri.kayitlar}
              yonetici={yonetici}
              fiyatYetki={fiyatYetki}
              benim={benim}
              koclar={koclar}
              onDegisti={yukle}
              setHata={setHata}
            />
          ))}
        </ul>
      )}
      <ul className="paket-listesi">{acikPaketler.map(kart)}</ul>
      {bitenPaketler.length > 0 && (
        <>
          <button className="metin" onClick={() => setBitenler(!bitenler)}>
            {bitenler ? 'Biten paketleri gizle' : `Biten / iptal paketler (${bitenPaketler.length})`}
          </button>
          {bitenler && <ul className="paket-listesi">{bitenPaketler.map(kart)}</ul>}
        </>
      )}
      {yonetici && gelmediler.length > 0 && (
        <details className="kart-form ic-form">
          <summary>Gelmedi işaretli dersler — dersten düşsün mü?</summary>
          <p className="aciklama kucuk-yazi">Varsayılan olarak "gelmedi" paketten düşmez. Geç iptal gibi durumlarda düşmesini işaretleyebilirsin.</p>
          <ul className="sade-liste">
            {gelmediler.map((k) => (
              <li key={k.id}>
                <label className="onay-satir">
                  <input
                    type="checkbox"
                    checked={k.derstenDussun === true}
                    onChange={async (e) => {
                      try {
                        await dersDusmeKarari(kisi.id, k.id, e.target.checked);
                        await yukle();
                      } catch (err) {
                        setHata(hataMesaji(err));
                      }
                    }}
                  />
                  {tarihGoster(k.tarih)}{k.grupAdi ? ` · ${k.grupAdi}` : ''} {k.not ? `· ${k.not}` : ''}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
