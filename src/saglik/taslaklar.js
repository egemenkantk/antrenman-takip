// Sakatlık ve branş kütüphanesi için başlangıç taslakları.
// Bunlar koçun antrenman tarafını düzenlemesine yardım eden genel çerçevelerdir; tanı ve tedavi değildir.
// Kişinin fizyoterapistinin/hekiminin talimatı her zaman önce gelir. İçerik son kontrolü yöneticidedir.
// Kalıp kodları: kutuphane/veri.js → KALIPLAR

export const ASAMA_ADLARI = ['Koruma', 'Kuvvet ve hareket açıklığı', 'Sahaya dönüş hazırlığı', 'Performansa dönüş'];

const a = (ad, hedefler, kriterler, kacinilacaklar, kacinilacakKaliplar, koc) => ({
  ad,
  hedefler,
  kriterler,
  kacinilacaklar,
  kacinilacakKaliplar,
  koc,
});

export const SAKATLIK_TASLAKLARI = [
  {
    kod: 'on-capraz-bag',
    ad: 'Ön çapraz bağ (ÖÇB) — ameliyat sonrası',
    bolge: 'Diz',
    aciklama:
      'Ameliyat sonrası süreç cerrah ve fizyoterapistin protokolüyle yürür. Aşama geçişi takvime göre değil, kriterlere göre yapılır; süre tek başına ölçüt değildir.',
    testler: ['Tek ayak CMJ (cm)', 'Denge (puan)', '505 çeviklik (sn)'],
    asamalar: [
      a(
        'Koruma',
        ['Şişliği kontrol altında tutmak', 'Tam diz düzlüğüne (ekstansiyon) ulaşmak', 'Ön uyluk (quadriseps) aktivasyonu', 'Topallamadan yürümek'],
        ['Şişlik çok az', 'Tam diz düzlüğü var', 'Düz bacak kaldırırken diz bükülmüyor', 'Destek almadan normal yürüyüş', 'Fizyoterapist onayı'],
        ['Sıçrama ve iniş', 'Koşu, sprint, yön değişimi', 'Fizyoterapistin izin vermediği yüklü diz egzersizleri'],
        ['sicrama', 'sprint'],
        ['Üst vücut, gövde ve sağlam bacak antrenmanı', 'Fizyoterapistin verdiği ev egzersizlerine eşlik', 'Bisiklet/kardiyo yalnızca fizyoterapist izin verdiyse']
      ),
      a(
        'Kuvvet ve hareket açıklığı',
        ['Tam hareket açıklığı', 'Ön ve arka uyluk kuvveti', 'Tek bacak kontrolü ve denge'],
        ['Şişlik yok, ağrı ≤ 2/10', 'Tam hareket açıklığı', 'Ön uyluk kuvveti sağlam bacağın yaklaşık %70–80’i', 'Tek bacak squat’ta diz içe kaçmıyor', 'Koşuya başlamak için fizyoterapist onayı'],
        ['Sıçrama ve iniş', 'Ani yön değişimi ve reaktif çeviklik'],
        ['sicrama', 'sprint'],
        ['Kademeli squat, kalça menteşe, tek bacak kuvveti', 'Denge çalışmaları', 'Her derste ağrı ve şişliği sor']
      ),
      a(
        'Sahaya dönüş hazırlığı',
        ['Koşu progresyonu', 'Çift bacaktan tek bacağa sıçrama-iniş', 'Planlı yön değişimi'],
        ['Ön ve arka uyluk kuvveti simetrisi ≥ %90', 'Tek ayak sıçrama testlerinde simetri ≥ %90', 'Ağrı ve şişlik yok', 'Sporcu kendini hazır hissediyor', 'Cerrah ve fizyoterapist onayı'],
        ['Temaslı ve kontrolsüz reaktif çalışmalar', 'Maç'],
        [],
        ['İniş tekniği (diz-ayak hizası)', 'Kademeli çeviklik', 'Sakatlık öncesi test değerleriyle karşılaştırma']
      ),
      a(
        'Performansa dönüş',
        ['Branşa özgü tam antrenman', 'Yeniden sakatlanmayı önleme'],
        ['Takımla tam antrenmanı ağrısız tamamlıyor', 'Test değerleri sakatlık öncesi seviyede'],
        [],
        [],
        ['Önleme programına (ısınmada nöromüsküler çalışma) devam', 'Yük artışını kademeli yap']
      ),
    ],
    kaynaklar: [
      { ad: 'van Melick N. ve ark. (2016) ACL rehabilitasyonu klinik rehberi, Br J Sports Med 50:1506', url: 'https://bjsm.bmj.com/content/50/24/1506' },
      { ad: 'Ardern C. ve ark. (2016) Spora dönüş uzlaşı bildirgesi (Bern), Br J Sports Med 50:853', url: 'https://research.regionh.dk/en/publications/2016-consensus-statement-on-return-to-sport-from-the-first-world-/' },
    ],
  },
  {
    kod: 'ayak-bilegi-burkulmasi',
    ad: 'Ayak bileği burkulması (dış bağlar)',
    bolge: 'Ayak bileği',
    aciklama:
      'Kırık şüphesi (kemiğe basınca ağrı, basamama) varsa önce hekim. Egzersiz tedavisi ve fonksiyonel destek (bant/ateli) öne çıkar; tam istirahat önerilmez.',
    testler: ['Denge (puan)', 'Tek ayak CMJ (cm)', '505 çeviklik (sn)'],
    asamalar: [
      a(
        'Koruma',
        ['Şişliği azaltmak', 'Tolere edildiği kadar yük vermek', 'Ağrısız hareket'],
        ['Ağrısız yürüyüş', 'Şişlik belirgin azalmış'],
        ['Sıçrama', 'Koşu ve yön değişimi'],
        ['sicrama', 'sprint'],
        ['Üst vücut ve gövde', 'Ağrısız ayak bileği hareketleri', 'Destek (bant/ateli) fizyoterapistin önerisine göre']
      ),
      a(
        'Kuvvet ve hareket açıklığı',
        ['Ayak bileği yukarı bükme (dorsifleksiyon) açıklığı', 'Baldır ve dış bacak (peroneal) kuvveti', 'Tek bacak denge'],
        ['Dorsifleksiyon (diz-duvar) iki tarafta benzer', '30 sn tek bacak denge', 'Tek bacak parmak ucu kalkışında simetri'],
        ['Yüksek şiddette sıçrama', 'Ani yön değişimi'],
        ['sicrama'],
        ['Denge çalışmaları (sert zemin → yumuşak zemin)', 'Baldır ve kalça kuvveti']
      ),
      a(
        'Sahaya dönüş hazırlığı',
        ['Sıçrama-iniş', 'Yön değişimi', 'Reaktif denge'],
        ['Tek ayak sıçrama testlerinde simetri ≥ %90', 'Denge testinde simetri', 'Ağrısız çeviklik'],
        ['Maç'],
        [],
        ['Kademeli pliometri', 'Planlıdan reaktife çeviklik']
      ),
      a(
        'Performansa dönüş',
        ['Tam antrenman', 'Tekrar burkulmayı önleme'],
        ['Tam antrenmanı ağrısız tamamlıyor'],
        [],
        [],
        ['Denge/propriosepsiyon çalışmasına aylarca devam', 'Destek kullanımı fizyoterapistle konuşulur']
      ),
    ],
    kaynaklar: [
      { ad: 'Vuurberg G. ve ark. (2018) Ayak bileği burkulması tanı, tedavi ve önleme rehberi, Br J Sports Med 52:956', url: 'https://pubmed.ncbi.nlm.nih.gov/29514819/' },
    ],
  },
  {
    kod: 'hamstring',
    ad: 'Arka uyluk (hamstring) zorlanması',
    bolge: 'Uyluk',
    aciklama:
      'Sprint sırasında oluşan ve uzama sırasında oluşan zorlanmalar farklı seyreder. Kas uzunken yük veren egzersizler (ör. Askling L-protokolü) dönüş süresini kısaltabilir.',
    testler: ['10 m sürat (sn)', '20 m sürat (sn)'],
    asamalar: [
      a(
        'Koruma',
        ['Ağrısız yürüyüş', 'Ağrısız izometrik kasılma'],
        ['Ağrısız yürüyüş ve hafif tempolu hareket', 'Ağrısız izometrik arka uyluk kasılması'],
        ['Sprint ve hızlı koşu', 'Ağır kalça menteşe (deadlift vb.)', 'Zorlayıcı germe'],
        ['sprint', 'mentese', 'sicrama'],
        ['Üst vücut, gövde ve sağlam bacak', 'Ağrısız izometrikler']
      ),
      a(
        'Kuvvet ve hareket açıklığı',
        ['Kası uzunken yükleme (L-protokolü: extender, diver, glider)', 'Kalça ve gövde kontrolü'],
        ['Ağrısız tam hareket açıklığı', 'Arka uyluk kuvveti sağlam tarafa yakın'],
        ['Maksimal sprint'],
        ['sprint'],
        ['Kademeli kalça menteşe', 'Tempolu koşu (%50–70) fizyoterapist onayıyla']
      ),
      a(
        'Sahaya dönüş hazırlığı',
        ['Koşu hızı progresyonu (%70 → %90)', 'Eksantrik kuvvet (Nordic vb.)'],
        ['%90+ hızda ağrısız sprint', 'Esneme sırasında güvensizlik hissi yok', 'Kuvvet simetrisi ≥ %90'],
        ['Maç'],
        [],
        ['Sprint mekaniği', 'Yön değişimi', 'Sprint sürelerini sakatlık öncesiyle karşılaştır']
      ),
      a(
        'Performansa dönüş',
        ['Maksimal sprint ve tam antrenman', 'Tekrarı önleme'],
        ['Tam antrenmanı ağrısız tamamlıyor'],
        [],
        [],
        ['Haftada 1–2 eksantrik arka uyluk çalışmasıyla bakım']
      ),
    ],
    kaynaklar: [
      { ad: 'Askling C. ve ark. (2013) Akut hamstring sakatlıklarında iki rehabilitasyon protokolü, Br J Sports Med 47:953', url: 'https://bjsm.bmj.com/content/47/15/953' },
      { ad: 'Ardern C. ve ark. (2016) Spora dönüş uzlaşı bildirgesi (Bern), Br J Sports Med 50:853', url: 'https://research.regionh.dk/en/publications/2016-consensus-statement-on-return-to-sport-from-the-first-world-/' },
    ],
  },
  {
    kod: 'patellar-tendinopati',
    ad: 'Patellar tendinopati (atlayıcı dizi)',
    bolge: 'Diz',
    aciklama:
      'Tam dinlenme yerine ağrı izlenerek kademeli tendon yüklemesi önerilir. Egzersiz sırasında ağrı ≤ 3/10 kabul edilebilir; ertesi sabah ağrı artmamalı.',
    testler: ['CMJ (cm)', 'Tek ayak CMJ (cm)', 'Drop jump RSI'],
    asamalar: [
      a(
        'Koruma',
        ['Ağrıyı azaltmak (izometrik yükleme)', 'Yükü düzenlemek'],
        ['İzometriklerde ağrı ≤ 3/10', 'Ertesi gün ağrı artmıyor'],
        ['Sıçrama ve iniş', 'Ağrıyı belirgin artıran derin squat'],
        ['sicrama'],
        ['Ağrı izleyerek izometrik bacak itişi/duvar oturuşu', 'Üst vücut ve gövde']
      ),
      a(
        'Kuvvet ve hareket açıklığı',
        ['Yavaş ve ağır izotonik yükleme (squat, bacak itiş)', 'Kalça ve baldır kuvveti'],
        ['Tek bacak yüklemede ağrı ≤ 3/10', 'Kuvvet sağlam tarafa yakın'],
        ['Yüksek şiddette sıçrama'],
        ['sicrama'],
        ['Tempoyu yavaş tut (3 sn iniş, 3 sn kalkış)', 'Ağrıyı her derste kaydet']
      ),
      a(
        'Sahaya dönüş hazırlığı',
        ['Enerji depolama: kademeli pliometri', 'Branşa özgü sıçrama ve iniş'],
        ['Pliometride ağrı ≤ 3/10 ve ertesi gün artmıyor', 'Sıçrama değerleri sakatlık öncesine yakın'],
        ['Ani yük artışı'],
        [],
        ['Sıçrama sayısını kademeli artır', 'Haftalık sıçrama yükünü takip et']
      ),
      a(
        'Performansa dönüş',
        ['Tam antrenman ve maç', 'Tendon sağlığını korumak'],
        ['Tam antrenmanı ağrı artışı olmadan tamamlıyor'],
        [],
        [],
        ['Haftada 2 ağır tendon yüklemesiyle bakım', 'Yoğun dönemlerde sıçrama yükünü dengele']
      ),
    ],
    kaynaklar: [
      { ad: 'Breda S. ve ark. (2021) Patellar tendinopatide kademeli tendon yükleme, Br J Sports Med 55:501', url: 'https://bjsm.bmj.com/content/early/2020/12/23/bjsports-2020-103403' },
    ],
  },
  {
    kod: 'omuz',
    ad: 'Omuz ağrısı (aşırı kullanım, sıkışma, kürek kemiği kontrolü)',
    bolge: 'Omuz',
    aciklama:
      'Çıkık ya da ameliyat sonrası süreç farklıdır ve fizyoterapist protokolüyle yürür. Baş üstü sporcularda (tenis, voleybol) kürek kemiği kontrolü ve rotator manşet kuvveti öne çıkar.',
    testler: ['Kavrama kuvveti (kg)'],
    asamalar: [
      a(
        'Koruma',
        ['Ağrıyı artıran baş üstü yükten kaçınmak', 'Kürek kemiği kontrolü', 'Ağrısız izometrik rotator manşet'],
        ['Günlük hareketlerde ağrı yok', 'Ağrısız izometrikler'],
        ['Baş üstü itme ve ağrıyı artıran itme hareketleri', 'Servis/smaç/atış'],
        ['itme'],
        ['Alt vücut ve gövde antrenmanı', 'Kürek kemiği çalışmaları (fizyoterapist önerisiyle)']
      ),
      a(
        'Kuvvet ve hareket açıklığı',
        ['Dış rotasyon ve kürek kemiği kasları kuvveti (alt trapez, serratus)', 'Hareket açıklığı (iç rotasyon kaybı varsa arka kapsül)'],
        ['Ağrısız tam hareket açıklığı', 'Dış/iç rotasyon kuvvet dengesi fizyoterapistin hedefinde'],
        ['Ağır baş üstü itme', 'Maksimal atış/servis'],
        ['itme'],
        ['Lastikle dış rotasyon, çekme hareketleri', 'Kinetik zincir: kalça ve gövde']
      ),
      a(
        'Sahaya dönüş hazırlığı',
        ['Üst vücut pliometrisi', 'Aralıklı atış/servis programı'],
        ['Aralıklı programı ağrısız tamamlıyor', 'Kuvvet simetrisi uygun'],
        ['Maç yükünde servis/smaç'],
        [],
        ['Top atma progresyonu', 'Atış/servis sayısını kaydet']
      ),
      a(
        'Performansa dönüş',
        ['Tam antrenman ve maç'],
        ['Tam antrenmanı ağrısız tamamlıyor'],
        [],
        [],
        ['Haftada 2–3 rotator manşet ve kürek kemiği bakım çalışması']
      ),
    ],
    kaynaklar: [
      { ad: 'Cools A. ve ark. (2014) Kürek kemiği diskinezisinde rehabilitasyon, Br J Sports Med 48:692', url: 'https://pubmed.ncbi.nlm.nih.gov/23687006/' },
      { ad: 'Ardern C. ve ark. (2016) Spora dönüş uzlaşı bildirgesi (Bern), Br J Sports Med 50:853', url: 'https://research.regionh.dk/en/publications/2016-consensus-statement-on-return-to-sport-from-the-first-world-/' },
    ],
  },
  {
    kod: 'bel-agrisi',
    ad: 'Bel ağrısı (özgül olmayan)',
    bolge: 'Bel',
    aciklama:
      'Bacağa yayılan uyuşma/güç kaybı, idrar ya da dışkı kontrolünde sorun, gece geçmeyen ağrı, ateş ya da düşme sonrası ağrı varsa antrenmanı durdur ve hekime yönlendir. Diğer durumlarda yatak istirahati değil, aktif kalmak ve egzersiz önerilir.',
    testler: ['Otur-uzan (cm)'],
    asamalar: [
      a(
        'Koruma',
        ['Ağrıyı sakinleştirmek', 'Aktif kalmak'],
        ['Günlük hareketlerde ağrı azalmış', 'Kırmızı bayrak yok'],
        ['Ağrıyı belirgin artıran ağır kalça menteşe ve yüklü öne eğilme', 'Sıçrama'],
        ['mentese', 'sicrama'],
        ['Yürüyüş, hafif kardiyo', 'Ağrısız gövde ve kalça hareketleri']
      ),
      a(
        'Kuvvet ve hareket açıklığı',
        ['Kademeli yükleme', 'Gövde ve kalça kuvveti', 'Hareket güveni'],
        ['Ağrı ≤ 3/10 ve ertesi gün artmıyor', 'Temel hareketlerde güven'],
        ['Ağır ve hızlı yüklü öne eğilme'],
        [],
        ['Kalça menteşeyi hafif başlat, tekniği önceliklendir', 'Gövde dayanıklılığı']
      ),
      a(
        'Sahaya dönüş hazırlığı',
        ['Branşa özgü rotasyon, sıçrama ve iniş'],
        ['Branş hareketlerinde ağrı yok ya da hafif ve artmıyor'],
        [],
        [],
        ['Rotasyon ve sıçrama yükünü kademeli artır']
      ),
      a(
        'Performansa dönüş',
        ['Tam antrenman'],
        ['Tam antrenmanı ağrı artışı olmadan tamamlıyor'],
        [],
        [],
        ['Gövde ve kalça kuvvetiyle bakım']
      ),
    ],
    kaynaklar: [
      { ad: 'NICE NG59 (2016) Bel ağrısı ve siyatik: değerlendirme ve yönetim', url: 'https://www.nice.org.uk/guidance/ng59' },
    ],
  },
];

// ---------- Branş profilleri ----------
export const BRANS_TASLAKLARI = [
  {
    ad: 'Kayak',
    anaKaslar: 'Ön ve arka uyluk, kalça (özellikle orta kalça), gövde, baldır',
    kasCalismaSekli:
      'Dönüşlerde uzun süreli izometrik ve eksantrik kasılma (dizler bükülü pozisyonda), sürekli denge düzeltmeleri; hız disiplinlerinde yüksek kuvvet altında uzun süre pozisyon koruma.',
    enerjiSistemleri: 'Bir iniş genellikle 40 sn – 2,5 dk: anaerobik glikolitik ağırlıklı, aerobik kapasite toparlanma ve günlük çok iniş için önemli.',
    sikSakatliklar: 'Ön çapraz bağ ve diz bağları, omuz (düşme), bel',
    oncelikliTestler: ['CMJ (cm)', 'Bosco skoru (cm)', 'Bosco · yorgunluk indeksi (%)', 'Denge (puan)', 'Squat 1RM (kg)'],
    sezonYapisi: 'Kış yarış sezonu; yaz-sonbahar hazırlık (kuvvet ve kapasite), sezon içi bakım kuvveti.',
    oncelikler:
      'Maksimal ve eksantrik bacak kuvveti, izometrik dayanıklılık (dizler bükülü), tekrarlı sıçrama dayanıklılığı (Bosco), tek bacak denge ve iniş kontrolü, gövde.',
    yasNotlari: '',
    kaynaklar: [
      { ad: 'Turnbull J. ve ark. (2009) Alp disiplini kayağın fizyolojisi, Scand J Med Sci Sports', url: 'https://research.bond.edu.au/en/publications/physiology-of-alpine-skiing/' },
      { ad: 'Hydren J. ve ark. (2013) Alp disiplini kayak yarışı için kuvvet ve kondisyon, Strength Cond J', url: 'https://www.bisp-surf.de/Record/PU201304003003' },
    ],
  },
  {
    ad: 'Basketbol',
    anaKaslar: 'Kalça, ön ve arka uyluk, baldır, gövde, omuz',
    kasCalismaSekli: 'Tekrarlı sıçrama-iniş, ani hızlanma-yavaşlama ve yön değişimi; yüksek eksantrik yük.',
    enerjiSistemleri: 'Aralıklı: kısa yüksek şiddetli eforlar (fosfojen, glikolitik) ve aralarda aerobik toparlanma.',
    sikSakatliklar: 'Ayak bileği burkulması, diz (patellar tendinopati, ön çapraz bağ), parmak',
    oncelikliTestler: ['CMJ (cm)', 'Drop jump RSI', '10 m sürat (sn)', '505 çeviklik (sn)', 'T-test (sn)', 'Yo-Yo IR1 (m)'],
    sezonYapisi: 'Sonbahar-bahar lig sezonu; yaz hazırlık; sezon içi haftada 1–2 kuvvet bakımı.',
    oncelikler: 'Sıçrama ve reaktif kuvvet, yavaşlama ve yön değişimi, iniş tekniği, tekrarlı sprint kapasitesi, ayak bileği denge.',
    yasNotlari: '',
    kaynaklar: [
      { ad: 'Stojanović E. ve ark. (2018) Basketbol maçlarında aktivite ve fizyolojik yanıtlar, Sports Med 48:111', url: 'https://pubmed.ncbi.nlm.nih.gov/29039018/' },
    ],
  },
  {
    ad: 'Futbol',
    anaKaslar: 'Arka uyluk, kalça, ön uyluk, kasık (adduktor), baldır, gövde',
    kasCalismaSekli: 'Sprint, hızlanma-yavaşlama, yön değişimi, şut ve ikili mücadele; arka uyluğa yüksek eksantrik yük.',
    enerjiSistemleri: 'Maç boyunca aerobik ağırlıklı, belirleyici anlar yüksek şiddetli sprintler (tekrarlı sprint kapasitesi).',
    sikSakatliklar: 'Hamstring zorlanması, kasık, ayak bileği burkulması, diz bağları',
    oncelikliTestler: ['10 m sürat (sn)', '30 m sürat (sn)', 'CMJ (cm)', '505 çeviklik (sn)', 'Yo-Yo IR1 (m)'],
    sezonYapisi: 'Uzun sezon; yaz hazırlık; maç gününe göre (MD) haftalık planlama.',
    oncelikler: 'Sprint ve hızlanma, eksantrik arka uyluk (Nordic), kasık kuvveti, yön değişimi, aerobik ve tekrarlı sprint kapasitesi, ısınmada sakatlık önleme (FIFA 11+).',
    yasNotlari: '',
    kaynaklar: [
      { ad: 'Soligard T. ve ark. (2008) Genç futbolcularda FIFA 11+ ısınma programı, BMJ 337:a2469', url: 'https://www.sciencedaily.com/releases/2008/12/081209221703.htm' },
      { ad: 'Askling C. ve ark. (2013) Akut hamstring sakatlıkları, Br J Sports Med 47:953', url: 'https://bjsm.bmj.com/content/47/15/953' },
    ],
  },
  {
    ad: 'Voleybol',
    anaKaslar: 'Kalça, ön uyluk, baldır, gövde, omuz ve kürek kemiği kasları',
    kasCalismaSekli: 'Tekrarlı dikey sıçrama (smaç, blok), iniş, baş üstü vuruş; kısa çevik hareketler.',
    enerjiSistemleri: 'Kısa yüksek şiddetli rallyeler (fosfojen ağırlıklı), aralarda toparlanma; aerobik kapasite set boyunca toparlanmayı destekler.',
    sikSakatliklar: 'Ayak bileği burkulması (blokta iniş), patellar tendinopati, omuz',
    oncelikliTestler: ['CMJ (cm)', 'Squat jump (cm)', 'Drop jump RSI', 'Bosco skoru (cm)', '505 çeviklik (sn)'],
    sezonYapisi: 'Sonbahar-bahar sezonu; sıçrama yükü haftalık takip edilmeli.',
    oncelikler: 'Dikey sıçrama ve reaktif kuvvet, iniş tekniği, tendon yük yönetimi, omuz bakım (rotator manşet, kürek kemiği), ayak bileği denge.',
    yasNotlari: '',
    kaynaklar: [
      { ad: 'Lidor R., Ziv G. (2010) Kadın voleybolcuların fiziksel ve fizyolojik özellikleri, J Strength Cond Res', url: 'https://www.scribd.com/document/470204247/lidor2010' },
      { ad: 'Cools A. ve ark. (2014) Kürek kemiği diskinezisinde rehabilitasyon, Br J Sports Med 48:692', url: 'https://pubmed.ncbi.nlm.nih.gov/23687006/' },
    ],
  },
  {
    ad: 'Tenis',
    anaKaslar: 'Kalça, bacaklar, gövde (rotasyon), omuz ve kürek kemiği kasları, ön kol',
    kasCalismaSekli: 'Kısa çok yönlü hızlanma-yavaşlama, gövde rotasyonu, baş üstü servis; asimetrik yük (vuruş kolu).',
    enerjiSistemleri: 'Puanlar kısa (çoğunlukla < 10 sn), maç uzun: fosfojen ağırlıklı eforlar ve güçlü aerobik toparlanma.',
    sikSakatliklar: 'Omuz, dirsek (tenisçi dirseği), bel, ayak bileği',
    oncelikliTestler: ['5 m sürat (sn)', '10 m sürat (sn)', '505 çeviklik (sn)', 'CMJ (cm)', 'Kavrama kuvveti (kg)'],
    sezonYapisi: 'Turnuva takvimine göre bloklar; turnuva haftalarında yük azaltılır.',
    oncelikler: 'İlk adım hızı ve yön değişimi, rotasyonel güç, omuz bakım (dış rotasyon, kürek kemiği), asimetri dengeleme, aerobik kapasite.',
    yasNotlari: '',
    kaynaklar: [
      { ad: 'Cools A. ve ark. (2008) Tenisçide iç sıkışma: rehabilitasyon önerileri, Br J Sports Med', url: 'https://oliverfinlay.com/assets/pdf/cools%20et%20al%20(2008)%20internal%20impingement%20in%20the%20tennis%20player%20-%20rehabilitation%20guidelines.pdf' },
    ],
  },
  {
    ad: 'Karting',
    anaKaslar: 'Boyun, gövde, omuz ve kollar, ön kol (kavrama), bacaklar (pedal)',
    kasCalismaSekli: 'Virajlarda yanal kuvvetlere karşı boyun ve gövdeyi izometrik sabitleme; direksiyonda tekrarlı kol ve kavrama kuvveti; titreşim.',
    enerjiSistemleri: 'Yarış boyunca yüksek kalp atımı (ısı ve stres dahil): aerobik dayanıklılık ve ısıya tolerans önemli.',
    sikSakatliklar: 'Kaburga ve gövde (koltuk teması), boyun, el-bilek ve ön kol aşırı kullanım',
    oncelikliTestler: ['Kavrama kuvveti (kg)', 'Denge (puan)', 'Yo-Yo IR1 (m)'],
    sezonYapisi: 'Yarış takvimine göre; yarış haftasında yük azaltma.',
    oncelikler: 'Boyun kuvveti (izometrik, dört yön), gövde dayanıklılığı, kavrama ve ön kol dayanıklılığı, aerobik kapasite, reaksiyon ve odak.',
    yasNotlari:
      'Çocuk (8–12): genel motor beceri, koordinasyon ve oyun temelli kondisyon; boyun için vücut ağırlığıyla hafif izometrik. Genç (13–15): teknik öncelikli kuvvet, kademeli boyun ve gövde. 16+: yapılandırılmış kuvvet ve dayanıklılık.',
    kaynaklar: [
      { ad: 'Karting özelinde araştırma sınırlı; içerik motor sporları genel bulguları ve koçluk deneyimine dayanır, kontrol edilmeli.', url: '' },
    ],
  },
  {
    ad: 'Cimnastik',
    anaKaslar: 'Omuz ve kürek kemiği, gövde, kalça, bilekler',
    kasCalismaSekli: 'Vücut ağırlığına göre yüksek göreceli kuvvet, izometrik tutuşlar, patlayıcı sıçrama-iniş, uç hareket açıklıkları.',
    enerjiSistemleri: 'Kısa yüksek şiddetli seriler (fosfojen, glikolitik).',
    sikSakatliklar: 'Bilek, bel (tekrarlı geriye bükülme), ayak bileği, omuz',
    oncelikliTestler: ['CMJ (cm)', 'Durarak uzun atlama (cm)', 'Otur-uzan (cm)', 'Denge (puan)'],
    sezonYapisi: 'Yarışma takvimine göre; çocuk gruplarında yıl boyu gelişim.',
    oncelikler: 'Göreceli kuvvet, gövde kontrolü, esneklik ile kuvvet dengesi, iniş tekniği; çocuklarda büyüme dönemlerinde yük takibi.',
    yasNotlari: 'Çocuk gruplarında oyun temelli, beceri ve koordinasyon öncelikli; büyüme atağı döneminde (ani boy uzaması) tekrarlı bel bükülmesi ve iniş yükü azaltılır.',
    kaynaklar: [{ ad: 'Kaynak eklenmeli.', url: '' }],
  },
];
