import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { kullaniciKaydi } from './telefonGiris';

const OturumContext = createContext(null);

// Oturum aşamaları: yukleniyor | girisYok | sifreBekliyor | hazir
export function OturumSaglayici({ children }) {
  const [durum, setDurum] = useState({ asama: 'yukleniyor' });
  // "Şifremi unuttum" ile SMS'le giren kişi önce yeni şifresini belirler
  const [sifreYenile, setSifreYenile] = useState(false);

  const hesapla = useCallback(async (fbKullanici) => {
    if (!fbKullanici || !fbKullanici.phoneNumber) {
      setDurum({ asama: 'girisYok' });
      return;
    }
    try {
      const kayit = await kullaniciKaydi(fbKullanici.phoneNumber);
      if (!kayit || kayit.aktif === false) {
        setDurum({ asama: 'girisYok' });
        return;
      }
      const sifresiVar = fbKullanici.providerData.some((p) => p.providerId === 'password');
      setDurum({ asama: sifresiVar ? 'hazir' : 'sifreBekliyor', fbKullanici, kullanici: kayit });
    } catch {
      setDurum({ asama: 'girisYok' });
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, hesapla), [hesapla]);

  // Şifre belirlendikten sonra durumu tazelemek için
  const yenile = useCallback(async () => {
    if (auth.currentUser) await auth.currentUser.reload();
    await hesapla(auth.currentUser);
  }, [hesapla]);

  return (
    <OturumContext.Provider value={{ durum, sifreYenile, setSifreYenile, yenile }}>
      {children}
    </OturumContext.Provider>
  );
}

export function useOturum() {
  return useContext(OturumContext);
}
