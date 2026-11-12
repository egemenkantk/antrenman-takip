// Postür vücut şeması: sade iskelet çizimi (önden görünüm, izleyiciye göre sol taraf = kişinin sağı).
// Koordinatlar postür bölgeleriyle (tanimlar.js → BOLGE) uyumlu: viewBox 0 0 140 300.

const KEMIK = { fill: '#eef1f4', stroke: '#8f9aa6', strokeWidth: 1.2, strokeLinejoin: 'round', strokeLinecap: 'round' };
const CIZGI = { fill: 'none', stroke: '#8f9aa6', strokeWidth: 1.2, strokeLinecap: 'round' };

// Uzun kemik: iki uçta yuvarlak eklem başı olan çubuk
function UzunKemik({ x1, y1, x2, y2, k = 4.2, bas = 4.8, uc1 = true, uc2 = true }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8f9aa6" strokeWidth={k + 2.4} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#eef1f4" strokeWidth={k} strokeLinecap="round" />
      {uc1 && <circle cx={x1} cy={y1} r={bas} {...KEMIK} />}
      {uc2 && <circle cx={x2} cy={y2} r={bas * 0.9} {...KEMIK} />}
    </g>
  );
}

function Taraf({ ayna }) {
  // ayna = false → izleyicinin solu (kişinin sağı); true → x ekseninde 140'a göre yansıt
  return (
    <g transform={ayna ? 'translate(140 0) scale(-1 1)' : undefined}>
      {/* Köprücük kemiği */}
      <path d="M68 55 Q57 52 45 56" {...CIZGI} strokeWidth={3.4} stroke="#8f9aa6" />
      <path d="M68 55 Q57 52 45 56" fill="none" stroke="#eef1f4" strokeWidth={1.6} strokeLinecap="round" />
      {/* Kürek kemiği (arkada, hafif) */}
      <path d="M47 62 L62 66 L58 92 Z" fill="#e3e8ed" stroke="#a9b3bd" strokeWidth={1} strokeLinejoin="round" opacity={0.9} />
      {/* Omuz başı */}
      <circle cx="44" cy="58" r="5" {...KEMIK} />
      {/* Kol: humerus, önkol (iki kemik), el */}
      <UzunKemik x1={42} y1={62} x2={34} y2={104} k={4} bas={4.4} />
      <line x1={33} y1={107} x2={27} y2={144} {...CIZGI} strokeWidth={2.6} />
      <line x1={37} y1={107} x2={31} y2={145} {...CIZGI} strokeWidth={2.6} />
      <path d="M24 146 Q28 143 34 147 L33 158 Q28 161 23 157 Z" {...KEMIK} />
      {/* Kaburgalar */}
      {[62, 69, 76, 83, 90, 97, 104].map((y, i) => (
        <path
          key={y}
          d={`M68 ${y} Q${50 - Math.min(i, 3) + Math.max(0, i - 4) * 2} ${y + 2} ${52 + Math.max(0, i - 3) * 2.2} ${y + 9 + i * 0.6}`}
          {...CIZGI}
          strokeWidth={1.6}
        />
      ))}
      {/* Kalça kemiği (ilium) */}
      <path d="M66 138 Q50 130 45 140 Q44 152 54 158 L62 160 Q66 152 66 146 Z" {...KEMIK} />
      {/* Bacak: femur, diz kapağı, tibia ve fibula, ayak */}
      <UzunKemik x1={57} y1={157} x2={57} y2={209} k={5} bas={4.8} uc2={false} />
      <path d="M51 207 Q57 203 63 207 Q63 212 57 212 Q51 212 51 207 Z" {...KEMIK} />
      <ellipse cx="57" cy="214" rx="3.6" ry="4.2" {...KEMIK} />
      <UzunKemik x1={57} y1={219} x2={56} y2={273} k={4.2} bas={4.4} uc1={false} />
      <line x1={51.5} y1={224} x2={51} y2={271} {...CIZGI} strokeWidth={2} />
      <path d="M50 279 Q56 276 61 279 L62 288 Q55 292 45 289 Q44 284 50 279 Z" {...KEMIK} />
    </g>
  );
}

export default function Iskelet() {
  return (
    <g>
      {/* Kafatası ve çene */}
      <ellipse cx="70" cy="21" rx="13" ry="14.5" {...KEMIK} />
      <path d="M61 29 Q62 39 70 41 Q78 39 79 29" {...KEMIK} />
      <ellipse cx="65" cy="21" rx="3" ry="2.6" fill="#c3ccd5" />
      <ellipse cx="75" cy="21" rx="3" ry="2.6" fill="#c3ccd5" />
      {/* Boyun omurları */}
      {[43, 47.5, 52].map((y) => <rect key={y} x="66.5" y={y - 1.8} width="7" height="3.6" rx="1.4" {...KEMIK} />)}
      <Taraf />
      <Taraf ayna />
      {/* Göğüs kemiği */}
      <path d="M67.5 58 L72.5 58 L72 92 Q70 96 68 92 Z" {...KEMIK} />
      {/* Sırt omurları (göğüs hizası, kaburgaların arasında hafif görünür) */}
      <line x1="70" y1="56" x2="70" y2="112" stroke="#b5bfc9" strokeWidth={4} strokeLinecap="round" opacity={0.55} />
      {/* Bel omurları */}
      {[114, 120.5, 127, 133.5].map((y) => <rect key={y} x="65" y={y - 2.6} width="10" height="5.2" rx="2" {...KEMIK} />)}
      {/* Sakrum */}
      <path d="M64 139 L76 139 L72.5 156 Q70 159 67.5 156 Z" {...KEMIK} />
    </g>
  );
}
