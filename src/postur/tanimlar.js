// Postür bulguları — eski Sporcu Kartı ile aynı anahtarlar (eski değerlendirmeler doğrudan uyumlu).
// [anahtar, ad, taraflı mı, bölge, düzeltici egzersizler, uzmana yönlendir]
export const POSTUR = [
  { gorunum: 'Önden', ogeler: [
    ['head_tilt', 'Baş lateral eğimi', 1, 'head', ['Boyun lateral esneme', 'Chin tuck']],
    ['shoulder_h', 'Omuz yükseklik farkı', 1, 'shoulder', ['Üst trapez esnetme', 'Serratus wall slide']],
    ['pelvis_h', 'Pelvis yükseklik farkı', 1, 'pelvis', ['Side plank', 'Quadratus lumborum esnetme']],
    ['valgus', 'Diz valgus', 1, 'knee', ['Mini band lateral walk', 'Clamshell', 'Tek ayak squat (ayna önünde)']],
    ['varus', 'Diz varus', 1, 'knee', ['Copenhagen plank', 'Kalça iç rotasyon mobilitesi']],
    ['pronation', 'Ayak pronasyonu / düz taban', 1, 'foot', ['Short foot egzersizi', 'Tek ayak denge', 'Tibialis posterior güçlendirme']],
  ]},
  { gorunum: 'Yandan', ogeler: [
    ['fwd_head', 'Baş önde duruş', 0, 'neck', ['Chin tuck', 'Derin boyun fleksör aktivasyonu', 'Göğüs açma esnetmesi']],
    ['protraction', 'Omuz protraksiyonu', 0, 'shoulder', ['Pektoral esnetme (kapı)', 'Band pull-apart', 'Face pull']],
    ['kyphosis', 'Artmış torakal kifoz', 0, 'thoracic', ['Foam roller torakal ekstansiyon', 'Open book', 'Prone Y-T-W']],
    ['lordosis', 'Artmış lomber lordoz', 0, 'lumbar', ['Half-kneeling kalça fleksör esnetme', 'Dead bug', 'Glute bridge']],
    ['flatback', 'Azalmış lordoz (düz bel)', 0, 'lumbar', ['Hamstring esnetme', 'Kedi-deve', 'Kalça menteşe drili']],
    ['ant_tilt', 'Anterior pelvik tilt', 0, 'pelvis', ['Half-kneeling kalça fleksör esnetme', 'Posterior tilt drili', 'Glute bridge']],
    ['post_tilt', 'Posterior pelvik tilt', 0, 'pelvis', ['Hamstring esnetme', 'Kalça fleksör aktivasyonu', 'Kedi-deve']],
    ['hyperext', 'Diz hiperekstansiyonu', 1, 'knee', ['Hamstring güçlendirme', 'Yumuşak diz farkındalık drili']],
    ['knee_flex', 'Diz fleksiyonu (dizler bükük duruş)', 1, 'knee', ['Hamstring esnetme', 'Gastroknemius esnetme', 'Half-kneeling kalça fleksör esnetme', 'Terminal diz ekstansiyonu (band TKE)']],
  ]},
  { gorunum: 'Arkadan', ogeler: [
    ['scoliosis', 'Skolyoz şüphesi', 1, 'thoracic', [], 1],
    ['winging', 'Scapular winging', 1, 'scap', ['Serratus punch', 'Push-up plus', 'Wall slide']],
    ['scap_elev', 'Skapular elevasyon (yüksek skapula)', 1, 'scap', ['Üst trapez esnetme', 'Levator skapula esnetme', 'Prone Y (alt trapez)']],
    ['scap_depr', 'Skapular depresyon (düşük skapula)', 1, 'scap', ['Shrug (hafif yük)', 'Wall slide', 'Serratus punch']],
    ['scap_abd', 'Skapular abdüksiyon (omurgadan uzak)', 1, 'scap', ['Band pull-apart', 'Prone T', 'Pektoral esnetme (kapı)']],
    ['scap_add', 'Skapular addüksiyon (omurgaya yakın)', 1, 'scap', ['Serratus punch', 'Push-up plus', 'Romboid esnetme']],
    ['scap_dnrot', 'Skapular aşağı rotasyon', 1, 'scap', ['Wall slide', 'Prone Y (alt trapez)', 'Levator skapula esnetme']],
    ['scap_tilt', 'Skapular anterior tilt (alt köşe belirgin)', 1, 'scap', ['Pektoralis minör esnetme', 'Prone Y (alt trapez)', 'Serratus wall slide']],
    ['scap_dysk', 'Skapular diskinezi (kol hareketinde)', 1, 'scap', ['Prone Y-T-W', 'Serratus punch', 'Wall slide']],
    ['calc_valgus', 'Kalkaneal valgus', 1, 'foot', ['Short foot egzersizi', 'Calf raise (topuk nötr)']],
  ]},
];

export const BULGU = {};
POSTUR.forEach((g) =>
  g.ogeler.forEach(([k, ad, tarafli, bolge, egz, yonlendir]) => {
    BULGU[k] = { k, ad, tarafli: !!tarafli, bolge, egz, yonlendir: !!yonlendir, gorunum: g.gorunum };
  })
);
// Az görülen skapula bulguları: "ekle" listesinden seçilene kadar gizli
export const SECMELI = ['scap_abd', 'scap_add', 'scap_dnrot', 'scap_tilt', 'scap_dysk'];
export const TARAF = { R: 'Sağ', L: 'Sol', B: 'İki taraf' };
export const SIDDET = { 1: 'Hafif', 2: 'Belirgin' };
export const bulguMetni = (f) => `${SIDDET[f.sev]}${f.side ? ' · ' + TARAF[f.side].toLocaleLowerCase('tr') : ''}`;

export const BOLGE = {
  head: { c: [70, 24], R: [60, 22], L: [80, 22] }, neck: { c: [70, 46] },
  shoulder: { c: [70, 58], R: [45, 58], L: [95, 58] }, thoracic: { c: [70, 84], R: [62, 90], L: [78, 90] },
  scap: { c: [70, 78], R: [55, 78], L: [85, 78] }, lumbar: { c: [70, 126] },
  pelvis: { c: [70, 146], R: [53, 146], L: [87, 146] }, knee: { c: [70, 214], R: [57, 214], L: [83, 214] },
  foot: { c: [70, 284], R: [55, 284], L: [85, 284] },
};

// Bir önceki değerlendirmeye göre eğilim: 'duzeldi' | 'artti' | 'yeni' | 'ayni' | null
export function egilim(simdi, once) {
  if (!once) return null;
  const n = simdi?.sev || 0, p = once?.sev || 0;
  if (n < p) return 'duzeldi';
  if (n > p) return p ? 'artti' : 'yeni';
  return 'ayni';
}
