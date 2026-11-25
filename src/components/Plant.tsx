// Cây và hoa của Vườn, vẽ bằng SVG phẳng. Màu lấy từ biến của theme nên tự đổi theo giao diện.
// Mỗi loài có 5 giai đoạn: 0 hạt giống → 1 nảy mầm → 2 cây non → 3 ra nụ → 4 nở hoa/trưởng thành.

import type { PlantSpecies } from '@/lib/types';

export const PLANTS: { id: PlantSpecies; name: string; note: string; isTree: boolean }[] = [
  { id: 'sen', name: 'Hoa sen', note: 'Vươn lên từ mặt nước', isTree: false },
  { id: 'ly', name: 'Hoa ly', note: 'Thẳng và kiêu hãnh', isTree: false },
  { id: 'linh-lan', name: 'Hoa linh lan', note: 'Những chiếc chuông nhỏ', isTree: false },
  { id: 'tan-tron', name: 'Cây tán tròn', note: 'Lớn chậm mà vững', isTree: true },
  { id: 'thong', name: 'Cây thông', note: 'Xanh quanh năm', isTree: true },
  // Bản 2 (cần chạy 005_v2.sql)
  { id: 'la-kim', name: 'Cây lá kim', note: 'Bền bỉ qua mùa lạnh', isTree: true },
  { id: 'xuong-rong', name: 'Xương rồng', note: 'Kiên cường, vẫn nở hoa', isTree: false },
  { id: 'huong-duong', name: 'Hướng dương', note: 'Luôn hướng về phía mặt trời', isTree: false },
  { id: 'dong-tien', name: 'Hoa đồng tiền', note: 'Rực rỡ và may mắn', isTree: false },
  { id: 'hong', name: 'Hoa hồng', note: 'Đẹp nhờ được chăm mỗi ngày', isTree: false },
];
/** Các loài có từ bản 2: chỉ chọn được sau khi chạy 005_v2.sql */
export const V2_PLANTS = new Set<PlantSpecies>(['la-kim', 'xuong-rong', 'huong-duong', 'dong-tien', 'hong']);
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
  rose: 'var(--k-rose)',
  rose2: 'var(--k-rose-2)',
  gerbera: 'var(--k-gerbera)',
  gerbera2: 'var(--k-gerbera-2)',
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

// ---------- Cây lá kim (dáng vân sam: thân thon, nhiều tầng cành rủ) ----------
function Conifer({ stage }: { stage: number }) {
  const tiers = stage === 2 ? 3 : stage === 3 ? 5 : 8;
  const top = stage === 2 ? 78 : stage === 3 ? 54 : 18;
  const maxW = stage === 2 ? 13 : stage === 3 ? 17 : 21;
  const base = 113;
  const step = (base - top) / (tiers + 0.7);
  // Vẽ từ tầng dưới cùng (rộng nhất) lên ngọn; các tầng chồng lên nhau, mép dưới gợn sóng như cành rủ
  const list = Array.from({ length: tiers }, (_, i) => {
    const yb = base - i * step;
    const yt = yb - step * 1.75;
    const w = maxW * (0.32 + 0.68 * (1 - i / tiers));
    return { yb, yt, w };
  });
  return (
    <>
      <Soil />
      <rect x={56.5} y={108} width={7} height={20} rx={1.5} fill={C.trunk} />
      {list.map(({ yb, yt, w }) => (
        <g key={yb}>
          <path
            d={`M60 ${yt} L${60 + w} ${yb} Q${60 + w * 0.66} ${yb + 4.5} ${60 + w / 3} ${yb} Q60 ${yb + 4.5} ${60 - w / 3} ${yb} Q${60 - w * 0.66} ${yb + 4.5} ${60 - w} ${yb} Z`}
            fill={C.leaf2}
            stroke={C.leaf2}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path d={`M60 ${yt} L${60 + w} ${yb} Q${60 + w * 0.66} ${yb + 4.5} ${60 + w / 3} ${yb} Q${60 + w / 6} ${yb + 2.6} 60 ${yb + 2.6} Z`} fill={C.leaf3} />
        </g>
      ))}
      <path d={`M60 ${list[tiers - 1].yt - 6} L60 ${list[tiers - 1].yt + 4}`} stroke={C.leaf3} strokeWidth={2} strokeLinecap="round" />
      {stage === 4 &&
        [
          [47, 96],
          [74, 86],
          [52, 66],
          [69, 54],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y} rx={2.6} ry={4.2} fill={C.trunk} />
            <path d={`M${x - 1.8} ${y - 1} L${x + 1.8} ${y - 1} M${x - 1.8} ${y + 1.4} L${x + 1.8} ${y + 1.4}`} stroke={C.petalShade} strokeWidth={0.8} strokeOpacity={0.7} />
          </g>
        ))}
    </>
  );
}

// ---------- Xương rồng ----------
/** Một đoạn thân xương rồng: hình chữ nhật bo tròn, có gân dọc và gai nhỏ */
function CactusPart({ x, y, w, h, shade = true }: { x: number; y: number; w: number; h: number; shade?: boolean }) {
  const spines: [number, number][] = [];
  for (let yy = y + 7; yy < y + h - 4; yy += 9) {
    spines.push([x + 1.5, yy], [x + w - 1.5, yy + 4]);
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={C.leaf2} />
      {shade && <rect x={x + w / 2} y={y} width={w / 2} height={h} rx={w / 4} fill={C.leaf3} opacity={0.55} />}
      <path d={`M${x + w * 0.32} ${y + w * 0.5} L${x + w * 0.32} ${y + h - 3} M${x + w * 0.68} ${y + w * 0.5} L${x + w * 0.68} ${y + h - 3}`} stroke={C.leaf3} strokeWidth={1.1} strokeOpacity={0.6} />
      {spines.map(([sx, sy]) => (
        <path key={`${sx}-${sy}`} d={`M${sx} ${sy} l${sx < x + w / 2 ? -2.6 : 2.6} -1.6`} stroke={C.petal} strokeWidth={1} strokeLinecap="round" />
      ))}
    </g>
  );
}

function CactusFlower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[-60, -30, 0, 30, 60].map((r) => (
        <Leaf key={r} x={0} y={0} len={9} w={3.6} rot={r} fill={r === 0 ? C.bloom2 : C.bloom} />
      ))}
      <circle cx={0} cy={-1} r={1.8} fill={C.pollen} />
    </g>
  );
}

function Cactus({ stage }: { stage: number }) {
  if (stage === 1) {
    return (
      <>
        <Soil />
        <ellipse cx={60} cy={119} rx={7.5} ry={8.5} fill={C.leaf2} />
        <path d="M57 114 l-2 -1.4 M63 113 l2 -1.4 M60 112 l0 -2.4" stroke={C.petal} strokeWidth={1} strokeLinecap="round" />
      </>
    );
  }
  if (stage === 2) {
    return (
      <>
        <Soil />
        <ellipse cx={60} cy={110} rx={14} ry={17} fill={C.leaf2} />
        <path d="M60 110 m0 -17 a14 17 0 0 1 0 34 Z" fill={C.leaf3} opacity={0.55} />
        <path d="M54 96 C52 104 52 116 54 125 M66 96 C68 104 68 116 66 125" stroke={C.leaf3} strokeWidth={1.1} strokeOpacity={0.6} fill="none" />
        {[
          [47, 104],
          [73, 108],
          [48, 116],
          [72, 119],
          [60, 93],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} l${x < 60 ? -2.6 : x > 60 ? 2.6 : 0} -1.8`} stroke={C.petal} strokeWidth={1} strokeLinecap="round" />
        ))}
      </>
    );
  }
  const top = stage === 3 ? 64 : 48;
  return (
    <>
      <Soil />
      {/* cánh tay phải */}
      <CactusPart x={70} y={stage === 3 ? 78 : 62} w={10} h={stage === 3 ? 26 : 30} />
      <rect x={64} y={stage === 3 ? 96 : 84} width={12} height={9} rx={4.5} fill={C.leaf2} />
      {/* cánh tay trái (chỉ khi trưởng thành) */}
      {stage === 4 && (
        <>
          <CactusPart x={38} y={76} w={10} h={26} />
          <rect x={42} y={95} width={12} height={9} rx={4.5} fill={C.leaf2} />
        </>
      )}
      <CactusPart x={51} y={top} w={18} h={128 - top} />
      {stage === 3 && (
        <>
          <ellipse cx={56} cy={top + 1} rx={2.6} ry={3.6} fill={C.bloom} />
          <ellipse cx={64} cy={top} rx={2.6} ry={3.6} fill={C.bloom2} />
        </>
      )}
      {stage === 4 && (
        <>
          <CactusFlower x={55} y={top + 2} s={1.1} />
          <CactusFlower x={66} y={top + 1} s={0.95} />
          <CactusFlower x={75} y={63} s={0.85} />
          <CactusFlower x={43} y={77} s={0.8} />
        </>
      )}
    </>
  );
}

// ---------- Hoa hướng dương ----------
function Sunflower({ stage }: { stage: number }) {
  const top = stage === 2 ? 84 : stage === 3 ? 58 : 46;
  return (
    <>
      <Soil />
      <path d={`M60 126 C61 108 59 ${top + 30} 60 ${top}`} stroke={C.leaf3} strokeWidth={stage === 4 ? 4 : 3.4} fill="none" strokeLinecap="round" />
      <Leaf x={60} y={112} len={24} w={12} rot={-64} fill={C.leaf2} vein={C.leaf3} />
      <Leaf x={60} y={106} len={22} w={11} rot={60} fill={C.leaf1} vein={C.leaf2} />
      {stage >= 3 && (
        <>
          <Leaf x={60} y={88} len={20} w={10} rot={-56} fill={C.leaf1} vein={C.leaf2} />
          <Leaf x={60} y={80} len={18} w={9} rot={54} fill={C.leaf2} vein={C.leaf3} />
        </>
      )}
      {stage === 2 && <Leaf x={60} y={86} len={13} w={6} rot={0} fill={C.leaf1} />}
      {stage === 3 && (
        <>
          <circle cx={60} cy={top - 4} r={8} fill={C.leaf2} />
          {[-50, -20, 20, 50].map((r) => (
            <Leaf key={r} x={60} y={top + 1} len={11} w={3.6} rot={r} fill={C.leaf3} />
          ))}
          <Leaf x={60} y={top - 9} len={7} w={3.4} rot={-12} fill={C.pollen} />
          <Leaf x={60} y={top - 9} len={7} w={3.4} rot={14} fill={C.pollen} />
        </>
      )}
      {stage === 4 && (
        <g>
          {Array.from({ length: 16 }).map((_, i) => (
            <Leaf key={`b${i}`} x={60} y={top - 10} len={20} w={5} rot={i * 22.5 + 11} fill={C.pollen} />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <Leaf key={`f${i}`} x={60} y={top - 10} len={22} w={5.4} rot={i * 22.5} fill={C.pollen} vein={C.petalShade} />
          ))}
          <circle cx={60} cy={top - 10} r={10.5} fill={C.trunk} />
          <circle cx={60} cy={top - 10} r={7} fill={C.soil2} />
          {[
            [57, -13],
            [63, -12],
            [60, -8],
            [56, -8],
            [64, -7],
          ].map(([x, dy]) => (
            <circle key={`${x}${dy}`} cx={x} cy={top + dy} r={0.9} fill={C.pollen} opacity={0.8} />
          ))}
        </g>
      )}
    </>
  );
}

// ---------- Hoa đồng tiền ----------
function Gerbera({ stage }: { stage: number }) {
  const top = stage === 3 ? 66 : 50;
  return (
    <>
      <Soil />
      {/* cụm lá sát gốc */}
      <Leaf x={60} y={126} len={stage === 2 ? 30 : 28} w={8.5} rot={-72} fill={C.leaf2} vein={C.leaf3} />
      <Leaf x={60} y={126} len={stage === 2 ? 30 : 28} w={8.5} rot={70} fill={C.leaf1} vein={C.leaf2} />
      <Leaf x={60} y={126} len={stage === 2 ? 26 : 24} w={7.5} rot={-38} fill={C.leaf3} vein={C.leaf2} />
      <Leaf x={60} y={126} len={stage === 2 ? 26 : 24} w={7.5} rot={36} fill={C.leaf2} vein={C.leaf3} />
      {stage === 2 && <Leaf x={60} y={126} len={20} w={6} rot={2} fill={C.leaf1} vein={C.leaf2} />}
      {stage >= 3 && <path d={`M60 124 C58 106 62 ${top + 22} 60 ${top}`} stroke={C.leaf2} strokeWidth={2.6} fill="none" strokeLinecap="round" />}
      {stage === 3 && (
        <>
          <ellipse cx={60} cy={top - 4} rx={5} ry={6.5} fill={C.gerbera2} />
          {[-40, 0, 40].map((r) => (
            <Leaf key={r} x={60} y={top + 1} len={8} w={3} rot={r} fill={C.leaf3} />
          ))}
        </>
      )}
      {stage === 4 && (
        <g>
          {Array.from({ length: 20 }).map((_, i) => (
            <Leaf key={`o${i}`} x={60} y={top - 8} len={22} w={3.8} rot={i * 18} fill={C.gerbera} />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <Leaf key={`i${i}`} x={60} y={top - 8} len={13} w={2.8} rot={i * 18 + 9} fill={C.gerbera2} />
          ))}
          <circle cx={60} cy={top - 8} r={6.2} fill={C.pollen} />
          <circle cx={60} cy={top - 8} r={3.6} fill={C.trunk} />
        </g>
      )}
    </>
  );
}

// ---------- Hoa hồng ----------
function RoseLeaves({ x, y, side }: { x: number; y: number; side: 1 | -1 }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x + side * 13} ${y - 7}`} stroke={C.leaf3} strokeWidth={1.4} strokeLinecap="round" />
      <Leaf x={x + side * 13} y={y - 7} len={10} w={4.8} rot={side * 62} fill={C.leaf2} vein={C.leaf3} />
      <Leaf x={x + side * 8} y={y - 4.5} len={8} w={4} rot={side * 20} fill={C.leaf1} />
      <Leaf x={x + side * 8} y={y - 4.5} len={8} w={4} rot={side * 118} fill={C.leaf2} />
    </g>
  );
}

function Thorns({ ys }: { ys: number[] }) {
  return (
    <>
      {ys.map((y, i) => (
        <path key={y} d={i % 2 ? `M60.5 ${y} l3.6 -1.4 l-3.6 -1.6 Z` : `M59.5 ${y} l-3.6 -1.4 l3.6 -1.6 Z`} fill={C.leaf3} />
      ))}
    </>
  );
}

function Rose({ stage }: { stage: number }) {
  const top = stage === 2 ? 86 : stage === 3 ? 62 : 56;
  return (
    <>
      <Soil />
      <path d={`M60 126 C59 110 61 ${top + 24} 60 ${top}`} stroke={C.leaf3} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Thorns ys={stage === 2 ? [116, 104] : [118, 108, 96, 84, 74]} />
      <RoseLeaves x={60} y={stage === 2 ? 112 : 108} side={-1} />
      <RoseLeaves x={60} y={stage === 2 ? 100 : 94} side={1} />
      {stage >= 3 && <RoseLeaves x={60} y={80} side={-1} />}
      {stage === 2 && <Leaf x={60} y={88} len={12} w={5} rot={0} fill={C.leaf1} />}
      {stage === 3 && (
        <>
          <path d={`M60 ${top + 2} C52 ${top - 4} 54 ${top - 16} 60 ${top - 19} C66 ${top - 16} 68 ${top - 4} 60 ${top + 2} Z`} fill={C.rose2} />
          <path d={`M60 ${top - 19} C63 ${top - 14} 64 ${top - 6} 60 ${top + 1}`} stroke={C.rose} strokeWidth={1.6} fill="none" />
          <Leaf x={60} y={top + 2} len={12} w={3.6} rot={-34} fill={C.leaf2} />
          <Leaf x={60} y={top + 2} len={12} w={3.6} rot={32} fill={C.leaf3} />
        </>
      )}
      {stage === 4 && (
        <g>
          {/* nụ phụ */}
          <path d="M60 88 C66 84 70 78 73 70" stroke={C.leaf3} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <path d="M73 71 C69 67 70 60 73 58 C76 60 77 67 73 71 Z" fill={C.rose2} />
          <Leaf x={73} y={71} len={7} w={2.6} rot={-30} fill={C.leaf2} />
          <Leaf x={73} y={71} len={7} w={2.6} rot={30} fill={C.leaf2} />
          {/* đài hoa */}
          <Leaf x={60} y={top} len={12} w={3.6} rot={-118} fill={C.leaf2} />
          <Leaf x={60} y={top} len={12} w={3.6} rot={118} fill={C.leaf3} />
          {/* bông hồng nở: các lớp cánh */}
          <circle cx={60} cy={top - 13} r={15} fill={C.rose2} />
          <Leaf x={60} y={top - 6} len={17} w={9} rot={-62} fill={C.rose2} />
          <Leaf x={60} y={top - 6} len={17} w={9} rot={62} fill={C.rose2} />
          <path d={`M45 ${top - 12} C45 ${top + 2} 75 ${top + 2} 75 ${top - 12} C69 ${top - 5} 51 ${top - 5} 45 ${top - 12} Z`} fill={C.rose} />
          <circle cx={60} cy={top - 16} r={8.5} fill={C.rose} />
          <path d={`M54 ${top - 15} C54 ${top - 23} 66 ${top - 23} 66 ${top - 15} C66 ${top - 10} 58 ${top - 10} 58 ${top - 15} C58 ${top - 18} 62 ${top - 18} 62 ${top - 15}`} stroke={C.rose2} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d={`M47 ${top - 10} C52 ${top - 6} 68 ${top - 6} 73 ${top - 10}`} stroke={C.rose2} strokeWidth={1.2} fill="none" strokeOpacity={0.7} />
        </g>
      )}
    </>
  );
}

/** Lá rụng nằm dưới gốc khi cây héo rõ */
function FallenLeaves() {
  return (
    <g opacity={0.85}>
      <Leaf x={36} y={127} len={11} w={4} rot={-100} fill={C.trunk} />
      <Leaf x={86} y={129} len={9} w={3.5} rot={78} fill={C.petalShade} />
      <Leaf x={74} y={131} len={8} w={3.2} rot={110} fill={C.trunk} />
    </g>
  );
}

const WILT_FILTER = ['', 'saturate(0.6) sepia(0.15) brightness(0.98)', 'saturate(0.38) sepia(0.38) brightness(0.95)'];
/** Cây héo thì rũ xuống: ngả sang một bên và thấp đi một chút, gốc và đất giữ nguyên */
const WILT_DROOP = ['', 'translate(60 128) skewX(-7) scale(1 0.96) translate(-60 -128)', 'translate(60 128) skewX(-15) scale(1 0.88) translate(-60 -128)'];

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
  /** 0 = tươi, 1 = hơi héo (3 ngày chưa tưới), 2 = héo rõ (7 ngày) */
  wilt?: 0 | 1 | 2;
  size?: number;
  className?: string;
  sway?: boolean;
}) {
  const st = Math.max(0, Math.min(4, Math.round(stage)));
  let body;
  if (st === 0) body = <Seed />;
  else if (st === 1 && species === 'xuong-rong') body = <Cactus stage={1} />;
  else if (st === 1) body = <Sprout />;
  else if (species === 'sen') body = <Lotus stage={st} />;
  else if (species === 'ly') body = <Lily stage={st} />;
  else if (species === 'linh-lan') body = <LilyOfValley stage={st} />;
  else if (species === 'tan-tron') body = <RoundTree stage={st} />;
  else if (species === 'la-kim') body = <Conifer stage={st} />;
  else if (species === 'xuong-rong') body = <Cactus stage={st} />;
  else if (species === 'huong-duong') body = <Sunflower stage={st} />;
  else if (species === 'dong-tien') body = <Gerbera stage={st} />;
  else if (species === 'hong') body = <Rose stage={st} />;
  else body = <Pine stage={st} />;
  // Hạt giống nằm dưới đất nên không rũ; từ lúc nảy mầm trở đi mới thấy héo
  const droop = st > 0 ? WILT_DROOP[wilt] : '';
  const wiltName = wilt === 2 ? ', đang héo' : wilt === 1 ? ', hơi héo' : '';

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={className}
      role="img"
      aria-label={`${plantName(species)}, giai đoạn ${st + 1} trên 5${wiltName}`}
      style={wilt ? { filter: WILT_FILTER[wilt], transition: 'filter .6s' } : { transition: 'filter .6s' }}
    >
      <g className={sway && wilt < 2 ? 'k-sway' : undefined} style={{ transformOrigin: '60px 128px', transformBox: 'view-box' }}>
        <g transform={droop || undefined}>{body}</g>
      </g>
      {wilt === 2 && st >= 2 && <FallenLeaves />}
    </svg>
  );
}
