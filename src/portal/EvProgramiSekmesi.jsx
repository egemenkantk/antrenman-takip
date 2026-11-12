import { useEffect, useId, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, gunEkle, kisaTarih } from '../program/model';
import { useKutuphane, EgzersizSatiri } from '../kutuphane/bilesenler';
import { evProgramiGetir, evProgramiKaydet, evYapilanlar } from './veri';

const BOS = { aktif: true, egzersizler: [], not: '', haftalikGun: 3 };

// Kişi kartında koçun hazırladığı ev programı. Öğrenci/veli portalda görür ve "yaptım" işaretler.
export default function EvProgramiSekmesi({ kisiId, duzenleyebilir, yapan }) {
  const kutuphane = useKutuphane();
  const listeId = useId();
  const [p, setP] = useState(null);
  const [kayitli, setKayitli] = useState(null);
  const [yapilan, setYapilan] = useState([]);
  const [yeni, setYeni] = useState('');
  const [durum, setDurum] = useState('');
  const [hata, setHata] = useState('');

  const yukle = async () => {
    try {
      const [e, y] = await Promise.all([evProgramiGetir(kisiId), evYapilanlar(kisiId, gunEkle(bugun(), -27))]);
      setP(e ? { ...BOS, ...e } : BOS);
      setKayitli(e);
      setYapilan(y.sort((a, b) => b.tarih.localeCompare(a.tarih)));
    } catch (err) {
      setHata(hataMesaji(err));
      setP(BOS);
    }
  };
  useEffect(() => {
    yukle();
  }, [kisiId]);
  if (!p) return <p className="aciklama">Yükleniyor…</p>;

  const satirGuncelle = (i, v) => setP({ ...p, egzersizler: p.egzersizler.map((x, j) => (j === i ? { ...x, ...v } : x)) });
  const tasi = (i, yon) => {
    const l = [...p.egzersizler];
    const j = i + yon;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    setP({ ...p, egzersizler: l });
  };
  const ekle = () => {
    if (!yeni.trim()) return;
    setP({ ...p, egzersizler: [...p.egzersizler, { ad: yeni.trim(), doz: '', not: '' }] });
    setYeni('');
  };
  const son28 = yapilan.filter((y) => (y.yapilanlar || []).length > 0);

  if (!duzenleyebilir) {
    return (
      <div>
        {!kayitli || !kayitli.egzersizler?.length ? (
          <div className="bos-durum"><p>Ev programı yok.</p></div>
        ) : (
          <ul className="program-listesi">
            {kayitli.egzersizler.map((e, i) => (
              <EgzersizSatiri key={i} satir={`${e.ad}${e.doz ? ` — ${e.doz}` : ''}`} kutuphane={kutuphane} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="aciklama">
        Öğrenci ya da veli portalda görür; videolar kütüphaneden gelir. Her gün yaptıklarını işaretleyebilirler.
      </p>
      <label className="onay-satir" style={{ margin: '10px 0' }}>
        <input type="checkbox" checked={p.aktif !== false} onChange={(e) => setP({ ...p, aktif: e.target.checked })} />
        Portalda göster
      </label>
      <ol className="ev-listesi">
        {p.egzersizler.map((e, i) => (
          <li key={i} className="ev-satir">
            <input value={e.ad} onChange={(ev) => satirGuncelle(i, { ad: ev.target.value })} aria-label="Egzersiz" list={listeId} />
            <input value={e.doz} onChange={(ev) => satirGuncelle(i, { doz: ev.target.value })} placeholder="3×12, 30 sn…" aria-label="Set / tekrar" />
            <input value={e.not} onChange={(ev) => satirGuncelle(i, { not: ev.target.value })} placeholder="Not" aria-label="Not" />
            <span className="ev-dugmeler">
              <button type="button" className="metin" onClick={() => tasi(i, -1)} aria-label="Yukarı">↑</button>
              <button type="button" className="metin" onClick={() => tasi(i, 1)} aria-label="Aşağı">↓</button>
              <button type="button" className="metin tehlike" onClick={() => setP({ ...p, egzersizler: p.egzersizler.filter((_, j) => j !== i) })} aria-label="Sil">×</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="egz-ekle">
        <input
          list={listeId}
          value={yeni}
          placeholder="+ Egzersiz ekle (kütüphaneden ya da serbest)"
          onChange={(e) => setYeni(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ekle();
            }
          }}
          aria-label="Egzersiz ekle"
        />
        <datalist id={listeId}>{kutuphane.map((e) => <option key={e.id} value={e.ad} />)}</datalist>
        {yeni.trim() && <button type="button" className="ikincil kucuk" onClick={ekle}>Ekle</button>}
      </div>
      <div className="form-izgara" style={{ marginTop: 12 }}>
        <label className="alan">
          <span>Haftada kaç gün</span>
          <input type="number" min="1" max="7" value={p.haftalikGun} onChange={(e) => setP({ ...p, haftalikGun: Number(e.target.value) || 3 })} />
        </label>
        <label className="alan">
          <span>Genel not</span>
          <input value={p.not} onChange={(e) => setP({ ...p, not: e.target.value })} placeholder="Isınma, dikkat edilecekler…" />
        </label>
      </div>
      {hata && <p className="hata">{hata}</p>}
      {durum && <p className="aciklama">{durum}</p>}
      <div className="dugme-satiri">
        <button
          className="birincil kucuk"
          onClick={async () => {
            setHata('');
            try {
              const egzersizler = p.egzersizler.filter((e) => e.ad.trim()).map((e) => ({ ad: e.ad.trim(), doz: e.doz.trim(), not: e.not.trim() }));
              await evProgramiKaydet(kisiId, { aktif: p.aktif !== false, egzersizler, not: p.not.trim(), haftalikGun: p.haftalikGun }, yapan);
              setDurum('Kaydedildi.');
              await yukle();
            } catch (err) {
              setHata(hataMesaji(err));
            }
          }}
        >
          Kaydet
        </button>
      </div>

      <h3>Son 4 hafta</h3>
      {son28.length === 0 ? (
        <p className="aciklama">Henüz "yaptım" işareti yok.</p>
      ) : (
        <ul className="sade-liste">
          {son28.map((y) => (
            <li key={y.id}>
              {kisaTarih(y.tarih)} — {y.yapilanlar.length} egzersiz
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
