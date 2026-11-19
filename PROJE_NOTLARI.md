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
- Wellness: kendi hesabı olan öğrenci ve yetişkin danışan kendi telefonundan doldurur; telefonu olmayan çocuk velisinin telefonundan (veli hesabıyla) doldurur; eksikse koç salonda doldurur. Hangi hesaptan doldurulduğu kaydedilir; aynı gün yalnızca dolduran hesap düzeltebilir.
- Ayrılan kişi pasife alınır, silinmez (KVKK silme talebi hariç).

### Roller
| Rol | Görebildikleri |
|---|---|
| Yönetici | Her şey |
| Koç | Sadece kendisine atanan kişiler ve gruplar; bu kişilerin paket ve ödemelerini görür ve kaydeder |
| Öğrenci / danışan | Sadece kendi sayfası |
| Veli | Çocuğunun/çocuklarının sayfası; tek hesaptan birden fazla çocuk |

### Kişi tipleri
- **Sporcu:** branş atanır; performans testleri, sezon fazları, gelişim raporu.
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

**Nasıl çalışıyor (Aşama 2, yapıldı):**
- Paket tanımları: Paketler ve ödemeler → Paket tanımları (yalnızca yönetici). Satıştan kaldırılan paket eski satışları bozmaz.
- Bireysel/PT: kişinin kartı → Paket ve ödeme → "Bireysel paket ata". Başlangıç tarihinden sonraki "geldi" işaretli bireysel dersler en eski dolmamış paketten düşer; "gelmedi" düşmez, yönetici isterse ders bazında "dersten düşsün" işaretler. Pakete düşmeyen dersler uyarı olarak görünür.
- Grup: grubun ayarında dönem ücreti paketi + ilk dönem başlangıcı seçilir; dönemler 28 günde bir ilerler. Kayıtlar her sabah 08:00'de otomatik açılır (yönetici "şimdi kontrol et" de diyebilir ya da grubun Ödemeler sekmesinden açabilir).
- Sonradan eklenen üyenin katılım tarihi saklanır; ilk dönemi kalan haftalara göre orantılı açılır.
- Düet ve trio: Gruplar'da ders türü "Düet"/"Trio" seçilen küçük grup (saat, yoklama, ortak program). Herkes kendi ders sayılı düet/trio paketini alır (kişi başı, süresiz). Yoklamada "geldi" olanın kendi paketinden ders düşer; gelmeyenden düşmez (istenirse "dersten düşsün").
- Düet/trioda eksik katılım: o gün kaç kişi geldiyse o ücret uygulanır (velilere baştan söyleniyor). Site gelenlere otomatik fark hesaplamaz; yönetici yoklamadan sonra çıkan kutuya kişi başı fark tutarını girer (ya da "fark ücreti yok"). Koç yoklama girdiyse eksik dersler kişinin Paket ve ödeme sekmesinde yöneticiye listelenir.
- Aylık abonelik (sporcular): paket tanımında aylık ücret, haftalık ders (3), aylık ders hakkı (12), taahhüt (en az 6 ay, yalnızca bilgi; engellemez). Kişiye başlangıç tarihiyle atanır; her ay aynı gün yeni dönem ve ödeme kaydı açılır (6 Kasım → 6 Aralık; ayın son günü kayarsa ayın son günü). Dönemin son günü öğrenci/veliye hatırlatma, yöneticiye özet.
- Abonelikte ders sayımı: o dönemdeki tüm bireysel ve grup yoklamaları (düet/trio hariç). Geldi hak yer; habersiz "gelmedi" telafi olmadığı için hak yer (yönetici "dersten düşmesin" diyebilir); "İzinli / ertelendi" hak yemez. Ertelenen dersler kendiliğinden devretmez; yönetici o aya "ek ders hakkı" ekleyebilir. Abonelik günlerindeki bireysel dersler bireysel paketten düşmez.
- Ek ücret: kişi kartından tek seferlik tutar (açıklamasını öğrenci/veli görür); yalnızca yönetici.
- Kişiye özel grup ücreti (kardeş indirimi vb.) grupta kişi bazında saklanır ve sonraki dönemlere de uygulanır.
- Dönemin son günü 08:00'de: gruba bağlı öğrenci/veli hesaplarına hatırlatma, yöneticilere ödedi/ödemedi özeti (site içi bildirim).
- Ödeme silme: kayıt yok olmaz, "silindi" işaretlenir ve işlem geçmişine yazılır; düzeltmelerin eski değerleri saklanır.
- Liste: bekleyen ödemeler, azalan paketler (≤2 ders), tarih/koç/yöntem filtreli tahsilatlar.
- Son ders bildirimi: yoklamada bir pakette tek ders kaldığında kişiye bağlı öğrenci/veli hesaplarına bir kez gider. "Paket azaldı" bildirimi kararla kaldırıldı; yönetici/koç için "Azalan paketler" listesi duruyor.
- Öğrenci/veli ekranları Aşama 3'te (bildirimleri o zaman görecekler).

### Program
- Sporcular: eski Sporcu Kartı program yapısı aynen taşınır (bloklar, dönemler, A/B/C günleri, bölüm seçimi ve sürükle-sırala, haftalık ilerleme tablosu, güne özel değişiklik, şablonlar, grup programı, maç gününe göre planlama).
- PT danışanları: blok yerine sade haftalık plan (günler + egzersiz listesi; bölümler ve ilerleme tablosu isteğe bağlı). Varsayılan fazlar Adaptasyon / Temel / İlerleme, ayrıca elle faz eklenebilir. Hedefe göre örnek şablonlar. Ev programı isteğe bağlı, kişi kişi gönderilir.
- PT danışanlarında test yapılmıyor; yeniden test hatırlatması yok.
- Pilates şubesi şimdilik sitede kullanılmayacak (pilates ders notu vb. yok).

### Rapor (eski adıyla veli raporu)
- Adı "Rapor"; kişi kartında sekme. Sporcu ve PT danışanı için aynı sistem, içerik kişi tipine göre değişir.
- Kime: veliye ya da kişinin kendisine (18 yaş altı sporcuda varsayılan veli).
- Sporcu: iki test günü karşılaştırma, test açıklamaları, rekorlar, gelişim grafikleri, antrenman özeti, vücut ölçüleri, değerlendirme ve hedefler.
- PT: tarih aralığına göre antrenman özeti (seans, katılım, dakika, RPE, hazır oluş), vücut ölçüleri, değerlendirme ve hedefler.
- PDF olarak indir ve yazdır. Rapor başlığı (salon adı, koç, logo) kurum ayarında tutulur.
- Performanz PDF'lerini sitede saklama/görüntüleme: ertelendi, istenirse sonra eklenir (Storage, europe-west3).

### Postür
- Eski Sporcu Kartı modeli aynen: önden/yandan/arkadan bulgular, şiddet (hafif/belirgin), taraf, seçmeli skapula bulguları, vücut şeması, önceki değerlendirmeye göre eğilim, skolyoz şüphesinde uzmana yönlendirme.
- Düzeltici egzersiz önerileri kişinin aktif/planlı bloğuna (seçilen bölüm ve günlere) ya da PT planına eklenir; grup programı değişmez.
- Raporda postür özeti bölümü.

### Takvim
- Haftalık ve aylık görünüm; bireysel ve grup dersleri, güne özel değişiklikler, etkinlikler. Gün/derse tıklayınca Bugün ekranı o tarihte açılır.
- Etkinlikler: maç, turnuva, test günü, diğer; herkes ya da seçili grup/kişiler. Maç ve turnuvalar "maç gününe göre" (MD) planlanmış blokları besler.
- Google Takvim bağlantısı: ertelendi (salon tarafında karışıklık olmasın diye); ihtiyaç olursa tek yönlü abonelik (ICS) olarak eklenebilir.

### Kütüphaneler
- Egzersiz kütüphanesi: ad, isteğe bağlı hareket kalıbı (squat, menteşe, tek bacak, itme, çekme, core, sıçrama…), video bağlantısı, uygulama ipucu, dikkat edilecekler. Mevcut programlardan tek tıkla içe alma; seçerek toplu silme.
- Egzersiz bir bölüme/niteliğe bağlı değil: kuvvet, kuvvette devamlılık, power gibi nitelikleri set/tekrar, yük ve hız belirler. Aynı hareket her bölümde kullanılabilir.
- Program düzenleyicide her bölümün altında tüm kütüphaneden öneriyle egzersiz ekleme; programda ve Bugün ekranında kütüphanedeki egzersizlerin yanında ▶ video bağlantısı.
- Kendi program şablonları: blok "şablon olarak kaydet", yeni blokta "Kendi şablonların" listesinden seçme; kütüphanede yeniden adlandır/sil.
- Yönetici ve "program düzenleyebilir" yetkili koçlar ekleyip düzenleyebilir; diğer koçlar görür.
- Branş profilleri ve sakatlık kütüphanesi: Aşama 4.

### Tasarım
- Şu anki görünüm iskelet; tasarım en sona bırakıldı. Renk, yazı tipi ve boşluklar tek stil dosyasından yönetildiği için sonradan değiştirmek kolay.

### Erteleme ve iptal
- Talepler WhatsApp'tan alınır; sitede talep formu yok.
- Yönetici/koç dersi "ertelendi" / "iptal" / "haber vermeden gelmedi" olarak işaretler; dersin düşüp düşmeyeceğine yönetici karar verir.
- Mevcut "güne özel değişiklik" mantığı kullanılır.

### Bildirimler
- Şimdilik yalnızca site içi (bildirim alanı + ana sayfada önemli kartlar).
- Örnekler: paketin son dersi (bir sonraki ders paketin son dersi olduğunda bir kez; "paket azaldı" bildirimi yok), grup dönemi ödemesi, grup saati değişti, ders iptal, yeni test sonucu, ödeme kaydedildi, fizyoterapist kontrol tarihi.
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

### Test planı, takip ve veriler (Kasım 2026)
- Sabit batarya yok: her kişiye kendi test planı atanır (kişi kartı → Testler → Test planı; ya da Testler → Test takibi'nde seçilen kişilere toplu).
- Test dönemleri 3 aylık; başlangıç kurum ayarında (yönetici değiştirir), varsayılan yılın çeyrekleri.
- Test takibi: kişi × planlı test tablosu (✓ yapıldı, ✗ eksik + önceki tarih, ½ taraflı testte tek taraf); eksikleri Test günü ekranına toplu aktarma.
- Test verileri: test + taraf, dönem/son 12 ay/tüm zamanlar, son ya da en iyi ölçüm; süzgeçler grup, şube, kitle, branş, cinsiyet, doğum yılı aralığı (farklı yaşlar birlikte görülebilir). Sıralama, yüzdelik dilim (süzülen grup içinde), ortalama/medyan/en iyi/sapma, doğum yılı/branş/grup/cinsiyet/kitleye göre ortalama karşılaştırma, son 4 dönem eğilimi, CSV indirme.
- Veliler/öğrenciler bu verileri ve sıralamayı görmez. Takım (kulüp) karşılaştırması tenis kulübü anlaşmasından sonra.

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
- Durum: PDF okuyucu tarayıcıda çalışıyor (Bosco, CMJ, Denge, 10 m sürat, belirsiz mesafe sürat doğrulandı). Orijinal PDF şimdilik saklanmıyor; rapordaki değerler ve ayrıntılar kaydediliyor. Belirsiz mesafe testlerinin hangi teste karşılık geldiği tarayıcıda hatırlanır.

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
- [x] Branş ve sakatlık kütüphanesi taslakları (Kasım 2026, kaynaklı; kontrol Çağla'da)

## 5. Yol haritası
1. **Aşama 1 — Temel:** kurulum, giriş, roller, Sporcu Kartı ve Tenis Takip'in taşınması. Yalnızca yönetici ve koçlar kullanır.
2. **Aşama 2 — Danışan ve işletme:** danışan tipi ve hedefler, paketler, ödeme kaydı, site içi bildirimler. ✔ Yapıldı (Kasım 2026).
3. **Aşama 3 — Portal:** öğrenci ve veli girişi açılır. ✔ Yapıldı (Kasım 2026):
   - Öğrenci/veli girişte portalı görür: ana sayfa (sıradaki dersler, bugünkü form, kalan ders ve ödeme, yaklaşan maç/test), takvim (haftalık saatler, 2 aylık etkinlikler), ev programı (video + "yaptım"), gelişim (test sonuçları), paket ve ödemeler (yalnızca kendi fiyatı, ödenen/kalan, ödeme geçmişi).
   - Veli: birden fazla çocuğu varsa üstte çocuk seçici.
   - Paket, grup ve etkinlik bilgileri sunucuda kişiye özel özetlenir (portalVerisi); öğrenci/veli bu koleksiyonları doğrudan okuyamaz.
   - Ev programı: kişi kartı → "Ev programı" sekmesi (koç hazırlar; kütüphane videoları otomatik). Son 4 haftanın "yaptım" günleri koça görünür.
   - Yönetici kişi kartında "Portal görünümü" ile öğrencinin ekranını salt okunur önizler.
   - Henüz yok: raporların portalda paylaşılması, erteleme/iptalin portal takviminde görünmesi.
4. **Aşama 4 — Kütüphaneler:** branş profilleri, sakatlık ve rehabilitasyon modülü. ✔ Yapıldı (Kasım 2026):
   - Kişi kartı → Sağlık: sakatlık kaydı (tür, bölge, taraf, tanı, takip eden uzman + WhatsApp), fizyoterapistin kısıtları, 4 aşama ve aşama geçişleri (onay veren kaydedilir), görüşme kayıtları ve sonraki kontrol tarihi, ağrı grafiği, önerilen testlerde sakatlık öncesi/sonrası karşılaştırma, iyileşti/yeniden aç.
   - Kişi kartı başlığında, kişi listesinde ve Bugün'de ⚠ uyarı; aktif sakatlığı olanlara yoklamada 0–10 ağrı skoru (≥5 ya da önceki derse göre +2 uyarı).
   - Programda (kişi kartı ve Bugün) o aşamada kaçınılacak hareket kalıbındaki egzersizler ⚠ ile işaretlenir; bunun için kütüphanede egzersizin hareket kalıbı seçilmiş olmalı.
   - Kütüphaneler → Sakatlık ve Branş profilleri: kaynaklı taslaklar tek tıkla eklenir, yönetici düzenler ve "Kontrol ettim" ile taslak işaretini kaldırır.
   - Sporcunun branş profili Özet'te, branşın öncelikli testleri (son ölçüm tarihiyle) Testler sekmesinde görünür.
   - Henüz yok: belge (rapor/MR) yükleme, fizyoterapiste gönderilecek özet PDF, öğrenci/veli portalında sakatlık görünümü.

## 6. Açık konular
- Ürün ve site ismi
- KVKK: verilerin yurt dışı sunucuda tutulması için gereken rıza/sözleşme

## 7. Anlaşma sonrası yapılacak
### Tenis kulübü hizmeti (kulüp antrenörü rolü)
- Durum: tenis kulübüyle anlaşma kesinleşince yapılacak; şimdilik bir şey eklenmedi.
- Hizmet: kulübün öğrencilerine genel aylık program ve testler; kulübün kendi hocaları sonuçları görür.
- Çözüm: yeni rol "kulüp antrenörü" — veli portalı gibi kısıtlı ekran. Yönetici hesabı açar ve hocayı kulübün öğrencilerine bağlar (bagliKisiler mantığı).
- Görür: bağlı öğrencilerin aylık programı (egzersiz, set/tekrar, notlar), test sonuçları ve raporları; birden fazla öğrencide öğrenci seçici.
- Görmez: kütüphane, şablonlar, sakatlık rehberleri, faz/otomatik program mantığı, ödemeler, koç notları, diğer sporcular. Veri sunucuda süzülerek verilir (portalVerisi gibi).
- Kulübün öğrencileri sistemde normal sporcu olarak durur, "Tenis Kulübü" gibi bir kurum/kulüp etiketiyle ayrılır.
- Anlaşmada karar verilecekler: egzersiz videoları görünsün mü, sakatlık kısıtları görünsün mü, kulüp hocası kort programını yazabilsin mi, kulüp dışına veri açılması için veli onayı nasıl alınacak.

## Ders saat / gün değişiklikleri
- Sabit haftalık saatler (kişi haftalikSaatler, grup saatler) aynen kalır; tek bir güne özel değişiklik `dersDegisiklik` koleksiyonuna yazılır.
- Belge id: `<sahipId>__<asılTarih>`. islem: `saat` (aynı gün başka saat), `tasi` (başka gün/saat → yeniTarih, yeniSaat), `iptal`.
- Bugün ekranında her kartta "🕒 Saat / gün" düğmesi; "Değişikliği geri al" belgeyi siler.
- Taşınan ders eski günde soluk "taşındı" olarak, yeni günde "taşındı (asıl tarih)" etiketiyle ve asıl günün planıyla görünür. Takvim de aynı hesaplamayı (gunHesap.gununKartlari) kullanır.
- Portal (öğrenci/veli) değişiklikleri portalVerisi üzerinden görür; koleksiyonu doğrudan okuyamaz. Değişiklik için otomatik bildirim henüz yok.

## Cimnastik
- Kişi tipi `cimnastik` (TIP_ADI). Kişi kartında Program, Ev programı, Testler, Postür ve Rapor sekmeleri gizli; Beceriler sekmesi var. Wellness Bugün ekranında ve portalda sorulmaz; portalda Ev programı ve Gelişim sayfaları yok. Test sayfalarına (test günü, takip, veriler) girmezler.
- Grup alanı `cimnastik: true` ("Cimnastik grubu" onayı). Grup programı `CimnastikDuzenleyici` ile: blok alanları `cimnastik: true, faz: 'cimnastik', tema, not (dönemin hedefi)`, bölümler sabit `c_isinma, c_beceri, c_ana, c_oyun, c_soguma`, her günde `sure: {bölüm: dk}`; haftalık dozaj (ilerleme) yok.
- Hazır dönem temaları `src/cimnastik/model.js` TEMALAR (yuvarlanma, denge, destek, sıçrama, esneklik, koordinasyon, parkur) — öneri içeriktir.
- Beceri takibi: `kisiler/{id}/ozel/beceriler` { durum: {anahtar: {d: calisiyor|yapabiliyor, t, y}}, ekler: [] }. Yalnızca ekip (ozel kuralı); veliler görmez. Grup sayfasında "Beceriler" sekmesi üye × beceri tablosu.

## Portal ayarları
- Ayarlar > "Öğrenci ve veli portalı": `kurumlar/fitkon.portal.gelisim` (varsayılan açık). Kapalıyken portalda Gelişim sayfası gizlenir ve kural (`portalGelisimAcik`) öğrenci/velinin testSonuclari okumasını engeller. portalVerisi `ayarlar.gelisim` döner.

## Tahsilatlar (aylık)
- `src/paket/Tahsilatlar.jsx`. Ay = ödemenin alındığı ay (maaş hesabı ay içinde alınan paradan yapılıyor).
- Türler (sınıf): grup, bireysel/PT (bireysel), düet/trio, aylık abonelik (abonelik + abonelikDonem), ek ücret. Ödemenin türü bağlı olduğu satilanPaket'ten gelir.
- Ayrıca: grup grup kırılım (cimnastik grupları ayrı toplam, bu ay başlayan dönemde bekleyen sayısı), tahsil edene göre koç tablosu, son 12 ay yığılmış grafik, süzgeçler (koç, yöntem, şube, kişi tipi), CSV (Excel, ; ayraçlı) indirme.

## Gruba sonradan katılım ve dönem muafiyeti
- `grup.uyeKatilim[kisiId]` = katılım tarihi. Grubun Ödemeler sekmesinde yönetici "Katılım" ile dönem seçer ya da tarih girer (`katilimGuncelle`): katılımdan önce biten dönem kayıtları (ödemesizse) `durum: iptal, fiyatNotu: 'Katılımdan önceki dönem'`; katıldığı dönem orantılı, sonrakiler tam ücretle yeniden hesaplanır; ödemeli kayıtlara dokunulmaz.
- Katılımı dönem bitişinden sonra olan üye o dönemde listelenmez ve kaydı açılmaz (istemci + sunucu donemKontrolu).
- "Bu döneme dahil değil" (`donemDahilAyarla`): kayıt yoksa açılıp `iptal, fiyatNotu: 'Bu döneme dahil değil'` yapılır; "Döneme dahil et" geri alır. Sunucu mevcut kaydın üstüne yazmadığı için muafiyet kalıcıdır.

## Dünya normları ve cihaz değişikliği
- `src/testler/normlar.js`: Eurofit (Tomkinson 2018, 9–17 yaş: uzun atlama, kavrama, otur-uzan, 20 m mekik/beep), ABD okul normları (6–17: 1 dk mekik, barfiks (erkek 10+), şınav, 6–8 yaş otur-uzan), genç tenisçi meta-analiz ortalamaları (Axman 2025: CMJ, 10/20 m sürat, 505). `normDegerlendir(test, deger, kisi, tarih)` test günündeki yaş + cinsiyet ile seviye (5 kademe) döner. 18+ için norm yok.
- Otur-uzan: bizim kutuda ayak tabanı 22 cm (Eurofit 15, ABD 23 cm'e çevrilir). Beep "8/5" → Léger dakika (L-1 + mekik/kademe mekik sayısı).
- Cihaz değişikliği: `kurumlar/fitkon.cihazDegisimi[test] = {tarih, not}` (Testler > Cihaz değişiklikleri, yönetici). Raporda değişimden önceki/sonraki ölçümler karşılaştırılmaz (yerine norm), grafik ve rekor yalnızca aynı cihaz dönemi; Test verilerinde uyarı.
- Raporda "Dünya normlarına göre değerlendirme" bölümü; Test verilerinde "Dünya normu" sütunu ve seviye özeti.
- Ödeme: kişi Paket sekmesinde önceki dönemlerden ödenmemiş grup/abonelik kayıtları üstte uyarı + ödeme formunda uyarı. Portal aylık abonelikte ders sayısı göstermez.

## Koçlara göre tahsilat (maaş için)
- Tahsilatlar > "Derse giren koça göre": grup ödemesi → grubun kocIds; diğerleri → kişinin kocIds. Birden fazla koçta her koça tamamı yazılır. Ödemeye `dersKocIds` ödeme anında yazılır (odemeEkle); eski ödemelerde güncel atama kullanılır.
- Maaş tablosunda gösterilmeyecek koçlar: `kurumlar/fitkon.tahsilat.gizliKoclar` (ör. kurucu). Maaş hesabı şimdilik elle.
- Sadece ödeme için tutulan gruplar (ders saati yok) Bugün/Takvim/portal ders listesinde görünmez; dönem kayıtları ve hatırlatmalar sürer — ek ayar gerekmez.
- Yapılan özel dersler (Tahsilatlar): bireysel/düet/trio kayıtları dersleriDagit ile paketlere dağıtılır; ders `dersiVeren` (yoksa `kaydeden`) koça yazılır, değer = paket uygulananFiyat ÷ dersSayisi. Bugün ekranında yönetici bireysel "Antrenmanı tamamla" ve düet/trio yoklamasında "Dersi veren koç" seçer (koçlar kendi adına kaydeder). Gizli koçların dersleri başka koça yazılmaz.
- "Tahsil eden" yalnızca bilgi: koç tablosu ve maaş dökümü tahsil edene göre değişmez.

## Koç ek yetkileri (kullanicilar.ekYetkiler)
- programDuzenle, kisiEkle (kişi yalnızca koça atanır), grupYonet (kendi grubunda üye/saat/süre — sunucu `grupDuzenleKoc` yazar, yalnızca koçun zaten erişebildiği kişiler eklenir, grupKocIds sunucuda eşitlenir), grupOdeme (kendi grubunda dönem kaydı, katılım, döneme dahil değil), ozelFiyat (liste dışı fiyat; işlem geçmişine "liste-disi-fiyat"/"fiyat-degisti"), tahsilatOzeti (Tahsilatlar'da yalnızca kendi satırı).
- İstemci: `yetkili(ben, y)` (src/auth/hesap.js). Kurallar: `yetkisiVar`, `grupKocu`.

## Dönem araçları ve aktarım
- Grup formunda "İlk dönemin başlangıcı" girilince dönem takvimi önizlemesi (DonemTakvimi).
- Ara hafta: `grup.donemAralari = [{tarih, hafta}]` — "tarih" günü başlayacak dönem "hafta" ertelenir, sonrakiler kayar. donemNo/donemBul (istemci paket/model.js, sunucu functions/donem.js) üçüncü parametre olarak alır; ara haftasında sunucu kayıt açmaz. Yalnızca başlamamış dönem ertelenir.
- Geçmiş dönemleri aktar (GrupOdemeleri, yönetici): üye × dönem tablosu (Ödendi: tutar/gerçek ödeme tarihi/yöntem; Ödenmedi; Yoktu). Ödeme notu "Aktarım · N. dönem (tarih aralığı)". Kayıt/ödemelerde `aktarimId`; `grup.aktarimlar` listesinden "geri al" (ödemeler silindi:true, açılan kayıtlar silinir, katılım eski haline).
- Özel ders: kişi Paket sekmesi "Devam eden paketi gir" — `satilanPaketler.oncekiDers` (siteden önce yapılan ders) kullanılan sayısına eklenir (istemci dersleriDagit + sunucu kalanDersler); ödenen tutar gerçek tarihle "Aktarım · devam eden paket" notuyla girilir.

## Düet/trio eksik katılım: tutarla düşme
- Paket tanımında `eksikUcretleri` ({1: tek gelirse ders başı, 2: trio'da iki kişi}) — tanım kaydedilince ücreti olmayan açık satılmış paketlere de kopyalanır; yeni atamada pakete yazılır.
- `tutarli(p)` paketlerde dersleriDagit tutar bazlı: tam katılım = uygulananFiyat/dersSayisi, eksik katılım = eksikUcretleri[gelenSayisi]. Sonuç: kalanTl, kalan (= kalanTl / tam ders ücreti, aşağı), eksikDers; her ders `maliyet` taşır. Sunucu kalanDersler aynı hesap.
- Bu paketlerde fark ücreti sorulmaz (Bugün FarkKutusu, Paket sekmesi eksikler listesi). Tahsilatlar özel ders değeri ders maliyetiyle.
- Gün bazlı koç: `kisiler.gunKoclari` / `gruplar.gunKoclari` = {haftaGünü: kocId} (yönetici, birden fazla koç varsa saat satırında seçilir). Bugün'de yönetici kaydederken "Dersi veren koç" o günün koçuyla gelir; koç kaydederse kendisi.
- Paket atama formu çift tıklamada iki kez kaydetmez. Bakım: `.github/workflows/odeme-sil.yml` tek ödemeyi silindi işaretler; `tani-odeme.yml` kişi/ay bazlı tanı (GitHub günlüğü "{" karakterini *** olarak maskeler — grep'te dikkat).
- Paket kartı: '+ Geçmiş ders gir' (bireysel; tarih, katılım, dersi veren) ve yönetici için 'Siteden önceki dersleri düzelt' (oncekiDers) — aktarım sonrası elle teyitli giriş.
- Aktarılmış pakette (aktarim/aktarimTarihi; eski kayıtlarda olusturma günü) aktarım gününden önceki dersler paketten düşmez (oncekiDers'e dahil), dersler listesinde oncedenSayildi:true ile koç ders dökümüne girer. Sunucu kalanDersler aynı.
- Kişi başlangıç tarihi `kisiler.baslangicTarihi` (yeni kişide bugün): gununKartlari bu tarihten önce kişiyi (bireysel kart ve grup üyeliği) göstermez; grup üyeleri ayrıca uyeKatilim'den önce görünmez.
- Yapılan özel dersler tablosu: tüm kişilerin bireysel/düet/trio kayıtları (paketli: paket maliyeti; abonelik kapsamındaki bireysel: aylikUcret/aylikDers; paketsiz: sayılır, değer 0 ve uyarı). Grup dersleri hariç.
- Bitmiş paket girişi: paket kartında '⇪ Bitmiş paketi gir' (başlangıç + son ders tarihi = bitisTarihi; oncekiDers = dersSayisi). Aralıktaki site kayıtları bu pakete (oncedenSayildi) yazılır, değer koç listesinde; sonraki dersler bir sonraki pakete.

## Veli/öğrenci izolasyonu (Kasım 2026)
- Veli/öğrenci yalnızca `bagliKisiler` listesindeki kişiyi okur (kurallar + `portalVerisi` sunucu kontrolü). Bağlamayı yalnızca yönetici yapar.
- `kurumlar` okuması `aktif` → `ekip` yapıldı (portal bu belgeyi okumaz).
- `test/kurallar.test.mjs` sonunda çapraz erişim testleri: başka çocuğun kartı, tüm alt koleksiyonları, toplu sorgular, ödeme/paket/grup/program, başka hesap, bildirim, kurum ayarı, kendine çocuk bağlama.

## Sadece ödeme grupları (Kasım 2026)
- Grup formunda "Sadece ödeme takibi" (`gruplar.sadeceOdeme`): ders günü/saat, yoklama, program, cimnastik yok; Bugün/Takvim'de kart açılmaz (gunHesap atlar). Koçun "üyeleri ve saatleri düzenle" düğmesi bu gruplarda gizli.
- Üyeler Ödemeler sekmesinden isim + kısa not + (isteğe bağlı) katılım tarihiyle eklenir (yönetici): `kisiler` belgesi `sadeceOdeme: true` ile açılır, gruba eklenir, grupKocIds eşitlenir, şu anki dönem kaydı açılır.
- `kisileriGetir(ben)` bu kişileri varsayılan gizler; Gruplar ve Ödemeler `{ odemeUyeleri: true }` ile ister. Grup üye aramasında da çıkmazlar.
- Tahsilatlarda grup dersi, koç tablosunda grubun koçuna yazılır (normal grup gibi). Üyeler sekmesinde "Tam karta çevir" → `sadeceOdeme: false`.

## Dönem tarihini kaydırma (Kasım 2026)
- `gruplar.donemAralari` artık `[{ no, gun }]`: no. dönem (0'dan) gun gün ertelenir. Eski `{ tarih, hafta }` kayıtları okunur; araç kaydederken `araNormal` ile hepsini no'ya çevirir (önceki bir döneme kaydırma eklenince sonrakiler kaybolmasın). Sunucu `functions/donem.js` aynı hesabı yapar.
- Grup Ödemeler > "⏸ Dönem tarihini kaydır": geçmiş/şu anki/ileri dönem, 1–28 gün. Önizleme: yeni takvim + taşınacak kayıt/ödeme sayısı. Onayda kaymış dönem kayıtları (`satilanPaketler`, kimlik `g_{grup}_{donemBas}_{kisi}`) yeni tarihli kimliğe kopyalanır (`tasimaGecmisi`), ödemelerin `satilanPaketId`'si güncellenir, eski kayıt silinir; ileri kaymada en geç dönemden başlanır. Hedefte başka kayıt varsa hiçbir şey yapılmaz. Kaydırmayı "kaldır" aynı taşımayı tersine yapar.

## Ortaklı gruplar (Kasım 2026)
- `gruplar.ortakPayi` (yüzde, 1–99; yoksa ortaksız). Grup formunda "Ortaklı grup" + "Ortağa giden pay (%)", varsayılan 50.
- Ödemeler tam tutarla kaydedilir (kasaya giren). `bizeKalanTutar(tutar, grup)` (paket/model.js): Tahsilatlar'daki ay toplamı, tür kutuları, 12 aylık grafik, grup tablosu ve grup ödeme özeti yalnızca bize kalanı gösterir, yanında "%50 ortağa" notu. "Tahsil edene göre" ve ödeme listesi tam tutar (elden alınan para).
- "Derse giren koça göre" (maaş) tablosu ortaklı gruplarda bize kalanı yazar; dökümde kasaya giren ayrıca görünür. Oran grup üzerinden okunur (değişirse geçmiş aylar da yeni oranla görünür).

## Bireysel paketten düet/trio dersi (Kasım 2026)
- Bireysel pakette `ozelDersKapsar: true` + `ozelDersUcreti` (ders başı; kişi kartı > Paket > "Düet/trio dersleri de bu paketten düşsün", yönetici). Ücret bireysel ders ücretinden farklıysa paket tutarla düşer (`tutarli`): düet/trio dersi, kendi türünde uygun paket yoksa bu bireysel paketten bireysel ders ücretiyle düşer. Önce kendi türündeki paket aranır. İstemci `paketKapsar` / sunucu `kalanDersler` aynı.
- Örnek: düet başlayıp ortağı ara verdiği için bireysel paket ödeyen öğrenci, ortağı dönünce kalan dersleri aynı paketten devam eder.

## Geçmiş günde kayıtlı grup dersi (Kasım 2026)
- Bugün ekranı, ders günü o gün olmayan (aktif, sadece ödeme olmayan) gruplar için o tarihte üyelerden birinde `antrenmanKayitlari/{tarih}_{grupId}` varsa kartı yine gösterir (`gununKartlari({ kayitliGruplar })`). Ders günü sonradan değişen gruplarda eski dersler düzenlenebilir. Gün geçmişi tutulmaz.
- Grup > "Dersler" sekmesi (src/gruplar/GrupDersleri.jsx): üyelerin `{tarih}_{grupId}` kayıtları tarih tarih listelenir; "Geçmiş ders ekle" (tarih, üye başına katılım, dersi veren koç), "Düzenle / tarihini değiştir" (yeni tarihli kimliğe yazar, eskisini siler), "Sil". Düet/trioda dersTuru, gelenSayisi, grupBoyu yazılır. Yönetici ve grubun koçları düzenler.
