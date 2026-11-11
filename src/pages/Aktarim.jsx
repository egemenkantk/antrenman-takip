// Eski Sporcu Kartı verilerini siteye aktarma (yalnızca yönetici).
// Dosya tarayıcıda okunur ve yöneticinin oturumuyla yazılır; depoya ya da sunucuya ayrıca gitmez.
// Tekrar çalıştırılabilir: aynı sporcu ikinci kez aktarılırsa üzerine yazılır, çoğalmaz.

import { useState } from 'react';
import { doc, writeBatch, serverTimestamp, collection, getDocs, getDoc, query, where } from 'firebase/firestore';
import { eskiBloguDonustur } from '../program/eskiDonustur';
import { db } from '../firebase';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { KURUM_ID } from '../config/marka';
import { BRANSLAR } from '../veri';

const temizBrans = (s) => {
  const t = String(s || '').trim();
  if (!t || t.toLocaleLowerCase('tr') === 'yok') return '';
  const eslesen = BRANSLAR.find((b) => b.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'));
  return eslesen || t.charAt(0).toLocaleUpperCase('tr') + t.slice(1);
};
const fotoGecerli = (u) => typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(u) && u.length < 400000;
const sayi = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

// Bir sporcunun yazılacak belgeleri
function belgeler(a, { subeId, kocEslesme, yapan }) {
  const kisiId = 'sk_' + a.id;
  const kocIds = [...new Set((a.coaches || []).map((c) => kocEslesme[c]).filter(Boolean))];
  const kisi = {
    tip: 'sporcu',
    ad: String(a.name || '').trim(),
    dogumTarihi: '',
    dogumYili: sayi(a.birthYear),
    cinsiyet: a.gender === 'Erkek' ? 'E' : a.gender === 'Kadın' || a.gender === 'Kız' ? 'K' : '',
    telefon: '',
    eskiTelefon: a.phone || '',
    subeIds: [subeId],
    kocIds,
    brans: temizBrans(a.sport),
    hedef: '',
    hedefNotu: a.goal || '',
    seviye: a.level || '',
    pozisyon: a.position || '',
    kulup: a.team || '',
    boy: sayi(a.height),
    kilo: sayi(a.weight),
    foto: fotoGecerli(a.photo) ? a.photo : null,
    not: '',
    aktif: true,
    kurumId: KURUM_ID,
    kaynak: 'sporcu-karti',
    eskiId: a.id,
    eskiKoclar: a.coaches || [],
    aktarimTarihi: serverTimestamp(),
    olusturan: yapan,
  };
  const yazilar = [[doc(db, 'kisiler', kisiId), kisi]];
  for (const m of a.metrics || []) {
    yazilar.push([
      doc(db, 'kisiler', kisiId, 'testSonuclari', 'sk_' + m.id),
      { test: m.name, tarih: m.date, deger: sayi(m.value), kaynak: 'sporcu-karti', kurumId: KURUM_ID },
    ]);
  }
  for (const w of a.wellness || []) {
    yazilar.push([
      doc(db, 'kisiler', kisiId, 'wellness', 'sk_' + w.id),
      {
        tarih: w.date,
        uyku: sayi(w.sleep),
        uykuSaati: sayi(w.hours),
        enerji: sayi(w.energy),
        kasAgrisi: sayi(w.soreness),
        stres: sayi(w.stress),
        ruhHali: sayi(w.mood),
        not: w.note || '',
        dolduran: 'aktarim',
        kaynak: 'sporcu-karti',
        kurumId: KURUM_ID,
      },
    ]);
  }
  for (const w of a.workouts || []) {
    yazilar.push([
      doc(db, 'kisiler', kisiId, 'antrenmanKayitlari', 'sk_' + w.id),
      {
        tarih: w.date,
        tur: w.type || '',
        sure: sayi(w.duration),
        rpe: sayi(w.rpe),
        icerik: w.exercises || '',
        not: w.note || '',
        kaynak: 'sporcu-karti',
        kurumId: KURUM_ID,
      },
    ]);
  }
  (a.health || []).forEach((h, i) => {
    yazilar.push([
      doc(db, 'kisiler', kisiId, 'sakatliklar', 'sk_' + (h.id || i)),
      { ...h, kaynak: 'sporcu-karti', kurumId: KURUM_ID },
    ]);
  });
  // Program blokları, güne özel değişiklikler, postür ve saatler: ilgili bölümler gelince dönüştürülecek
  const { photo, metrics, wellness, workouts, health, ...ham } = a;
  yazilar.push([
    doc(db, 'kisiler', kisiId, 'ozel', 'eskiKayit'),
    { ...ham, kaynak: 'sporcu-karti', aktarimTarihi: serverTimestamp() },
  ]);
  return yazilar;
}

export default function Aktarim({ subeler, koclar }) {
  const { durum } = useOturum();
  const [paket, setPaket] = useState(null);
  const [subeId, setSubeId] = useState(subeler[0]?.id || '');
  const [kocEslesme, setKocEslesme] = useState({});
  const [hata, setHata] = useState('');
  const [ilerleme, setIlerleme] = useState(null);
  const [bitti, setBitti] = useState(null);

  async function dosyaSec(e) {
    setHata('');
    setBitti(null);
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const veri = JSON.parse(await f.text());
      if (!Array.isArray(veri.athletes)) throw new Error('bicim');
      setPaket(veri);
      // Koç adlarını kullanıcı adlarıyla otomatik eşleştirmeyi dene
      const adlar = [...new Set(veri.athletes.flatMap((a) => a.coaches || []))];
      const es = {};
      for (const ad of adlar) {
        const kok = ad.toLocaleLowerCase('tr').replace(/\s*hoca$/, '').trim();
        const k = koclar.find((u) => u.ad.toLocaleLowerCase('tr').startsWith(kok));
        es[ad] = k ? k.id : '';
      }
      setKocEslesme(es);
    } catch {
      setPaket(null);
      setHata('Dosya okunamadı. Sana gönderdiğim aktarım dosyasını seçtiğinden emin ol.');
    }
  }

  async function aktar() {
    setHata('');
    if (!subeId) return setHata('Şube seç.');
    const tum = paket.athletes.flatMap((a) => belgeler(a, { subeId, kocEslesme, yapan: durum.kullanici.id }));
    tum.push([
      doc(db, 'aktarim', 'sporcu-karti'),
      {
        groups: paket.groups || [],
        events: paket.events || [],
        coaches: paket.coaches || [],
        logo: paket.brand?.logo && fotoGecerli(paket.brand.logo) ? paket.brand.logo : null,
        sporcuSayisi: paket.athletes.length,
        aktaran: durum.kullanici.id,
        tarih: serverTimestamp(),
      },
    ]);
    try {
      for (let i = 0; i < tum.length; i += 400) {
        const b = writeBatch(db);
        tum.slice(i, i + 400).forEach(([ref, v]) => b.set(ref, v, { merge: true }));
        await b.commit();
        setIlerleme(Math.min(100, Math.round(((i + 400) / tum.length) * 100)));
      }
      setBitti({ sporcu: paket.athletes.length, belge: tum.length });
      setPaket(null);
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setIlerleme(null);
    }
  }

  const kocAdlari = Object.keys(kocEslesme);
  const say = (k) => (paket?.athletes || []).reduce((t, a) => t + (a[k]?.length || 0), 0);

  return (
    <section className="kart-form">
      <h3>Eski verileri aktar</h3>
      <p className="aciklama kucuk-yazi">
        Sporcu Kartı'ndan dışa aktardığım dosyayı seç. Sporcular, test ölçümleri, wellness ve antrenman kayıtları aktarılır.
        Program blokları ve postür değerlendirmeleri saklanır; o bölümler gelince kartta görünecek. Tekrar çalıştırılırsa kayıtlar çoğalmaz, ama aktarılan sporcuların kartlarında sonradan yaptığın değişikliklerin üzerine yazar.
      </p>
      <input type="file" accept="application/json,.json" onChange={dosyaSec} />

      {paket && (
        <>
          <ul className="sade-liste">
            <li>{paket.athletes.length} sporcu</li>
            <li>{say('metrics')} ölçüm/test, {say('wellness')} wellness, {say('workouts')} antrenman kaydı</li>
            <li>{(paket.groups || []).length} grup ve {(paket.events || []).length} etkinlik (gruplar ve takvim bölümü gelince kullanılacak)</li>
          </ul>

          <label className="alan">
            <span>Sporcular hangi şubeye eklensin?</span>
            <select value={subeId} onChange={(e) => setSubeId(e.target.value)}>
              {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
            </select>
          </label>

          {kocAdlari.length > 0 && (
            <div className="alan">
              <span>Eski sayfadaki antrenörler → sitedeki koç hesapları</span>
              {kocAdlari.map((ad) => (
                <div key={ad} className="satir-arasi">
                  <span>{ad}</span>
                  <select value={kocEslesme[ad]} onChange={(e) => setKocEslesme({ ...kocEslesme, [ad]: e.target.value })}>
                    <option value="">Şimdilik atama</option>
                    {koclar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
                  </select>
                </div>
              ))}
              <small className="ipucu">Koç henüz eklenmediyse boş bırak; sonra kişi kartından atayabilirsin.</small>
            </div>
          )}

          <details>
            <summary>Sporcu listesi</summary>
            <ul className="sade-liste">
              {paket.athletes.map((a) => (
                <li key={a.id}>
                  {a.name}
                  {temizBrans(a.sport) ? ` · ${temizBrans(a.sport)}` : ''}
                  {a.coaches?.length ? ` · ${a.coaches.join(', ')}` : ''}
                </li>
              ))}
            </ul>
          </details>

          <button className="birincil" onClick={aktar} disabled={ilerleme !== null}>
            {ilerleme !== null ? `Aktarılıyor… %${ilerleme}` : `${paket.athletes.length} sporcuyu aktar`}
          </button>
        </>
      )}

      {hata && <p className="hata">{hata}</p>}
      {bitti && (
        <p className="bilgi">
          Aktarım tamamlandı: {bitti.sporcu} sporcu ve kayıtları ({bitti.belge} kayıt) Kişiler bölümünde.
          Bilgisayarındaki aktarım dosyasını artık silebilirsin.
        </p>
      )}
    </section>
  );
}

// Aktarılmış sporcuların saklanan eski program bloklarını yeni program bölümüne dönüştürür.
export function ProgramAktarimi() {
  const { durum } = useOturum();
  const [ilerleme, setIlerleme] = useState(null);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');

  async function calistir() {
    setHata('');
    setSonuc(null);
    setIlerleme('Kişiler okunuyor…');
    try {
      const kisiler = await getDocs(query(collection(db, 'kisiler'), where('kaynak', '==', 'sporcu-karti')));
      const yazilar = [];
      for (const k of kisiler.docs) {
        const eski = await getDoc(doc(db, 'kisiler', k.id, 'ozel', 'eskiKayit'));
        for (const b of eski.exists() ? eski.data().blocks || [] : []) {
          if (!b?.start) continue;
          yazilar.push([
            doc(db, 'programlar', 'sk_' + b.id),
            {
              ...eskiBloguDonustur(b),
              sahipTip: 'kisi',
              sahipId: k.id,
              kurumId: KURUM_ID,
              kaynak: 'sporcu-karti',
              olusturan: durum.kullanici.id,
              olusturma: serverTimestamp(),
            },
          ]);
        }
      }
      setIlerleme(`${yazilar.length} blok yazılıyor…`);
      for (let i = 0; i < yazilar.length; i += 400) {
        const bt = writeBatch(db);
        yazilar.slice(i, i + 400).forEach(([r, v]) => bt.set(r, v));
        await bt.commit();
      }
      setSonuc({ blok: yazilar.length, kisi: kisiler.size });
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setIlerleme(null);
    }
  }

  return (
    <section className="kart-form">
      <h3>Eski program bloklarını aktar</h3>
      <p className="aciklama kucuk-yazi">
        Sporcu Kartı'ndan aktarılan sporcuların program blokları (günler, bölümler, haftalık dozajlar) Program sekmesine dönüştürülür.
        Tekrar çalıştırılırsa aynı bloklar yeniden yazılır, çoğalmaz; ama bu bloklarda sitede yaptığın değişikliklerin üzerine yazar.
      </p>
      <button className="ikincil" onClick={calistir} disabled={ilerleme !== null}>
        {ilerleme || 'Program bloklarını aktar'}
      </button>
      {hata && <p className="hata">{hata}</p>}
      {sonuc && <p className="bilgi">{sonuc.kisi} sporcudan {sonuc.blok} program bloğu aktarıldı.</p>}
    </section>
  );
}
