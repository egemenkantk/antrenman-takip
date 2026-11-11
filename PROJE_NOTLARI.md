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
- Fitkon'un iki şubesi var: (1) Sporcu Performans ve Cimnastik Merkezi, (2) Pilates Salonu. Gruplar, dersler ve paket tanımları şubeye bağlı; paket fiyatları şubeye göre farklı.
- Aynı koçlar iki şubede de çalışıyor; koç erişimi şubeye göre değil, kişi/grup atamasına göre.
- Bir kişi iki şubede de kayıtlı olabilir; paket ve ödemeleri şube şube ayrı görünür.

### Hesaplar ve veri saklama
- Öğrenci hesabında yaş sınırı yok: telefonu olan reşit olmayan sporcu aile onayıyla kendi hesabını kullanabilir.
- Wellness: kendi hesabı olan öğrenci ve yetişkin danışan kendi telefonundan doldurur; eksikse koç salonda doldurur. Veli doldurmaz.
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
- **PT danışanı:** çoğunlukla yetişkin; pilates salonu ve birebir danışanlar. Hedef seçilir (masa başı, ileri yaş, kilo verme, ağrı yönetimi). Test/program kullanımı isteğe bağlı.
- **Cimnastik:** çocuk grupları, yalnızca grup dersleri (4 haftalık dönem, aile ödemesi). Sporcu tipinde, branş: cimnastik.
- Kişi tipi ve hedefe göre otomatik şekillenen: test seti, program şablonu önerisi, uyarı eşikleri, rapor dili.
- Program önerileri öneri olarak kalır; yönetici/koç onaylamadan atanmaz.

### Giriş (SMS yok, ücretsiz)
- Telefon numarası + şifre.
- Hesabı yönetici açar; sistem geçici şifre üretir, WhatsApp'tan iletilir. Dışarıdan kayıt yok.
- İlk girişte kişi kendi şifresini belirler, isteğe bağlı e-posta ekler.
- Şifremi unuttum: e-postası varsa sıfırlama bağlantısı (Firebase, ücretsiz); yoksa yönetici "geçici şifre ver" der.
- "Beni hatırla" ile uzun süreli oturum; ana ekrana eklenebilir (uygulama gibi açılır).

### Paketler ve ödeme
- Paketler bir kez tanımlanır: ad, şube, tür (grup/bireysel), kitle (sporcu/PT danışanı), ders sayısı, fiyat. Fiyatlar aynı paket için herkese aynı; şubeye, türe ve kitleye göre farklı paketler var.
- Bireysel/PT paketlerde süre sınırı YOK; paket dersler bitince biter.
- Grup dersleri 4 haftalık dönemlerle ilerler; grup ödemesi döneme bağlı, ödemeyi aileler yapar. Derse gelinmese de ücret aynı, aktarım yok.
- Dönem ortasında gruba katılan çocuğun ilk dönem ücreti kalan haftalara göre orantılı (katıldığı hafta dahil).
- Dönemin son günü gruptaki tüm velilere ödeme hatırlatması, yöneticiye kim ödedi/ödemedi özeti. İkinci hatırlatma yok.
- Grup dersinde her veli yalnızca kendi çocuğunu görür; diğer çocuklar ve aileler görünmez. Grup duyuruları herkese gider.
- Grubun gün/saati toplu değişebilir; değişiklik gruptaki herkese bildirilir.
- Bir kişide aynı anda birden fazla paket olabilir; ders, türüne uyan en eski aktif paketten düşer.
- Fiyat değişikliği yalnızca yeni satışlara yansır.
- Paket atanırken fiyat liste fiyatından gelir; kişiye özel fiyatı yalnızca yönetici değiştirir (isteğe bağlı neden notuyla).
- Öğrenci/veli liste fiyatını hiçbir yerde görmez; sadece kendi fiyatını ve kalan tutarı görür.
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
- Örnekler: paket azaldı (son dersler), grup dönemi ödemesi, grup saati değişti, ders iptal, yeni test sonucu, ödeme kaydedildi, fizyoterapist kontrol tarihi.
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

### Performanz test verileri
- Testler Performanz cihazlarıyla yapılıyor; sonuçlar Performanz'ın kendi portalına senkronize oluyor.
- Portal her test için PDF rapor veriyor; raporlar aynı mantıkta ve metni okunabilir.
- Sitede "Performanz raporu yükle": PDF'ler toplu yüklenir, değerler okunur, sporcu ad + doğum tarihiyle eşleşir, önizleme ve onayla kaydedilir; mükerrer yükleme engellenir.
- Özet değerler, normatif seviye, boy/kilo alınır; grafiklerdeki tek tek değerler alınmaz.
- Her test türü için örnek rapor gerekli. Elde: Bosco, Denge (sağ ayak), CMJ, Sürat 10 m, V-cut (portalda "Sürat - Belirsiz Mesafe", 25 m).
- V-cut raporda adıyla geçmiyor ("Belirsiz Mesafe"); yüklemede test türü elle seçilir/eşleştirilir. Normu yok, Performanz takım ortalamasını norm diye kullanıyor → bu normatif seviye dikkate alınmaz.
- CMJ raporundaki "temas süresi" (örn. 8 s) sıçrama öncesi platformda bekleme süresi; analizde kullanılmaz. Uçuş süresi alınır.
- Raporlardaki "Antrenör" alanı cihaz hesabı sahibini gösteriyor; koç ataması buradan alınmaz.
- Performanz'ın genel "Öneri" maddeleri programa aktarılmaz, istenirse referans olarak saklanır.
- Eski raporlar da yüklenerek geçmiş test verisi siteye taşınabilir.
- Tüm raporlarda üst kısım (sporcu ve test bilgileri) aynı; altta teste özel bölümler var.
- Denge sağ ve sol ayak ayrı rapor; ikisi birleştirilip sağ-sol farkı (asimetri) hesaplanır.
- Performanz'ın otomatik yorum metinleri kendi içinde tutarsız olabiliyor; esas alınan ham sayılar, yorum metni ayrıca saklanır.
- İleride Performanz API erişimi verirse otomatik aktarıma geçilir (Performanz'a sorulacak).

### Mevcut özellikler (taşınacak)
Sporcu Kartı ve Tenis Takip'teki her şey: sporcu listesi, Bugün panosu, program blokları (gün bazlı bölüm seçimi, sürükle-sırala), Core ve Denge bölümleri, postür değerlendirmesi, gruplar, çoklu koç ataması, haftalık saatler, fotoğraflar, güne özel değişiklikler, wellness anketi, testler, veli raporu PDF, Performanz testleri.

### Güncelleme yöntemi
- Kod GitHub deposunda; değişiklikler Claude sohbetlerinden yapılır.
- Önce test sitesi, onaydan sonra gerçek site.
- Veri yapısı değişikliklerinden önce yedek.

## 3. Teknik yapı (öneri)
- Firebase projesi: antrenman-takip-e6e4f (Blaze, TRY, bütçe uyarısı). Firestore Standard, europe-west3 (Frankfurt), günlük yedek (7 gün).
- Arayüz: React + Vite. Hosting, Authentication, Firestore; Storage ileride.
- Giriş: şifre kontrolü sunucu fonksiyonunda (functions/, europe-west3, Node 22); tarayıcıya tek kullanımlık giriş anahtarı döner. Hesabın e-postası gerçek adres ya da telefondan türetilen iç adres. Kullanıcı kimliği = telefon numarası; sunucu her hesaba "telefon" etiketi (custom claim) koyar.
- İlk yönetici: GitHub Actions → "Yönetici hesabı kur" (tek seferlik).
- Güvenlik: firestore.rules, rol bazlı. Öğrenci/velinin görmemesi gereken bilgiler (liste fiyatı, koç notları, sağlık, diğer çocuklar) ayrı belgelerde; portal için özetler Aşama 3'te üretilecek.
- Yayın: GitHub Actions — main → canlı site + kurallar; pull request → 7 günlük test önizlemesi. Anahtar: FIREBASE_SERVICE_ACCOUNT (GitHub secret).
- Mobil uyumlu; ileride Capacitor ile App Store / Play Store.

## 4. İş bölümü

### Çağla
- [x] GitHub hesabı ve boş, özel (private) depo (egemenkantk/antrenman-takip)
- [x] Firebase projesi (Google hesabıyla); SMS için Blaze planı + bütçe uyarısı
- [x] Yayın anahtarını GitHub'a koymak (FIREBASE_SERVICE_ACCOUNT) ve yayın hesabına rol eklemek
- [x] Authentication'da E-posta/Şifre girişini açmak
- [ ] "Yönetici hesabı kur" akışını çalıştırıp şifre belirlemek
- [ ] Fitkon logosu ve renkleri
- [ ] Paket listesi (ad, ders sayısı, süre, fiyat)
- [ ] Nahit Hoca ile veri sahipliği konuşması
- [ ] KVKK aydınlatma ve açık rıza metinleri (bir hukukçuya kontrol ettirilmesi önerilir)
- [ ] Branş ve sakatlık içeriklerinin kontrolü
- [ ] İsim kararı ve alan adı (sonra)

### Claude
- [x] Proje notları (bu dosya)
- [x] Veri modeli ve ekran listesi (VERI_MODELI.md)
- [x] Kod iskeleti, giriş sistemi, roller, otomatik yayın, test/gerçek ortam (ilk sürüm)
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
