import { useEffect, useState } from 'react';
import SocialFeed from '../components/SocialFeed';
import { fetchSocialFeed } from '../services/api';
import type { SocialActivity } from '../types';

const gradients = [
  'from-emerald-400 to-cyan-500',
  'from-lime-400 to-emerald-500',
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-pink-500',
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'FK';
}

function getRelativeTime(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default function Social() {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSocialFeed()
      .then((items) => {
        setActivities(
          items.map((item, index) => {
            const name = item.user_name || 'FitKit Member';
            return {
              id: String(item.feed_id),
              userId: Number(item.user_id),
              name,
              message: item.content || 'Completed a workout',
              timeAgo: getRelativeTime(item.timestamp),
              initials: getInitials(name),
              avatarGradient: gradients[index % gradients.length],
              photoUrl: item.photo_url,
              reactions: [
                { emoji: '🔥', count: Number(item.fire_count || 0) },
                { emoji: '💪', count: Number(item.flex_count || 0) },
                { emoji: '👏', count: Number(item.clap_count || 0) },
              ],
              activeReaction: ({ Fire: '🔥', Flex: '💪', Clap: '👏' } as Record<string, string>)[item.my_reaction] || null,
            };
          })
        );
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      {loading && <p className="text-slate-400 text-sm">Loading feed...</p>}
      {error && <p className="text-red-300 text-sm">{error}</p>}
      {!loading && !error && activities.length === 0 && (
        <p className="text-slate-500 text-sm">No public activities have been logged yet.</p>
      )}
      {activities.length > 0 && <SocialFeed activities={activities} />}
    </div>
  );
}
