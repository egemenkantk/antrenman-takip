import { useEffect, useState } from 'react';
import { hataMesaji } from '../auth/hesap';
import { bugun, kisaTarih } from '../program/model';
import { tarihGoster } from '../veri';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { testBilgisi, sayiGoster, TARAF_ADI as TEST_TARAF } from '../testler/tanimlar';
import { ASAMA_ADLARI } from './taslaklar';
import {
  BOLGELER,
  TARAF_ADI,
  sakatlikTipleriGetir,
  sakatliklariGetir,
  sakatlikKaydet,
  asamaGecir,
  sakatlikKapat,
  gorusmeleriGetir,
  gorusmeEkle,
} from './veri';

const alt = async (kisiId, ad) => (await getDocs(collection(db, 'kisiler', kisiId, ad))).docs.map((d) => ({ id: d.id, ...d.data() }));
const waBag = (tel) => {
  const r = String(tel || '').replace(/\D/g, '');
  if (r.length < 10) return null;
  return 'https://wa.me/' + (r.startsWith('90') ? r : r.startsWith('0') ? '9' + r : '90' + r);
};

function SakatlikFormu({ ilk, tipler, onKaydet, onVazgec }) {
  const [f, setF] = useState({
    tipId: ilk?.tipId || '',
    bolge: ilk?.bolge || '',
    taraf: ilk?.taraf || 'sag',
    baslangic: ilk?.baslangic || bugun(),
    tani: ilk?.tani || '',
    uzmanAd: ilk?.uzman?.ad || '',
    uzmanKurum: ilk?.uzman?.kurum || '',
    uzmanIletisim: ilk?.uzman?.iletisim || '',
    kisitlar: ilk?.kisitlar || '',
    asama: ilk?.asama || 1,
  });
  const [hata, setHata] = useState('');
  const tip = tipler.find((t) => t.id === f.tipId);
  return (
    <form
      className="kart-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.tipId && !f.tani.trim()) return setHata('Sakatlık türü seç ya da tanıyı yaz.');
        if (!f.bolge) return setHata('Bölge seç.');
        setHata('');
        try {
          await onKaydet({
            tipId: f.tipId,
            tipAd: tip?.ad || '',
            bolge: f.bolge,
            taraf: f.taraf,
            baslangic: f.baslangic,
            tani: f.tani.trim(),
            uzman: { ad: f.uzmanAd.trim(), kurum: f.uzmanKurum.trim(), iletisim: f.uzmanIletisim.trim() },
            kisitlar: f.kisitlar.trim(),
            ...(ilk ? {} : { asama: Number(f.asama) || 1 }),
          });
        } catch (err) {
          setHata(hataMesaji(err));
        }
      }}
    >
      <h3>{ilk ? 'Sakatlığı düzenle' : 'Yeni sakatlık'}</h3>
      <div className="form-izgara">
        <label className="alan">
          <span>Tür (kütüphaneden)</span>
          <select
            value={f.tipId}
            onChange={(e) => {
              const t = tipler.find((x) => x.id === e.target.value);
              setF({ ...f, tipId: e.target.value, bolge: t?.bolge && BOLGELER.includes(t.bolge) ? t.bolge : f.bolge });
            }}
          >
            <option value="">Diğer / kütüphanede yok</option>
            {tipler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Bölge</span>
          <select value={f.bolge} onChange={(e) => setF({ ...f, bolge: e.target.value })}>
            <option value="">Seç</option>
            {BOLGELER.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="alan">
          <span>Taraf</span>
          <select value={f.taraf} onChange={(e) => setF({ ...f, taraf: e.target.value })}>
            <option value="sag">Sağ</option>
            <option value="sol">Sol</option>
            <option value="iki">İki taraf</option>
            <option value="yok">Taraf yok (bel, boyun…)</option>
          </select>
        </label>
        <label className="alan">
          <span>Başlangıç / sakatlanma tarihi</span>
          <input type="date" value={f.baslangic} onChange={(e) => setF({ ...f, baslangic: e.target.value })} />
        </label>
        <label className="alan">
          <span>Tanı (hekim/fizyoterapistin söylediği)</span>
          <input value={f.tani} onChange={(e) => setF({ ...f, tani: e.target.value })} placeholder="Örn. 2. derece lateral bağ zorlanması" />
        </label>
        {!ilk && (
          <label className="alan">
            <span>Şu anki aşama</span>
            <select value={f.asama} onChange={(e) => setF({ ...f, asama: Number(e.target.value) })}>
              {ASAMA_ADLARI.map((ad, i) => <option key={i} value={i + 1}>{i + 1}. {ad}</option>)}
            </select>
          </label>
        )}
      </div>
      <h4>Takip eden uzman</h4>
      <div className="form-izgara">
        <label className="alan"><span>Ad</span><input value={f.uzmanAd} onChange={(e) => setF({ ...f, uzmanAd: e.target.value })} /></label>
        <label className="alan"><span>Kurum</span><input value={f.uzmanKurum} onChange={(e) => setF({ ...f, uzmanKurum: e.target.value })} /></label>
        <label className="alan"><span>Telefon / iletişim</span><input value={f.uzmanIletisim} onChange={(e) => setF({ ...f, uzmanIletisim: e.target.value })} /></label>
      </div>
      <label className="alan">
        <span>Fizyoterapistin verdiği kısıtlar</span>
        <textarea rows={2} value={f.kisitlar} onChange={(e) => setF({ ...f, kisitlar: e.target.value })} placeholder="Örn. 2 hafta sıçrama yok, koşu yalnızca düz zeminde" />
      </label>
      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil kucuk">Kaydet</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

function AsamaFormu({ s, onKaydet, onVazgec }) {
  const [f, setF] = useState({ asama: Math.min(4, (s.asama || 1) + 1), tarih: bugun(), onaylayan: s.uzman?.ad || '', not: '' });
  return (
    <div className="kart-form ic-form">
      <strong>Aşama değiştir</strong>
      <div className="form-izgara">
        <label className="alan">
          <span>Yeni aşama</span>
          <select value={f.asama} onChange={(e) => setF({ ...f, asama: Number(e.target.value) })}>
            {ASAMA_ADLARI.map((ad, i) => <option key={i} value={i + 1}>{i + 1}. {ad}</option>)}
          </select>
        </label>
        <label className="alan"><span>Tarih</span><input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} /></label>
        <label className="alan"><span>Onay veren (fizyoterapist/hekim)</span><input value={f.onaylayan} onChange={(e) => setF({ ...f, onaylayan: e.target.value })} /></label>
        <label className="alan"><span>Not</span><input value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} placeholder="Hangi kriterler karşılandı" /></label>
      </div>
      <div className="dugme-satiri">
        <button className="birincil kucuk" onClick={() => onKaydet(f)}>Kaydet</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

function GorusmeFormu({ onKaydet, onVazgec }) {
  const [f, setF] = useState({ tarih: bugun(), kim: '', ozet: '', kisitlar: '', sonrakiKontrol: '' });
  return (
    <div className="kart-form ic-form">
      <strong>Fizyoterapist/hekim görüşmesi</strong>
      <div className="form-izgara">
        <label className="alan"><span>Tarih</span><input type="date" value={f.tarih} onChange={(e) => setF({ ...f, tarih: e.target.value })} /></label>
        <label className="alan"><span>Kiminle</span><input value={f.kim} onChange={(e) => setF({ ...f, kim: e.target.value })} /></label>
        <label className="alan"><span>Sonraki kontrol</span><input type="date" value={f.sonrakiKontrol} onChange={(e) => setF({ ...f, sonrakiKontrol: e.target.value })} /></label>
      </div>
      <label className="alan"><span>Ne konuşuldu</span><textarea rows={2} value={f.ozet} onChange={(e) => setF({ ...f, ozet: e.target.value })} /></label>
      <label className="alan"><span>Yeni kısıtlar (boş bırakırsan mevcutlar kalır)</span><input value={f.kisitlar} onChange={(e) => setF({ ...f, kisitlar: e.target.value })} /></label>
      <div className="dugme-satiri">
        <button className="birincil kucuk" disabled={!f.ozet.trim()} onClick={() => onKaydet(f)}>Kaydet</button>
        <button className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// Sakatlıktan sonraki derslerde girilen 0–10 ağrı skorları
function AgriTrendi({ kayitlar, baslangic }) {
  const l = kayitlar
    .filter((k) => typeof k.agri === 'number' && k.tarih >= baslangic)
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .slice(-12);
  if (!l.length) return <p className="aciklama kucuk-yazi">Henüz ağrı skoru girilmedi. Bugün ekranında yoklamada girilir.</p>;
  const son = l[l.length - 1].agri;
  const onceki = l.length > 1 ? l[l.length - 2].agri : null;
  const uyari = son >= 5 || (onceki != null && son - onceki >= 2);
  return (
    <div>
      <div className="agri-cubuklari" aria-label="Son ağrı skorları">
        {l.map((k) => (
          <span key={k.id} title={`${kisaTarih(k.tarih)}: ${k.agri}/10`} className={k.agri >= 5 ? 'yuksek' : k.agri >= 3 ? 'orta' : ''}>
            <i style={{ height: `${Math.max(6, k.agri * 10)}%` }} />
            <small>{k.agri}</small>
          </span>
        ))}
      </div>
      {uyari && (
        <p className="uyari-kutu kucuk-yazi">
          Son ağrı {son}/10{onceki != null && son - onceki >= 2 ? ` (önceki derste ${onceki})` : ''}. Yükü azalt ve fizyoterapistle görüş.
        </p>
      )}
    </div>
  );
}

// Sakatlık öncesi son ölçüm ile sonrası son ölçüm
function TestKarsilastirma({ testler, adlar, baslangic }) {
  const satirlar = [];
  for (const ad of adlar) {
    for (const taraf of testBilgisi(ad).tarafli ? ['sag', 'sol'] : [null]) {
      const l = testler.filter((t) => t.test === ad && (t.taraf || null) === taraf).sort((a, b) => a.tarih.localeCompare(b.tarih));
      const once = [...l].reverse().find((t) => t.tarih < baslangic);
      const sonra = [...l].reverse().find((t) => t.tarih >= baslangic);
      if (once || sonra) satirlar.push({ ad, taraf, once, sonra });
    }
  }
  if (!satirlar.length) return <p className="aciklama kucuk-yazi">Bu sakatlık için önerilen testlerde ölçüm yok.</p>;
  return (
    <div className="tablo-kap">
      <table className="tablo">
        <thead><tr><th>Test</th><th>Sakatlık öncesi</th><th>Sonra (son)</th><th>Fark</th></tr></thead>
        <tbody>
          {satirlar.map((r) => {
            const fark = r.once && r.sonra && r.once.deger ? ((r.sonra.deger - r.once.deger) / Math.abs(r.once.deger)) * 100 : null;
            return (
              <tr key={r.ad + r.taraf}>
                <th>{r.ad}{r.taraf ? ` · ${TEST_TARAF[r.taraf]}` : ''}</th>
                <td>{r.once ? `${sayiGoster(r.once.deger)} (${kisaTarih(r.once.tarih)})` : '—'}</td>
                <td>{r.sonra ? `${sayiGoster(r.sonra.deger)} (${kisaTarih(r.sonra.tarih)})` : '—'}</td>
                <td>{fark == null ? '' : `${fark > 0 ? '+' : ''}${fark.toFixed(0)}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SakatlikKarti({ s, kisiId, tip, kayitlar, testler, yapan, onDegisti }) {
  const [mod, setMod] = useState(null); // 'asama' | 'gorusme' | 'duzenle'
  const [gorusmeler, setGorusmeler] = useState(null);
  const [acik, setAcik] = useState(s.durum !== 'iyilesti');
  const [hata, setHata] = useState('');
  const asama = s.asama || 1;
  const rehber = tip?.asamalar?.[asama - 1];
  const yukleG = () => gorusmeleriGetir(kisiId, s.id).then(setGorusmeler).catch(() => setGorusmeler([]));
  useEffect(() => {
    if (acik && gorusmeler === null) yukleG();
  }, [acik]);
  const calistir = async (is) => {
    setHata('');
    try {
      await is();
      setMod(null);
      await onDegisti();
      await yukleG();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };
  const wa = waBag(s.uzman?.iletisim);
  const iyilesti = s.durum === 'iyilesti';

  return (
    <li className={'sakatlik-karti' + (iyilesti ? ' soluk' : '')}>
      <button className="sakatlik-baslik" onClick={() => setAcik(!acik)} aria-expanded={acik}>
        <span className="esnek">
          <strong>{s.tipAd || s.tani || 'Sakatlık'}</strong>
          <span className="aciklama kucuk-yazi">
            {[s.bolge, TARAF_ADI[s.taraf]].filter(Boolean).join(' · ')} · {tarihGoster(s.baslangic)}
            {iyilesti ? ` – ${tarihGoster(s.bitis)} · İyileşti` : ''}
          </span>
        </span>
        {!iyilesti && <span className="asama-rozet">Aşama {asama}/4</span>}
      </button>
      {acik && (
        <div className="sakatlik-govde">
          {!iyilesti && (
            <ol className="asama-cizgisi" aria-label="Aşamalar">
              {ASAMA_ADLARI.map((ad, i) => (
                <li key={i} className={i + 1 < asama ? 'gecti' : i + 1 === asama ? 'simdi' : ''}>{ad}</li>
              ))}
            </ol>
          )}
          {s.tani && s.tipAd && <p className="kucuk-yazi"><strong>Tanı:</strong> {s.tani}</p>}
          {s.kisitlar && <p className="blok-not"><strong>Fizyoterapistin kısıtları:</strong> {s.kisitlar}</p>}
          <p className="kucuk-yazi">
            <strong>Takip eden:</strong> {[s.uzman?.ad, s.uzman?.kurum].filter(Boolean).join(', ') || 'girilmemiş'}
            {s.uzman?.iletisim && <> · {wa ? <a href={wa} target="_blank" rel="noreferrer">{s.uzman.iletisim} (WhatsApp)</a> : s.uzman.iletisim}</>}
            {s.sonrakiKontrol && <> · Sonraki kontrol: <strong>{tarihGoster(s.sonrakiKontrol)}</strong></>}
          </p>

          {!iyilesti && rehber && (
            <div className="rehber">
              <h4>{asama}. aşama: {rehber.ad}</h4>
              <p className="aciklama kucuk-yazi">Genel çerçeve; fizyoterapistin talimatı her zaman önce gelir.</p>
              <div className="rehber-izgara">
                <div><strong>Hedefler</strong><ul>{rehber.hedefler.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                <div><strong>Koç ne yapabilir</strong><ul>{rehber.koc.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                {rehber.kacinilacaklar.length > 0 && (
                  <div><strong>Kaçınılacaklar</strong><ul>{rehber.kacinilacaklar.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                )}
                <div><strong>Sonraki aşamaya geçiş kriterleri</strong><ul>{rehber.kriterler.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              </div>
            </div>
          )}
          {!iyilesti && !tip && <p className="aciklama kucuk-yazi">Kütüphanede olmayan sakatlık: aşama rehberi yok, fizyoterapistin kısıtlarına göre ilerle.</p>}

          <h4>Ağrı (0–10)</h4>
          <AgriTrendi kayitlar={kayitlar} baslangic={s.baslangic} />

          <h4>Testler: sakatlık öncesi ve sonrası</h4>
          <TestKarsilastirma testler={testler} adlar={tip?.testler?.length ? tip.testler : [...new Set(testler.filter((t) => t.taraf).map((t) => t.test))]} baslangic={s.baslangic} />

          {(s.gecisler || []).length > 0 && (
            <>
              <h4>Aşama geçişleri</h4>
              <ul className="sade-liste kucuk-yazi">
                {s.gecisler.map((g, i) => (
                  <li key={i}>{tarihGoster(g.tarih)} → {g.asama}. aşama{g.onaylayan ? ` · onay: ${g.onaylayan}` : ''}{g.not ? ` · ${g.not}` : ''}</li>
                ))}
              </ul>
            </>
          )}

          <h4>Görüşmeler</h4>
          {gorusmeler === null ? (
            <p className="aciklama kucuk-yazi">Yükleniyor…</p>
          ) : gorusmeler.length === 0 ? (
            <p className="aciklama kucuk-yazi">Kayıtlı görüşme yok.</p>
          ) : (
            <ul className="sade-liste kucuk-yazi">
              {gorusmeler.map((g) => (
                <li key={g.id}>
                  <strong>{tarihGoster(g.tarih)}</strong>{g.kim ? ` · ${g.kim}` : ''}: {g.ozet}
                  {g.kisitlar ? ` · Kısıt: ${g.kisitlar}` : ''}
                  {g.sonrakiKontrol ? ` · Sonraki kontrol ${tarihGoster(g.sonrakiKontrol)}` : ''}
                </li>
              ))}
            </ul>
          )}

          {hata && <p className="hata">{hata}</p>}
          {mod === 'asama' && (
            <AsamaFormu s={s} onVazgec={() => setMod(null)} onKaydet={(v) => calistir(() => asamaGecir(kisiId, s, v, yapan))} />
          )}
          {mod === 'gorusme' && (
            <GorusmeFormu onVazgec={() => setMod(null)} onKaydet={(v) => calistir(() => gorusmeEkle(kisiId, s.id, v, yapan))} />
          )}
          {!mod && (
            <div className="dugme-satiri">
              {!iyilesti && <button className="birincil kucuk" onClick={() => setMod('asama')}>Aşama değiştir</button>}
              <button className="ikincil kucuk" onClick={() => setMod('gorusme')}>+ Görüşme</button>
              <button className="metin" onClick={() => onDegisti('duzenle', s)}>Düzenle</button>
              {!iyilesti ? (
                <button
                  className="metin"
                  onClick={() => window.confirm('Sakatlık iyileşti olarak kapatılsın mı? Uyarılar kalkar, kayıt geçmişte kalır.') && calistir(() => sakatlikKapat(kisiId, s, bugun(), yapan))}
                >
                  İyileşti
                </button>
              ) : (
                <button className="metin" onClick={() => calistir(() => sakatlikKapat(kisiId, s, null, yapan, true))}>Yeniden aç</button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function SaglikSekmesi({ kisi, yapan, onKisiDegisti }) {
  const [veri, setVeri] = useState(null);
  const [form, setForm] = useState(null);
  const [hata, setHata] = useState('');
  const yukle = async () => {
    try {
      const [sakatliklar, tipler, kayitlar, testler] = await Promise.all([
        sakatliklariGetir(kisi.id),
        sakatlikTipleriGetir(),
        alt(kisi.id, 'antrenmanKayitlari'),
        alt(kisi.id, 'testSonuclari'),
      ]);
      setVeri({ sakatliklar, tipler, kayitlar, testler });
    } catch (e) {
      setHata(hataMesaji(e));
      setVeri({ sakatliklar: [], tipler: [], kayitlar: [], testler: [] });
    }
  };
  useEffect(() => {
    yukle();
  }, [kisi.id]);
  if (!veri) return <p className="aciklama">Yükleniyor…</p>;

  if (form) {
    return (
      <SakatlikFormu
        ilk={form.id ? form : null}
        tipler={veri.tipler}
        onVazgec={() => setForm(null)}
        onKaydet={async (v) => {
          await sakatlikKaydet(kisi.id, form.id || null, v, yapan);
          setForm(null);
          await yukle();
          onKisiDegisti?.();
        }}
      />
    );
  }
  const aktif = veri.sakatliklar.filter((s) => s.durum !== 'iyilesti');
  const gecmis = veri.sakatliklar.filter((s) => s.durum === 'iyilesti');
  const kart = (s) => (
    <SakatlikKarti
      key={s.id}
      s={s}
      kisiId={kisi.id}
      tip={veri.tipler.find((t) => t.id === s.tipId)}
      kayitlar={veri.kayitlar}
      testler={veri.testler}
      yapan={yapan}
      onDegisti={async (islem, x) => {
        if (islem === 'duzenle') return setForm(x);
        await yukle();
        onKisiDegisti?.();
      }}
    />
  );
  return (
    <div>
      <div className="paket-ozet-bant">
        <span className="aciklama">Sakatlık ve rehabilitasyon takibi. Tanı ve tedavi kişinin fizyoterapisti/hekimindedir; burada antrenmanı ona göre düzenlersin.</span>
        <button className="ikincil kucuk" onClick={() => setForm({})}>+ Sakatlık</button>
      </div>
      {hata && <p className="hata">{hata}</p>}
      {veri.tipler.length === 0 && (
        <p className="aciklama kucuk-yazi">Sakatlık kütüphanesi boş; yönetici Kütüphaneler → Sakatlık sekmesinden taslakları ekleyebilir.</p>
      )}
      {aktif.length === 0 && <div className="bos-durum"><p>Aktif sakatlık yok.</p></div>}
      <ul className="sakatlik-listesi">{aktif.map(kart)}</ul>
      {gecmis.length > 0 && (
        <details>
          <summary>Geçmiş sakatlıklar ({gecmis.length})</summary>
          <ul className="sakatlik-listesi">{gecmis.map(kart)}</ul>
        </details>
      )}
    </div>
  );
}
