import { useEffect, useState } from 'react';
import SocialFeed from '../components/SocialFeed';
import { fetchSocialFeed } from '../services/api';

export default function Social() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    try {
      const data = await fetchSocialFeed();
      if (Array.isArray(data)) {
        const formatted = data.map((item) => ({
          id: item.feed_id || String(item.feed_id),
          userName: item.member_name || 'FitKit Member',
          user: {
            name: item.member_name || 'FitKit Member',
            avatar: '',
          },
          content: item.description || item.message || 'Completed a workout session.',
          message: item.description || item.message || 'Completed a workout session.',
          activity: item.description || item.message || 'Completed a workout session.',
          activityTitle: item.activity_type || 'Workout',
          type: item.activity_type || 'workout',
          timestamp: new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          time: new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          likes: 0,
          // Arrays to prevent `.map()` runtime crashes in SocialFeed:
          comments: [],
          reactions: [],
          tags: [],
          metrics: [],
          stats: [],
          ...item,
        }));
        setActivities(formatted);
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
        <p className="text-slate-400 text-sm">Loading activities...</p>
      ) : activities.length === 0 ? (
        <p className="text-slate-500 text-sm">No public activities yet. Log a workout with "Share to Feed" checked!</p>
      ) : (
        <SocialFeed activities={activities} />
      )}
    </div>
  );
}