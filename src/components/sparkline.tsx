export function Sparkline({
  values,
  width = 148,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={up ? "#2ec9a5" : "#e25d5d"}
        strokeWidth="1.6"
        points={pts}
      />
    </svg>
  );
}

export function CandleChart({
  bars,
  width = 720,
  height = 220,
}: {
  bars: { open: number; high: number; low: number; close: number }[];
  width?: number;
  height?: number;
}) {
  if (bars.length === 0) return null;
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = max - min || 1;
  const slot = width / bars.length;
  const y = (v: number) => height - ((v - min) / span) * (height - 8) - 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {bars.map((b, i) => {
        const x = i * slot + slot / 2;
        const up = b.close >= b.open;
        const color = up ? "#2ec9a5" : "#e25d5d";
        const top = y(Math.max(b.open, b.close));
        const bot = y(Math.min(b.open, b.close));
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(b.high)} y2={y(b.low)} stroke={color} strokeWidth="1" />
            <rect
              x={x - Math.max(1.2, slot * 0.28)}
              y={top}
              width={Math.max(2.4, slot * 0.56)}
              height={Math.max(1, bot - top)}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}
