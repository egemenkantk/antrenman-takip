// Cimnastik grup dersleri: dönem temaları (hocaya yardımcı hazır içerik) ve beceri listesi.
import { CIM_SIRASI } from '../program/model';

// Varsayılan bölüm süreleri (dk). Toplam grubun ders süresine göre ölçeklenir.
const VARSAYILAN_SURE = { c_isinma: 10, c_beceri: 15, c_ana: 20, c_oyun: 10, c_soguma: 5 };

export function sureDagit(toplam = 60) {
  const t = Object.values(VARSAYILAN_SURE).reduce((a, b) => a + b, 0);
  const o = Object.fromEntries(CIM_SIRASI.map((k) => [k, Math.max(5, Math.round((VARSAYILAN_SURE[k] * toplam) / t / 5) * 5)]));
  // Yuvarlama farkını ana bölüme ekle/çıkar
  const fark = toplam - Object.values(o).reduce((a, b) => a + b, 0);
  o.c_ana = Math.max(5, o.c_ana + fark);
  return o;
}

// Hazır dönem temaları. Hepsi öneridir; hoca seçtikten sonra dilediği gibi değiştirir.
export const TEMALAR = {
  yuvarlanma: {
    ad: 'Yuvarlanmalar',
    not: 'Öne ve geriye takla için güvenli baş-boyun pozisyonu, toparlanma ve sırt üstü yuvarlanma.',
    icerik: {
      c_isinma: 'Hafif koşu ve hayvan yürüyüşleri (ayı, yengeç)\nBoyun ve bilek çevirmeleri\nSallanan sandalye (toparlanmış sırt üstü sallanma)',
      c_beceri: 'Eğimli mindere öne takla\nKütük yuvarlanma (yan yuvarlanma)\nGeriye takla için eğimli minderde sallanma',
      c_ana: 'İstasyonlar: eğimli minder takla · düz minderde takla · kütük yuvarlanma · minder tünelinden geçiş',
      c_oyun: 'Hayvan taklidi yarışı',
      c_soguma: 'Kedi–inek esnemesi\nKelebek oturuş\nNefes çalışması',
    },
  },
  denge: {
    ad: 'Denge ve duruş',
    not: 'Tek ayak üzerinde durma, uçak duruşu, denge aletinde yürüme ve dönüş; dik ve gergin vücut duruşu.',
    icerik: {
      c_isinma: 'Müzikli serbest koşu, müzik durunca heykel\nAyak bileği ve parmak ucu çalışması',
      c_beceri: 'Tek ayak denge (5–10 sn)\nUçak duruşu\nParmak ucunda yürüme',
      c_ana: 'Yer çizgisinde → alçak denge aletinde → denge aletinde yürüme, yarım dönüş ve iniş',
      c_oyun: 'Heykel oyunu',
      c_soguma: 'Bacak arkası esnemesi\nSırt üstü gevşeme',
    },
  },
  destek: {
    ad: 'Destek ve ters duruş',
    not: 'Kollar üzerinde vücut ağırlığı taşıma: tavşan sıçrayışı, mum duruşu, duvar destekli amut, çembere hazırlık.',
    icerik: {
      c_isinma: 'Ayı ve yengeç yürüyüşü\nEl bileği ısınması\nPlank (kısa süre)',
      c_beceri: 'Mum duruşu\nTavşan sıçrayışı\nDuvara ayak yürütme (duvar destekli amut)',
      c_ana: 'İstasyonlar: kasa üzerinden tavşan sıçrayışı · duvar amudu · çizgi üzerinde çember hazırlığı',
      c_oyun: 'El arabası yarışı',
      c_soguma: 'Bilek ve omuz esnemesi\nÇocuk pozu',
    },
  },
  sicrama: {
    ad: 'Sıçramalar ve güvenli iniş',
    not: 'Çift ayakla sıçrama, dönüşlü sıçramalar ve dizler bükülü, dengeli iniş.',
    icerik: {
      c_isinma: 'Seksek ve ip atlama\nAyak bileği sıçramaları',
      c_beceri: 'Düz sıçrama ve iniş (“donup kal”)\nYarım dönüş sıçrama\nÇömelik sıçrama',
      c_ana: 'Mini trambolin / kasa üzerinden sıçrama ve mindere iniş\nMakas sıçrama',
      c_oyun: 'Kurbağa sıçrama yarışı',
      c_soguma: 'Baldır ve ön bacak esnemesi\nNefes çalışması',
    },
  },
  esneklik: {
    ad: 'Esneklik ve köprü',
    not: 'Köprü, spagat ve pike oturuş çalışmaları; zorlamadan, kademeli esneklik.',
    icerik: {
      c_isinma: 'Hafif koşu\nKol çevirmeleri ve gövde dönüşleri',
      c_beceri: 'Yerden köprü\nKelebek ve pike oturuş\nSağ / sol spagat hazırlığı',
      c_ana: 'Eşli esneme çalışması (kontrollü)\nKöprüde ileri geri sallanma\nBacak salınımları',
      c_oyun: 'Ayna oyunu',
      c_soguma: 'Sırt üstü gevşeme\nNefes çalışması',
    },
  },
  koordinasyon: {
    ad: 'Koordinasyon ve ritim',
    not: 'Müzikle hareket, ip ve çember gibi küçük araçlarla koordinasyon.',
    icerik: {
      c_isinma: 'Müzikli ısınma, ritme göre adım\nYön değiştirerek koşu',
      c_beceri: 'İp atlama\nÇember çevirme ve içinden geçme\nTop atıp tutma',
      c_ana: 'Kısa koreografi: yürüyüş + sıçrama + dönüş + duruş',
      c_oyun: 'Trafik lambası',
      c_soguma: 'Yavaş müzikle esneme',
    },
  },
  parkur: {
    ad: 'Parkur ve kuvvet oyunları',
    not: 'Tırmanma, asılma, sürünme ve sıçramaları birleştiren parkurlar; genel kuvvet ve cesaret.',
    icerik: {
      c_isinma: 'Kovalamaca\nHayvan yürüyüşleri',
      c_beceri: 'Barda asılma (5–10 sn)\nBarda diz çekme\nSürünme ve tırmanma',
      c_ana: 'Parkur: tünel → kasa tırmanma → denge aleti → takla → sıçrayarak iniş',
      c_oyun: 'Hazine avı parkuru',
      c_soguma: 'Kol ve sırt esnemesi\nÇocuk pozu',
    },
  },
};
export const TEMA_SIRASI = Object.keys(TEMALAR);

export function temaGunu(temaId, toplamSure = 60) {
  const t = TEMALAR[temaId];
  return { baslik: '', bolumler: [...CIM_SIRASI], icerik: t ? { ...t.icerik } : {}, sure: sureDagit(toplamSure) };
}

// ---------- Beceri takibi (yalnızca ekip görür) ----------
export const BECERI_GRUPLARI = [
  ['Yuvarlanmalar', ['Öne takla', 'Geriye takla', 'Kütük yuvarlanma', 'Bacaklar açık öne takla']],
  ['Destek ve ters duruş', ['Mum duruşu', 'Tavşan sıçrayışı', 'Duvar destekli amut', 'Amut', 'Çember (yan çark)']],
  ['Köprü ve esneklik', ['Yerden köprü', 'Köprüden kalkış', 'Sağ spagat', 'Sol spagat', 'Orta spagat', 'Pike oturuş']],
  ['Denge', ['Tek ayak denge (5 sn)', 'Uçak duruşu', 'Denge aletinde yürüme', 'Denge aletinde dönüş']],
  ['Sıçramalar', ['Düz sıçrama ve iniş', 'Yarım dönüş sıçrama', 'Tam dönüş sıçrama', 'Makas sıçrama', 'Çömelik sıçrama']],
  ['Asılma', ['Barda asılma (10 sn)', 'Barda diz çekme']],
];

export const beceriAnahtar = (ad) =>
  ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export const DURUMLAR = [
  ['', 'Başlanmadı'],
  ['calisiyor', 'Çalışıyor'],
  ['yapabiliyor', 'Yapabiliyor'],
];
export const sonrakiDurum = (d) => (d === 'calisiyor' ? 'yapabiliyor' : d === 'yapabiliyor' ? '' : 'calisiyor');
