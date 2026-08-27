interface ProgressBarProps {
  value: number;
  max: number;
  gradientFrom?: string; // e.g. "from-lime-400"
  gradientTo?: string; // e.g. "to-cyan-400"
  heightClass?: string; // e.g. "h-1.5"
  className?: string;
}

export default function ProgressBar({
  value,
  max,
  gradientFrom = 'from-lime-400',
  gradientTo = 'to-cyan-400',
  heightClass = 'h-1.5',
  className = '',
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full ${heightClass} rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradientFrom} ${gradientTo} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
