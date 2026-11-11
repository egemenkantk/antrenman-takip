import { useOturum } from './auth/OturumContext';
import Giris from './pages/Giris';
import SifreBelirle from './pages/SifreBelirle';
import Panel from './pages/Panel';

export default function App() {
  const { durum, sifreYenile } = useOturum();

  if (durum.asama === 'yukleniyor') {
    return <div className="yukleniyor" aria-live="polite">Yükleniyor…</div>;
  }
  if (durum.asama === 'girisYok') return <Giris />;
  if (durum.asama === 'sifreBekliyor' || sifreYenile) return <SifreBelirle />;
  return <Panel />;
}
