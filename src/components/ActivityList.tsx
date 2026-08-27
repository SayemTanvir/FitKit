import { Icon } from './Icons'
import { recentActivities } from '../data'

export function ActivityList() {
  return <div className="activity-list">{recentActivities.map((item) => <div className="activity-row" key={item.id}>
    <div className="activity-icon">{item.icon}</div>
    <div className="activity-main"><strong>{item.name}</strong><span>{item.detail}</span></div>
    <div className="activity-time"><span>{item.time}</span>{item.calories && <b><Icon name="flame" size={13} /> {item.calories} kcal</b>}</div>
    <Icon name="chevron" size={17} />
  </div>)}</div>
}
