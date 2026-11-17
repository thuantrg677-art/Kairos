// Tranh nền phẳng ở đầu mỗi màn hình: bầu trời rộng + đồi/núi/cây theo từng theme.
// Lấy cảm hứng từ các hình tham khảo (núi tuyết, tán cây, linh lan, bộ cây phẳng), không sao chép.

import { useId } from 'react';
import { useStore } from '@/lib/store';
import type { ThemeId } from '@/lib/types';

const V = (name: string) => `var(--k-${name})`;

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -7 C0.6 -2 2 -0.6 7 0 C2 0.6 0.6 2 0 7 C-0.6 2 -2 0.6 -7 0 C-2 -0.6 -0.6 -2 0 -7 Z"
      fill="#fff"
      opacity={0.95}
    />
  );
}

function Bird({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-6 0 Q-3 -4 0 0 Q3 -4 6 0 Q3 -2 0 1.5 Q-3 -2 -6 0 Z"
      fill={V('leaf-3')}
    />
  );
}

/** Một cụm tán lá: nhiều hình tròn chồng lên nhau, có viền kem phía sau */
function Canopy({ x, y, s = 1, flip }: { x: number; y: number; s?: number; flip?: boolean }) {
  const dots: [number, number, number, string][] = [
    [0, 0, 34, 'leaf-2'],
    [34, 10, 26, 'leaf-2'],
    [-30, 14, 24, 'leaf-2'],
    [14, 30, 24, 'leaf-2'],
    [-12, -8, 18, 'leaf-1'],
    [30, 2, 13, 'leaf-1'],
    [-28, 22, 12, 'leaf-3'],
    [16, 34, 12, 'leaf-3'],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {dots.slice(0, 4).map(([cx, cy, r], i) => (
        <circle key={'o' + i} cx={cx} cy={cy} r={r + 5} fill={V('surface')} opacity={0.75} />
      ))}
      {dots.map(([cx, cy, r, c], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={V(c)} />
      ))}
      <path d="M-4 54 L2 16 M2 30 L-12 12 M2 26 L18 8" stroke={V('leaf-3')} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.85} />
    </g>
  );
}

function MiniTree({ x, y, kind, s = 1 }: { x: number; y: number; kind: 'round' | 'pine'; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-2.5} y={-12} width={5} height={12} fill={V('trunk')} />
      {kind === 'round' ? (
        <>
          <circle cx={0} cy={-24} r={15} fill={V('leaf-2')} />
          <circle cx={-6} cy={-29} r={8} fill={V('leaf-1')} />
          <circle cx={8} cy={-18} r={7} fill={V('leaf-3')} />
        </>
      ) : (
        <>
          <path d="M0 -44 L13 -10 L-13 -10 Z" fill={V('leaf-2')} />
          <path d="M0 -44 L13 -10 L0 -10 Z" fill={V('leaf-3')} />
        </>
      )}
    </g>
  );
}

function Motif({ theme }: { theme: ThemeId }) {
  switch (theme) {
    case 'dinh-tuyet':
      return (
        <g transform="translate(0 18)">
          {/* sườn tối phía sau */}
          <path d="M150 190 L262 44 L286 30 L300 40 L318 34 L420 150 L420 190 Z" fill={V('hill-3')} />
          <path d="M262 44 L286 30 L300 40 L318 34 L352 74 C330 80 322 110 330 180 L240 180 Z" fill={V('hill-2')} />
          {/* sườn tuyết sáng */}
          <path d="M-20 180 C60 150 150 120 205 92 C240 74 252 58 262 44 L286 30 C290 60 268 96 276 120 C284 146 310 160 330 180 Z" fill={V('hill-1')} />
          <path d="M276 120 C284 146 310 160 330 180 L250 180 C262 160 270 140 276 120 Z" fill={V('hill-2')} opacity={0.7} />
          {/* những người leo núi nhỏ xíu */}
          {[
            [208, 91],
            [220, 85],
            [246, 66],
          ].map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y - 5} r={1.6} fill={V('ink')} />
              <rect x={x - 1.6} y={y - 3.6} width={3.2} height={5} rx={1} fill={V('accent')} />
            </g>
          ))}
        </g>
      );
    case 'linh-lan':
      return (
        <>
          <path d="M-20 180 C-10 110 60 86 110 108 C150 60 250 62 280 112 C330 92 400 110 420 180 Z" fill={V('hill-3')} opacity={0.75} />
          <path d="M40 180 C60 140 120 132 150 150 C190 120 260 128 290 180 Z" fill={V('hill-2')} opacity={0.8} />
          <circle cx={70} cy={182} r={30} fill={V('hill-1')} />
          <circle cx={112} cy={188} r={24} fill={V('hill-1')} />
          <circle cx={300} cy={186} r={32} fill={V('hill-1')} />
          <circle cx={344} cy={190} r={22} fill={V('hill-1')} />
          <Sparkle x={300} y={96} s={1.2} />
          <Sparkle x={338} y={62} s={1.5} />
          <Sparkle x={262} y={118} s={0.9} />
          <Sparkle x={218} y={54} s={0.8} />
        </>
      );
    case 'giay-kem':
    case 'trang-den':
      return (
        <>
          <path d="M-20 180 L-20 150 C80 138 300 138 420 150 L420 180 Z" fill={V('hill-1')} opacity={0.55} />
          <MiniTree x={48} y={152} kind="pine" s={1.5} />
          <MiniTree x={104} y={150} kind="round" s={1.5} />
          <MiniTree x={170} y={148} kind="round" s={1.1} />
          <MiniTree x={236} y={148} kind="pine" s={1.2} />
          <MiniTree x={296} y={150} kind="round" s={1.7} />
          <MiniTree x={358} y={152} kind="pine" s={1.4} />
        </>
      );
    case 'pastel':
      return (
        <>
          <g fill={V('surface')} opacity={0.85}>
            <ellipse cx={250} cy={104} rx={30} ry={10} />
            <ellipse cx={266} cy={96} rx={18} ry={10} />
            <ellipse cx={330} cy={78} rx={30} ry={10} />
            <ellipse cx={314} cy={70} rx={18} ry={10} />
          </g>
          <path d="M-20 180 C40 120 140 112 200 150 C250 116 350 118 420 160 L420 180 Z" fill={V('hill-2')} />
          <path d="M-20 180 C60 146 130 146 190 168 C260 140 340 150 420 172 L420 180 Z" fill={V('hill-1')} />
          <path d="M120 180 C170 160 250 160 300 180 Z" fill={V('hill-3')} opacity={0.8} />
        </>
      );
    default:
      // Tán rừng: đồi xanh, hai cụm tán lá ở hai góc, vài cánh chim giữa trời
      return (
        <>
          <path d="M-20 180 C50 128 150 122 220 156 C270 126 360 128 420 158 L420 180 Z" fill={V('hill-1')} />
          <path d="M-20 180 C70 150 150 150 210 170 C280 146 350 152 420 170 L420 180 Z" fill={V('hill-2')} />
          <path d="M150 180 C200 164 280 164 330 180 Z" fill={V('hill-3')} opacity={0.85} />
          <Canopy x={346} y={98} s={0.92} flip />
          <Canopy x={36} y={150} s={0.5} />
          <Bird x={236} y={62} />
          <Bird x={258} y={78} s={0.8} />
          <Bird x={224} y={86} s={0.7} />
        </>
      );
  }
}

export function Scenery({ className, theme: forced }: { className?: string; theme?: ThemeId }) {
  const stored = useStore((s) => s.profile?.theme);
  const theme = forced ?? stored ?? ((document.documentElement.dataset.theme as ThemeId) || 'tan-rung');
  const id = useId();
  return (
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={V('sky-1')} />
          <stop offset="1" stopColor={V('sky-2')} />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill={`url(#${id})`} />
      <Motif theme={theme} />
    </svg>
  );
}
