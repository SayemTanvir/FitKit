import { useState } from 'react';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { SocialActivity } from '../types';
import { reactToFeed } from '../services/api';
import UserAvatar from './UserAvatar';
import ReactionBar from './ReactionBar';
import { reactions, type ReactionType } from '../services/reactions';

export default function SocialFeed({ activities }: { activities: SocialActivity[] }) {
  return <div className="glass rounded-2xl p-6 flex flex-col"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-lime-300" /><h2 className="font-display font-semibold text-lg text-white">Social Feed</h2></div><Link to="/community" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Open community →</Link></div>{activities.length===0?<p className="text-sm text-slate-400 py-6">No visible activity yet.</p>:<div className="space-y-4 overflow-y-auto max-h-[640px] pr-1">{activities.map((activity)=><ActivityItem key={activity.id} activity={activity}/>)}</div>}</div>;
}

function ActivityItem({ activity }: { activity: SocialActivity }) {
  const initial=Object.fromEntries(reactions.map(([type,emoji])=>[type,activity.reactions.find((item)=>item.emoji===emoji)?.count||0])) as Record<ReactionType,number>;
  const [counts,setCounts]=useState(initial);
  const [active,setActive]=useState<ReactionType|null>(reactions.find(([,emoji])=>emoji===activity.activeReaction)?.[0]||null);
  const [saving,setSaving]=useState(false);
  let member=false;try{member=JSON.parse(localStorage.getItem('user')||'{}').role==='Member';}catch{ /* signed-out fallback */ }
  const toggle=async(type:ReactionType)=>{
    if(!member||saving)return;
    setSaving(true);
    try{const result=await reactToFeed(Number(activity.id),type);setCounts({Fire:Number(result.fire_count||0),Flex:Number(result.flex_count||0),Clap:Number(result.clap_count||0)});setActive(result.my_reaction||null);}
    catch(error:any){toast.error(error.message||'Could not save reaction');}
    finally{setSaving(false);}
  };
  return <article className="pb-4 border-b border-white/10 last:border-0 last:pb-0"><div className="flex items-center gap-2.5"><UserAvatar name={activity.name} photoUrl={activity.photoUrl} gradient={activity.avatarGradient} /><div className="min-w-0"><p className="text-sm text-slate-200"><Link to={activity.userId?`/profile/${activity.userId}`:'/profile'} className="font-semibold text-white hover:text-lime-400 transition-colors">{activity.name}</Link>{' '}{activity.message}</p><p className="text-[11px] text-slate-500">{activity.timeAgo}</p></div></div><div className="mt-2.5 ml-[42px]"><ReactionBar counts={counts} active={active} onReact={toggle} disabled={!member||saving}/></div></article>;
}
