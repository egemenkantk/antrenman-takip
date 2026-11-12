import { useEffect, useMemo, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { tarihGoster } from '../veri';
import { odemeDurumu, dersleriDagit, tl, KITLE_ADI } from './model.js';
import {
  kisiPaketleri,
  kisiOdemeleri,
  bireyselKayitlar,
  paketTanimlariGetir,
  paketAta,
  paketGuncelle,
  odemeEkle,
  dersDusmeKarari,
} from './veri';
import { DurumRozeti, OdemeFormu, OdemeListesi } from './bilesenler';

function PaketAtaFormu({ kisi, tanimlar, yonetici, onKaydet, onVazgec }) {
  const uygun = tanimlar.filter(
    (t) => t.aktif !== false && t.tur === 'bireysel' && (!t.kitle || t.kitle === kisi.tip)
  );
  const digerleri = tanimlar.filter((t) => t.aktif !== false && t.tur === 'bireysel' && t.kitle && t.kitle !== kisi.tip);
  const [tanimId, setTanimId] = useState(uygun[0]?.id || '');
  const tanim = tanimlar.find((t) => t.id === tanimId);
  const [baslangic, setBaslangic] = useState(bugun());
  const [fiyat, setFiyat] = useState(tanim?.fiyat ?? '');
  const [not, setNot] = useState('');
  const [hata, setHata] = useState('');
  useEffect(() => setFiyat(tanim?.fiyat ?? ''), [tanimId]);

  if (!tanimlar.some((t) => t.tur === 'bireysel' && t.aktif !== false)) {
    return (
      <div className="kart-form">
        <p className="aciklama">Henüz bireysel paket tanımı yok. Yönetici "Paketler ve ödemeler → Paket tanımları"ndan ekleyebilir.</p>
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
            {uygun.map((t) => <option key={t.id} value={t.id}>{t.ad} · {t.dersSayisi} ders</option>)}
            {digerleri.length > 0 && (
              <optgroup label="Diğer kitle">
                {digerleri.map((t) => <option key={t.id} value={t.id}>{t.ad} · {KITLE_ADI[t.kitle]}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <label className="alan">
          <span>Başlangıç</span>
          <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
        </label>
        <label className="alan">
          <span>Fiyat (₺){yonetici ? ' — kişiye özel değiştirebilirsin' : ''}</span>
          <input type="number" min="0" value={fiyat} disabled={!yonetici} onChange={(e) => setFiyat(e.target.value)} />
        </label>
        {yonetici && (
          <label className="alan">
            <span>Fiyat notu (kardeş indirimi vb.)</span>
            <input value={not} onChange={(e) => setNot(e.target.value)} />
          </label>
        )}
      </div>
      <p className="aciklama kucuk-yazi">Bu tarihten sonraki "geldi" işaretli bireysel dersler bu paketten düşer. Paketin bitiş tarihi yok.</p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Ata</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
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
              : `Bireysel · ${tarihGoster(p.baslangic)} başlangıç`}
          </span>
        </div>
        <DurumRozeti durum={od.durum} />
      </div>
      {p.tur === 'bireysel' && d && (
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
          {p.tur === 'bireysel' && d && (
            <>
              <h4>Bu paketten düşen dersler</h4>
              {d.dersler.length === 0 ? (
                <p className="aciklama kucuk-yazi">Henüz ders düşmedi.</p>
              ) : (
                <p className="kucuk-yazi">
                  {d.dersler.map((x) => kisaTarih(x.tarih) + (x.katilim === 'gelmedi' ? ' (gelmedi)' : '')).join(' · ')}
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
      setVeri({ paketler, odemeler, kayitlar, tanimlar });
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

  const sirali = [...veri.paketler].sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || ''));
  const bitmis = (p) => {
    if (p.durum === 'iptal') return true;
    const od = odemeDurumu(p, veri.odemeler);
    if (od.kalan > 0) return false;
    if (p.tur === 'grup') return p.donemBit < bugun();
    return dagitim.paketler[p.id]?.kalan === 0;
  };
  const acikPaketler = sirali.filter((p) => !bitmis(p));
  const bitenPaketler = sirali.filter(bitmis);
  const toplamKalan = veri.paketler.reduce((t, p) => t + (p.durum === 'iptal' ? 0 : odemeDurumu(p, veri.odemeler).kalan), 0);
  const gelmediler = veri.kayitlar
    .filter((k) => k.katilim === 'gelmedi' && !String(k.id).includes('_') && !String(k.id).startsWith('sk_'))
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, 10);

  const kart = (p) => (
    <PaketKarti key={p.id} p={p} dagitim={dagitim} odemeler={veri.odemeler} yonetici={yonetici} benim={benim} koclar={koclar} onDegisti={yukle} setHata={setHata} />
  );

  return (
    <div>
      <div className="paket-ozet-bant">
        <span>Toplam kalan ödeme <strong className={toplamKalan > 0 ? 'uyari-yazi' : ''}>{tl(toplamKalan)}</strong></span>
        {!ata && <button className="ikincil kucuk" onClick={() => setAta(true)}>+ Bireysel paket ata</button>}
      </div>
      {hata && <p className="hata">{hata}</p>}
      {ata && (
        <PaketAtaFormu
          kisi={kisi}
          tanimlar={veri.tanimlar}
          yonetici={yonetici}
          onVazgec={() => setAta(false)}
          onKaydet={async (v) => { await paketAta(v, benim); setAta(false); await yukle(); }}
        />
      )}
      {dagitim.paketsizDersler.length > 0 && (
        <p className="uyari-kutu kucuk-yazi">
          {dagitim.paketsizDersler.length} bireysel ders hiçbir pakete düşmedi (paket bitmiş ya da atanmamış):{' '}
          {dagitim.paketsizDersler.slice(-6).map((x) => kisaTarih(x.tarih)).join(', ')}
        </p>
      )}
      {acikPaketler.length === 0 && !ata && (
        <div className="bos-durum"><p>Açık paket yok. Grup dönemleri grubun "Ödemeler" sekmesinden açılır; bireysel paketi buradan atayabilirsin.</p></div>
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
          <summary>Gelmedi işaretli bireysel dersler — dersten düşsün mü?</summary>
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
                  {tarihGoster(k.tarih)} {k.not ? `· ${k.not}` : ''}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
