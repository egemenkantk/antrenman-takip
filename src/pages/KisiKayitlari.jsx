// Kişi kartındaki Testler ve Kayıtlar sekmeleri (şimdilik görüntüleme)
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { tarihGoster } from '../veri';

async function altListe(kisiId, ad) {
  const snap = await getDocs(collection(db, 'kisiler', kisiId, ad));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const sayiGoster = (v) => (v == null ? '—' : String(v).replace('.', ','));

export function TestlerSekmesi({ kisiId }) {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    altListe(kisiId, 'testSonuclari').then(setListe).catch(() => setListe([]));
  }, [kisiId]);

  if (liste === null) return <p className="aciklama">Yükleniyor…</p>;
  if (liste.length === 0)
    return <div className="bos-durum"><p>Henüz test sonucu yok. Test günü ve Performanz raporu yükleme yakında.</p></div>;

  // Test adına göre grupla, her testte tarihe göre sırala
  const gruplar = {};
  for (const t of liste) (gruplar[t.test] ||= []).push(t);
  const tarihler = [...new Set(liste.map((t) => t.tarih))].sort();

  return (
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
          {Object.keys(gruplar)
            .sort((a, b) => a.localeCompare(b, 'tr'))
            .map((ad) => {
              const satir = Object.fromEntries(gruplar[ad].map((t) => [t.tarih, t.deger]));
              const degerler = tarihler.map((t) => satir[t]).filter((v) => v != null);
              const fark = degerler.length > 1 ? degerler[degerler.length - 1] - degerler[0] : null;
              return (
                <tr key={ad}>
                  <th scope="row">{ad}</th>
                  {tarihler.map((t) => <td key={t}>{sayiGoster(satir[t])}</td>)}
                  {tarihler.length > 1 && (
                    <td>{fark == null ? '—' : (fark > 0 ? '+' : '') + sayiGoster(Math.round(fark * 100) / 100)}</td>
                  )}
                </tr>
              );
            })}
        </tbody>
      </table>
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
