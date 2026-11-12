// Eski Sporcu Kartı verilerini siteye aktarma (yalnızca yönetici).
// Dosya tarayıcıda okunur ve yöneticinin oturumuyla yazılır; depoya ya da sunucuya ayrıca gitmez.
// Tekrar çalıştırılabilir: aynı sporcu ikinci kez aktarılırsa üzerine yazılır, çoğalmaz.

import { useState } from 'react';
import { doc, writeBatch, serverTimestamp, collection, getDocs, getDoc, query, where } from 'firebase/firestore';
import { eskiBloguDonustur } from '../program/eskiDonustur';
import { grupKoclariniEsitle } from '../gruplar/veri';
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

// Aktarılmış sporcuların saklanan eski verilerinden: program blokları, antrenman saatleri,
// güne özel değişiklikler ve gruplar (grup programı ve üyeleriyle).
const ESKI_BOLUM = { surat: 'hiz', plio: 'power', kondisyon: 'kardiyo', toparlanma: 'mobilite' };
const bolumCevir = (k) => ESKI_BOLUM[k] || k;
const nesneCevir = (o = {}) => Object.fromEntries(Object.entries(o).map(([k, v]) => [bolumCevir(k), v]));
function eskiOzeliCevir(ov) {
  if (ov.rest) return { dinlenme: true, not: ov.note || '' };
  return {
    dinlenme: false,
    sade: false,
    baslik: ov.title || '',
    bolumler: (ov.secs || []).map(bolumCevir),
    icerik: nesneCevir(ov.items),
    doz: nesneCevir(ov.dose),
    not: ov.note || '',
    blokId: null,
  };
}
function saatleriCevir(times, weekdays, time) {
  const r = {};
  for (const [g, t] of Object.entries(times || {})) r[g] = t || '';
  if (!Object.keys(r).length) for (const g of weekdays || []) r[g] = time || '';
  return r;
}

export function ProgramAktarimi({ koclar = [], subeler = [] }) {
  const { durum } = useOturum();
  const [ilerleme, setIlerleme] = useState(null);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');

  const kocBul = (ad) => {
    const kok = String(ad || '').toLocaleLowerCase('tr').replace(/\s*hoca$/, '').trim();
    return koclar.find((u) => u.ad.toLocaleLowerCase('tr').startsWith(kok))?.id || null;
  };

  async function calistir() {
    setHata('');
    setSonuc(null);
    setIlerleme('Eski kayıtlar okunuyor…');
    const yapan = durum.kullanici.id;
    const ortak = { kurumId: KURUM_ID, kaynak: 'sporcu-karti' };
    try {
      const kisiler = await getDocs(query(collection(db, 'kisiler'), where('kaynak', '==', 'sporcu-karti')));
      const yazilar = [];
      const sayac = { blok: 0, ozel: 0, saat: 0, grup: 0 };
      const eskiGrubu = {}; // eski grup id → [kişi id]
      for (const k of kisiler.docs) {
        const eski = await getDoc(doc(db, 'kisiler', k.id, 'ozel', 'eskiKayit'));
        if (!eski.exists()) continue;
        const e = eski.data();
        for (const b of e.blocks || []) {
          if (!b?.start) continue;
          yazilar.push([doc(db, 'programlar', 'sk_' + b.id), { ...eskiBloguDonustur(b), sahipTip: 'kisi', sahipId: k.id, ...ortak, olusturan: yapan, olusturma: serverTimestamp() }, false]);
          sayac.blok++;
        }
        for (const [tarih, ov] of Object.entries(e.overrides || {})) {
          yazilar.push([doc(db, 'gunOzel', `${k.id}__${tarih}`), { ...eskiOzeliCevir(ov), sahipTip: 'kisi', sahipId: k.id, tarih, ...ortak, kaydeden: yapan }, false]);
          sayac.ozel++;
        }
        const saatler = saatleriCevir(e.times);
        if (Object.keys(saatler).length && !e.groupId) {
          yazilar.push([doc(db, 'kisiler', k.id), { haftalikSaatler: saatler }, true]);
          sayac.saat++;
        }
        if (e.groupId) (eskiGrubu[e.groupId] ||= []).push(k.id);
      }

      const genel = await getDoc(doc(db, 'aktarim', 'sporcu-karti'));
      const uyeler = [];
      for (const g of genel.exists() ? genel.data().groups || [] : []) {
        const grupId = 'sk_' + g.id;
        const uyeIds = eskiGrubu[g.id] || [];
        uyeler.push(...uyeIds);
        const ilkUye = kisiler.docs.find((d) => d.id === uyeIds[0]);
        yazilar.push([
          doc(db, 'gruplar', grupId),
          {
            ad: g.name || 'Grup',
            subeId: ilkUye?.data().subeIds?.[0] || subeler[0]?.id || '',
            kocIds: (g.coaches || []).map(kocBul).filter(Boolean),
            eskiKoclar: g.coaches || [],
            saatler: saatleriCevir(g.times, g.weekdays, g.time),
            sure: g.duration || 60,
            not: g.note || '',
            uyeIds,
            aktif: true,
            ...ortak,
            olusturan: yapan,
            olusturma: serverTimestamp(),
          },
          false,
        ]);
        sayac.grup++;
        for (const b of g.blocks || []) {
          if (!b?.start) continue;
          yazilar.push([doc(db, 'programlar', 'sk_' + b.id), { ...eskiBloguDonustur(b), sahipTip: 'grup', sahipId: grupId, ...ortak, olusturan: yapan, olusturma: serverTimestamp() }, false]);
          sayac.blok++;
        }
        for (const [tarih, ov] of Object.entries(g.overrides || {})) {
          yazilar.push([doc(db, 'gunOzel', `${grupId}__${tarih}`), { ...eskiOzeliCevir(ov), sahipTip: 'grup', sahipId: grupId, tarih, ...ortak, kaydeden: yapan }, false]);
          sayac.ozel++;
        }
      }

      setIlerleme(`${yazilar.length} kayıt yazılıyor…`);
      for (let i = 0; i < yazilar.length; i += 400) {
        const bt = writeBatch(db);
        yazilar.slice(i, i + 400).forEach(([r, v, birlestir]) => (birlestir ? bt.set(r, v, { merge: true }) : bt.set(r, v)));
        await bt.commit();
      }
      await grupKoclariniEsitle([...new Set(uyeler)]);
      setSonuc(sayac);
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setIlerleme(null);
    }
  }

  return (
    <section className="kart-form">
      <h3>Eski program, grup ve saatleri aktar</h3>
      <p className="aciklama kucuk-yazi">
        Sporcu Kartı'ndan aktarılan verilerden program blokları, bireysel antrenman saatleri, güne özel değişiklikler ve
        gruplar (üyeleri, saatleri ve grup programıyla) oluşturulur. Tekrar çalıştırılırsa kayıtlar çoğalmaz, ama bu kayıtlarda
        sitede yaptığın değişikliklerin üzerine yazar.
      </p>
      <button className="ikincil" onClick={calistir} disabled={ilerleme !== null}>
        {ilerleme || 'Aktar'}
      </button>
      {hata && <p className="hata">{hata}</p>}
      {sonuc && (
        <p className="bilgi">
          Aktarıldı: {sonuc.blok} program bloğu, {sonuc.grup} grup, {sonuc.saat} sporcunun antrenman saatleri, {sonuc.ozel} güne özel değişiklik.
        </p>
      )}
    </section>
  );
}

// Sporcu Kartı'ndan aktarılan sporcuların eski postür değerlendirmeleri
export function PosturAktarimi() {
  const { durum } = useOturum();
  const [ilerleme, setIlerleme] = useState(null);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');

  async function calistir() {
    setHata('');
    setSonuc(null);
    setIlerleme('Eski kayıtlar okunuyor…');
    try {
      const kisiler = await getDocs(query(collection(db, 'kisiler'), where('kaynak', '==', 'sporcu-karti')));
      const yazilar = [];
      for (const k of kisiler.docs) {
        const eski = await getDoc(doc(db, 'kisiler', k.id, 'ozel', 'eskiKayit'));
        for (const p of eski.exists() ? eski.data().postures || [] : []) {
          if (!p?.date) continue;
          yazilar.push([
            doc(db, 'kisiler', k.id, 'posturDegerlendirmeleri', 'sk_' + (p.id || p.date)),
            { tarih: p.date, not: p.note || '', bulgular: p.findings || {}, kaynak: 'sporcu-karti', kurumId: KURUM_ID, kaydeden: durum.kullanici.id },
          ]);
        }
      }
      for (let i = 0; i < yazilar.length; i += 400) {
        const bt = writeBatch(db);
        yazilar.slice(i, i + 400).forEach(([r, v]) => bt.set(r, v));
        await bt.commit();
      }
      setSonuc(yazilar.length);
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setIlerleme(null);
    }
  }

  return (
    <section className="kart-form">
      <h3>Eski postür değerlendirmelerini aktar</h3>
      <p className="aciklama kucuk-yazi">Sporcu Kartı'ndaki postür değerlendirmeleri kişi kartlarının Postür sekmesine aktarılır. Tekrar çalıştırılırsa çoğalmaz.</p>
      <button className="ikincil" onClick={calistir} disabled={ilerleme !== null}>{ilerleme || 'Aktar'}</button>
      {hata && <p className="hata">{hata}</p>}
      {sonuc != null && <p className="bilgi">{sonuc} postür değerlendirmesi aktarıldı.</p>}
    </section>
  );
}
