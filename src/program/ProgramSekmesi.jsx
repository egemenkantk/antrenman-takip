import { useEffect, useState } from 'react';
import ProgramDuzenleyici from './ProgramDuzenleyici';
import { programlariGetir, programEkle, programGuncelle, programSil } from './veri';
import {
  BOLUMLER,
  BOLUM_RENK,
  HARF,
  HAFTA_GUNLERI,
  bugun,
  blokBitis,
  blokDurumu,
  gunEkle,
  gunFarki,
  kisaTarih,
  gunBolumleri,
  dozaj,
  fazAdi,
  fazRengi,
  haftaSayisi,
  gunHaftaGunu,
} from './model';

const GUN_ADI = Object.fromEntries(HAFTA_GUNLERI);
const satirlar = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);

function GunKarti({ b, g, i, hafta }) {
  const bolumler = gunBolumleri(b, g);
  return (
    <div className="gun-karti">
      <h4>
        <span className="harf">{HARF[i]}</span>
        <span>
          {GUN_ADI[gunHaftaGunu(b, i)]}
          {g.baslik ? <small> · {g.baslik}</small> : null}
        </span>
      </h4>
      {b.sade ? (
        <ul className="egzersizler">{satirlar(g.icerik?.liste).map((s, k) => <li key={k}>{s}</li>)}</ul>
      ) : (
        bolumler.map((k) => {
          const d = BOLUMLER[k]?.doz ? dozaj(hafta, i, k) : '';
          const hareketler = satirlar(g.icerik?.[k]);
          if (!hareketler.length && !d) return null;
          return (
            <div key={k} className="bolum" style={{ '--bc': BOLUM_RENK[k] }}>
              <h5>
                {BOLUMLER[k]?.ad || k}
                {d && <span className="doz">{d}</span>}
              </h5>
              {hareketler.length > 0 && <ul className="egzersizler">{hareketler.map((s, n) => <li key={n}>{s}</li>)}</ul>}
            </div>
          );
        })
      )}
    </div>
  );
}

function BlokGorunumu({ b }) {
  const t = bugun();
  const durum = blokDurumu(b, t);
  const n = haftaSayisi(b);
  const buHafta = durum === 'simdi' ? Math.floor(gunFarki(b.baslangic, t) / 7) : durum === 'planli' ? 0 : n - 1;
  const [hafta, setHafta] = useState(buHafta);
  const rx = (b.ilerleme || [])[hafta];

  return (
    <div className="blok-gorunum">
      <div className="blok-bas">
        <div>
          <h3>
            {b.ad} <span className="faz" style={{ background: fazRengi(b) }}>{fazAdi(b)}</span>
          </h3>
          <p className="aciklama">
            {kisaTarih(b.baslangic)} – {kisaTarih(gunEkle(blokBitis(b), -1))} · {n} hafta ·{' '}
            {(b.haftaGunleri || []).length} gün/hafta
            {durum === 'simdi' && ` · şu an ${buHafta + 1}. hafta`}
            {durum === 'planli' && ' · planlandı'}
            {durum === 'bitti' && ' · tamamlandı'}
          </p>
          {b.not && <p className="blok-not">{b.not}</p>}
        </div>
      </div>

      {!b.sade && (b.ilerleme || []).length > 0 && (
        <div className="hafta-secici" role="tablist" aria-label="Hafta">
          {(b.ilerleme || []).map((h, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={hafta === i}
              className={'hafta-btn' + (hafta === i ? ' secili' : '') + (durum === 'simdi' && i === buHafta ? ' bu-hafta' : '')}
              onClick={() => setHafta(i)}
              title={h.not || ''}
            >
              {i + 1}. hafta
            </button>
          ))}
        </div>
      )}
      {rx?.not && <p className="hafta-notu">{hafta + 1}. hafta: {rx.not}</p>}

      <div className="gun-izgara">
        {(b.gunler || []).map((g, i) => <GunKarti key={i} b={b} g={g} i={i} hafta={rx} />)}
      </div>
    </div>
  );
}

export default function ProgramSekmesi({ sahipTip, sahipId, sade, hedef, duzenleyebilir, yapan }) {
  const [bloklar, setBloklar] = useState(null);
  const [secili, setSecili] = useState(null);
  const [mod, setMod] = useState(null); // null | 'yeni' | 'duzenle'
  const [hata, setHata] = useState('');

  async function yukle(seciliId) {
    try {
      const l = await programlariGetir(sahipId);
      setBloklar(l);
      const t = bugun();
      const varsayilan =
        l.find((b) => b.id === seciliId) || l.find((b) => blokDurumu(b, t) === 'simdi') || l.find((b) => blokDurumu(b, t) === 'planli') || l[l.length - 1];
      setSecili(varsayilan?.id || null);
    } catch {
      setHata('Program yüklenemedi.');
      setBloklar([]);
    }
  }
  useEffect(() => {
    yukle();
  }, [sahipId]);

  if (bloklar === null) return <p className="aciklama">Yükleniyor…</p>;
  const b = bloklar.find((x) => x.id === secili);
  const sonBitis = bloklar.length ? blokBitis(bloklar[bloklar.length - 1]) : null;
  const yeniBaslangic = sonBitis && sonBitis > bugun() ? sonBitis : bugun();

  if (mod) {
    return (
      <ProgramDuzenleyici
        ilk={mod === 'duzenle' ? b : null}
        sade={mod === 'duzenle' ? b.sade : sade}
        hedef={hedef}
        varsayilanBaslangic={yeniBaslangic}
        onVazgec={() => setMod(null)}
        onKaydet={async (blok) => {
          if (mod === 'duzenle') {
            await programGuncelle(b.id, blok, yapan);
            setMod(null);
            await yukle(b.id);
          } else {
            const r = await programEkle(sahipTip, sahipId, blok, yapan);
            setMod(null);
            await yukle(r.id);
          }
        }}
      />
    );
  }

  return (
    <div>
      {hata && <p className="hata">{hata}</p>}
      {bloklar.length === 0 ? (
        <div className="bos-durum">
          <p>{sade ? 'Henüz haftalık plan yok.' : 'Henüz program bloğu yok.'}</p>
          {duzenleyebilir && (
            <button className="birincil kucuk" onClick={() => setMod('yeni')}>
              {sade ? '+ Haftalık plan oluştur' : '+ Program bloğu oluştur'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="zaman-cizelgesi">
            {bloklar.map((x) => {
              const d = blokDurumu(x);
              const n = haftaSayisi(x);
              const ilerleme = d === 'bitti' ? 100 : d === 'planli' ? 0 : Math.round((gunFarki(x.baslangic, bugun()) / (n * 7)) * 100);
              return (
                <button key={x.id} className={'zc-blok' + (x.id === secili ? ' secili' : '')} onClick={() => setSecili(x.id)}>
                  <b>{x.ad}</b>
                  <span>{kisaTarih(x.baslangic)} · {n} hf</span>
                  <i className="cubuk"><i style={{ width: ilerleme + '%', background: fazRengi(x) }} /></i>
                </button>
              );
            })}
            {duzenleyebilir && (
              <button className="zc-blok yeni" onClick={() => setMod('yeni')}>
                + {sade ? 'Yeni plan' : 'Sonraki blok'}
              </button>
            )}
          </div>

          {b && <BlokGorunumu key={b.id} b={b} />}

          {b && duzenleyebilir && (
            <div className="dugme-satiri">
              <button className="ikincil kucuk" onClick={() => setMod('duzenle')}>Düzenle</button>
              <button
                className="metin tehlike"
                onClick={async () => {
                  if (!window.confirm(`"${b.ad}" silinsin mi? Bu işlem geri alınamaz.`)) return;
                  try {
                    await programSil(b.id);
                    await yukle();
                  } catch {
                    setHata('Silinemedi.');
                  }
                }}
              >
                Sil
              </button>
            </div>
          )}
        </>
      )}
      {!duzenleyebilir && (
        <p className="aciklama kucuk-yazi">Programı yönetici ya da program düzenleme yetkisi olan koç değiştirebilir.</p>
      )}
    </div>
  );
}
