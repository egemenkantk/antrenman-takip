// Kişi kartındaki Testler ve Kayıtlar sekmeleri (şimdilik görüntüleme)
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { tarihGoster } from '../veri';
import { TESTLER, testBilgisi, sayiyaCevir } from '../testler/tanimlar';
import { sonuclariKaydet } from '../testler/veri';

async function altListe(kisiId, ad) {
  const snap = await getDocs(collection(db, 'kisiler', kisiId, ad));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const sayiGoster = (v, b = 2) => (v == null ? '—' : String(Math.round(v * 10 ** b) / 10 ** b).replace('.', ','));

const TARAF = { sag: 'Sağ', sol: 'Sol' };
const KAYNAK = { performanz: 'Performanz', elle: 'Elle girildi', 'sporcu-karti': 'Sporcu Kartı' };

export function TestlerSekmesi({ kisiId, duzenleyebilir, yapan }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
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
  const anahtarlar = Object.keys(satirlar).sort((a, b) => a.localeCompare(b, 'tr'));
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
          <button className="ikincil kucuk" onClick={() => setForm({ test: '', tarih: new Date().toISOString().slice(0, 10), deger: '', taraf: '' })}>
            + Sonuç ekle
          </button>
          <small className="aciklama">Toplu giriş ve Performanz raporları için ana sayfadaki Testler bölümünü kullan.</small>
        </div>
      )}
      {form && (
        <form
          className="ic-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setHata('');
            const deger = sayiyaCevir(form.deger);
            if (!form.test.trim() || deger == null || !form.tarih) return setHata('Test, tarih ve değer gerekli.');
            try {
              await sonuclariKaydet([{ kisiId, test: form.test.trim(), tarih: form.tarih, deger, taraf: form.taraf || null, kaynak: 'elle' }], yapan);
              setForm(null);
              await yukle();
            } catch {
              setHata('Kaydedilemedi.');
            }
          }}
        >
          <div className="form-izgara">
            <label className="alan">
              <span>Test</span>
              <input list="test-adlari" value={form.test} onChange={(e) => setForm({ ...form, test: e.target.value })} placeholder="Örn. CMJ (cm)" />
              <datalist id="test-adlari">{Object.keys(TESTLER).map((t) => <option key={t} value={t} />)}</datalist>
            </label>
            <label className="alan">
              <span>Tarih</span>
              <input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
            </label>
            <label className="alan">
              <span>Değer</span>
              <input inputMode="decimal" value={form.deger} onChange={(e) => setForm({ ...form, deger: e.target.value })} />
            </label>
            <label className="alan">
              <span>Taraf</span>
              <select value={form.taraf} onChange={(e) => setForm({ ...form, taraf: e.target.value })}>
                <option value="">—</option>
                <option value="sag">Sağ</option>
                <option value="sol">Sol</option>
              </select>
            </label>
          </div>
          {hata && <p className="hata">{hata}</p>}
          <div className="dugme-satiri">
            <button className="birincil kucuk">Kaydet</button>
            <button type="button" className="metin" onClick={() => setForm(null)}>Vazgeç</button>
          </div>
        </form>
      )}

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
              {anahtarlar.flatMap((k) => {
                const r = satirlar[k];
                const iyi = testBilgisi(r.test).iyi;
                const d = tarihler.map((t) => r.olcumler[t]?.deger).filter((v) => v != null);
                const fark = d.length > 1 ? d[d.length - 1] - d[0] : null;
                const iyilesme = fark == null || fark === 0 ? '' : (iyi === 'dusuk' ? fark < 0 : fark > 0) ? 'artı' : 'eksi';
                const satir = (
                  <tr key={k}>
                    <th scope="row">{r.test}{r.taraf ? ` · ${TARAF[r.taraf]}` : ''}</th>
                    {tarihler.map((t) => {
                      const o = r.olcumler[t];
                      return (
                        <td key={t} title={o ? KAYNAK[o.kaynak] || '' : ''}>
                          {o ? sayiGoster(o.deger) : '—'}
                          {o?.normSeviye && <span className={'norm-rozet kucuk n-' + o.normSeviye}>{o.normSeviye}</span>}
                        </td>
                      );
                    })}
                    {tarihler.length > 1 && (
                      <td className={'degisim ' + iyilesme}>{fark == null ? '—' : (fark > 0 ? '+' : '') + sayiGoster(fark)}</td>
                    )}
                  </tr>
                );
                if (!(r.taraf === 'sol' && farklar[r.test])) return [satir];
                const f = farklar[r.test];
                return [
                  satir,
                  <tr key={k + 'fark'} className="fark-satiri">
                    <th scope="row">{r.test} · sağ-sol farkı</th>
                    {tarihler.map((t) => (
                      <td key={t} className={f[t] >= 15 ? 'uyari' : ''}>{f[t] != null ? '%' + sayiGoster(f[t], 1) : '—'}</td>
                    ))}
                    {tarihler.length > 1 && <td></td>}
                  </tr>,
                ];
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
