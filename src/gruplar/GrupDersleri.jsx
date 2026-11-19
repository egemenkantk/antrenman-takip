// Grubun girilmiş dersleri: geçmiş ders elle ekleme, tarihini değiştirme (ör. düzensiz günler), silme.
// Kayıtlar her üyenin kendi antrenmanKayitlari/{tarih}_{grupId} belgesidir; düet/trioda paketten düşme bunlara göre hesaplanır.
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { KURUM_ID } from '../config/marka';
import { hataMesaji, sonDersKontrol } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { grupKayitId } from '../bugun/veri';
import { KATILIM } from '../bugun/Formlar';
import { kocAdi } from '../paket/bilesenler';

const KATILIM_ADI = Object.fromEntries(KATILIM);
const ozelDersMi = (g) => g.dersTuru === 'duet' || g.dersTuru === 'trio';

async function dersleriGetir(grup, uyeler) {
  const tarihler = {};
  await Promise.all(
    uyeler.map(async (k) => {
      try {
        const s = await getDocs(collection(db, 'kisiler', k.id, 'antrenmanKayitlari'));
        for (const d of s.docs) {
          const r = d.data();
          if (r.grupId !== grup.id || d.id !== grupKayitId(r.tarih, grup.id)) continue;
          (tarihler[r.tarih] ||= {})[k.id] = { id: d.id, ...r };
        }
      } catch {
        /* okunamayan üye atlanır */
      }
    })
  );
  return Object.entries(tarihler)
    .map(([tarih, kayitlar]) => ({ tarih, kayitlar }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

function DersFormu({ grup, uyeler, benim, koclar, ilk, mevcutTarihler, onKaydet, onVazgec }) {
  const ilkKayit = ilk ? Object.values(ilk.kayitlar)[0] : null;
  const [tarih, setTarih] = useState(ilk?.tarih || '');
  const [katilim, setKatilim] = useState(() => Object.fromEntries(uyeler.map((k) => [k.id, ilk?.kayitlar[k.id]?.katilim || 'geldi'])));
  const [dersiVeren, setDersiVeren] = useState(ilkKayit?.dersiVeren || ilkKayit?.kaydeden || benim);
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const cakisma = tarih && tarih !== ilk?.tarih && mevcutTarihler.includes(tarih);

  async function kaydet(e) {
    e.preventDefault();
    if (!tarih) return setHata('Tarih seçin.');
    if (tarih > bugun()) return setHata('İleri tarih girilemez.');
    if (cakisma && !window.confirm(`${kisaTarih(tarih)} tarihinde bu grubun dersi zaten var. Üzerine yazılsın mı?`)) return;
    setHata('');
    setBekliyor(true);
    try {
      await onKaydet({ tarih, katilim, dersiVeren });
    } catch (err) {
      setHata(hataMesaji(err));
      setBekliyor(false);
    }
  }
  return (
    <form className="kart-form ic-form" onSubmit={kaydet}>
      <strong>{ilk ? `${kisaTarih(ilk.tarih)} dersini düzenle` : 'Geçmiş ders ekle'}</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>Ders tarihi</span>
          <input type="date" max={bugun()} value={tarih} onChange={(e) => setTarih(e.target.value)} />
          {cakisma && <small className="uyari-yazi">Bu tarihte ders var.</small>}
        </label>
        {koclar?.length > 0 && (
          <label className="alan">
            <span>Dersi veren koç</span>
            <select value={dersiVeren} onChange={(e) => setDersiVeren(e.target.value)}>
              {!koclar.some((k) => k.id === dersiVeren) && <option value={dersiVeren}>{kocAdi(dersiVeren, benim, koclar)}</option>}
              {koclar.map((k) => <option key={k.id} value={k.id}>{kocAdi(k.id, benim, koclar)}</option>)}
            </select>
          </label>
        )}
      </div>
      {uyeler.map((k) => (
        <label key={k.id} className="alan">
          <span>{k.ad}</span>
          <select value={katilim[k.id]} onChange={(e) => setKatilim({ ...katilim, [k.id]: e.target.value })}>
            {KATILIM.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
          </select>
        </label>
      ))}
      {ozelDersMi(grup) && (
        <p className="aciklama kucuk-yazi">Gelenlerin paketinden ders düşer; kaç kişi geldiyse ona göre (paketinde eksik katılım ücreti varsa) hesaplanır.</p>
      )}
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

export default function GrupDersleri({ grup, uyeler, benim, koclar, duzenleyebilir }) {
  const [dersler, setDersler] = useState(null);
  const [acik, setAcik] = useState(null); // 'yeni' | tarih
  const [hata, setHata] = useState('');
  const yukle = () => dersleriGetir(grup, uyeler).then(setDersler).catch((e) => setHata(hataMesaji(e)));
  useEffect(() => {
    setDersler(null);
    yukle();
  }, [grup.id, uyeler.map((k) => k.id).join()]);

  // Bir dersi (yeniden) yaz; tarih değiştiyse eski tarihli kayıtlar silinir
  async function kaydet(eski, { tarih, katilim, dersiVeren }) {
    const gelenSayisi = uyeler.filter((k) => katilim[k.id] === 'geldi').length;
    for (const k of uyeler) {
      const onceki = eski?.kayitlar[k.id];
      const yeniId = grupKayitId(tarih, grup.id);
      const mevcut = (await getDoc(doc(db, 'kisiler', k.id, 'antrenmanKayitlari', yeniId))).data();
      const temel = { ...(onceki || mevcut || {}) };
      delete temel.id;
      await setDoc(doc(db, 'kisiler', k.id, 'antrenmanKayitlari', yeniId), {
        ...temel,
        tarih,
        katilim: katilim[k.id],
        seansTipi: 'grup',
        grupId: grup.id,
        grupAdi: grup.ad || '',
        tur: temel.tur || grup.ad || 'Grup dersi',
        dersiVeren,
        ...(ozelDersMi(grup) ? { dersTuru: grup.dersTuru, gelenSayisi, grupBoyu: uyeler.length } : {}),
        ...(katilim[k.id] === 'geldi' ? {} : { rpe: null, sure: null }),
        not: temel.not || 'Elle girildi (geçmiş ders)',
        kaydeden: temel.kaydeden || benim,
        duzenleyen: benim,
        kurumId: KURUM_ID,
        kayit: temel.kayit || serverTimestamp(),
      });
      if (onceki && onceki.id !== yeniId) await deleteDoc(doc(db, 'kisiler', k.id, 'antrenmanKayitlari', onceki.id));
      if (ozelDersMi(grup)) sonDersKontrol(k.id);
    }
  }
  async function sil(d) {
    if (!window.confirm(`${kisaTarih(d.tarih)} dersi silinsin mi? Bu dersin bütün üyelerdeki kaydı kalkar${ozelDersMi(grup) ? ' ve paketlere geri yüklenir' : ''}.`)) return;
    setHata('');
    try {
      for (const r of Object.entries(d.kayitlar)) await deleteDoc(doc(db, 'kisiler', r[0], 'antrenmanKayitlari', r[1].id));
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  const formProps = { grup, uyeler, benim, koclar, mevcutTarihler: (dersler || []).map((d) => d.tarih), onVazgec: () => setAcik(null) };
  return (
    <div>
      <p className="aciklama kucuk-yazi">
        Girilmiş dersler. Düzensiz günlerdeki dersleri buradan tarih vererek ekleyebilir ya da bir dersin tarihini değiştirebilirsin.
      </p>
      {hata && <p className="hata">{hata}</p>}
      {duzenleyebilir && acik !== 'yeni' && (
        <button className="birincil kucuk" onClick={() => setAcik('yeni')}>+ Geçmiş ders ekle</button>
      )}
      {acik === 'yeni' && (
        <DersFormu
          {...formProps}
          onKaydet={async (v) => {
            await kaydet(null, v);
            setAcik(null);
            await yukle();
          }}
        />
      )}
      {!dersler && <p className="aciklama">Yükleniyor…</p>}
      {dersler && dersler.length === 0 && <p className="aciklama">Henüz girilmiş ders yok.</p>}
      {dersler && dersler.length > 0 && (
        <ul className="paket-listesi">
          {dersler.map((d) => {
            const ilk = Object.values(d.kayitlar)[0];
            return (
              <li key={d.tarih} className="paket-karti">
                <div className="paket-ust">
                  <div className="esnek">
                    <strong>{kisaTarih(d.tarih)}</strong>
                    <span className="aciklama kucuk-yazi">
                      {uyeler.map((k) => `${k.ad}: ${KATILIM_ADI[d.kayitlar[k.id]?.katilim] || 'kayıt yok'}`).join(' · ')}
                      {ilk?.dersiVeren || ilk?.kaydeden ? ` · ${kocAdi(ilk.dersiVeren || ilk.kaydeden, benim, koclar)}` : ''}
                    </span>
                  </div>
                </div>
                {duzenleyebilir && acik !== d.tarih && (
                  <div className="dugme-satiri">
                    <button className="metin" onClick={() => setAcik(d.tarih)}>Düzenle / tarihini değiştir</button>
                    <button className="metin" onClick={() => sil(d)}>Sil</button>
                  </div>
                )}
                {acik === d.tarih && (
                  <DersFormu
                    {...formProps}
                    ilk={d}
                    onKaydet={async (v) => {
                      await kaydet(d, v);
                      setAcik(null);
                      await yukle();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
