// Sadece ödeme gruplarında günlük giriş: dönem üyesi olmadan o gün gelip ücretini ödeyenler.
// Her giriş bir satilanPaketler kaydıdır (tur: 'gunluk', grupId, tarih = baslangic); ödeme ona bağlanır.
// Tahsilatlarda grup dersleri altında o grubun satırına, koç tablosunda grubun koçuna yazılır.
import { useEffect, useState } from 'react';
import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { kisiEkle } from '../veri';
import { odemeEkle } from './veri';
import { tl, YONTEMLER, odemeDurumu } from './model.js';

async function girisleriGetir(grupId, bas, bit) {
  const ps = await getDocs(query(collection(db, 'satilanPaketler'), where('grupId', '==', grupId), where('tur', '==', 'gunluk')));
  const l = ps.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.durum !== 'iptal' && p.baslangic >= bas && p.baslangic <= bit);
  const odemeler = (
    await Promise.all(l.map((p) => getDocs(query(collection(db, 'odemeler'), where('satilanPaketId', '==', p.id)))))
  ).flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
  return l.map((p) => ({ ...p, od: odemeDurumu(p, odemeler) })).sort((a, b) => b.baslangic.localeCompare(a.baslangic));
}

export default function GunlukGirisler({ grup, kisiler, donem, yonetici, benim, onKisiEklendi }) {
  const [liste, setListe] = useState(null);
  const [acik, setAcik] = useState(false);
  const [odemeAcik, setOdemeAcik] = useState(null);
  const [f, setF] = useState({ tarih: bugun(), ad: '', tutar: grup.gunlukUcret || '', yontem: 'nakit', odendi: true });
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const yukle = () => girisleriGetir(grup.id, donem.bas, donem.bit).then(setListe).catch((e) => setHata(hataMesaji(e)));
  useEffect(() => {
    setListe(null);
    yukle();
  }, [grup.id, donem.bas]);

  // Önerilecek isimler: grubun üyeleri ve daha önce günlük gelenler (kartı açılmamış hafif kayıtlar)
  const adaylar = kisiler.filter((k) => k.aktif !== false && ((grup.uyeIds || []).includes(k.id) || (k.sadeceOdeme && (k.gunlukGruplar || []).includes(grup.id))));
  const adinKisi = (ad) => adaylar.find((k) => k.ad.trim().toLocaleLowerCase('tr') === ad.trim().toLocaleLowerCase('tr'));

  async function kaydet(e) {
    e.preventDefault();
    const ad = f.ad.trim();
    if (!ad) return setHata('Ad yazın.');
    if (!(Number(f.tutar) > 0)) return setHata('Ücret girin.');
    if (bekliyor) return;
    setHata('');
    setBekliyor(true);
    try {
      let kisi = adinKisi(ad);
      if (!kisi) {
        const id = await kisiEkle(
          { ad, sadeceOdeme: true, tip: 'sporcu', subeIds: grup.subeId ? [grup.subeId] : [], kocIds: [], grupKocIds: grup.kocIds || [], gunlukGruplar: [grup.id], not: 'Günlük giriş' },
          benim
        );
        kisi = { id, ad };
        await onKisiEklendi?.();
      }
      const p = await addDoc(collection(db, 'satilanPaketler'), {
        kisiId: kisi.id,
        tur: 'gunluk',
        grupId: grup.id,
        grupAdi: grup.ad || '',
        paketAdi: `${grup.ad || 'Grup'} · günlük giriş`,
        baslangic: f.tarih,
        uygulananFiyat: Number(f.tutar),
        listeFiyati: Number(grup.gunlukUcret) || Number(f.tutar),
        durum: 'aktif',
        olusturan: benim,
        kurumId: KURUM_ID,
        olusturma: serverTimestamp(),
      });
      if (f.odendi) await odemeEkle({ kisiId: kisi.id, satilanPaketId: p.id, tutar: f.tutar, tarih: f.tarih, yontem: f.yontem, not: 'Günlük giriş' }, benim);
      setF({ ...f, ad: '' });
      await yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
    setBekliyor(false);
  }

  async function odemeAl(p, yontem) {
    setHata('');
    try {
      await odemeEkle({ kisiId: p.kisiId, satilanPaketId: p.id, tutar: p.od.kalan, tarih: bugun(), yontem, not: 'Günlük giriş' }, benim);
      setOdemeAcik(null);
      await yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  }

  const adOf = (id) => kisiler.find((k) => k.id === id)?.ad || 'Kişi';
  const toplam = (liste || []).reduce((t, p) => t + p.od.odenen, 0);

  return (
    <div className="gunluk-girisler">
      <div className="baslik-satiri">
        <h3>Günlük girişler</h3>
        {yonetici && !acik && <button className="birincil kucuk" onClick={() => setAcik(true)}>+ Günlük giriş</button>}
      </div>
      <p className="aciklama kucuk-yazi">
        {kisaTarih(donem.bas)} – {kisaTarih(donem.bit)} arası · {liste ? `${liste.length} giriş · alınan ${tl(toplam)}` : 'yükleniyor…'}
        {grup.gunlukUcret ? ` · günlük ücret ${tl(grup.gunlukUcret)}` : ''}
      </p>
      {acik && (
        <form className="kart-form ic-form" onSubmit={kaydet}>
          <div className="form-izgara">
            <label className="alan">
              <span>Tarih</span>
              <input type="date" max={bugun()} value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} />
            </label>
            <label className="alan">
              <span>Ad soyad</span>
              <input list={`gunluk-${grup.id}`} value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder="Yazın ya da seçin" />
              <datalist id={`gunluk-${grup.id}`}>
                {adaylar.map((k) => <option key={k.id} value={k.ad} />)}
              </datalist>
              {f.ad.trim() && !adinKisi(f.ad) && <small className="ipucu">Yeni isim: kişi kartı açılmadan kaydedilir.</small>}
            </label>
            <label className="alan">
              <span>Ücret (₺)</span>
              <input type="number" min="0" value={f.tutar} onChange={(e) => setF({ ...f, tutar: e.target.value })} />
            </label>
            <label className="alan">
              <span>Ödeme yöntemi</span>
              <select value={f.yontem} onChange={(e) => setF({ ...f, yontem: e.target.value })} disabled={!f.odendi}>
                {YONTEMLER.map(([v, a]) => <option key={v} value={v}>{a}</option>)}
              </select>
            </label>
          </div>
          <label className="onay-kutusu">
            <input type="checkbox" checked={f.odendi} onChange={(e) => setF({ ...f, odendi: e.target.checked })} />
            <span>Ödeme alındı</span>
          </label>
          {hata && <p className="hata">{hata}</p>}
          <div className="dugme-satiri">
            <button className="birincil kucuk" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
            <button type="button" className="metin" onClick={() => { setAcik(false); setHata(''); }}>Kapat</button>
          </div>
        </form>
      )}
      {!acik && hata && <p className="hata">{hata}</p>}
      {liste && liste.length > 0 && (
        <ul className="sade-liste">
          {liste.map((p) => (
            <li key={p.id}>
              {kisaTarih(p.baslangic)} · <strong>{adOf(p.kisiId)}</strong> · {tl(p.uygulananFiyat)}{' '}
              {p.od.kalan <= 0 ? (
                <span className="odeme-rozet odendi">Ödendi</span>
              ) : (
                <>
                  <span className="odeme-rozet odenmedi">Bekliyor</span>
                  {yonetici && odemeAcik !== p.id && <button className="metin" onClick={() => setOdemeAcik(p.id)}>Ödeme al</button>}
                  {odemeAcik === p.id &&
                    YONTEMLER.map(([v, a]) => (
                      <button key={v} className="metin" onClick={() => odemeAl(p, v)}>{a}</button>
                    ))}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
