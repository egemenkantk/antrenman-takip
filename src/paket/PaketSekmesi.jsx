import { useEffect, useMemo, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { tarihGoster } from '../veri';
import { odemeDurumu, dersleriDagit, tl, KITLE_ADI, TUR_KISA, dersSayili, eksikKatilim, kayitTuru, abonelikDonemBul, abonelikDersleri, taahhutBilgisi } from './model.js';
import {
  kisiPaketleri,
  kisiOdemeleri,
  abonelikAta,
  abonelikDonemleriniAc,
  bireyselKayitlar,
  paketTanimlariGetir,
  paketAta,
  paketGuncelle,
  odemeEkle,
  dersDusmeKarari,
  ekUcretEkle,
  farkKarari,
} from './veri';
import { DurumRozeti, OdemeFormu, OdemeListesi } from './bilesenler';

function PaketAtaFormu({ kisi, tanimlar, yonetici, onKaydet, onVazgec }) {
  const uygun = tanimlar.filter(
    (t) => t.aktif !== false && (dersSayili(t.tur) || t.tur === 'abonelik') && (!t.kitle || t.kitle === kisi.tip)
  );
  const digerleri = tanimlar.filter((t) => t.aktif !== false && (dersSayili(t.tur) || t.tur === 'abonelik') && t.kitle && t.kitle !== kisi.tip);
  const [tanimId, setTanimId] = useState(uygun[0]?.id || '');
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
        if (!tanim) return setHata('Paket seç.');
        setHata('');
        try {
          await onKaydet({ kisi, tanim, baslangic, uygulananFiyat: yonetici ? Number(fiyat) : tanim.fiyat, fiyatNotu: yonetici ? not : '' });
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <h3>Paket ata</h3>
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
        <button className="birincil kucuk">Ata</button>
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

function AbonelikKarti({ a, donemler, odemeler, kayitlar, yonetici, benim, koclar, onDegisti, setHata }) {
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
          {yonetici && !bitti && <button className="metin" onClick={() => setMod('ucret')}>Aylık ücreti düzenle</button>}
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
            <PaketKarti key={d.id} p={d} dagitim={null} odemeler={odemeler} yonetici={yonetici} benim={benim} koclar={koclar} onDegisti={onDegisti} setHata={setHata} />
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

function PaketKarti({ p, dagitim, odemeler, yonetici, benim, koclar, onDegisti, setHata }) {
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
              : `${TUR_KISA[p.tur] || 'Bireysel'} · ${tarihGoster(p.baslangic)} başlangıç`}
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
            {p.dersSayisi} dersten {d.kullanilan} yapıldı · <strong>{d.kalan} kalan</strong>
          </span>
        </div>
      )}
      <div className="paket-tutar">
        <span>Fiyat <strong>{tl(p.uygulananFiyat)}</strong></span>
        <span>Ödenen <strong>{tl(od.odenen)}</strong></span>
        <span>Kalan <strong className={od.kalan > 0 ? 'uyari-yazi' : ''}>{tl(od.kalan)}</strong></span>
      </div>
      {yonetici && (Number(p.listeFiyati) !== Number(p.uygulananFiyat) || p.fiyatNotu) && (
        <p className="aciklama kucuk-yazi">
          {p.tur === 'grup' && p.tamUcret ? `Dönem ücreti ${tl(p.tamUcret)}` : `Liste fiyatı ${tl(p.listeFiyati)}`}
          {p.fiyatNotu ? ` · ${p.fiyatNotu}` : ''}
        </p>
      )}
      {mod === 'odeme' && (
        <OdemeFormu
          onrTutar={od.kalan || ''}
          onVazgec={() => setMod(null)}
          onKaydet={(v) => calistir(() => odemeEkle({ ...v, kisiId: p.kisiId, satilanPaketId: p.id }, benim))}
        />
      )}
      {mod === 'fiyat' && (
        <FiyatFormu paket={p} onVazgec={() => setMod(null)} onKaydet={(v) => calistir(() => paketGuncelle(p, v, benim))} />
      )}
      {!mod && (
        <div className="dugme-satiri">
          {p.durum !== 'iptal' && <button className="birincil kucuk" onClick={() => setMod('odeme')}>Ödeme al</button>}
          <button className="ikincil kucuk" onClick={() => setAcik(!acik)}>{acik ? 'Ayrıntıyı gizle' : 'Ayrıntı'}</button>
          {yonetici && p.durum !== 'iptal' && <button className="metin" onClick={() => setMod('fiyat')}>Fiyatı düzenle</button>}
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

export default function PaketSekmesi({ kisi, yonetici, benim, koclar }) {
  const [veri, setVeri] = useState(null);
  const [ata, setAta] = useState(false);
  const [ek, setEk] = useState(null); // {tarih, aciklama, ilgiliKayitId}
  const [bitenler, setBitenler] = useState(false);
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
    .filter((p) => p.tur !== 'abonelik' && p.tur !== 'abonelikDonem')
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
  const bitenPaketler = sirali.filter(bitmis);
  const toplamKalan = veri.paketler.reduce((t, p) => t + (p.durum === 'iptal' ? 0 : odemeDurumu(p, veri.odemeler).kalan), 0);
  // Eksik katılımlı düet/trio dersleri: fark ücreti eklenmemiş ve "gerek yok" denmemiş olanlar
  const ekKayitlari = new Set(veri.paketler.filter((p) => p.tur === 'ek' && p.ilgiliKayitId).map((p) => p.ilgiliKayitId));
  const eksikler = veri.kayitlar
    .filter((k) => eksikKatilim(k) && !k.farkGerekYok && !ekKayitlari.has(k.id))
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
    <PaketKarti key={p.id} p={p} dagitim={dagitim} odemeler={veri.odemeler} yonetici={yonetici} benim={benim} koclar={koclar} onDegisti={yukle} setHata={setHata} />
  );

  return (
    <div>
      <div className="paket-ozet-bant">
        <span>Toplam kalan ödeme <strong className={toplamKalan > 0 ? 'uyari-yazi' : ''}>{tl(toplamKalan)}</strong></span>
        <span className="dugme-satiri">
          {!ata && <button className="ikincil kucuk" onClick={() => setAta(true)}>+ Paket ata</button>}
          {yonetici && !ek && <button className="ikincil kucuk" onClick={() => setEk({})}>+ Ek ücret</button>}
        </span>
      </div>
      {hata && <p className="hata">{hata}</p>}
      {ata && (
        <PaketAtaFormu
          kisi={kisi}
          tanimlar={veri.tanimlar}
          yonetici={yonetici}
          onVazgec={() => setAta(false)}
          onKaydet={async (v) => {
            if (v.tanim.tur === 'abonelik') await abonelikAta({ ...v, aylikUcret: v.uygulananFiyat }, benim);
            else await paketAta(v, benim);
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
