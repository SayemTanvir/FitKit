import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WorkoutPlans from './pages/WorkoutPlans';
import Progress from './pages/Progress';
import Social from './pages/Social';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<WorkoutPlans />} />
          <Route path="/activity" element={<Progress />} />
          <Route path="/social" element={<Social />} />
          <Route path="/achievements" element={<Profile />} />
          <Route path="/settings" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
