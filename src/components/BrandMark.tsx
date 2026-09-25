import { Link } from 'react-router-dom';

export default function BrandMark({ linked = true }: { linked?: boolean }) {
  const content = (
    <>
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-lime-500/15">
        <svg viewBox="0 0 44 44" className="h-7 w-7" aria-hidden="true">
          <polyline points="2,22 12,22 16,10 22,34 27,16 31,22 42,22" fill="none" stroke="#052e16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        <span className="block font-display text-lg font-bold leading-none tracking-tight text-white">FitKit</span>
        <span className="mt-1 block text-[9px] font-semibold tracking-[0.2em] text-slate-500">TRAIN · TRACK · THRIVE</span>
      </span>
    </>
  );

  return linked ? <Link to="/" className="inline-flex items-center gap-3">{content}</Link> : <div className="inline-flex items-center gap-3">{content}</div>;
}
