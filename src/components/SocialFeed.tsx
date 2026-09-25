import { useState } from 'react';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import toast from 'react-hot-toast';
import type { SocialActivity } from '../types';
import { reactToFeed } from '../services/api';
import UserAvatar from './UserAvatar';
import ReactionBar from './ReactionBar';
import { reactions, type ReactionType } from '../services/reactions';

export default function SocialFeed({ activities, loading = false, hasMore = false, error = '', onLoadMore = () => {} }: {
  activities: SocialActivity[];
  loading?: boolean;
  hasMore?: boolean;
  error?: string;
  onLoadMore?: () => void;
}) {
  return <div className="glass rounded-2xl p-6 flex flex-col"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-lime-300" /><h2 className="font-display font-semibold text-lg text-white">Social Feed</h2></div><Link to="/community" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Open community →</Link></div>{activities.length===0&&!loading?(error?<div className="py-6"><p role="alert" className="text-sm text-red-300">{error}</p><button type="button" onClick={onLoadMore} className="text-xs text-cyan-300 mt-2">Retry</button></div>:<p className="text-sm text-slate-400 py-6">No visible activity yet.</p>):activities.length===0?<p className="text-sm text-slate-400 py-6">Loading activity...</p>:<Virtuoso
    data={activities}
    computeItemKey={(_, activity) => activity.id}
    itemContent={(_, activity) => <ActivityItem activity={activity} />}
    endReached={() => { if (hasMore && !loading && !error) onLoadMore(); }}
    increaseViewportBy={{ top: 240, bottom: 480 }}
    style={{ height: 'min(640px, 70vh)' }}
    components={{
      Footer: () => <div className="py-4 text-center text-xs text-slate-500">{error ? <button type="button" onClick={onLoadMore} className="text-cyan-300 hover:text-cyan-200">Could not load more activity. Retry</button> : loading ? 'Loading more activity...' : hasMore ? null : 'You are all caught up.'}</div>,
    }}
  />}</div>;
}

function ActivityItem({ activity }: { activity: SocialActivity }) {
  const initial=Object.fromEntries(reactions.map(([type,emoji])=>[type,activity.reactions.find((item)=>item.emoji===emoji)?.count||0])) as Record<ReactionType,number>;
  const [counts,setCounts]=useState(initial);
  const [active,setActive]=useState<ReactionType|null>(reactions.find(([,emoji])=>emoji===activity.activeReaction)?.[0]||null);
  const [saving,setSaving]=useState(false);
  let member=false;try{member=['Member','Admin'].includes(JSON.parse(localStorage.getItem('user')||'{}').role);}catch{ /* signed-out fallback */ }
  const toggle=async(type:ReactionType)=>{
    if(!member||saving)return;
    setSaving(true);
    try{const result=await reactToFeed(Number(activity.id),type);setCounts({Fire:Number(result.fire_count||0),Flex:Number(result.flex_count||0),Clap:Number(result.clap_count||0)});setActive(result.my_reaction||null);}
    catch(error:any){toast.error(error.message||'Could not save reaction');}
    finally{setSaving(false);}
  };
  return <article className="pb-4 border-b border-white/10 last:border-0 last:pb-0"><div className="flex items-center gap-2.5"><UserAvatar name={activity.name} photoUrl={activity.photoUrl} gradient={activity.avatarGradient} /><div className="min-w-0"><p className="text-sm text-slate-200"><Link to={activity.userId?`/profile/${activity.userId}`:'/profile'} className="font-semibold text-white hover:text-lime-400 transition-colors">{activity.name}</Link>{' '}{activity.message}</p><p className="text-[11px] text-slate-500">{activity.timeAgo}</p></div></div><div className="mt-2.5 ml-[42px]"><ReactionBar counts={counts} active={active} onReact={toggle} disabled={!member||saving}/></div></article>;
}
