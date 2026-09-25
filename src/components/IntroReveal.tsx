import { useEffect, useState } from 'react';

export default function IntroReveal() {
  const [visible, setVisible] = useState(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return sessionStorage.getItem('fitkit_intro_seen') !== 'true';
  });

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem('fitkit_intro_seen', 'true');
    const timer = window.setTimeout(() => setVisible(false), 1050);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="intro-reveal" aria-hidden="true">
      <div className="intro-mark">
        <svg viewBox="0 0 44 44">
          <polyline points="2,22 12,22 16,10 22,34 27,16 31,22 42,22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p>FITKIT</p>
      <span>TRAIN · TRACK · THRIVE</span>
    </div>
  );
}
