import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { kullaniciKaydi } from './hesap';

const OturumContext = createContext(null);

// Oturum aşamaları: yukleniyor | girisYok | sifreBekliyor | hazir
export function OturumSaglayici({ children }) {
  const [durum, setDurum] = useState({ asama: 'yukleniyor' });

  const hesapla = useCallback(async (fbKullanici) => {
    if (!fbKullanici) {
      setDurum({ asama: 'girisYok' });
      return;
    }
    try {
      const { claims } = await fbKullanici.getIdTokenResult();
      const telefon = claims.telefon;
      const kayit = telefon ? await kullaniciKaydi(telefon) : null;
      if (!kayit || kayit.aktif === false) {
        await signOut(auth);
        setDurum({ asama: 'girisYok' });
        return;
      }
      setDurum({
        asama: kayit.sifreDegismeli ? 'sifreBekliyor' : 'hazir',
        fbKullanici,
        kullanici: kayit,
      });
    } catch {
      setDurum({ asama: 'girisYok' });
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, hesapla), [hesapla]);

  // Şifre/e-posta değişince kaydı yeniden oku
  const yenile = useCallback(() => hesapla(auth.currentUser), [hesapla]);

  return <OturumContext.Provider value={{ durum, yenile }}>{children}</OturumContext.Provider>;
}

export function useOturum() {
  return useContext(OturumContext);
}
