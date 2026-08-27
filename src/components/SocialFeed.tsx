import { useState } from 'react';
import { Users } from 'lucide-react';
import type { SocialActivity } from '../types';

interface SocialFeedProps {
  activities: SocialActivity[];
}

export default function SocialFeed({ activities }: SocialFeedProps) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-lg text-white">Social Feed</h2>
        <Users className="w-4 h-4 text-slate-400" />
      </div>
      <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: SocialActivity }) {
  const [reactions, setReactions] = useState(activity.reactions);
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);

  const toggleReaction = (emoji: string) => {
    const isActivating = activeEmoji !== emoji;

    setReactions((prev) =>
      prev.map((r) => {
        if (r.emoji === emoji) {
          return { ...r, count: isActivating ? r.count + 1 : r.count - 1 };
        }
        // if switching from a different active reaction, undo that one
        if (r.emoji === activeEmoji) {
          return { ...r, count: r.count - 1 };
        }
        return r;
      })
    );
    setActiveEmoji(isActivating ? emoji : null);
  };

  return (
    <article className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${activity.avatarGradient} flex items-center justify-center text-[11px] font-bold text-slate-900 shrink-0`}
        >
          {activity.initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-white">{activity.name}</span> {activity.message}
          </p>
          <p className="text-[11px] text-slate-500">{activity.timeAgo}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-2.5 ml-[42px]">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            onClick={() => toggleReaction(r.emoji)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activeEmoji === r.emoji
                ? 'bg-lime-400/20 border-lime-400/50 text-lime-100'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {r.emoji} <span className="font-mono-fk">{r.count}</span>
          </button>
        ))}
      </div>
    </article>
  );
}
