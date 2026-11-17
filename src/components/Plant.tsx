// Cây và hoa của Vườn, vẽ bằng SVG phẳng. Màu lấy từ biến của theme nên tự đổi theo giao diện.
// Mỗi loài có 5 giai đoạn: 0 hạt giống → 1 nảy mầm → 2 cây non → 3 ra nụ → 4 nở hoa/trưởng thành.

import type { PlantSpecies } from '@/lib/types';

export const PLANTS: { id: PlantSpecies; name: string; note: string; isTree: boolean }[] = [
  { id: 'sen', name: 'Hoa sen', note: 'Vươn lên từ mặt nước', isTree: false },
  { id: 'ly', name: 'Hoa ly', note: 'Thẳng và kiêu hãnh', isTree: false },
  { id: 'linh-lan', name: 'Hoa linh lan', note: 'Những chiếc chuông nhỏ', isTree: false },
  { id: 'tan-tron', name: 'Cây tán tròn', note: 'Lớn chậm mà vững', isTree: true },
  { id: 'thong', name: 'Cây thông', note: 'Xanh quanh năm', isTree: true },
];
export const plantName = (id: PlantSpecies) => PLANTS.find((p) => p.id === id)?.name ?? 'Cây';
export const plantIsTree = (id: PlantSpecies) => PLANTS.find((p) => p.id === id)?.isTree ?? false;

const C = {
  leaf1: 'var(--k-leaf-1)',
  leaf2: 'var(--k-leaf-2)',
  leaf3: 'var(--k-leaf-3)',
  trunk: 'var(--k-trunk)',
  petal: 'var(--k-petal)',
  petalShade: 'var(--k-petal-shade)',
  bloom: 'var(--k-bloom)',
  bloom2: 'var(--k-bloom-2)',
  pollen: 'var(--k-pollen)',
  soil: 'var(--k-soil)',
  soil2: 'var(--k-soil-2)',
  pond: 'var(--k-pond)',
};

/** Một chiếc lá/cánh hoa nhọn hai đầu, mọc từ gốc (x, y), dài len, rộng w, xoay rot độ */
function Leaf({ x, y, len, w, rot, fill, vein }: { x: number; y: number; len: number; w: number; rot: number; fill: string; vein?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 C ${w} ${-len * 0.3} ${w} ${-len * 0.78} 0 ${-len} C ${-w} ${-len * 0.78} ${-w} ${-len * 0.3} 0 0 Z`} fill={fill} />
      {vein && <path d={`M0 ${-len * 0.12} L0 ${-len * 0.86}`} stroke={vein} strokeWidth={1.1} strokeLinecap="round" />}
    </g>
  );
}

function Soil() {
  return (
    <>
      <ellipse cx={60} cy={129} rx={36} ry={7.5} fill={C.soil2} />
      <ellipse cx={60} cy={127} rx={30} ry={6.5} fill={C.soil} />
    </>
  );
}

function Seed() {
  return (
    <>
      <g transform="rotate(-18 60 118)">
        <ellipse cx={60} cy={117} rx={7} ry={10} fill={C.trunk} />
        <path d="M57 111 Q59 116 57.5 122" stroke={C.petalShade} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
      <Soil />
    </>
  );
}

function Sprout() {
  return (
    <>
      <Soil />
      <path d="M60 126 C60 116 60 110 60 102" stroke={C.leaf2} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Leaf x={60} y={104} len={20} w={7.5} rot={-52} fill={C.leaf1} />
      <Leaf x={60} y={104} len={17} w={7} rot={48} fill={C.leaf2} />
    </>
  );
}

// ---------- Hoa sen ----------
function Lotus({ stage }: { stage: number }) {
  return (
    <>
      <ellipse cx={60} cy={128} rx={44} ry={9} fill={C.pond} />
      {/* lá nổi trên mặt nước */}
      <ellipse cx={32} cy={127} rx={15} ry={4.5} fill={C.leaf3} />
      <ellipse cx={90} cy={129} rx={12} ry={3.6} fill={C.leaf2} />
      {/* lá tròn vươn cao */}
      <path d="M80 127 C81 116 80 108 79 101" stroke={C.leaf3} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <ellipse cx={79} cy={99} rx={19} ry={6.5} fill={C.leaf2} />
      <ellipse cx={79} cy={97.6} rx={15} ry={4.2} fill={C.leaf1} />
      {stage >= 3 && (
        <path d={`M52 127 C50 108 54 ${stage === 4 ? 86 : 82} 54 ${stage === 4 ? 70 : 64}`} stroke={C.leaf3} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      )}
      {stage === 3 && (
        <>
          <Leaf x={54} y={66} len={27} w={10} rot={0} fill={C.bloom} />
          <Leaf x={54} y={66} len={25} w={5} rot={0} fill={C.bloom2} />
          <Leaf x={54} y={68} len={10} w={5} rot={-48} fill={C.leaf2} />
          <Leaf x={54} y={68} len={10} w={5} rot={48} fill={C.leaf2} />
        </>
      )}
      {stage === 4 && (
        <>
          <Leaf x={54} y={70} len={30} w={9} rot={-62} fill={C.bloom2} />
          <Leaf x={54} y={70} len={30} w={9} rot={62} fill={C.bloom2} />
          <Leaf x={54} y={70} len={36} w={10} rot={0} fill={C.bloom2} />
          <Leaf x={54} y={70} len={34} w={9.5} rot={-30} fill={C.bloom} />
          <Leaf x={54} y={70} len={34} w={9.5} rot={30} fill={C.bloom} />
          <Leaf x={54} y={71} len={27} w={8.5} rot={-84} fill={C.bloom} />
          <Leaf x={54} y={71} len={27} w={8.5} rot={84} fill={C.bloom} />
          <Leaf x={54} y={71} len={22} w={8} rot={-14} fill={C.petal} />
          <Leaf x={54} y={71} len={22} w={8} rot={14} fill={C.petal} />
          <ellipse cx={54} cy={62} rx={6.5} ry={3.6} fill={C.pollen} />
        </>
      )}
    </>
  );
}

// ---------- Hoa ly ----------
function Lily({ stage }: { stage: number }) {
  const top = stage === 2 ? 82 : 58;
  const leaves = stage === 2 ? [116, 106, 96, 88] : [116, 106, 96, 86, 76, 68];
  return (
    <>
      <Soil />
      <path d={`M60 126 L60 ${top}`} stroke={C.leaf3} strokeWidth={3} strokeLinecap="round" />
      {leaves.map((y, i) => (
        <Leaf key={y} x={60} y={y} len={stage === 2 ? 19 : 23} w={4.6} rot={i % 2 ? 58 : -58} fill={i % 2 ? C.leaf2 : C.leaf1} />
      ))}
      {stage === 2 && <Leaf x={60} y={84} len={14} w={4} rot={0} fill={C.leaf1} />}
      {stage === 3 && (
        <>
          <Leaf x={60} y={60} len={24} w={5.5} rot={-20} fill={C.petalShade} vein={C.leaf2} />
          <Leaf x={60} y={60} len={26} w={5.5} rot={14} fill={C.bloom} vein={C.bloom2} />
          <Leaf x={60} y={62} len={9} w={4} rot={-70} fill={C.leaf2} />
          <Leaf x={60} y={62} len={9} w={4} rot={70} fill={C.leaf2} />
        </>
      )}
      {stage === 4 && (
        <>
          {/* một nụ bên cạnh */}
          <path d="M60 70 C66 66 70 62 73 55" stroke={C.leaf3} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Leaf x={73} y={56} len={17} w={4.5} rot={24} fill={C.petalShade} vein={C.leaf2} />
          {/* bông hoa 6 cánh */}
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <Leaf key={r} x={60} y={44} len={22} w={7.5} rot={r} fill={r % 120 === 0 ? C.bloom : C.petal} vein={C.bloom2} />
          ))}
          {[30, 150, 270].map((r) => (
            <g key={r} transform={`translate(60 44) rotate(${r})`}>
              <path d="M0 0 L0 -9" stroke={C.leaf2} strokeWidth={1.2} strokeLinecap="round" />
              <circle cx={0} cy={-10} r={1.9} fill={C.pollen} />
            </g>
          ))}
          <circle cx={60} cy={44} r={2.8} fill={C.pollen} />
        </>
      )}
    </>
  );
}

// ---------- Hoa linh lan ----------
function Bell({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -7 L0 0" stroke={C.leaf2} strokeWidth={1.6} strokeLinecap="round" />
      <path
        d="M-7.5 9 C-8.5 0 -5 -1.5 0 -1.5 C5 -1.5 8.5 0 7.5 9 Q5.6 12.5 3.8 9.4 Q1.9 12.5 0 9.4 Q-1.9 12.5 -3.8 9.4 Q-5.6 12.5 -7.5 9 Z"
        fill={C.petal}
        stroke={C.petalShade}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path d="M-3 2 L-3.4 7 M3 2 L3.4 7" stroke={C.petalShade} strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}

function LilyOfValley({ stage }: { stage: number }) {
  const k = stage === 2 ? 0.68 : 1;
  return (
    <>
      <Soil />
      <Leaf x={56} y={126} len={66 * k} w={15 * k} rot={-17} fill={C.leaf3} vein={C.leaf2} />
      <Leaf x={64} y={126} len={56 * k} w={14 * k} rot={21} fill={C.leaf2} vein={C.leaf1} />
      {stage === 2 && <Leaf x={60} y={126} len={26} w={7} rot={2} fill={C.leaf1} />}
      {stage >= 3 && (
        <path d="M60 126 C59 92 60 58 76 46 C84 40 93 43 97 51" stroke={C.leaf2} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      )}
      {stage === 3 && (
        <>
          {[
            [69, 60],
            [80, 51],
            [91, 50],
            [98, 57],
          ].map(([x, y]) => (
            <g key={x}>
              <path d={`M${x} ${y - 6} L${x} ${y}`} stroke={C.leaf2} strokeWidth={1.4} strokeLinecap="round" />
              <circle cx={x} cy={y + 3} r={4} fill={C.petal} stroke={C.petalShade} strokeWidth={1} />
            </g>
          ))}
        </>
      )}
      {stage === 4 && (
        <>
          <Bell x={66} y={66} s={1.15} />
          <Bell x={79} y={54} s={1.05} />
          <Bell x={92} y={52} s={0.95} />
          <Bell x={99} y={61} s={0.8} />
        </>
      )}
    </>
  );
}

// ---------- Cây tán tròn ----------
function RoundTree({ stage }: { stage: number }) {
  return (
    <>
      <Soil />
      {stage === 2 && (
        <>
          <path d="M60 126 L60 96" stroke={C.trunk} strokeWidth={4} strokeLinecap="round" />
          <circle cx={60} cy={86} r={15} fill={C.leaf2} />
          <circle cx={54} cy={81} r={8} fill={C.leaf1} />
        </>
      )}
      {stage === 3 && (
        <>
          <path d="M60 126 L60 84 M60 104 L50 94 M60 98 L70 88" stroke={C.trunk} strokeWidth={5} strokeLinecap="round" fill="none" />
          <circle cx={70} cy={74} r={15} fill={C.leaf3} />
          <circle cx={57} cy={72} r={22} fill={C.leaf2} />
          <circle cx={46} cy={86} r={11} fill={C.leaf3} />
          <circle cx={50} cy={64} r={10} fill={C.leaf1} />
        </>
      )}
      {stage === 4 && (
        <>
          <path d="M60 126 L60 70 M60 100 L44 84 M60 92 L78 76 M60 82 L52 70" stroke={C.trunk} strokeWidth={6.5} strokeLinecap="round" fill="none" />
          <circle cx={78} cy={50} r={21} fill={C.leaf3} />
          <circle cx={58} cy={52} r={31} fill={C.leaf2} />
          <circle cx={36} cy={72} r={17} fill={C.leaf3} />
          <circle cx={84} cy={72} r={15} fill={C.leaf2} />
          <circle cx={48} cy={36} r={15} fill={C.leaf1} />
          <circle cx={82} cy={66} r={8} fill={C.leaf1} />
          <path d="M60 96 L60 74 M60 92 L50 82 M60 86 L69 77" stroke={C.trunk} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </>
      )}
    </>
  );
}

// ---------- Cây thông ----------
function Pine({ stage }: { stage: number }) {
  // Mỗi tầng: [đỉnh y, nửa bề rộng, chiều cao]
  const tiers: [number, number, number][] =
    stage === 2
      ? [
          [92, 15, 22],
          [80, 11, 20],
        ]
      : stage === 3
        ? [
            [88, 21, 26],
            [72, 17, 24],
            [58, 12, 22],
          ]
        : [
            [86, 27, 28],
            [70, 23, 26],
            [55, 19, 24],
            [41, 14, 22],
            [28, 9.5, 20],
          ];
  return (
    <>
      <Soil />
      <rect x={56} y={stage === 2 ? 110 : 108} width={8} height={18} rx={1.5} fill={C.trunk} />
      {tiers.map(([y, w, h]) => (
        <g key={y}>
          <path d={`M60 ${y} L${60 + w} ${y + h} L${60 - w} ${y + h} Z`} fill={C.leaf2} strokeLinejoin="round" stroke={C.leaf2} strokeWidth={2} />
          <path d={`M60 ${y} L${60 + w} ${y + h} L60 ${y + h} Z`} fill={C.leaf3} strokeLinejoin="round" stroke={C.leaf3} strokeWidth={2} />
        </g>
      ))}
    </>
  );
}

export function Plant({
  species,
  stage,
  wilt = 0,
  size = 120,
  className,
  sway,
}: {
  species: PlantSpecies;
  stage: number;
  /** 0 = tươi, 1 = hơi héo, 2 = héo rõ (dùng ở giai đoạn 3) */
  wilt?: 0 | 1 | 2;
  size?: number;
  className?: string;
  sway?: boolean;
}) {
  const st = Math.max(0, Math.min(4, Math.round(stage)));
  let body;
  if (st === 0) body = <Seed />;
  else if (st === 1) body = <Sprout />;
  else if (species === 'sen') body = <Lotus stage={st} />;
  else if (species === 'ly') body = <Lily stage={st} />;
  else if (species === 'linh-lan') body = <LilyOfValley stage={st} />;
  else if (species === 'tan-tron') body = <RoundTree stage={st} />;
  else body = <Pine stage={st} />;

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={className}
      role="img"
      aria-label={`${plantName(species)}, giai đoạn ${st + 1} trên 5`}
      style={wilt ? { filter: `saturate(${wilt === 1 ? 0.65 : 0.35}) brightness(0.96)` } : undefined}
    >
      <g className={sway ? 'k-sway' : undefined} style={{ transformOrigin: '60px 128px', transformBox: 'view-box' }}>
        {body}
      </g>
    </svg>
  );
}
