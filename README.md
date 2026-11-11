# Antrenman Takip

Fitkon için sporcu ve danışan takip sitesi. Kararlar ve yol haritası: [PROJE_NOTLARI.md](PROJE_NOTLARI.md), veri yapısı: [VERI_MODELI.md](VERI_MODELI.md).

## Yapı
- **Arayüz:** React + Vite (`src/`)
- **Altyapı:** Firebase — Hosting, Authentication (telefon + şifre), Firestore (europe-west3)
- **Güvenlik:** `firestore.rules` — rol bazlı erişim (yönetici, koç, öğrenci, veli)
- **Yayın:** `.github/workflows/yayin.yml` — `main` → canlı site; pull request → 7 günlük test önizlemesi

## Yerelde çalıştırma
```
npm install
npm run dev
```

## Kurallar
- Hizmet hesabı anahtarı asla depoya girmez; yalnızca GitHub "Actions secrets" içinde `FIREBASE_SERVICE_ACCOUNT` olarak durur.
- Veri yapısı değişikliklerinden önce yedek alınır (Firestore günlük yedek açık, 7 gün).
