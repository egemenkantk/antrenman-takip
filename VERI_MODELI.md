# Veri Modeli ve Ekran Listesi

> Durum: onaylandı (11 Kasım 2026). Değişiklikler önce Çağla'ya sorulur.
> Teknik altyapı: Firebase Firestore (belge tabanlı veritabanı).
> Her kayıtta görünmez bir `kurumId` alanı vardır (şimdilik hep "fitkon").

---

## Bölüm 1 — Veri modeli

Aşağıdaki her başlık bir "tablo" gibi düşünülebilir. Parantez içindeki aşama numarası, o tablonun yol haritasında hangi aşamada devreye gireceğini gösterir.

### 1.1 Kurum ve kullanıcılar

**kurumlar** (Aşama 1)
| Alan | Açıklama |
|---|---|
| ad, logo, renkler | Fitkon'un görünümü; isim değişirse buradan değişir |
| haftalikSaatler | Gün gün varsayılan ders/antrenman saatleri |
| bildirimAyarlari | Hangi otomatik bildirimin açık olduğu |

**salonlar** (Aşama 1) — Fitkon'un iki salonu
| Alan | Açıklama |
|---|---|
| ad, adres | |
| haftalikSaatler | Salonun ders saatleri |

> Gruplar, seanslar ve paket tanımları bir salona bağlıdır. Fiyatlar salona göre farklı olabilir.

**kullanicilar** — siteye giriş yapan herkes (Aşama 1)
| Alan | Açıklama |
|---|---|
| telefon | Giriş için; benzersiz |
| ad | |
| rol | yonetici / koc / ogrenci / veli |
| ekYetkiler | Koça tek tek açılan yetkiler (örn. program düzenleme) |
| bagliKisiler | Öğrenci: kendi kişi kaydı. Veli: çocuklarının kişi kayıtları |
| veliOnayi | Reşit olmayan öğrencinin kendi hesabı için: onay veren veli ve tarih |
| aktif | Pasife alınan kullanıcı giriş yapamaz |

> Not: "Kullanıcı" ile "kişi" ayrı tutulur. Kişi = takip edilen sporcu/danışan. Kullanıcı = siteye giren hesap.
> Böylece bir sporcunun hesabı olmadan velisi giriş yapabilir; bir veli tek hesapla iki çocuğunu görür.
> Yaş sınırı yok: telefonu olan reşit olmayan sporcu, aile onayıyla kendi hesabını alabilir.

### 1.2 Kişiler (sporcu ve danışan)

**kisiler** (Aşama 1, danışan alanları Aşama 2)
| Alan | Açıklama |
|---|---|
| tip | sporcu / danisan |
| ad, dogumTarihi, cinsiyet, foto, telefon | |
| kocIds | Atanmış koçlar (birden fazla olabilir) |
| grupIds | Üye olduğu gruplar |
| brans | Sporcular için (tenis, kayak, basketbol, karting, futbol, voleybol…) |
| hedef | Danışanlar için (masa başı, ileri yaş, kilo verme, ağrı yönetimi) |
| saglikTaramasi | PAR-Q+ cevapları, doktor onayı gerekli mi (Aşama 2) |
| yasamTarzi | Meslek, oturma süresi, adım, uyku (Aşama 2) |
| saglikNotlari | Kronik durum, ilaç, alerji — yalnızca yönetici ve atanmış koç |
| aktif | Ayrılan kişi silinmez, pasife alınır |

Her kişinin altında kendine ait kayıtlar:

| Alt tablo | İçerik | Aşama |
|---|---|---|
| testSonuclari | Test adı, tarih, değer(ler), sağ/sol, kaynak (elle / Performanz) | 1 |
| posturDegerlendirmeleri | Tarih, bulgular, notlar, fotoğraf | 1 |
| wellness | Tarih, uyku, yorgunluk, ağrı/kas ağrısı, stres, ruh hali, 0-10 ağrı skoru | 1 |
| sakatliklar | Bölge, taraf, tarih, tanı, takip eden uzman, belgeler, mevcut aşama | 4 |
| sakatliklar → fizyoGorusmeleri | Tarih, ne söylendi, verilen kısıtlar, sonraki kontrol | 4 |
| sakatliklar → asamaGecisleri | Hangi aşamaya, tarih, onay kimden alındı | 4 |
| raporlar | Oluşturulan veli/danışan raporlarının kaydı | 1 |

### 1.3 Gruplar ve program

**gruplar** (Aşama 1)
| Alan | Açıklama |
|---|---|
| ad, salonId, uyeIds, kocIds | |
| haftalikSaatler | Grubun ders günleri ve saatleri |
| aktifProgramId | Grubun ortak programı |

**grupDonemleri** — grup dersleri 4 haftalık dönemlerle ilerler (Aşama 2)
| Alan | Açıklama |
|---|---|
| grupId | |
| baslangic, bitis | 4 hafta; bir dönem bitince sıradaki otomatik açılır |
| durum | aktif / bitti |

> Grup dersine gelinmese de dönem ücreti aynıdır; gelinmeyen dersler aktarılmaz.
> Grubun gün/saati toplu olarak değişebilir: değişiklik gruba bir kez girilir, sonraki seanslar güncellenir ve gruptaki tüm velilere/öğrencilere bildirim gider.

**programlar** — bloklar (Aşama 1)
| Alan | Açıklama |
|---|---|
| sahip | Bir kişi ya da bir grup |
| faz | Sporcu: genel/özel/müsabaka… Danışan: adaptasyon/temel/ilerleme |
| baslangic, bitis | |
| gunler | A/B/C günleri; her gün için seçili bölümler ve sırası |
| egzersizler | Egzersiz, set/tekrar/yük/RPE hedefi, haftalık ilerleme |
| evProgrami | Öğrencinin evde yapacakları (Aşama 3'te öğrenciye görünür) |
| sablondanMi | Hangi şablondan türetildiği |

### 1.4 Takvim ve dersler

**seanslar** — her tek ders/antrenman (Aşama 1)
| Alan | Açıklama |
|---|---|
| tarih, saat, salonId | |
| kisiId veya grupId | |
| ders turu | grup / bireysel (paketten düşerken eşleşir) |
| kocId | Dersi alan koç; "yerine bakma"da değişir, asıl koç da saklanır |
| durum | planlandi / yapildi / ertelendi / iptal / gelmedi |
| derstenDustuMu | Yönetici kararı (özellikle "gelmedi" ve geç iptal için) |
| yeniTarih | Ertelenen dersin yeni zamanı |
| gunOzelDegisiklik | Bugüne özel program değişikliği (mevcut özellik) |
| katilim | Grup dersinde kim geldi; kişi başı RPE, ağrı skoru, not |
| koçNotu | Ders sonu notu |

> Seanslar haftalık saatlerden otomatik üretilir; tek tek elle de eklenebilir.

### 1.5 Paket ve ödeme (Aşama 2)

**paketTanimlari** — satılan paket türleri
| Alan | Açıklama |
|---|---|
| ad | Örn. "Bireysel 8 ders – sporcu" |
| salonId | Hangi salonda geçerli |
| tur | grup (dönem bazlı) / bireysel (ders sayılı) |
| kitle | sporcu / yetişkin danışan (PT) |
| dersSayisi | Yalnızca bireysel/PT paketlerde; süre sınırı yok, dersler bitince biter |
| fiyat | Bireysel: paket fiyatı. Grup: 4 haftalık dönem ücreti |
| aktif | Satıştan kaldırılan paket listede görünmez, eski satışlar bozulmaz |

**satilanPaketler** — bir kişiye atanmış paket
| Alan | Açıklama |
|---|---|
| kisiId, paketTanimId | |
| listeFiyati | Paket tanımındaki fiyatın satış anındaki kopyası; öğrenci/veli GÖRMEZ |
| uygulananFiyat | Kişiye özel fiyat; varsayılan liste fiyatı, yalnızca yönetici değiştirir |
| fiyatNotu | İsteğe bağlı neden (kardeş, hediye ders vb.); öğrenci/veli görmez |
| baslangic | Satış/başlangıç tarihi (bitiş tarihi yok) |
| durum | aktif / sirada / bitti |
| toplamDers | |
| kullanilanDers | Seanslardan otomatik hesaplanır, elle girilmez |
| satanKocId | |

**odemeler**
| Alan | Açıklama |
|---|---|
| satilanPaketId, kisiId | |
| tutar, tarih, yontem | nakit / havale / kart |
| tahsilEdenKocId | Kaydı giren koç, otomatik |
| duzeltmeGecmisi | Her düzeltmede eski değer, kim, ne zaman |
| silindi | Yalnızca yönetici "siler"; kayıt gizlenir ama iz kalır |

> Kalan tutar = uygulanan fiyat − ödemeler toplamı (otomatik).
> Bir kişide aynı anda birden fazla paket olabilir (örn. grup + bireysel, ya da bitmeden alınan yenisi).
> Ders düşerken (bireysel): ders türüne uyan paketlerden en eski aktif olandan düşer; o biterse sıradaki devreye girer.
> Grup öğrencisi: her dönem için bir kayıt açılır (grupDonemId); ödeme o döneme işlenir. Ders sayısı düşülmez.

### 1.6 Bildirimler (Aşama 2)

**bildirimler**
| Alan | Açıklama |
|---|---|
| aliciKullaniciId | |
| tip | paket azaldı (son 2 ders) / grup dönemi ödemesi / grup saati değişti / ders iptal / yeni test / ödeme kaydedildi / fizyo kontrol / … |
| metin, baglanti | Tıklayınca ilgili sayfaya gider |
| okundu, tarih | |

### 1.7 Kütüphaneler (Aşama 1 temel, Aşama 4 genişler)

| Tablo | İçerik |
|---|---|
| egzersizler | Ad, bölüm (Core, Denge…), video/görsel, ipuçları, sakatlıkta kaçınılacak durumlar |
| programSablonlari | Kişi tipi/hedef/branşa göre hazır programlar |
| testTanimlari | Test adı, birim, sağ/sol var mı, hangi kişi tipi/branş/hedef için, norm aralıkları |
| branslar | Ana kaslar, kas çalışma şekli, enerji sistemleri, riskler, öncelikli testler, sezon yapısı, kaynaklar (Aşama 4) |
| sakatlikTipleri | Aşamalar, geçiş kriterleri, kaçınılacaklar, koçun yapacakları, kaynaklar (Aşama 4) |

### 1.8 İz kaydı

**islemGecmisi** — önemli işlemlerin kaydı: kim, ne zaman, ne yaptı (ödeme düzeltme, yetki değişikliği, kişi silme/pasife alma, sakatlık aşama geçişi).

---

## Bölüm 2 — Kim neyi görür / değiştirir

| Veri | Yönetici | Koç | Öğrenci / danışan | Veli |
|---|---|---|---|---|
| Kişi kartı | Hepsi | Atandığı kişiler | Kendisi (sınırlı) | Çocukları (sınırlı) |
| Sağlık notları, sakatlık detayı | Okur/yazar | Atandığı kişiler | Sadece aşama ve yapılacaklar | Sadece aşama ve yapılacaklar |
| Koç iç notları | Okur/yazar | Atandığı kişiler | Görmez | Görmez |
| Program | Okur/yazar | Okur; yetkisi varsa yazar | Kendi programı ve ev egzersizleri | Çocuğunun |
| Yoklama, RPE | Okur/yazar | Atandığı kişiler/gruplar | Kendi geçmişi | Çocuğunun |
| Wellness | Okur/yazar | Atandığı kişiler; eksikse salonda doldurur | Kendi telefonundan doldurur, geçmişini görür | Çocuğunun geçmişi |
| Testler | Okur/yazar | Atandığı kişiler | Kendi sonuçları | Çocuğunun |
| Paket ve ödeme | Hepsi; kişiye özel fiyatı yalnızca o değiştirir | Atandığı kişiler; ödeme kaydeder, düzeltir; fiyatı değiştiremez | Kendi fiyatı ve durumu (liste fiyatını görmez) | Çocuğunun (liste fiyatını görmez) |
| Ödeme silme | Evet | Hayır | Hayır | Hayır |
| Kütüphaneler | Okur/yazar | Okur | Ev egzersizi videoları | Ev egzersizi videoları |
| Kullanıcılar, ayarlar | Evet | Hayır | Hayır | Hayır |

---

## Bölüm 3 — Ekran listesi

### Ortak (Aşama 1)
1. **Giriş** — telefon + şifre, "beni hatırla"
2. **İlk giriş** — SMS kodu → şifre belirleme
3. **Şifremi unuttum** — SMS kodu → yeni şifre

### Yönetici
| # | Ekran | İçerik | Aşama |
|---|---|---|---|
| 4 | Bugün | Salon seçimi, saat saat dersler, uyarılar (wellness, sakatlık, paket azaldı), hızlı yoklama ve wellness girişi | 1 |
| 5 | Kişiler | Liste, filtre (tip, branş, hedef, koç, grup, aktif/pasif), arama | 1 |
| 6 | Kişi kartı | Sekmeler: Özet · Program · Kayıtlar · Testler · Postür · Sağlık/Sakatlık · Paket ve Ödeme · Raporlar | 1 (Sakatlık 4, Paket 2) |
| 7 | Gruplar | Grup listesi, üyeler, ortak program, birleşik yoklama | 1 |
| 8 | Takvim | Haftalık/aylık görünüm, erteleme/iptal/yerine bakma | 1 |
| 9 | Test günü modu | Test seç → kişileri sırayla gir | 1 |
| 10 | Paketler | Paket tanımları (salon/tür/kitle), satılan paketler, azalan paketler | 2 |
| 11 | Ödemeler | Tüm ödemeler, koça/tarihe göre filtre, kalan alacaklar | 2 |
| 12 | Koçlar ve kullanıcılar | Hesap açma, rol ve ek yetkiler, pasife alma | 1 |
| 13 | Kütüphaneler | Egzersiz, şablon, test, branş, sakatlık | 1 → 4 |
| 14 | Özetler | Koç bazında devam/gelişim, aylık tahsilat | 2 |
| 15 | Ayarlar | Logo, renkler, salonlar ve saatleri, bildirim ayarları | 1 |
| 16 | Bildirimler | | 2 |

### Koç
Yöneticinin 4–9. ekranları, yalnızca kendi kişi ve gruplarıyla; 10–11'in kendi öğrencileriyle sınırlı hali; kütüphaneler (okuma); bildirimler.
Ek olarak: **Yerine bakılan dersler** (geçici devredilen dersler Bugün ekranında ayrı işaretli).

### Öğrenci / danışan (Aşama 3)
| # | Ekran | İçerik |
|---|---|---|
| 17 | Ana sayfa | Sıradaki ders, kalan ders, ders günü "Bugünkü formunu doldur" kartı, önemli bildirimler |
| 20 | Bugünkü formum | Wellness formu (kendi hesabı olan öğrenci ve yetişkin danışan) |
| 18 | Takvimim | Ders günleri ve saatleri, iptal/erteleme bilgisi |
| 19 | Programım | Ev egzersizleri (video), "yaptım" işareti |
| 21 | Gelişimim | Test sonuçları, grafikler, başlangıç–şimdi karşılaştırması |
| 22 | Paket ve ödemelerim | Aktif paket, ödenen/kalan, geçmiş |
| 23 | Raporlarım | PDF raporlar |
| 24 | Bildirimler | |

### Veli (Aşama 3)
Öğrenci ekranlarının aynısı + üstte **çocuk seçici** (birden fazla çocuk varsa).

---

## Bölüm 4 — Alınan kararlar

1. **Öğrenci hesabı:** Yaş sınırı yok. Telefonu olan reşit olmayan sporcu, aile onayıyla kendi hesabını kullanabilir; onay kaydı tutulur.
2. **Paketler:** Grup ve bireysel paketler ayrı. Fiyat salona (iki salon) ve kitleye (sporcu / yetişkin PT danışanı) göre değişir.
3. **Birden fazla aktif paket:** Olabilir. Ders, türüne uyan en eski aktif paketten düşer.
4. **Wellness:** Kendi hesabı olan öğrenci ve yetişkin danışan kendi telefonundan doldurur; hesabı olmayan ya da unutan için koç salonda doldurur. Kimin doldurduğu kaydedilir. Veli doldurmaz, geçmişi görür.
5. **Ayrılan kişi:** Pasife alınır, silinmez. (Not: KVKK kapsamında kişi verilerinin silinmesini açıkça talep ederse yönetici kalıcı silme yapabilmelidir; bu sadece talep halinde.)
6. **Paket süresi yok (bireysel/PT):** Geçerlilik süresi/bitiş tarihi tutulmaz; paket dersler bitince biter.
8. **Grup dersleri 4 haftalık dönemler:** Ödeme döneme bağlı; derse gelinmese de ücret aynı, aktarım yok. Dönemin son günü gruptaki tüm velilere ödeme hatırlatması ve yöneticiye özet (kim ödedi/ödemedi) gider. İkinci hatırlatma yok. Veliler birbirini ve diğer çocukları görmez.
9. **Toplu saat değişikliği:** Grubun gün/saati toplu değişebilir; gruptaki herkese bildirim gider.
7. **Kişiye özel fiyat:** Paket atanırken liste fiyatı gelir; yalnızca yönetici değiştirebilir. Öğrenci ve veli liste fiyatını hiçbir yerde görmez, sadece kendi fiyatını ve kalan tutarı görür.
