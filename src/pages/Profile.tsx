import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import { fetchMyProfile } from '../services/api';
import type { Achievement } from '../types';
import UserAvatar from '../components/UserAvatar';

export default function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    fetchMyProfile(userId)
      .then((data) => {
        setProfile(data.user);
        setAchievements(
          data.achievements.map((achievement: any) => ({
            id: String(achievement.id),
            label: achievement.label,
            icon: achievement.label.toLowerCase().includes('10k') ? 'footprints' : 'dumbbell',
            locked: !achievement.earned_date,
          }))
        );
      })
      .catch((requestError) => setError(requestError.message));
  }, [userId]);

  if (error) {
    return <div className="glass rounded-2xl p-8 text-red-300">{error}</div>;
  }

  if (!profile) {
    return <div className="glass rounded-2xl p-8 text-slate-400">Loading profile...</div>;
  }

  const months = Number(profile.membership_months || 0);
  const rankTargets: Record<string, { next: string; months: number }> = {
    Bronze: { next: 'Silver Member', months: 12 },
    Silver: { next: 'Gold Member', months: 36 },
    Gold: { next: 'Platinum Member', months: 60 },
    Platinum: { next: 'Diamond Member', months: 120 },
    Diamond: { next: 'Top Rank', months: 120 },
  };
  const target = rankTargets[profile.membership_rank] || rankTargets.Bronze;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="glass rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-2"><UserAvatar name={profile.name} photoUrl={profile.photo_url} className="w-14 h-14"/><h1 className="font-display font-semibold text-2xl text-white">{profile.name}</h1></div>
        <p className="text-slate-400 text-sm">{profile.role}{profile.email ? ` · ${profile.email}` : ''}</p>
        {profile.country_name && <p className="text-slate-400 text-sm mt-1">{profile.country_name}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-sm">
          <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500 text-xs">Fitness level</p><p className="text-white mt-1">{profile.fitness_level || 'Not set'}</p></div>
          <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500 text-xs">Primary goal</p><p className="text-white mt-1">{profile.primary_goal || 'Not set'}</p></div>
          {profile.height_cm && <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500 text-xs">Height</p><p className="text-white mt-1">{profile.height_cm} cm</p></div>}
          {profile.weight_kg && <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-500 text-xs">Weight</p><p className="text-white mt-1">{profile.weight_kg} kg</p></div>}
        </div>
      </div>

      <Leaderboard
        currentRank={`${profile.membership_rank} Member`}
        nextRank={target.next}
        tenure={`${months} months`}
        xpCurrent={Math.min(months, target.months)}
        xpTarget={target.months}
        achievements={achievements}
      />
    </div>
  );
}
