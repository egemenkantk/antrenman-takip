// Kişi kartı > Özet: kişiyi kapsayan yaklaşan etkinlikler (kendisi, grubu ya da herkes) + son geçmiş olanlar.
// Kart içinden yeni etkinlik (kişi seçili gelir) ve mevcut etkinliği düzenleme.
import { useEffect, useState } from 'react';
import { useOturum } from '../auth/OturumContext';
import { hataMesaji } from '../auth/hesap';
import { kisileriGetir } from '../veri';
import { gruplariGetir } from '../gruplar/veri';
import { bugun, gunEkle, coz } from '../program/model';
import { etkinlikleriGetir, etkinlikKaydet, etkinlikSil, kapsiyor, ETKINLIK_TURU, ETKINLIK_SIMGE } from './veri';
import EtkinlikFormu from './EtkinlikFormu';

const tarihYazi = (t) => coz(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
const gunFarki = (t) => Math.round((coz(t) - coz(bugun())) / 86400000);
const kalanYazi = (n) => (n === 0 ? 'bugün' : n === 1 ? 'yarın' : `${n} gün kaldı`);

export default function KisiEtkinlikleri({ kisi }) {
  const { durum } = useOturum();
  const ben = durum.kullanici;
  const [liste, setListe] = useState(null);
  const [grupIds, setGrupIds] = useState([]);
  const [secenek, setSecenek] = useState(null); // { kisiler, gruplar } form için
  const [form, setForm] = useState(null); // {} yeni | etkinlik
  const [hepsi, setHepsi] = useState(false);
  const [hata, setHata] = useState('');

  async function yukle() {
    try {
      const [e, g] = await Promise.all([etkinlikleriGetir(gunEkle(bugun(), -90), gunEkle(bugun(), 365)), gruplariGetir(ben).catch(() => [])]);
      const gIds = g.filter((x) => (x.uyeIds || []).includes(kisi.id)).map((x) => x.id);
      setGrupIds(gIds);
      setListe(e.filter((x) => kapsiyor(x, { tip: 'kisi', id: kisi.id, grupIds: gIds })));
    } catch (err) {
      setHata(hataMesaji(err));
      setListe([]);
    }
  }
  useEffect(() => {
    yukle();
  }, [kisi.id]);

  async function formAc(e) {
    setHata('');
    if (!secenek) {
      try {
        const [k, g] = await Promise.all([kisileriGetir(ben), gruplariGetir(ben)]);
        setSecenek({ kisiler: k, gruplar: g });
      } catch (err) {
        return setHata(hataMesaji(err));
      }
    }
    setForm(e);
  }

  if (form && secenek) {
    return (
      <EtkinlikFormu
        ilk={form.id ? form : null}
        varsayilan={{ kisiIds: [kisi.id] }}
        kisiler={secenek.kisiler}
        gruplar={secenek.gruplar}
        onVazgec={() => setForm(null)}
        onKaydet={async (l) => {
          if (form.id) await etkinlikKaydet(form, l[0], ben.id);
          else for (const v of l) await etkinlikKaydet(null, v, ben.id);
          setForm(null);
          await yukle();
        }}
        onSil={async () => {
          if (!window.confirm(`"${form.ad || ETKINLIK_TURU[form.tur]}" silinsin mi? Etkinlik kapsadığı herkesten kalkar.`)) return;
          await etkinlikSil(form.id);
          setForm(null);
          await yukle();
        }}
      />
    );
  }

  const b = bugun();
  const gelecek = (liste || []).filter((e) => e.tarih >= b);
  const gecmis = (liste || []).filter((e) => e.tarih < b).slice(-3).reverse();
  const gosterilen = hepsi ? gelecek : gelecek.slice(0, 5);
  const Satir = ({ e, soluk }) => (
    <li className={'etkinlik-satir tur-' + e.tur + (soluk ? ' soluk' : '')}>
      <button type="button" className="metin" onClick={() => formAc(e)} title="Düzenle">
        <span className="etkinlik-simge">{ETKINLIK_SIMGE[e.tur]}</span>
        <strong>{e.ad || ETKINLIK_TURU[e.tur]}</strong>
        <span className="aciklama kucuk-yazi">
          {' '}· {tarihYazi(e.tarih)}{e.saat ? ` ${e.saat}` : ''}{e.yer ? ` · ${e.yer}` : ''}
          {e.kapsam === 'herkes' ? ' · herkes' : !(e.kisiIds || []).includes(kisi.id) && (e.grupIds || []).some((g) => grupIds.includes(g)) ? ' · grubuyla' : ''}
        </span>
      </button>
      {!soluk && <span className={'etkinlik-kalan' + (gunFarki(e.tarih) <= 7 ? ' yakin' : '')}>{kalanYazi(gunFarki(e.tarih))}</span>}
    </li>
  );

  return (
    <section className="kisi-etkinlikler">
      <div className="baslik-satiri">
        <h3>Yaklaşan etkinlikler</h3>
        <button className="ikincil kucuk" onClick={() => formAc({})}>+ Etkinlik</button>
      </div>
      {hata && <p className="hata">{hata}</p>}
      {!liste ? (
        <p className="aciklama kucuk-yazi">Yükleniyor…</p>
      ) : (
        <>
          {!gelecek.length && <p className="aciklama kucuk-yazi">Yaklaşan maç, turnuva ya da test günü yok.</p>}
          {gelecek.length > 0 && (
            <ul className="etkinlik-liste">
              {gosterilen.map((e) => <Satir key={e.id} e={e} />)}
            </ul>
          )}
          {gelecek.length > 5 && (
            <button className="metin kucuk-yazi" onClick={() => setHepsi(!hepsi)}>{hepsi ? 'Daha az göster' : `Tümünü göster (${gelecek.length})`}</button>
          )}
          {gecmis.length > 0 && (
            <>
              <p className="aciklama kucuk-yazi etkinlik-gecmis-baslik">Geçmiş</p>
              <ul className="etkinlik-liste">
                {gecmis.map((e) => <Satir key={e.id} e={e} soluk />)}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
