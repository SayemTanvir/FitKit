import { useEffect, useState } from 'react';
import SocialFeed from '../components/SocialFeed';

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
        // Safe mapping to prevent undefined .map() crashes in SocialFeed.tsx
        const safeActivities = data.map((item) => {
          const userName = item.user_name || item.author || item.user?.name || 'FitKit Member';
          const messageText = item.content || item.message || item.description || 'Completed a workout session';

          return {
            id: String(item.id || item.feed_id || Math.random()),
            content: messageText,
            message: messageText,
            activity: messageText,
            user: {
              name: typeof item.user === 'string' ? item.user : userName,
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
            },
            userName: userName,
            timestamp: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            likes: 0,
            // Fallback empty arrays to prevent crashes on .map()
            comments: [],
            reactions: [],
            tags: [],
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