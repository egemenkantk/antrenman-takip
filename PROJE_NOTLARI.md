# Antrenman Takip Sitesi — Proje Notları

> Bu dosya projenin hafızasıdır. Her yeni çalışma oturumunda önce bu dosya okunur.
> Alınan her kararda güncellenir.

Çalışma adı: henüz belirlenmedi (isim, logo ve renkler tek ayardan değişecek)
İlk kullanım yeri: Fitkon
Sistem sahibi ve tek yönetici: Çağla Uzun

---

## 1. Amaç

Sporcu Kartı ve Fitkon Tenis Takip sayfalarını, giriş sistemli gerçek bir web sitesine taşımak.
Site hem sporcuları hem sedanter danışanları kapsar; ileride öğrenci ve velilere açılır.
Uzun vadede başka salonlarda da kullanılabilecek bir ürüne ve mobil uygulamaya dönüşebilir.

## 2. Alınan kararlar

### Kurum yapısı
- İlk sürümde kurum seçimi YOK. Siteye giren herkes doğrudan Fitkon'u görür.
- Arka planda tüm kayıtlar bir kurum etiketiyle (Fitkon) tutulur. Görünmez, ama ileride ikinci kurum eklemeyi kolaylaştırır.
- Tüm yetki yöneticide (Çağla). Koçlara ek yetkiler tek tek açılabilir.
- Fitkon'un iki salonu var; gruplar, dersler ve paketler salona bağlı.

### Hesaplar ve veri saklama
- Öğrenci hesabında yaş sınırı yok: telefonu olan reşit olmayan sporcu aile onayıyla kendi hesabını kullanabilir.
- Wellness formu salonda doldurulur; öğrenci/veli sadece geçmişi görür.
- Ayrılan kişi pasife alınır, silinmez (KVKK silme talebi hariç).

### Roller
| Rol | Görebildikleri |
|---|---|
| Yönetici | Her şey |
| Koç | Sadece kendisine atanan kişiler ve gruplar; bu kişilerin paket ve ödemelerini görür ve kaydeder |
| Öğrenci / danışan | Sadece kendi sayfası |
| Veli | Çocuğunun/çocuklarının sayfası; tek hesaptan birden fazla çocuk |

### Kişi tipleri
- **Sporcu:** branş atanır; performans testleri, sezon fazları, veli raporu.
- **Danışan (sedanter):** hedef seçilir (masa başı, ileri yaş, kilo verme, ağrı yönetimi).
- Kişi tipi ve hedefe göre otomatik şekillenen: test seti, program şablonu önerisi, uyarı eşikleri, rapor dili.
- Program önerileri öneri olarak kalır; yönetici/koç onaylamadan atanmaz.

### Giriş
- Telefon numarası + şifre.
- Hesabı yönetici açar; dışarıdan kayıt yok.
- SMS kodu yalnızca ilk girişte (numara doğrulama + şifre belirleme) ve "şifremi unuttum"da.
- "Beni hatırla" ile uzun süreli oturum; ana ekrana eklenebilir (uygulama gibi açılır).

### Paketler ve ödeme
- Paketler bir kez tanımlanır: ad, salon, tür (grup/bireysel), kitle (sporcu/yetişkin PT danışanı), ders sayısı, fiyat. Fiyatlar aynı paket için herkese aynı; salona, türe ve kitleye göre farklı paketler var.
- Paketlerde süre sınırı YOK; paket dersler bitince biter.
- Bir kişide aynı anda birden fazla paket olabilir; ders, türüne uyan en eski aktif paketten düşer.
- Fiyat değişikliği yalnızca yeni satışlara yansır.
- Paket atanırken isteğe bağlı indirim/not alanı.
- Ödeme siteden ALINMAZ. Ödemeyi her koç kendi öğrencisinden alır ve sisteme kendisi kaydeder (tutar, tarih, yöntem, tahsil eden koç otomatik); taksitte kalan otomatik hesaplanır.
- Koç yalnızca kendi öğrencilerinin ödemelerini görür; yönetici hepsini görür, tahsil eden koça göre filtreleyebilir.
- Kaydedilen ödemede yapılan her düzeltme kim/ne zaman bilgisiyle loglanır; silme yalnızca yöneticide.
- Yoklama girilince ders otomatik düşer.
- Öğrenci görür: aktif paket(ler), kalan ders, ödenen/kalan tutar, ödeme geçmişi.
- Koçlara yapılan ödemeler / hakediş: kapsam dışı (öğrenciden tahsilat ise kapsamda, koçlar kaydeder).

### Erteleme ve iptal
- Talepler WhatsApp'tan alınır; sitede talep formu yok.
- Yönetici/koç dersi "ertelendi" / "iptal" / "haber vermeden gelmedi" olarak işaretler; dersin düşüp düşmeyeceğine yönetici karar verir.
- Mevcut "güne özel değişiklik" mantığı kullanılır.

### Bildirimler
- Şimdilik yalnızca site içi (bildirim alanı + ana sayfada önemli kartlar).
- Örnekler: paket azaldı (son dersler), ders iptal, yeni test sonucu, ödeme kaydedildi, fizyoterapist kontrol tarihi.
- Yönetici hangi otomatik bildirimlerin çalışacağını açıp kapatabilir.
- SMS/WhatsApp bildirimi ileride eklenebilir.

### Koç tarafı
- Telefonda direkt "Bugün" ekranı, tek dokunuşla yoklama ve RPE.
- Wellness'ı kötü ya da sakatlığı olan öğrenci ders öncesi uyarılı görünür.
- Ders sonu kısa not; bir sonraki koç görür.
- Egzersiz kütüphanesi (video/görsel + ipucu), program şablonları, test günü modu.
- Yerine bakma (dersi geçici olarak başka koça devretme) ve devir notu.
- Koç bazında devam/gelişim özeti (yalnızca yönetici görür).

### Branş kütüphanesi
- İlk branşlar: kayak, basketbol, karting, futbol, voleybol (tenis zaten mevcut).
- Her profil: ana kas grupları, kas çalışma şekli, enerji sistemleri, sık sakatlıklar, öncelikli testler, sezon yapısı, antrenman öncelikleri.
- Karting'de yaş grubuna göre ayrı öneriler.
- Sporcuya branş atanınca test ve program önerileri buna göre gelir.
- İçerikler literatüre dayalı, kaynaklı; son kontrol Çağla'da.

### Sakatlık ve rehabilitasyon
- Sakatlık kaydı: bölge, taraf, tarih, tanı, takip eden uzman (ad, kurum, iletişim), belge yükleme.
- Kart ve Bugün ekranında belirgin uyarı; riskli egzersizler işaretlenir, alternatif önerilir.
- Her derste 0-10 ağrı skoru; artışta uyarı.
- 4 aşama: koruma → kuvvet/hareket açıklığı → sahaya dönüş hazırlığı → performansa dönüş.
- Aşama geçişi tarihe değil kritere göre (ağrı, simetri, test sonuçları); sakatlık öncesi testler referans.
- Sabit fizyoterapist yok: Çağla, kişinin kendi fizyoterapistiyle iletişim kurup görüşme kayıtlarını ve aşama onaylarını girer.
- Fizyoterapistin talimatı her zaman sistem önerisinin önündedir.
- İleride: fizyoterapiste gönderilebilir özet sayfası/PDF.
- Sakatlık kütüphanesi: ön çapraz bağ, ayak bileği burkulması, hamstring, patellar tendinopati, omuz, bel ağrısı.

### Mevcut özellikler (taşınacak)
Sporcu Kartı ve Tenis Takip'teki her şey: sporcu listesi, Bugün panosu, program blokları (gün bazlı bölüm seçimi, sürükle-sırala), Core ve Denge bölümleri, postür değerlendirmesi, gruplar, çoklu koç ataması, haftalık saatler, fotoğraflar, güne özel değişiklikler, wellness anketi, testler, veli raporu PDF, Performanz testleri.

### Güncelleme yöntemi
- Kod GitHub deposunda; değişiklikler Claude sohbetlerinden yapılır.
- Önce test sitesi, onaydan sonra gerçek site.
- Veri yapısı değişikliklerinden önce yedek.

## 3. Teknik yapı (öneri)
- Firebase: Hosting, Authentication, Firestore, Storage. Bölge: Avrupa.
- Giriş: telefon doğrulaması Firebase ile; şifre katmanı üzerine kurulacak.
- İki ortam: test ve gerçek.
- Mobil uyumlu; ileride Capacitor ile App Store / Play Store.

## 4. İş bölümü

### Çağla
- [x] GitHub hesabı ve boş, özel (private) depo (egemenkantk/antrenman-takip)
- [ ] Firebase projesi (Google hesabıyla); SMS için Blaze planı + bütçe uyarısı
- [ ] Fitkon logosu ve renkleri
- [ ] Paket listesi (ad, ders sayısı, süre, fiyat)
- [ ] Nahit Hoca ile veri sahipliği konuşması
- [ ] KVKK aydınlatma ve açık rıza metinleri (bir hukukçuya kontrol ettirilmesi önerilir)
- [ ] Branş ve sakatlık içeriklerinin kontrolü
- [ ] İsim kararı ve alan adı (sonra)

### Claude
- [x] Proje notları (bu dosya)
- [x] Veri modeli ve ekran listesi (VERI_MODELI.md)
- [ ] Kod iskeleti, giriş sistemi, roller, otomatik yayın, test/gerçek ortam
- [ ] Mevcut iki sayfadan veri aktarma aracı
- [ ] Branş ve sakatlık kütüphanesi taslakları

## 5. Yol haritası
1. **Aşama 1 — Temel:** kurulum, giriş, roller, Sporcu Kartı ve Tenis Takip'in taşınması. Yalnızca yönetici ve koçlar kullanır.
2. **Aşama 2 — Danışan ve işletme:** danışan tipi ve hedefler, paketler, ödeme kaydı, site içi bildirimler.
3. **Aşama 3 — Portal:** öğrenci ve veli girişi açılır.
4. **Aşama 4 — Kütüphaneler:** branş profilleri, sakatlık ve rehabilitasyon modülü.

## 6. Açık konular
- Ürün ve site ismi
- KVKK: verilerin yurt dışı sunucuda tutulması için gereken rıza/sözleşme
