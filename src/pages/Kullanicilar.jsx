import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
  telefonuDuzenle,
  telefonuGoster,
  kullaniciOlustur,
  geciciSifreVer,
  kullaniciDurum,
  kullaniciSil,
  hataMesaji,
} from '../auth/hesap';
import { MARKA } from '../config/marka';

const ROLLER = [
  ['koc', 'Koç'],
  ['ogrenci', 'Öğrenci / danışan'],
  ['veli', 'Veli'],
  ['yonetici', 'Yönetici'],
];
const ROL_ADI = Object.fromEntries(ROLLER);

function sifreMesaji(ad, sifre) {
  const site = window.location.origin;
  return `Merhaba ${ad.split(' ')[0]}, ${MARKA.ad} takip sitesine giriş bilgilerin:\n\nSite: ${site}\nTelefon: kendi numaran\nGeçici şifre: ${sifre}\n\nİlk girişte kendi şifreni belirleyeceksin.`;
}

function SifreKutusu({ kisi, onKapat }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const mesaj = sifreMesaji(kisi.ad, kisi.sifre);
  const wa = `https://wa.me/${kisi.telefon.replace('+', '')}?text=${encodeURIComponent(mesaj)}`;
  return (
    <div className="sifre-kutusu" role="status">
      <p>
        <strong>{kisi.ad}</strong> için geçici şifre:
      </p>
      <code className="gecici-sifre">{kisi.sifre}</code>
      <p className="aciklama">Bu şifre bir daha gösterilmeyecek. Kişiye ilet; ilk girişte kendi şifresini belirleyecek.</p>
      <div className="dugme-satiri">
        <a className="birincil kucuk" href={wa} target="_blank" rel="noreferrer">
          WhatsApp'tan gönder
        </a>
        <button
          className="ikincil kucuk"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(mesaj);
              setKopyalandi(true);
            } catch {
              /* panoya erişim yoksa sessizce geç */
            }
          }}
        >
          {kopyalandi ? 'Kopyalandı' : 'Mesajı kopyala'}
        </button>
        <button className="metin" onClick={onKapat}>Kapat</button>
      </div>
    </div>
  );
}

export default function Kullanicilar({ onGeri }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState({ ad: '', telefon: '', rol: 'koc', eposta: '' });
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [yeniSifre, setYeniSifre] = useState(null);

  async function yukle() {
    const snap = await getDocs(collection(db, 'kullanicilar'));
    setListe(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'))
    );
  }
  useEffect(() => {
    yukle().catch(() => setListe([]));
  }, []);

  async function ekle(e) {
    e.preventDefault();
    setHata('');
    const telefon = telefonuDuzenle(form.telefon);
    if (!form.ad.trim()) return setHata('Ad soyad gerekli.');
    if (!telefon) return setHata('Telefon numarasını 05xx xxx xx xx şeklinde girin.');
    setBekliyor(true);
    try {
      const { geciciSifre } = await kullaniciOlustur({ ...form, telefon });
      setYeniSifre({ ad: form.ad.trim(), telefon, sifre: geciciSifre });
      setForm({ ad: '', telefon: '', rol: form.rol, eposta: '' });
      await yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setBekliyor(false);
    }
  }

  async function durumDegistir(k) {
    const pasifeAl = k.aktif !== false;
    const soru = pasifeAl
      ? `${k.ad} pasife alınsın mı? Giriş yapamaz ama kayıtları silinmez; istediğinde tekrar aktif edebilirsin.`
      : `${k.ad} tekrar aktif edilsin mi?`;
    if (!window.confirm(soru)) return;
    try {
      await kullaniciDurum(k.id, !pasifeAl);
      await yukle();
    } catch (err) {
      window.alert(hataMesaji(err));
    }
  }

  async function sil(k) {
    if (!window.confirm(`${k.ad} TAMAMEN silinsin mi?\n\nBu yalnızca yanlış ya da test amaçlı eklenen hesaplar içindir ve geri alınamaz. Ayrılan biri için "Pasife al"ı kullan.`)) return;
    try {
      await kullaniciSil(k.id);
      await yukle();
    } catch (err) {
      window.alert(hataMesaji(err));
    }
  }

  async function sifreVer(k) {
    if (!window.confirm(`${k.ad} için yeni geçici şifre oluşturulsun mu? Mevcut şifresi geçersiz olur.`)) return;
    try {
      const { geciciSifre } = await geciciSifreVer(k.id);
      setYeniSifre({ ad: k.ad, telefon: k.id, sifre: geciciSifre });
    } catch (err) {
      window.alert(hataMesaji(err));
    }
  }

  return (
    <div>
      {onGeri && <button className="metin geri" onClick={onGeri}>← Ana sayfa</button>}
      <h2>Kullanıcılar</h2>
      <p className="aciklama">
        Siteye giriş yapacak kişileri buradan ekle. Eklediğinde bir geçici şifre oluşur; kişiye WhatsApp'tan iletebilirsin.
      </p>

      {yeniSifre && <SifreKutusu kisi={yeniSifre} onKapat={() => setYeniSifre(null)} />}

      <form className="kart-form" onSubmit={ekle}>
        <h3>Yeni kullanıcı</h3>
        <div className="form-izgara">
          <label className="alan">
            <span>Ad soyad</span>
            <input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
          </label>
          <label className="alan">
            <span>Telefon</span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="05xx xxx xx xx"
              value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: e.target.value })}
            />
          </label>
          <label className="alan">
            <span>Rol</span>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLLER.map(([v, ad]) => (
                <option key={v} value={v}>{ad}</option>
              ))}
            </select>
          </label>
          <label className="alan">
            <span>E-posta (isteğe bağlı)</span>
            <input
              type="email"
              value={form.eposta}
              onChange={(e) => setForm({ ...form, eposta: e.target.value })}
            />
          </label>
        </div>
        {form.rol === 'ogrenci' || form.rol === 'veli' ? (
          <p className="aciklama kucuk-yazi">
            Öğrenci/veli hesabını sporcu kartlarına bağlama, kişiler bölümü gelince eklenecek.
          </p>
        ) : null}
        {hata && <p className="hata">{hata}</p>}
        <button className="birincil" disabled={bekliyor}>
          {bekliyor ? 'Ekleniyor…' : 'Ekle ve geçici şifre oluştur'}
        </button>
      </form>

      <h3>Kayıtlı kullanıcılar</h3>
      {liste === null && <p className="aciklama">Yükleniyor…</p>}
      {liste && liste.length === 0 && <p className="aciklama">Henüz kullanıcı yok.</p>}
      {liste && liste.length > 0 && (
        <ul className="bolum-listesi">
          {liste.map((k) => (
            <li key={k.id} className="bolum-karti">
              <div>
                <strong>{k.ad}</strong>
                <span>
                  {telefonuGoster(k.id)} · {ROL_ADI[k.rol] || k.rol}
                  {k.eposta ? ' · e-posta var' : ''}
                  {k.sifreDegismeli ? ' · ilk girişi bekleniyor' : ''}
                  {k.aktif === false ? ' · pasif' : ''}
                </span>
              </div>
              {k.rol !== 'yonetici' && (
                <div className="dugme-satiri">
                  {k.rol === 'koc' && (
                    <label className="onay-kutusu kucuk-yazi">
                      <input
                        type="checkbox"
                        checked={(k.ekYetkiler || []).includes('programDuzenle')}
                        onChange={async (e) => {
                          try {
                            await updateDoc(doc(db, 'kullanicilar', k.id), {
                              ekYetkiler: e.target.checked ? arrayUnion('programDuzenle') : arrayRemove('programDuzenle'),
                            });
                            await yukle();
                          } catch (err) {
                            window.alert(hataMesaji(err));
                          }
                        }}
                      />
                      <span>Program düzenleyebilir</span>
                    </label>
                  )}
                  {k.aktif !== false && (
                    <button className="ikincil kucuk" onClick={() => sifreVer(k)}>
                      Geçici şifre ver
                    </button>
                  )}
                  <button className="ikincil kucuk" onClick={() => durumDegistir(k)}>
                    {k.aktif === false ? 'Aktif et' : 'Pasife al'}
                  </button>
                  <button className="metin tehlike" onClick={() => sil(k)}>
                    Sil
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
