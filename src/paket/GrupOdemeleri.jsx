import { useEffect, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { donemBul, donemNo, odemeDurumu, tl } from './model.js';
import { grupDonemKayitlari, grupKaydiOlustur, kisiOdemeleri, odemeEkle, grupOzelFiyat, paketGuncelle } from './veri';
import { orantiliUcret } from './model.js';
import { DurumRozeti, OdemeFormu, OdemeListesi } from './bilesenler';

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

export default function GrupOdemeleri({ grup, kisiler, tanim, yonetici, benim, koclar, onGrupDegisti }) {
  const ilk = grup.donemBaslangic ? donemBul(grup.donemBaslangic, bugun()) || donemNo(grup.donemBaslangic, 0) : null;
  const [no, setNo] = useState(ilk?.no ?? 0);
  const [veri, setVeri] = useState(null);
  const [acik, setAcik] = useState(null); // {kisiId, mod: 'odeme'|'liste'}
  const [hata, setHata] = useState('');
  const donem = grup.donemBaslangic ? donemNo(grup.donemBaslangic, no) : null;

  const yukle = async () => {
    if (!donem) return;
    try {
      const kayitlar = await grupDonemKayitlari(grup, donem);
      const odemeler = (await Promise.all((grup.uyeIds || []).map((id) => kisiOdemeleri(id).catch(() => [])))).flat();
      setVeri({ kayitlar, odemeler });
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  useEffect(() => {
    setVeri(null);
    yukle();
  }, [grup.id, no]);

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

  const uyeler = (grup.uyeIds || []).map((id) => kisiler.find((k) => k.id === id) || { id, ad: 'Kişi' });
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
      {hata && <p className="hata">{hata}</p>}
      {!veri && <p className="aciklama">Yükleniyor…</p>}
      {ozet && (
        <p className="aciklama">
          {ozet.odeyen}/{ozet.kayit} kişi ödedi · Tahsil edilen {tl(ozet.tahsil)} / {tl(ozet.toplam)}
        </p>
      )}
      {yonetici && eksikler.length > 0 && (
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
            return (
              <li key={k.id} className="paket-karti">
                <div className="paket-ust">
                  <div className="esnek">
                    <strong>{k.ad}</strong>
                    <span className="aciklama kucuk-yazi">
                      {r
                        ? `${tl(r.uygulananFiyat)} · Ödenen ${tl(od.odenen)}${od.kalan > 0 ? ` · Kalan ${tl(od.kalan)}` : ''}${
                            yonetici && r.fiyatNotu ? ` · ${r.fiyatNotu}` : ''
                          }`
                        : 'Bu dönem kaydı yok'}
                    </span>
                  </div>
                  {od && <DurumRozeti durum={od.durum} />}
                </div>
                {r && !ac && (
                  <div className="dugme-satiri">
                    {od.kalan > 0 && r.durum !== 'iptal' && (
                      <button className="birincil kucuk" onClick={() => setAcik({ kisiId: k.id, mod: 'odeme' })}>Ödeme al</button>
                    )}
                    <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'liste' })}>Ödemeler</button>
                    {yonetici && (
                      <button className="metin" onClick={() => setAcik({ kisiId: k.id, mod: 'ozel' })}>
                        {grup.ozelFiyatlar?.[k.id] ? `Özel ücret: ${tl(grup.ozelFiyatlar[k.id].fiyat)}` : 'Özel ücret'}
                      </button>
                    )}
                  </div>
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
