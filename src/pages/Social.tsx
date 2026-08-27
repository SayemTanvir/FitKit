import SocialFeed from '../components/SocialFeed';
import { socialActivities } from '../data/mockData';

export default function Social() {
  return (
    <div className="max-w-2xl">
      <SocialFeed activities={socialActivities} />
    </div>
  );
}
