import { useEffect, useMemo, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji, telefonuDuzenle, telefonuGoster } from '../auth/hesap';
import {
  BRANSLAR,
  HEDEFLER,
  HEDEF_ADI,
  TIP_ADI,
  ROL_ADI,
  subeleriGetir,
  kullanicilariGetir,
  kisileriGetir,
  kisiEkle,
  kisiGuncelle,
  hesabiBagla,
  hesapBaginiKaldir,
  yasHesapla,
  tarihGoster,
} from '../veri';
import { TestlerSekmesi, KayitlarSekmesi } from './KisiKayitlari';
import ProgramSekmesi from '../program/ProgramSekmesi';
import RaporSekmesi from '../rapor/RaporSekmesi';
import PosturSekmesi from '../postur/PosturSekmesi';
import PaketSekmesi from '../paket/PaketSekmesi';
import EvProgramiSekmesi from '../portal/EvProgramiSekmesi';
import Portal from '../portal/Portal';
import SaglikSekmesi from '../saglik/SaglikSekmesi';
import { BransOzeti, BransTestOnerisi } from '../saglik/Kutuphane';
import { sakatlikTipleriGetir, riskliKaliplar, sakatlikEtiketi } from '../saglik/veri';
import { RiskliKaliplar } from '../kutuphane/bilesenler';
import { HAFTA_GUNLERI } from '../program/model';
import { saatOzeti } from './Gruplar';

const BOS = {
  tip: 'sporcu',
  ad: '',
  dogumTarihi: '',
  cinsiyet: '',
  telefon: '',
  subeIds: [],
  kocIds: [],
  brans: '',
  hedef: '',
  boy: '',
  kilo: '',
  haftalikSaatler: {},
  not: '',
};

function Avatar({ kisi, buyuk }) {
  return kisi.foto ? (
    <img className={'avatar' + (buyuk ? '' : ' kucuk-av')} src={kisi.foto} alt="" />
  ) : (
    <div className={'avatar' + (buyuk ? '' : ' kucuk-av')} aria-hidden="true">{kisi.ad.charAt(0)}</div>
  );
}

function CokluSecim({ secenekler, secili, onChange }) {
  return (
    <div className="cip-grubu">
      {secenekler.map(([id, ad]) => {
        const acik = secili.includes(id);
        return (
          <button
            type="button"
            key={id}
            className={'cip' + (acik ? ' secili' : '')}
            aria-pressed={acik}
            onClick={() => onChange(acik ? secili.filter((x) => x !== id) : [...secili, id])}
          >
            {ad}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Kişi ekleme / düzenleme ----------
function KisiForm({ ilk, subeler, koclar, yonetici, onKaydet, onVazgec }) {
  const [f, setF] = useState({ ...BOS, ...ilk });
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const bransListede = !f.brans || BRANSLAR.includes(f.brans);
  const [digerBrans, setDigerBrans] = useState(!bransListede);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function kaydet(e) {
    e.preventDefault();
    setHata('');
    if (!f.ad.trim()) return setHata('Ad soyad gerekli.');
    let telefon = '';
    if (f.telefon.trim()) {
      telefon = telefonuDuzenle(f.telefon);
      if (!telefon) return setHata('Telefon numarasını 05xx xxx xx xx şeklinde girin ya da boş bırakın.');
    }
    if (f.subeIds.length === 0) return setHata('En az bir şube seçin.');
    const veri = {
      tip: f.tip,
      ad: f.ad.trim(),
      dogumTarihi: f.dogumTarihi || '',
      cinsiyet: f.cinsiyet || '',
      telefon,
      subeIds: f.subeIds,
      brans: f.tip === 'sporcu' ? f.brans.trim() : '',
      hedef: f.tip === 'pt' ? f.hedef : '',
      boy: f.boy === '' || f.boy == null ? null : Number(f.boy),
      kilo: f.kilo === '' || f.kilo == null ? null : Number(f.kilo),
      haftalikSaatler: f.haftalikSaatler || {},
      not: f.not.trim(),
    };
    if (yonetici) veri.kocIds = f.kocIds;
    setBekliyor(true);
    try {
      await onKaydet(veri);
    } catch (err) {
      setHata(hataMesaji(err));
      setBekliyor(false);
    }
  }

  return (
    <form className="kart-form" onSubmit={kaydet}>
      <h3>{ilk?.id ? 'Bilgileri düzenle' : 'Yeni kişi'}</h3>

      <div className="secim-cubugu" role="radiogroup" aria-label="Kişi tipi">
        {Object.entries(TIP_ADI).map(([v, ad]) => (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={f.tip === v}
            className={'secim' + (f.tip === v ? ' secili' : '')}
            onClick={() => setF({ ...f, tip: v })}
          >
            {ad}
          </button>
        ))}
      </div>

      <div className="form-izgara">
        <label className="alan">
          <span>Ad soyad</span>
          <input value={f.ad} onChange={set('ad')} />
        </label>
        <label className="alan">
          <span>Doğum tarihi</span>
          <input type="date" value={f.dogumTarihi} onChange={set('dogumTarihi')} />
        </label>
        <label className="alan">
          <span>Cinsiyet</span>
          <select value={f.cinsiyet} onChange={set('cinsiyet')}>
            <option value="">Seçilmedi</option>
            <option value="K">Kadın</option>
            <option value="E">Erkek</option>
          </select>
        </label>
        <label className="alan">
          <span>Boy (cm)</span>
          <input type="number" step="0.1" inputMode="decimal" value={f.boy ?? ''} onChange={set('boy')} />
        </label>
        <label className="alan">
          <span>Kilo (kg)</span>
          <input type="number" step="0.1" inputMode="decimal" value={f.kilo ?? ''} onChange={set('kilo')} />
        </label>
        <label className="alan">
          <span>Telefon (isteğe bağlı)</span>
          <input type="tel" inputMode="tel" placeholder="05xx xxx xx xx" value={f.telefon} onChange={set('telefon')} />
        </label>

        {f.tip === 'sporcu' && (
          <label className="alan">
            <span>Branş</span>
            {!digerBrans ? (
              <select
                value={f.brans}
                onChange={(e) => {
                  if (e.target.value === '__diger') {
                    setDigerBrans(true);
                    setF({ ...f, brans: '' });
                  } else setF({ ...f, brans: e.target.value });
                }}
              >
                <option value="">Seçilmedi</option>
                {BRANSLAR.map((b) => <option key={b} value={b}>{b}</option>)}
                <option value="__diger">Diğer…</option>
              </select>
            ) : (
              <input placeholder="Branş adı" value={f.brans} onChange={set('brans')} />
            )}
          </label>
        )}

        {f.tip === 'pt' && (
          <label className="alan">
            <span>Hedef</span>
            <select value={f.hedef} onChange={set('hedef')}>
              <option value="">Seçilmedi</option>
              {HEDEFLER.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="alan">
        <span>Şube</span>
        <CokluSecim
          secenekler={subeler.map((s) => [s.id, s.ad])}
          secili={f.subeIds}
          onChange={(v) => setF({ ...f, subeIds: v })}
        />
      </div>

      <div className="alan">
        <span>Bireysel antrenman günleri ve saatleri</span>
        <div className="gun-saat-izgara">
          {HAFTA_GUNLERI.map(([g, ad]) => {
            const saatler = f.haftalikSaatler || {};
            const acik = saatler[g] != null;
            return (
              <div key={g} className={'gun-saat' + (acik ? ' acik' : '')}>
                <label className="onay-kutusu">
                  <input
                    type="checkbox"
                    checked={acik}
                    onChange={(e) => {
                      const s = { ...saatler };
                      if (e.target.checked) s[g] = '';
                      else delete s[g];
                      setF({ ...f, haftalikSaatler: s });
                    }}
                  />
                  <span>{ad}</span>
                </label>
                {acik && (
                  <input
                    type="time"
                    value={saatler[g]}
                    onChange={(e) => setF({ ...f, haftalikSaatler: { ...saatler, [g]: e.target.value } })}
                    aria-label={`${ad} saati`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <small className="ipucu">Bugün ekranında saat sırasına göre görünür. Grup derslerinin saati grup ayarlarından gelir.</small>
      </div>

      {yonetici && (
        <div className="alan">
          <span>Koç(lar)</span>
          {koclar.length === 0 ? (
            <small className="ipucu">Henüz koç eklenmemiş. Koçlar ve kullanıcılar bölümünden ekleyebilirsin.</small>
          ) : (
            <CokluSecim
              secenekler={koclar.map((k) => [k.id, k.ad])}
              secili={f.kocIds}
              onChange={(v) => setF({ ...f, kocIds: v })}
            />
          )}
        </div>
      )}

      <label className="alan">
        <span>Not</span>
        <textarea rows={2} value={f.not} onChange={set('not')} />
        <small className="ipucu">Sağlık bilgileri buraya değil, ileride gelecek "Sağlık" sekmesine girilecek.</small>
      </label>

      {hata && <p className="hata">{hata}</p>}
      <div className="dugme-satiri">
        <button className="birincil" disabled={bekliyor}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="metin" onClick={onVazgec}>Vazgeç</button>
      </div>
    </form>
  );
}

// ---------- Kişi kartı ----------
const SEKMELER = [
  ['ozet', 'Özet', null],
  ['program', 'Program', 1],
  ['ev', 'Ev programı', null],
  ['kayitlar', 'Kayıtlar', 1],
  ['testler', 'Testler', 1],
  ['postur', 'Postür', 1],
  ['saglik', 'Sağlık', null],
  ['paket', 'Paket ve ödeme', null],
  ['rapor', 'Rapor', null],
  ['portal', 'Portal görünümü', null],
];

function KisiKarti({ kisi, subeler, koclar, kullanicilar, yonetici, benim, programYetkisi, onGeri, onDegisti }) {
  const [sekme, setSekme] = useState('ozet');
  const [duzenle, setDuzenle] = useState(false);
  const [baglaSecim, setBaglaSecim] = useState('');
  const [hata, setHata] = useState('');
  const [tipler, setTipler] = useState([]);
  const sakatliklar = kisi.aktifSakatliklar || [];
  useEffect(() => {
    if (sakatliklar.length) sakatlikTipleriGetir().then(setTipler).catch(() => {});
  }, [sakatliklar.length]);
  const riskli = useMemo(() => riskliKaliplar(kisi, tipler), [kisi, tipler]);
  const yas = yasHesapla(kisi.dogumTarihi, kisi.dogumYili);
  const subeAdlari = kisi.subeIds?.map((id) => subeler.find((s) => s.id === id)?.ad).filter(Boolean) || [];
  const kocAdlari = (kisi.kocIds || []).map((id) =>
    id === benim ? 'Sen' : koclar.find((k) => k.id === id)?.ad || telefonuGoster(id)
  );
  const bagliHesaplar = kullanicilar.filter((u) => (u.bagliKisiler || []).includes(kisi.id));
  const baglanabilir = kullanicilar.filter(
    (u) => (u.rol === 'ogrenci' || u.rol === 'veli') && !(u.bagliKisiler || []).includes(kisi.id)
  );

  async function calistir(is) {
    setHata('');
    try {
      await is();
      await onDegisti();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  }

  return (
    <div>
      <button className="metin geri" onClick={onGeri}>← Kişiler</button>
      <header className="kisi-baslik">
        <Avatar kisi={kisi} buyuk />
        <div>
          <h2>{kisi.ad}</h2>
          <p className="aciklama">
            {TIP_ADI[kisi.tip]}
            {kisi.tip === 'sporcu' && kisi.brans ? ` · ${kisi.brans}` : ''}
            {kisi.tip === 'pt' && kisi.hedef ? ` · ${HEDEF_ADI[kisi.hedef]}` : ''}
            {yas !== null ? ` · ${yas} yaş` : ''}
            {kisi.aktif === false ? ' · Pasif' : ''}
          </p>
          {sakatliklar.map((a) => (
            <button key={a.id} className="sakatlik-uyari" onClick={() => setSekme('saglik')}>
              ⚠ {a.ad} · {sakatlikEtiketi(a)}
            </button>
          ))}
        </div>
      </header>

      <nav className="sekmeler" aria-label="Kişi kartı bölümleri">
        {SEKMELER.filter(([id]) => id !== 'portal' || yonetici).map(([id, ad]) => (
          <button key={id} className={'sekme' + (sekme === id ? ' secili' : '')} onClick={() => setSekme(id)}>
            {ad}
          </button>
        ))}
      </nav>

      {hata && <p className="hata">{hata}</p>}

      {sekme === 'program' && (
        <RiskliKaliplar.Provider value={riskli}>
          {riskli.size > 0 && (
            <p className="uyari-kutu kucuk-yazi">
              ⚠ Aktif sakatlık: bu aşamada kaçınılacak hareket türündeki egzersizler işaretli (kütüphanede hareket kalıbı seçilmiş olanlar). Fizyoterapistin kısıtları önce gelir.
            </p>
          )}
          <ProgramSekmesi
            sahipTip="kisi"
            sahipId={kisi.id}
            sade={kisi.tip === 'pt'}
            hedef={kisi.hedef}
            duzenleyebilir={programYetkisi}
            yapan={benim}
          />
        </RiskliKaliplar.Provider>
      )}
      {sekme === 'testler' && kisi.tip === 'sporcu' && kisi.brans && <BransTestOnerisi brans={kisi.brans} kisiId={kisi.id} />}
      {sekme === 'testler' && <TestlerSekmesi kisiId={kisi.id} duzenleyebilir yapan={benim} />}
      {sekme === 'kayitlar' && <KayitlarSekmesi kisiId={kisi.id} />}

      {sekme === 'rapor' && <RaporSekmesi kisi={kisi} yapan={benim} />}
      {sekme === 'portal' && yonetici && <Portal ben={{ id: benim, rol: 'yonetici' }} onizlemeKisiId={kisi.id} />}
      {sekme === 'ev' && <EvProgramiSekmesi kisiId={kisi.id} duzenleyebilir yapan={benim} />}
      {sekme === 'saglik' && <SaglikSekmesi kisi={kisi} yapan={benim} onKisiDegisti={onDegisti} />}
      {sekme === 'paket' && <PaketSekmesi kisi={kisi} yonetici={yonetici} benim={benim} koclar={koclar} />}
      {sekme === 'postur' && <PosturSekmesi kisi={kisi} yapan={benim} programYetkisi={programYetkisi} />}
      {!['ozet', 'program', 'testler', 'kayitlar', 'rapor', 'postur', 'paket', 'ev', 'portal', 'saglik'].includes(sekme) && (
        <div className="bos-durum">
          <p>
            Bu bölüm Aşama {SEKMELER.find((s) => s[0] === sekme)[2]} kapsamında gelecek.
            {sekme === 'program' || sekme === 'postur' ? ' Sporcu Kartı\'ndan aktarılan veriler saklanıyor; bölüm gelince burada görünecek.' : ''}
          </p>
        </div>
      )}

      {sekme === 'ozet' && duzenle && (
        <KisiForm
          ilk={{ ...kisi, telefon: kisi.telefon ? telefonuGoster(kisi.telefon) : '' }}
          subeler={subeler}
          koclar={koclar}
          yonetici={yonetici}
          onVazgec={() => setDuzenle(false)}
          onKaydet={async (veri) => {
            await kisiGuncelle(kisi.id, veri);
            setDuzenle(false);
            await onDegisti();
          }}
        />
      )}

      {sekme === 'ozet' && !duzenle && (
        <>
          {kisi.tip === 'sporcu' && kisi.brans && <BransOzeti brans={kisi.brans} />}
          <dl className="bilgi-izgara">
            <div><dt>Doğum tarihi</dt><dd>{kisi.dogumTarihi ? tarihGoster(kisi.dogumTarihi) : kisi.dogumYili ? `${kisi.dogumYili} (yıl)` : '—'}</dd></div>
            <div><dt>Boy / kilo</dt><dd>{kisi.boy ? `${kisi.boy} cm` : '—'} / {kisi.kilo ? `${String(kisi.kilo).replace('.', ',')} kg` : '—'}</dd></div>
            {kisi.seviye && <div><dt>Seviye</dt><dd>{kisi.seviye}</dd></div>}
            {kisi.pozisyon && <div><dt>Pozisyon / disiplin</dt><dd>{kisi.pozisyon}</dd></div>}
            {kisi.kulup && <div><dt>Kulüp</dt><dd>{kisi.kulup}</dd></div>}
            {kisi.eskiTelefon && !kisi.telefon && <div><dt>Telefon (eski kayıt)</dt><dd>{kisi.eskiTelefon}</dd></div>}
            {kisi.hedefNotu && <div className="genis"><dt>Hedef</dt><dd>{kisi.hedefNotu}</dd></div>}
            <div><dt>Cinsiyet</dt><dd>{{ K: 'Kadın', E: 'Erkek' }[kisi.cinsiyet] || '—'}</dd></div>
            <div><dt>Telefon</dt><dd>{kisi.telefon ? telefonuGoster(kisi.telefon) : '—'}</dd></div>
            <div><dt>Şube</dt><dd>{subeAdlari.join(', ') || '—'}</dd></div>
            <div><dt>Antrenman saatleri</dt><dd>{saatOzeti(kisi.haftalikSaatler) || '—'}</dd></div>
            <div><dt>Koç</dt><dd>{kocAdlari.join(', ') || (kisi.eskiKoclar?.length ? `Atanmadı (eski kayıtta: ${kisi.eskiKoclar.join(', ')})` : '—')}</dd></div>
            {kisi.not && <div className="genis"><dt>Not</dt><dd>{kisi.not}</dd></div>}
          </dl>
          <div className="dugme-satiri">
            <button className="ikincil kucuk" onClick={() => setDuzenle(true)}>Bilgileri düzenle</button>
            {yonetici && (
              <button
                className="ikincil kucuk"
                onClick={() => {
                  const pasif = kisi.aktif !== false;
                  if (!window.confirm(pasif ? `${kisi.ad} pasife alınsın mı? Kayıtları silinmez.` : `${kisi.ad} tekrar aktif edilsin mi?`)) return;
                  calistir(() => kisiGuncelle(kisi.id, { aktif: !pasif }));
                }}
              >
                {kisi.aktif === false ? 'Aktif et' : 'Pasife al'}
              </button>
            )}
          </div>

          {yonetici && (
            <section className="kart-form">
              <h3>Siteye giriş yapan hesaplar</h3>
              <p className="aciklama kucuk-yazi">
                Kişinin kendi hesabı ya da velisinin hesabı buraya bağlanır. Hesap önce Koçlar ve kullanıcılar bölümünden "Öğrenci / danışan" ya da "Veli" rolüyle eklenmeli.
              </p>
              {bagliHesaplar.length === 0 && <p className="aciklama">Bağlı hesap yok.</p>}
              {bagliHesaplar.length > 0 && (
                <ul className="sade-liste">
                  {bagliHesaplar.map((u) => (
                    <li key={u.id} className="satir-arasi">
                      <span>{u.ad} · {ROL_ADI[u.rol]} · {telefonuGoster(u.id)}</span>
                      <button
                        className="metin tehlike"
                        onClick={() => calistir(() => hesapBaginiKaldir(u.id, kisi.id))}
                      >
                        Bağı kaldır
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {baglanabilir.length > 0 && (
                <div className="dugme-satiri">
                  <select value={baglaSecim} onChange={(e) => setBaglaSecim(e.target.value)}>
                    <option value="">Hesap seç…</option>
                    {baglanabilir.map((u) => (
                      <option key={u.id} value={u.id}>{u.ad} ({ROL_ADI[u.rol]})</option>
                    ))}
                  </select>
                  <button
                    className="ikincil kucuk"
                    disabled={!baglaSecim}
                    onClick={() =>
                      calistir(async () => {
                        await hesabiBagla(baglaSecim, kisi.id);
                        setBaglaSecim('');
                      })
                    }
                  >
                    Bağla
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Liste ----------
export default function Kisiler({ onGeri }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const yonetici = ben.rol === 'yonetici';
  const [kisiler, setKisiler] = useState(null);
  const [subeler, setSubeler] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [hata, setHata] = useState('');
  const [secili, setSecili] = useState(null);
  const [yeni, setYeni] = useState(false);
  const [ara, setAra] = useState('');
  const [tip, setTip] = useState('');
  const [sube, setSube] = useState('');
  const [koc, setKoc] = useState('');
  const [pasifler, setPasifler] = useState(false);

  async function yukle() {
    try {
      const [k, s, u] = await Promise.all([
        kisileriGetir(ben),
        subeleriGetir(),
        yonetici ? kullanicilariGetir() : Promise.resolve([]),
      ]);
      setKisiler(k);
      setSubeler(s);
      setKullanicilar(u);
    } catch (e) {
      setHata(hataMesaji(e));
      setKisiler([]);
    }
  }
  useEffect(() => {
    yukle();
  }, []);

  const koclar = kullanicilar.filter((u) => (u.rol === 'koc' || u.rol === 'yonetici') && u.aktif !== false);

  const gorunen = useMemo(() => {
    if (!kisiler) return [];
    const a = ara.trim().toLocaleLowerCase('tr');
    return kisiler.filter(
      (k) =>
        (pasifler ? k.aktif === false : k.aktif !== false) &&
        (!tip || k.tip === tip) &&
        (!sube || (k.subeIds || []).includes(sube)) &&
        (!koc || (k.kocIds || []).includes(koc)) &&
        (!a || k.ad.toLocaleLowerCase('tr').includes(a))
    );
  }, [kisiler, ara, tip, sube, koc, pasifler]);

  if (secili) {
    const kisi = kisiler.find((k) => k.id === secili);
    if (kisi) {
      return (
        <KisiKarti
          kisi={kisi}
          subeler={subeler}
          koclar={koclar}
          kullanicilar={kullanicilar}
          yonetici={yonetici}
          benim={ben.id}
          programYetkisi={yonetici || (ben.ekYetkiler || []).includes('programDuzenle')}
          onGeri={() => setSecili(null)}
          onDegisti={yukle}
        />
      );
    }
  }

  return (
    <div>
      <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>
      <div className="baslik-satiri">
        <h2>{yonetici ? 'Kişiler' : 'Kişilerim'}</h2>
        {yonetici && !yeni && (
          <button className="birincil kucuk" onClick={() => setYeni(true)} disabled={subeler.length === 0}>
            + Yeni kişi
          </button>
        )}
      </div>
      {hata && <p className="hata">{hata}</p>}
      {yonetici && kisiler && subeler.length === 0 && (
        <p className="bilgi">Kişi eklemeden önce Ayarlar bölümünden şubeleri eklemelisin.</p>
      )}

      {yeni && (
        <KisiForm
          ilk={{ subeIds: subeler.length === 1 ? [subeler[0].id] : [] }}
          subeler={subeler}
          koclar={koclar}
          yonetici={yonetici}
          onVazgec={() => setYeni(false)}
          onKaydet={async (veri) => {
            const id = await kisiEkle(veri, ben.id);
            setYeni(false);
            await yukle();
            setSecili(id);
          }}
        />
      )}

      <div className="filtreler">
        <input
          type="search"
          placeholder="İsimle ara"
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          aria-label="İsimle ara"
        />
        <select value={tip} onChange={(e) => setTip(e.target.value)} aria-label="Kişi tipi">
          <option value="">Tüm tipler</option>
          {Object.entries(TIP_ADI).map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
        </select>
        {subeler.length > 1 && (
          <select value={sube} onChange={(e) => setSube(e.target.value)} aria-label="Şube">
            <option value="">Tüm şubeler</option>
            {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        )}
        {yonetici && koclar.length > 0 && (
          <select value={koc} onChange={(e) => setKoc(e.target.value)} aria-label="Koç">
            <option value="">Tüm koçlar</option>
            {koclar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
          </select>
        )}
        <label className="onay-kutusu">
          <input type="checkbox" checked={pasifler} onChange={(e) => setPasifler(e.target.checked)} />
          <span>Pasifler</span>
        </label>
      </div>

      {kisiler === null && <p className="aciklama">Yükleniyor…</p>}
      {kisiler && gorunen.length === 0 && (
        <p className="aciklama">
          {kisiler.length === 0
            ? yonetici
              ? 'Henüz kişi yok. "Yeni kişi" ile ekleyebilirsin.'
              : 'Sana atanmış kişi yok.'
            : 'Bu filtreye uyan kişi yok.'}
        </p>
      )}
      <ul className="bolum-listesi">
        {gorunen.map((k) => {
          const yas = yasHesapla(k.dogumTarihi, k.dogumYili);
          return (
            <li key={k.id}>
              <button className="bolum-karti acik" onClick={() => setSecili(k.id)}>
                <Avatar kisi={k} />
                <div className="esnek">
                  <strong>{k.ad}</strong>
                  <span>
                    {TIP_ADI[k.tip]}
                    {k.tip === 'sporcu' && k.brans ? ` · ${k.brans}` : ''}
                    {k.tip === 'pt' && k.hedef ? ` · ${HEDEF_ADI[k.hedef]}` : ''}
                    {yas !== null ? ` · ${yas} yaş` : ''}
                  </span>
                </div>
                {(k.aktifSakatliklar || []).length > 0 && <span className="sakatlik-nokta" title="Aktif sakatlık">⚠</span>}
                <em>Aç →</em>
              </button>
            </li>
          );
        })}
      </ul>
      {kisiler && kisiler.length > 0 && (
        <p className="aciklama kucuk-yazi">{gorunen.length} kişi gösteriliyor</p>
      )}
    </div>
  );
}
