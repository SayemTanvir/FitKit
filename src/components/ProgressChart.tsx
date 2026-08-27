export function ProgressChart() {
  return <div className="chart-wrap">
    <div className="chart-y"><span>12k</span><span>8k</span><span>4k</span><span>0</span></div>
    <div className="chart-area">
      <div className="chart-grid"><i/><i/><i/><i/></div>
      <svg viewBox="0 0 700 250" preserveAspectRatio="none" className="line-chart">
        <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(139,92,246,.25)"/><stop offset="100%" stopColor="rgba(139,92,246,0)"/></linearGradient></defs>
        <path d="M0 130 C50 100 65 115 105 88 S170 120 210 74 S280 105 315 62 S380 94 420 50 S480 88 525 42 S590 92 630 56 S675 75 700 35 L700 250 L0 250 Z" fill="url(#area)" />
        <path d="M0 130 C50 100 65 115 105 88 S170 120 210 74 S280 105 315 62 S380 94 420 50 S480 88 525 42 S590 92 630 56 S675 75 700 35" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-x">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x => <span key={x}>{x}</span>)}</div>
    </div>
  </div>
}
