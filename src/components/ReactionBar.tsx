import { reactions, type ReactionType } from '../services/reactions';

export default function ReactionBar({counts,active,onReact,disabled=false}:{counts:Record<ReactionType,number>;active:ReactionType|null;onReact:(type:ReactionType)=>void;disabled?:boolean}){
  return <div className="flex flex-wrap gap-2">{reactions.map(([type,emoji])=><button type="button" key={type} onClick={()=>onReact(type)} disabled={disabled} aria-label={`${type} reaction, ${counts[type]} total`} aria-pressed={active===type} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${active===type?'bg-lime-400/20 border-lime-400/50 text-lime-100':'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-50'}`}>{emoji} <span className="font-mono-fk">{counts[type]}</span></button>)}</div>;
}
