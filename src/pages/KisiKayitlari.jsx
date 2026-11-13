// Kişi kartındaki Testler ve Kayıtlar sekmeleri (şimdilik görüntüleme)
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { tarihGoster } from '../veri';
import { testBilgisi, testSirasi, TESTLER, sayiyaCevir } from '../testler/tanimlar';
import TestGunuFormu from '../testler/TestGunuFormu';
import { sonuclariKaydet, sonucGuncelle, sonucSil } from '../testler/veri';

async function altListe(kisiId, ad) {
  const snap = await getDocs(collection(db, 'kisiler', kisiId, ad));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const sayiGoster = (v, b = 2) => (v == null ? '—' : String(Math.round(v * 10 ** b) / 10 ** b).replace('.', ','));

const TARAF = { sag: 'Sağ', sol: 'Sol' };
const KAYNAK = { performanz: 'Performanz', elle: 'Elle girildi', 'sporcu-karti': 'Sporcu Kartı' };

function SonucDuzenle({ o, onKaydet, onSil, onVazgec }) {
  const [f, setF] = useState({ deger: String(o.deger ?? '').replace('.', ','), tarih: o.tarih, seviye: o.seviye ?? '', not: o.not || '' });
  const [hata, setHata] = useState('');
  const seviyeli = TESTLER[o.test]?.seviyeli || o.seviye != null;
  return (
    <div className="kart-form ic-form">
      <strong>{o.test}{o.taraf ? ` · ${TARAF[o.taraf]}` : ''}</strong>
      <small className="aciklama">{KAYNAK[o.kaynak] || ''}{o.oncekiDeger != null ? ` · önceki değer ${sayiGoster(o.oncekiDeger)}` : ''}</small>
      <div className="form-izgara">
        <label className="alan"><span>Değer</span><input inputMode="decimal" value={f.deger} onChange={(e) => setF({ ...f, deger: e.target.value })} /></label>
        <label className="alan"><span>Tarih</span><input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} /></label>
        {seviyeli && <label className="alan"><span>Makine seviyesi</span><input inputMode="numeric" value={f.seviye} onChange={(e) => setF({ ...f, seviye: e.target.value })} /></label>}
        <label className="alan"><span>Not</span><input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} /></label>
      </div>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button
          className="birincil kucuk"
          onClick={async () => {
            const deger = sayiyaCevir(f.deger);
            if (deger == null || !f.tarih) return setHata('Değer ve tarih gerekli.');
            setHata('');
            try {
              await onKaydet({ deger, tarih: f.tarih, seviye: sayiyaCevir(f.seviye), not: f.not.trim() });
            } catch {
              setHata('Kaydedilemedi.');
            }
          }}
        >
          Kaydet
        </button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
        <button
          className="metin tehlike"
          onClick={async () => {
            if (!window.confirm(`${o.test} · ${tarihGoster(o.tarih)} sonucu silinsin mi?`)) return;
            try {
              await onSil();
            } catch {
              setHata('Silinemedi.');
            }
          }}
        >
          Sil
        </button>
      </div>
    </div>
  );
}

export function TestlerSekmesi({ kisiId, duzenleyebilir, yapan }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
  const [duzenle, setDuzenle] = useState(null); // düzenlenen sonuç
  const [hata, setHata] = useState('');
  const yukle = () => altListe(kisiId, 'testSonuclari').then(setListe).catch(() => setListe([]));
  useEffect(() => {
    yukle();
  }, [kisiId]);

  if (liste === null) return <p className="aciklama">Yükleniyor…</p>;

  // Test + taraf satırları; sağ ve sol aynı gün varsa fark satırı
  const satirlar = {};
  for (const t of liste) {
    const k = t.test + (t.taraf ? '|' + t.taraf : '');
    (satirlar[k] ||= { test: t.test, taraf: t.taraf || null, olcumler: {} }).olcumler[t.tarih] = t;
  }
  const tarihler = [...new Set(liste.map((t) => t.tarih))].sort();
  // Kategori sırasına (Sporcu Kartı'ndaki gibi), sonra katalogdaki sıraya göre
  const anahtarlar = Object.keys(satirlar).sort((a, b) => testSirasi(satirlar[a].test) - testSirasi(satirlar[b].test) || a.localeCompare(b, 'tr'));
  const farklar = {};
  for (const k of anahtarlar) {
    const r = satirlar[k];
    if (r.taraf !== 'sag' || !satirlar[r.test + '|sol']) continue;
    const sol = satirlar[r.test + '|sol'];
    const f = {};
    for (const d of tarihler) {
      const a = r.olcumler[d]?.deger, b = sol.olcumler[d]?.deger;
      if (a != null && b != null && Math.max(a, b) > 0) f[d] = (Math.abs(a - b) / Math.max(a, b)) * 100;
    }
    if (Object.keys(f).length) farklar[r.test] = f;
  }

  return (
    <div className="kayit-bolumleri">
      {duzenleyebilir && !form && (
        <div className="dugme-satiri">
          <button className="ikincil kucuk" onClick={() => setForm(true)}>+ Test sonucu gir</button>
          <small className="aciklama">Birden fazla kişi için Testler sayfasındaki "Test günü"nü, Performanz PDF'leri için de aynı sayfayı kullan.</small>
        </div>
      )}
      {form && (
        <TestGunuFormu
          kullanilanlar={new Set(liste.map((t) => t.test))}
          onVazgec={() => setForm(null)}
          onKaydet={async (sonuclar) => {
            await sonuclariKaydet(sonuclar.map((x) => ({ ...x, kisiId })), yapan);
            setForm(null);
            await yukle();
          }}
        />
      )}

      {duzenle && (
        <SonucDuzenle
          o={duzenle}
          onVazgec={() => setDuzenle(null)}
          onKaydet={async (v) => { await sonucGuncelle(kisiId, duzenle, v, yapan); setDuzenle(null); await yukle(); }}
          onSil={async () => { await sonucSil(kisiId, duzenle.id); setDuzenle(null); await yukle(); }}
        />
      )}
      {duzenleyebilir && liste.length > 0 && !duzenle && <p className="aciklama kucuk-yazi">Düzeltmek ya da silmek için değerin üstüne dokun.</p>}
      {liste.length === 0 ? (
        <div className="bos-durum"><p>Henüz test sonucu yok.</p></div>
      ) : (
        <div className="tablo-kap">
          <table className="tablo">
            <thead>
              <tr>
                <th>Test / ölçüm</th>
                {tarihler.map((t) => <th key={t}>{tarihGoster(t)}</th>)}
                {tarihler.length > 1 && <th>Değişim</th>}
              </tr>
            </thead>
            <tbody>
              {anahtarlar.flatMap((k, ki) => {
                const r = satirlar[k];
                const kat = testBilgisi(r.test).kat;
                const baslik =
                  ki === 0 || testBilgisi(satirlar[anahtarlar[ki - 1]].test).kat !== kat ? (
                    <tr key={'kat-' + kat} className="kat-satir">
                      <th colSpan={tarihler.length + 2}>{kat}</th>
                    </tr>
                  ) : null;
                const bilgi = testBilgisi(r.test);
                const iyi = bilgi.kat === 'Diğer' ? Object.values(r.olcumler).find((o) => o.ozelYon)?.ozelYon || bilgi.iyi : bilgi.iyi;
                const d = tarihler.map((t) => r.olcumler[t]?.deger).filter((v) => v != null);
                const fark = d.length > 1 ? d[d.length - 1] - d[0] : null;
                const iyilesme = fark == null || fark === 0 || iyi === 'notr' ? '' : (iyi === 'dusuk' ? fark < 0 : fark > 0) ? 'artı' : 'eksi';
                const satir = (
                  <tr key={k}>
                    <th scope="row">{r.test}{r.taraf ? ` · ${TARAF[r.taraf]}` : ''}</th>
                    {tarihler.map((t) => {
                      const o = r.olcumler[t];
                      return (
                        <td key={t} title={o ? KAYNAK[o.kaynak] || '' : ''}>
                          {o && duzenleyebilir ? (
                            <button className="deger-dugme" onClick={() => setDuzenle(o)} aria-label={`${r.test} ${tarihGoster(t)} düzenle`}>
                              {sayiGoster(o.deger)}
                            </button>
                          ) : o ? sayiGoster(o.deger) : '—'}
                          {o?.seviye != null && <small className="aciklama"> · sv. {o.seviye}</small>}
                          {o?.normSeviye && <span className={'norm-rozet kucuk n-' + o.normSeviye}>{o.normSeviye}</span>}
                        </td>
                      );
                    })}
                    {tarihler.length > 1 && (
                      <td className={'degisim ' + iyilesme}>{fark == null ? '—' : (fark > 0 ? '+' : '') + sayiGoster(fark)}</td>
                    )}
                  </tr>
                );
                if (!(r.taraf === 'sol' && farklar[r.test])) return [baslik, satir].filter(Boolean);
                const f = farklar[r.test];
                return [
                  baslik,
                  satir,
                  <tr key={k + 'fark'} className="fark-satiri">
                    <th scope="row">{r.test} · sağ-sol farkı</th>
                    {tarihler.map((t) => (
                      <td key={t} className={f[t] >= 15 ? 'uyari' : ''}>{f[t] != null ? '%' + sayiGoster(f[t], 1) : '—'}</td>
                    ))}
                    {tarihler.length > 1 && <td></td>}
                  </tr>,
                ].filter(Boolean);
              })}
            </tbody>
          </table>
        </div>
      )}
      {Object.values(farklar).some((f) => Object.values(f).some((v) => v >= 15)) && (
        <p className="aciklama kucuk-yazi">%15 ve üzeri sağ-sol farkı vurgulanır.</p>
      )}
    </div>
  );
}

const WELLNESS = [
  ['uyku', 'Uyku'],
  ['enerji', 'Enerji'],
  ['kasAgrisi', 'Kas ağrısı'],
  ['stres', 'Stres'],
  ['ruhHali', 'Ruh hali'],
];

export function KayitlarSekmesi({ kisiId }) {
  const [veri, setVeri] = useState(null);
  useEffect(() => {
    Promise.all([altListe(kisiId, 'antrenmanKayitlari'), altListe(kisiId, 'wellness')])
      .then(([a, w]) => setVeri({ a, w }))
      .catch(() => setVeri({ a: [], w: [] }));
  }, [kisiId]);

  if (veri === null) return <p className="aciklama">Yükleniyor…</p>;
  if (veri.a.length === 0 && veri.w.length === 0)
    return <div className="bos-durum"><p>Henüz kayıt yok. Bugün ekranı ve yoklama gelince kayıtlar buraya düşecek.</p></div>;

  const antrenman = [...veri.a].sort((x, y) => (y.tarih || '').localeCompare(x.tarih || ''));
  const wellness = [...veri.w].sort((x, y) => (y.tarih || '').localeCompare(x.tarih || ''));

  return (
    <div className="kayit-bolumleri">
      {antrenman.length > 0 && (
        <section>
          <h3>Antrenman kayıtları</h3>
          <ul className="kayit-listesi">
            {antrenman.map((k) => (
              <li key={k.id}>
                <div className="kayit-ust">
                  <strong>{tarihGoster(k.tarih)}</strong>
                  <span>{k.tur}{k.sure ? ` · ${k.sure} dk` : ''}</span>
                  {k.rpe != null && <span className="rpe-rozet" data-seviye={k.rpe >= 9 ? 'y' : k.rpe >= 7 ? 'o' : 'd'}>RPE {k.rpe}</span>}
                </div>
                {k.icerik && <p className="kayit-icerik">{k.icerik}</p>}
                {k.not && <p className="aciklama kucuk-yazi">{k.not}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {wellness.length > 0 && (
        <section>
          <h3>Wellness</h3>
          <div className="tablo-kap">
            <table className="tablo">
              <thead>
                <tr>
                  <th>Tarih</th>
                  {WELLNESS.map(([, ad]) => <th key={ad}>{ad}</th>)}
                  <th>Uyku (sa)</th>
                </tr>
              </thead>
              <tbody>
                {wellness.map((w) => (
                  <tr key={w.id}>
                    <th scope="row">{tarihGoster(w.tarih)}</th>
                    {WELLNESS.map(([k]) => <td key={k}>{sayiGoster(w[k])}</td>)}
                    <td>{sayiGoster(w.uykuSaati)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="aciklama kucuk-yazi">1–5 ölçeği; yüksek değer daha iyi durumu gösterir.</p>
        </section>
      )}
    </div>
  );
}
