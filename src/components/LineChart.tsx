'use client';

import { useMemo } from 'react';

type Point = { x: Date; y: number };

export default function LineChart({ points }: { points: Point[] }) {
  const dims = { width: 800, height: 280, padding: 32 };
  const { path, area, minY, maxY } = useMemo(() => {
    if (points.length === 0) return { path: '', area: '', minY: 0, maxY: 0 };
    const sorted = [...points].sort((a, b) => a.x.getTime() - b.x.getTime());
    const minX = sorted[0].x.getTime();
    const maxX = sorted[sorted.length - 1].x.getTime();
    const minYVal = Math.min(...sorted.map((p) => p.y));
    const maxYVal = Math.max(...sorted.map((p) => p.y));
    const xScale = (value: number) =>
      minX === maxX ? dims.padding : ((value - minX) / (maxX - minX)) * (dims.width - dims.padding * 2) + dims.padding;
    const yScale = (value: number) =>
      maxYVal === minYVal ? dims.height / 2 : dims.height - dims.padding - ((value - minYVal) / (maxYVal - minYVal)) * (dims.height - dims.padding * 2);

    const pathCommands = sorted.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${xScale(p.x.getTime())},${yScale(p.y)}`).join(' ');
    const areaCommands = `${pathCommands} L${dims.width - dims.padding},${dims.height - dims.padding} L${dims.padding},${dims.height - dims.padding} Z`;
    return { path: pathCommands, area: areaCommands, minY: minYVal, maxY: maxYVal };
  }, [points, dims.height, dims.padding, dims.width]);

  return (
    <svg viewBox={`0 0 ${dims.width} ${dims.height}`} className="chart" role="img" aria-label="Price history chart">
      <defs>
        <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {area && <path d={area} className="chart-area" />}
      {path && <path d={path} stroke="url(#lineGradient)" />}
      <text x={dims.padding} y={dims.padding} fill="var(--muted)" fontSize="12">
        Min: {minY.toFixed(2)}
      </text>
      <text x={dims.padding} y={dims.padding + 16} fill="var(--muted)" fontSize="12">
        Max: {maxY.toFixed(2)}
      </text>
    </svg>
  );
}
