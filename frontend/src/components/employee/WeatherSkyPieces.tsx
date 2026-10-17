import { Box, keyframes } from "@mui/material";

const drift = keyframes`
  0%, 100% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
`;
const glow = keyframes`
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
`;
const twinkle = keyframes`
  0%, 100% { opacity: 0.25; }
  50% { opacity: 1; }
`;
const rainDrop = keyframes`
  0% { opacity: 0; transform: translate(0, -18px); }
  25% { opacity: 0.85; }
  100% { opacity: 0; transform: translate(-8px, 52px); }
`;
const snowFall = keyframes`
  0% { opacity: 0; transform: translate(0, -14px); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(10px, 54px); }
`;
const flash = keyframes`
  0%, 86%, 100% { opacity: 0; }
  90%, 96% { opacity: 1; }
`;

const still = (name: string) => ({ "@media (prefers-reduced-motion: reduce)": { [name]: "none" } });

export function Sun({ x, y }: { x: number; y: number }) {
  return (
    <Box component="g" sx={{ animation: `${glow} 4s ease-in-out infinite`, ...still("animation") }}>
      <circle cx={x} cy={y} r={74} fill="#FFE08A" opacity={0.16} />
      <circle cx={x} cy={y} r={52} fill="#FFE08A" opacity={0.3} />
      <circle cx={x} cy={y} r={34} fill="#FFCE4A" />
    </Box>
  );
}

export function Moon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <mask id="start-door-moon-mask">
        <rect x={x - 50} y={y - 50} width={100} height={100} fill="#fff" />
        <circle cx={x + 14} cy={y - 8} r={28} fill="#000" />
      </mask>
      <circle cx={x} cy={y} r={50} fill="#F6F1D8" opacity={0.12} />
      <circle cx={x} cy={y} r={32} fill="#F6F1D8" mask="url(#start-door-moon-mask)" />
    </g>
  );
}

const STARS = [
  [210, 36, 1.8], [250, 70, 1.4], [300, 30, 2], [340, 64, 1.5], [370, 38, 1.8],
  [60, 34, 1.5], [180, 92, 1.3], [320, 100, 1.4],
] as const;

export function Stars() {
  return (
    <g fill="#fff">
      {STARS.map(([cx, cy, r], i) => (
        <Box
          key={i}
          component="circle"
          cx={cx}
          cy={cy}
          r={r}
          sx={{ animation: `${twinkle} ${2.4 + (i % 3) * 0.7}s ease-in-out ${i * 0.3}s infinite`, ...still("animation") }}
        />
      ))}
    </g>
  );
}

export function Cloud({ x, y, scale = 1, fill = "#fff", opacity = 1 }: {
  x: number;
  y: number;
  scale?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <Box component="g" sx={{ animation: `${drift} 14s ease-in-out infinite`, ...still("animation") }}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill} opacity={opacity}>
        <ellipse cx={0} cy={0} rx={50} ry={18} />
        <circle cx={-16} cy={-12} r={20} />
        <circle cx={14} cy={-20} r={26} />
        <circle cx={36} cy={-6} r={16} />
      </g>
    </Box>
  );
}

const DROPS = [60, 96, 132, 168, 204, 240, 276, 312, 348, 78, 150, 222, 294] as const;

export function Rain() {
  return (
    <g stroke="#DCEBFA" strokeWidth={2} strokeLinecap="round">
      {DROPS.map((x, i) => (
        <Box
          key={x}
          component="line"
          x1={x}
          y1={110 + (i % 3) * 14}
          x2={x - 5}
          y2={124 + (i % 3) * 14}
          sx={{ animation: `${rainDrop} 1s linear ${(i % 5) * 0.2}s infinite`, ...still("animation") }}
        />
      ))}
    </g>
  );
}

export function Snow() {
  return (
    <g fill="#fff">
      {DROPS.map((x, i) => (
        <Box
          key={x}
          component="circle"
          cx={x}
          cy={108 + (i % 4) * 12}
          r={2.6}
          sx={{ animation: `${snowFall} 3s linear ${(i % 6) * 0.5}s infinite`, ...still("animation") }}
        />
      ))}
    </g>
  );
}

export function Lightning({ x, y }: { x: number; y: number }) {
  return (
    <Box component="g" sx={{ animation: `${flash} 4.5s linear infinite`, ...still("animation") }}>
      <path
        transform={`translate(${x} ${y})`}
        d="M12 0 L-8 38 H6 L-2 70 L26 28 H12 L22 0Z"
        fill="#FFE27A"
      />
    </Box>
  );
}

export function FogBands() {
  return (
    <g fill="#fff">
      {[104, 130, 156].map((y, i) => (
        <Box
          key={y}
          component="rect"
          x={30 + i * 26}
          y={y}
          width={300 - i * 20}
          height={10}
          rx={5}
          opacity={0.55 - i * 0.1}
          sx={{ animation: `${drift} ${9 + i * 3}s ease-in-out infinite`, ...still("animation") }}
        />
      ))}
    </g>
  );
}
