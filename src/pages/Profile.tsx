import { useParams } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import { achievements, rankInfo } from '../data/mockData';

export default function Profile() {
  const { userId } = useParams();
  const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  
  // If a specific userId is passed, you can fetch that user's profile data here.
  // Otherwise, fallback to the current logged-in user.
  const profileTitle = userId ? `Member Profile #${userId}` : `${currentUser?.name || 'User'} Profile`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="glass rounded-2xl p-8">
        <h1 className="font-display font-semibold text-2xl text-white mb-2">{profileTitle}</h1>
        <p className="text-slate-400 text-sm">View account details, rank progress, and achievements.</p>
      </div>
      <Leaderboard
        currentRank={rankInfo.currentRank}
        nextRank={rankInfo.nextRank}
        tenure={rankInfo.tenure}
        xpCurrent={rankInfo.xpCurrent}
        xpTarget={rankInfo.xpTarget}
        achievements={achievements}
      />
    </div>
  );
}