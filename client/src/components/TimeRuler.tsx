import type React from 'react';

const INTERVALS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];

interface Props {
  duration: number;
  zoom: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

function fmtTime(t: number, interval: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  if (interval >= 1) return `${m}:${String(Math.round(s)).padStart(2, '0')}`;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export function TimeRuler({ duration, zoom, onPointerDown, onPointerMove, onPointerUp }: Props) {
  const interval = INTERVALS.find((i) => i * zoom >= 70) ?? 300;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-6; t += interval) ticks.push(Math.round(t * 1000) / 1000);

  return (
    <div
      className="time-ruler"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {ticks.map((t) => (
        <div key={t} className="ruler-tick" style={{ left: t * zoom }}>
          <span className="ruler-tick-line" />
          <span className="ruler-tick-label">{fmtTime(t, interval)}</span>
        </div>
      ))}
    </div>
  );
}
