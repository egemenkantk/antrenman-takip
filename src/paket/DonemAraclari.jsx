// Grup dönemleri: takvim önizlemesi, ara haftalar (özel durumda dönem kaydırma) ve geçmiş dönemlerin aktarımı
import { Fragment, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, deleteDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih, gunEkle } from '../program/model';
import { donemBul, donemNo, odemeDurumu, tl, YONTEMLER, grupKayitKimligi, araGun, araYazi, araNormal } from './model.js';
import { grupKaydiOlustur, kisiOdemeleri, kisiPaketleri, odemeEkle, paketGuncelle, DONEM_HARIC, KATILIM_ONCESI } from './veri';

// ---------- Takvim önizlemesi ----------
export function DonemTakvimi({ bas, aralar = [], adet = 5 }) {
  if (!bas) return null;
  const simdi = donemBul(bas, bugun(), aralar);
  const ilkNo = Math.max(0, (simdi?.no ?? 0) - 2);
  const l = Array.from({ length: adet }, (_, i) => donemNo(bas, ilkNo + i, aralar));
  return (
    <div className="donem-takvimi" aria-label="Dönem takvimi">
      {l.map((d) => (
        <span key={d.no} className={'donem-cip' + (simdi && d.no === simdi.no && !simdi.arada ? ' simdi' : '')}>
          {d.araSonrasi ? <small>⏸ {araYazi(d.araSonrasi)} kaydı · </small> : null}
          {d.no + 1}. dönem: {kisaTarih(d.bas)} – {kisaTarih(d.bit)}
          {simdi && d.no === simdi.no && !simdi.arada ? ' (şu an)' : ''}
        </span>
      ))}
    </div>
  );
}

// ---------- Ara / tarih kaydırma ----------
// Takvim değişince (ara eklenir ya da kaldırılır) kaymış dönemlerin kayıtları yeni başlangıç tarihlerine taşınır;
// ödemeler aynı döneme bağlı kalır (ödeme tarihi değişmez). Hiçbir şey silinmez, çift kayıt oluşmaz.
export async function takimTasimaPlani(grup, yeniAralar) {
  const eskiAralar = grup.donemAralari || [];
  const ps = await getDocs(query(collection(db, 'satilanPaketler'), where('grupId', '==', grup.id)));
  const kayitlar = ps.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() })).filter((r) => r.data.tur === 'grup' && r.data.donemBas);
  const enGec = kayitlar.reduce((m, r) => (r.data.donemBas > m ? r.data.donemBas : m), bugun());
  const eskiNo = {};
  for (let n = 0; n < 400; n++) {
    const d = donemNo(grup.donemBaslangic, n, eskiAralar);
    eskiNo[d.bas] = n;
    if (d.bas > enGec) break;
  }
  const tasinacak = [];
  for (const r of kayitlar) {
    const n = eskiNo[r.data.donemBas];
    if (n == null) continue;
    const y = donemNo(grup.donemBaslangic, n, yeniAralar);
    if (y.bas === r.data.donemBas) continue;
    tasinacak.push({ ...r, n, yeni: y, yeniId: grupKayitKimligi(grup.id, y.bas, r.data.kisiId) });
  }
  const odemeler = await Promise.all(
    tasinacak.map((t) => getDocs(query(collection(db, 'odemeler'), where('satilanPaketId', '==', t.id))).then((s) => s.docs))
  );
  tasinacak.forEach((t, i) => (t.odemeler = odemeler[i]));
  // Hedefte (taşınmayacak) bir kayıt varsa dur
  const kaynaklar = new Set(tasinacak.map((t) => t.id));
  for (const t of tasinacak) {
    if (kaynaklar.has(t.yeniId)) continue;
    const s = await getDoc(doc(db, 'satilanPaketler', t.yeniId));
    if (s.exists()) throw new Error('Yeni tarihte zaten bir dönem kaydı var; taşıma yapılmadı. Bizimle iletişime geçin.');
  }
  return tasinacak;
}
export async function takvimiDegistir(grup, yeniAralar, plan, benim) {
  // Zincirleme taşımada hedef önce boşalsın: ileri kaymada en geçten, geri kaymada en erkenden başla
  const ileri = plan.some((t) => t.yeni.bas > t.data.donemBas);
  const sirali = [...plan].sort((a, b) => (ileri ? b.data.donemBas.localeCompare(a.data.donemBas) : a.data.donemBas.localeCompare(b.data.donemBas)));
  for (const t of sirali) {
    await setDoc(doc(db, 'satilanPaketler', t.yeniId), {
      ...t.data,
      donemBas: t.yeni.bas,
      donemBit: t.yeni.bit,
      baslangic: t.yeni.bas,
      tasimaGecmisi: [...(t.data.tasimaGecmisi || []), { eskiBas: t.data.donemBas, eskiBit: t.data.donemBit || '', yapan: benim, zaman: new Date().toISOString() }],
    });
    for (const o of t.odemeler) await updateDoc(o.ref, { satilanPaketId: t.yeniId });
    await deleteDoc(t.ref);
  }
  await updateDoc(doc(db, 'gruplar', grup.id), { donemAralari: yeniAralar });
}

export function AraHaftalar({ grup, benim, onDegisti }) {
  const [acik, setAcik] = useState(false);
  const [gun, setGun] = useState(3);
  const [hata, setHata] = useState('');
  const [plan, setPlan] = useState(null); // { yeniAralar, tasinacak, aciklama }
  const [bekliyor, setBekliyor] = useState(false);
  const aralar = araNormal(grup.donemBaslangic, grup.donemAralari || []);
  const simdi = donemBul(grup.donemBaslangic, bugun(), aralar);
  const sonNo = (simdi?.no ?? 0) + 4;
  const donemler = Array.from({ length: sonNo + 1 }, (_, i) => donemNo(grup.donemBaslangic, i, aralar));
  const [secim, setSecim] = useState(String(simdi?.no ?? 0));
  const secili = donemler.find((x) => String(x.no) === secim) || donemler[0];
  const gunSayi = Math.max(0, Math.min(28, Math.round(Number(gun) || 0)));
  // Ara dönem numarasına yazılır (aynı döneme ikinci ara eklenirse toplanır)
  const onizleme = secili && gunSayi ? [...aralar, { no: secili.no, gun: gunSayi }] : aralar;

  function sifirla() {
    setPlan(null);
    setHata('');
  }
  async function hazirla(yeniAralar, aciklama) {
    setHata('');
    setBekliyor(true);
    try {
      const tasinacak = await takimTasimaPlani(grup, yeniAralar);
      setPlan({ yeniAralar, tasinacak, aciklama });
    } catch (e) {
      setHata(e.message?.startsWith('Yeni tarihte') ? e.message : hataMesaji(e));
    }
    setBekliyor(false);
  }
  async function uygula() {
    setHata('');
    setBekliyor(true);
    try {
      await takvimiDegistir(grup, plan.yeniAralar, plan.tasinacak, benim || '');
      setPlan(null);
      setAcik(false);
      await onDegisti?.();
    } catch (e) {
      setHata(hataMesaji(e));
    }
    setBekliyor(false);
  }
  const odemeSayisi = plan ? plan.tasinacak.reduce((t, x) => t + x.odemeler.length, 0) : 0;

  const PlanKutusu = () =>
    plan && (
      <div className="uyari-kutu">
        <strong>{plan.aciklama}</strong>
        <DonemTakvimi bas={grup.donemBaslangic} aralar={plan.yeniAralar} />
        <p className="aciklama kucuk-yazi">
          {plan.tasinacak.length
            ? `${plan.tasinacak.length} dönem kaydı yeni tarihlerine taşınacak${odemeSayisi ? `, ${odemeSayisi} ödeme aynı döneme bağlı kalacak (ödeme tarihleri değişmez)` : ''}. Ücretler değişmez.`
            : 'Taşınacak kayıt yok; yalnızca takvim değişecek.'}
        </p>
        <div className="dugme-satiri">
          <button className="birincil kucuk" disabled={bekliyor} onClick={uygula}>{bekliyor ? 'Kaydediliyor…' : 'Onayla ve kaydet'}</button>
          <button className="metin" onClick={sifirla}>Vazgeç</button>
        </div>
      </div>
    );

  return (
    <div className="ara-haftalar">
      {aralar.length > 0 && (
        <p className="aciklama kucuk-yazi">
          Kaydırmalar:{' '}
          {aralar.map((a, i) => (
            <span key={a.no + '-' + i}>
              {a.no + 1}. dönem {araYazi(araGun(a))} ertelendi{' '}
              {!plan && (
                <button
                  className="metin"
                  onClick={() => {
                    if (!window.confirm(`${a.no + 1}. dönemdeki ${araYazi(araGun(a))} kaydırma kaldırılsın mı? Sonraki dönemler eski tarihlerine döner.`)) return;
                    hazirla(aralar.filter((_, j) => j !== i), 'Kaydırma kaldırılınca dönemler');
                  }}
                >
                  kaldır
                </button>
              )}{' '}
            </span>
          ))}
        </p>
      )}
      {!acik && !plan && <button className="metin" onClick={() => setAcik(true)}>⏸ Dönem tarihini kaydır (izin, tatil)</button>}
      {!acik && <PlanKutusu />}
      {acik && (
        <div className="kart-form ic-form">
          <strong>Dönem tarihini kaydır</strong>
          <p className="aciklama kucuk-yazi">
            Seçilen dönem ve sonraki bütün dönemler bu kadar gün kayar; geçmiş dönemler de seçilebilir. Önceki dönemler değişmez.
            O dönemden sonraki kayıtlar ve ödemeleri yeni tarihlere taşınır.
          </p>
          <div className="form-izgara">
            <label className="alan">
              <span>Kayacak dönem</span>
              <select value={secim} onChange={(e) => { setSecim(e.target.value); sifirla(); }}>
                {donemler.map((d) => (
                  <option key={d.no} value={d.no}>{d.no + 1}. dönem · {kisaTarih(d.bas)} başlangıçlı{simdi && d.no === simdi.no ? ' (şu an)' : ''}</option>
                ))}
              </select>
            </label>
            <label className="alan">
              <span>Kaç gün sonra başlasın</span>
              <input type="number" min="1" max="28" value={gun} onChange={(e) => { setGun(e.target.value); sifirla(); }} />
            </label>
          </div>
          <small className="ipucu">Örn. 3 → {secili ? `${kisaTarih(secili.bas)} yerine ${kisaTarih(gunEkle(secili.bas, 3))}` : ''}. 7 gün = 1 hafta. Yanlış girerseniz kaydırmayı "kaldır" ile geri alabilirsiniz.</small>
          {!plan && <DonemTakvimi bas={grup.donemBaslangic} aralar={onizleme} />}
          {hata && <p className="hata">{hata}</p>}
          {plan ? (
            <PlanKutusu />
          ) : (
            <div className="dugme-satiri">
              <button
                className="birincil kucuk"
                disabled={!gunSayi || bekliyor}
                onClick={() => hazirla(onizleme, `${secili.no + 1}. dönem ${kisaTarih(secili.bas)} yerine ${kisaTarih(donemNo(grup.donemBaslangic, secili.no, onizleme).bas)} başlayınca`)}
              >
                {bekliyor ? 'Hazırlanıyor…' : 'Önizle'}
              </button>
              <button className="metin" onClick={() => { setAcik(false); sifirla(); }}>Vazgeç</button>
            </div>
          )}
        </div>
      )}
      {hata && !acik && <p className="hata">{hata}</p>}
    </div>
  );
}
// ---------- Geçmiş dönemleri aktar ----------
const DURUM = [
  ['', '—'],
  ['odendi', 'Ödendi'],
  ['odenmedi', 'Ödenmedi'],
  ['yok', 'Yoktu'],
];

export function GecmisAktarim({ grup, kisiler, tanim, benim, onBitti, onVazgec }) {
  const aralar = grup.donemAralari || [];
  const simdiNo = donemBul(grup.donemBaslangic, bugun(), aralar)?.no ?? 0;
  const donemler = Array.from({ length: simdiNo + 1 }, (_, i) => donemNo(grup.donemBaslangic, i, aralar));
  const uyeler = (grup.uyeIds || []).map((id) => kisiler.find((k) => k.id === id) || { id, ad: 'Kişi' });
  const [mevcut, setMevcut] = useState(null); // { [kisiId]: { [donemBas]: {kayit, od} } }
  const [hucre, setHucre] = useState({}); // `${kisiId}|${donemBas}` → { d, tutar, tarih, yontem }
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const fiyat = (kid) => Number(grup.ozelFiyatlar?.[kid]?.fiyat ?? tanim.fiyat) || 0;

  useEffect(() => {
    Promise.all(
      uyeler.map(async (k) => {
        const [pl, ol] = await Promise.all([kisiPaketleri(k.id).catch(() => []), kisiOdemeleri(k.id).catch(() => [])]);
        const m = {};
        for (const p of pl.filter((x) => x.tur === 'grup' && x.grupId === grup.id)) m[p.donemBas] = { kayit: p, od: odemeDurumu(p, ol) };
        return [k.id, m];
      })
    ).then((l) => setMevcut(Object.fromEntries(l)));
  }, [grup.id]);

  const anahtar = (kid, d) => `${kid}|${d.bas}`;
  const ayarla = (kid, d, deg) =>
    setHucre((h) => ({ ...h, [anahtar(kid, d)]: { d: '', tutar: fiyat(kid), tarih: d.bas, yontem: 'nakit', ...h[anahtar(kid, d)], ...deg } }));
  const satirDoldur = (kid, deger) => {
    for (const d of donemler) if (!kilitli(kid, d)) ayarla(kid, d, { d: deger });
  };
  const kilitli = (kid, d) => {
    const m = mevcut?.[kid]?.[d.bas];
    return !!(m && m.od.odenen > 0);
  };

  const sayilar = Object.values(hucre).reduce((t, h) => ((t[h.d] = (t[h.d] || 0) + 1), t), {});

  async function kaydet() {
    setHata('');
    const secilen = Object.entries(hucre).filter(([, h]) => h.d);
    if (!secilen.length) return setHata('Hiç hücre seçilmedi.');
    if (!window.confirm(`${sayilar.odendi || 0} ödendi, ${sayilar.odenmedi || 0} ödenmedi, ${sayilar.yok || 0} yoktu kaydedilsin mi?`)) return;
    setBekliyor(true);
    const aktarimId = 'akt_' + Date.now();
    try {
      // Katılım: baştan "Yoktu" olan dönemlerden sonraki ilk dönem
      const katilim = { ...(grup.uyeKatilim || {}) };
      const oncekiKatilim = {};
      for (const k of uyeler) {
        let ilkVar = null;
        for (const d of donemler) {
          const h = hucre[anahtar(k.id, d)]?.d;
          const m = mevcut[k.id]?.[d.bas];
          const var_ = h === 'odendi' || h === 'odenmedi' || (!h && m && m.kayit.durum !== 'iptal');
          if (var_) { ilkVar = d; break; }
          if (h !== 'yok') break; // belirsiz dönem: katılımı değiştirme
        }
        if (ilkVar && ilkVar.no > 0 && hucre[anahtar(k.id, donemler[0])]?.d === 'yok' && (!katilim[k.id] || katilim[k.id] < ilkVar.bas)) {
          oncekiKatilim[k.id] = katilim[k.id] || null;
          katilim[k.id] = ilkVar.bas;
        }
      }
      if (Object.keys(oncekiKatilim).length) await updateDoc(doc(db, 'gruplar', grup.id), { uyeKatilim: katilim });
      const g2 = { ...grup, uyeKatilim: katilim };

      for (const k of uyeler) {
        for (const d of donemler) {
          const h = hucre[anahtar(k.id, d)];
          if (!h?.d) continue;
          const m = mevcut[k.id]?.[d.bas];
          let kayit = m?.kayit;
          const kayitAc = async () => {
            if (kayit) return kayit;
            await grupKaydiOlustur(g2, d, tanim, k.id, benim);
            const id = grupKayitKimligi(grup.id, d.bas, k.id);
            await updateDoc(doc(db, 'satilanPaketler', id), { aktarimId });
            kayit = { id, kisiId: k.id, durum: 'aktif', fiyatNotu: '' };
            return kayit;
          };
          if (h.d === 'yok') {
            const once = katilim[k.id] && d.bit < katilim[k.id];
            if (kayit && !(m.od.odenen > 0)) await paketGuncelle(kayit, { durum: 'iptal', fiyatNotu: once ? KATILIM_ONCESI : DONEM_HARIC }, benim);
            else if (!kayit && !once) {
              await kayitAc();
              await paketGuncelle(kayit, { durum: 'iptal', fiyatNotu: DONEM_HARIC }, benim);
            }
            continue;
          }
          await kayitAc();
          if (kayit.durum === 'iptal') await paketGuncelle(kayit, { durum: 'aktif', fiyatNotu: '' }, benim);
          if (h.d === 'odendi' && Number(h.tutar) > 0) {
            await odemeEkle(
              {
                kisiId: k.id,
                satilanPaketId: kayit.id,
                tutar: Number(h.tutar),
                tarih: h.tarih || d.bas,
                yontem: h.yontem,
                not: `Aktarım · ${d.no + 1}. dönem (${kisaTarih(d.bas)} – ${kisaTarih(d.bit)})`,
                ekAlanlar: { aktarimId },
              },
              benim
            );
          }
        }
      }
      await updateDoc(doc(db, 'gruplar', grup.id), {
        aktarimlar: arrayUnion({ id: aktarimId, tarih: bugun(), yapan: benim, sayilar, oncekiKatilim }),
        guncelleme: serverTimestamp(),
      });
      onBitti(`Aktarım kaydedildi: ${sayilar.odendi || 0} ödendi, ${sayilar.odenmedi || 0} ödenmedi, ${sayilar.yok || 0} yoktu.`);
    } catch (e) {
      setHata(hataMesaji(e) + ' Kaydedilenler kaldı; "Aktarımı geri al" ile temizleyebilirsiniz.');
      setBekliyor(false);
    }
  }

  if (!mevcut) return <p className="aciklama">Yükleniyor…</p>;
  return (
    <div className="kart-form ic-form gecmis-aktarim">
      <strong>Geçmiş dönemleri aktar</strong>
      <p className="aciklama kucuk-yazi">
        Her öğrenci için her dönemi seçin: <b>Ödendi</b> (tutar, ödemenin alındığı tarih ve yöntem), <b>Ödenmedi</b> (borç olarak kalır) ya da <b>Yoktu</b> (o dönem grupta
        değildi). Baştaki "Yoktu"lardan sonraki ilk dönem katılım tarihi olur. Ödeme alınmış dönemler kilitlidir. Satır başındaki düğmeyle bütün dönemleri tek seferde doldurabilirsiniz.
      </p>
      <div className="tablo-kap">
        <table className="tablo aktarim-tablo">
          <thead>
            <tr>
              <th>Öğrenci</th>
              {donemler.map((d) => <th key={d.no}>{d.no + 1}. dönem<br /><small>{kisaTarih(d.bas)} – {kisaTarih(d.bit)}</small></th>)}
            </tr>
          </thead>
          <tbody>
            {uyeler.map((k) => (
              <tr key={k.id}>
                <th scope="row">
                  {k.ad}
                  <span className="satir-doldur">
                    <button type="button" className="metin" onClick={() => satirDoldur(k.id, 'odendi')}>hepsi ödendi</button>
                  </span>
                </th>
                {donemler.map((d) => {
                  const m = mevcut[k.id]?.[d.bas];
                  const h = hucre[anahtar(k.id, d)] || {};
                  if (kilitli(k.id, d)) {
                    return <td key={d.no} className="kilitli">✓ kayıtlı<br /><small>{tl(m.od.odenen)}</small></td>;
                  }
                  return (
                    <td key={d.no} className={h.d ? 'secili-' + h.d : ''}>
                      <select value={h.d || ''} onChange={(e) => ayarla(k.id, d, { d: e.target.value })} aria-label={`${k.ad} ${d.no + 1}. dönem`}>
                        {DURUM.map(([v, ad]) => <option key={v} value={v}>{v === '' && m ? (m.kayit.durum === 'iptal' ? 'İptal (değiştirme)' : 'Ödenmedi (değiştirme)') : ad}</option>)}
                      </select>
                      {h.d === 'odendi' && (
                        <>
                          <input type="number" min="0" value={h.tutar} onChange={(e) => ayarla(k.id, d, { tutar: e.target.value })} aria-label="Tutar" />
                          <input type="date" value={h.tarih} onChange={(e) => ayarla(k.id, d, { tarih: e.target.value })} aria-label="Ödeme tarihi" />
                          <select value={h.yontem} onChange={(e) => ayarla(k.id, d, { yontem: e.target.value })} aria-label="Yöntem">
                            {YONTEMLER.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
                          </select>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="aciklama">
        Seçilen: {sayilar.odendi || 0} ödendi · {sayilar.odenmedi || 0} ödenmedi · {sayilar.yok || 0} yoktu
      </p>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={bekliyor} onClick={kaydet}>{bekliyor ? 'Kaydediliyor…' : 'Aktarımı kaydet'}</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// Son aktarımı geri al: aktarımla açılan kayıtları siler, ödemelerini "silindi" yapar, katılım tarihlerini eski haline getirir
export async function aktarimiGeriAl(grup, akt, benim) {
  const [ps, os] = await Promise.all([
    getDocs(query(collection(db, 'satilanPaketler'), where('aktarimId', '==', akt.id))),
    getDocs(query(collection(db, 'odemeler'), where('aktarimId', '==', akt.id))),
  ]);
  for (const o of os.docs) await updateDoc(o.ref, { silindi: true, silen: benim, silinme: serverTimestamp(), silmeNedeni: 'Aktarım geri alındı' });
  for (const p of ps.docs) await deleteDoc(p.ref);
  const katilim = { ...(grup.uyeKatilim || {}) };
  for (const [kid, eski] of Object.entries(akt.oncekiKatilim || {})) {
    if (eski) katilim[kid] = eski;
    else delete katilim[kid];
  }
  await updateDoc(doc(db, 'gruplar', grup.id), {
    uyeKatilim: katilim,
    aktarimlar: (grup.aktarimlar || []).filter((a) => a.id !== akt.id),
  });
  return { odeme: os.size, kayit: ps.size };
}

export function AktarimListesi({ grup, benim, onDegisti }) {
  const [hata, setHata] = useState('');
  if (!grup.aktarimlar?.length) return null;
  return (
    <p className="aciklama kucuk-yazi">
      Aktarımlar:{' '}
      {grup.aktarimlar.map((a) => (
        <Fragment key={a.id}>
          {kisaTarih(a.tarih)} ({a.sayilar?.odendi || 0} ödendi, {a.sayilar?.odenmedi || 0} ödenmedi, {a.sayilar?.yok || 0} yoktu){' '}
          <button
            className="metin"
            onClick={async () => {
              if (!window.confirm('Bu aktarım geri alınsın mı? Aktarımla girilen ödemeler silinir (iz kalır), açılan dönem kayıtları kaldırılır.')) return;
              try {
                await aktarimiGeriAl(grup, a, benim);
                onDegisti?.();
              } catch (e) {
                setHata(hataMesaji(e));
              }
            }}
          >
            geri al
          </button>{' '}
        </Fragment>
      ))}
      {hata && <span className="hata"> {hata}</span>}
    </p>
  );
}
