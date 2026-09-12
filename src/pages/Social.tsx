import { useEffect, useState } from 'react';
import SocialFeed from '../components/SocialFeed';

// Helper function for relative time ("12 minutes ago", "2 hours ago", etc.)
function getRelativeTime(timestamp: string | Date) {
  if (!timestamp) return 'Just now';
  const now = new Date().getTime();
  const past = new Date(timestamp).getTime();
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

// Helper for initials
function getInitials(name: string) {
  return name
    .trim()
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'FK';
}

// Preset gradients matching your theme
const gradients = [
  'from-emerald-400 to-cyan-500',
  'from-lime-400 to-emerald-500',
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-pink-500',
];

export default function Social() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadFeed = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/social/feed', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        const safeActivities = data.map((item, index) => {
          const userName = item.user_name || item.author || item.user?.name || 'FitKit Member';
          let messageText = item.content || item.message || item.description || 'Completed a workout session';
          //
          if (messageText.startsWith(userName)) {
            messageText = messageText.slice(userName.length).trim();
          }
          return {
            id: String(item.id || item.feed_id || Math.random()),
            name: userName,
            message: messageText,
            timeAgo: getRelativeTime(item.timestamp),
            initials: getInitials(userName),
            avatarGradient: gradients[index % gradients.length],
            reactions: [
              { emoji: '🔥', count: 14 + (index % 5) },
              { emoji: '💪', count: 6 + (index % 3) },
              { emoji: '👏', count: 3 + (index % 2) }
            ],
            ...item
          };
        });
        setActivities(safeActivities);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      {loading ? (
        <p className="text-slate-400 text-sm">Loading feed...</p>
      ) : activities.length === 0 ? (
        <p className="text-slate-500 text-sm">No activities logged yet. Go to Daily Activity Logs to record one!</p>
      ) : (
        <SocialFeed activities={activities} />
      )}
    </div>
  );
}