import { useState } from 'react'
import { WorkoutCard } from '../components/WorkoutCard'
import { workoutPlans } from '../data'
import { Icon } from '../components/Icons'

export function Workouts() {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Beginner', 'Intermediate', 'Advanced']
  const plans = filter === 'All' ? workoutPlans : workoutPlans.filter(p => p.level === filter)
  return <div className="page"><div className="page-hero"><div><span className="eyebrow">WORKOUT LIBRARY</span><h1>Train with purpose.</h1><p>Curated plans designed by FitKit admins for every fitness level.</p></div><button className="primary-btn"><Icon name="plus" size={17}/> Create log</button></div>
    <div className="filter-row">{filters.map(f => <button key={f} className={filter === f ? 'filter active' : 'filter'} onClick={() => setFilter(f)}>{f}</button>)}</div>
    <div className="workout-grid">{plans.map(p => <WorkoutCard key={p.id} plan={p} featured={p.id === 2}/>)}</div>
    <div className="exercise-library panel"><div className="section-heading"><div><span className="eyebrow">EXERCISE CATALOG</span><h2>Popular exercises</h2></div><button className="text-btn">Browse catalog <Icon name="arrow" size={14}/></button></div><div className="exercise-pills">{['Bench Press','Squat','Deadlift','Push Up','Plank','Running','Shoulder Press','Lunges'].map((x,i)=><span key={x}><b>{String(i+1).padStart(2,'0')}</b>{x}</span>)}</div></div>
  </div>
}
