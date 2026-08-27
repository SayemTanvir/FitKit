import { useEffect, useId, useState, type ReactNode } from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  icon?: ReactNode;
}

export default function CircularProgress({
  value,
  max,
  size = 72,
  strokeWidth = 9,
  colorFrom = '#a3e635',
  colorTo = '#22d3ee',
  icon,
}: CircularProgressProps) {
  const gradientId = `grad-${useId().replace(/[:]/g, '')}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOffset(circumference * (1 - progress));
    });
    return () => cancelAnimationFrame(frame);
  }, [circumference, progress]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      {icon && <div className="absolute inset-0 flex items-center justify-center">{icon}</div>}
    </div>
  );
}
