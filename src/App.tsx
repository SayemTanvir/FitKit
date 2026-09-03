import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkoutPlans from './pages/WorkoutPlans';
import Progress from './pages/Progress';
import Social from './pages/Social';
import Profile from './pages/Profile';

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected app views */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<WorkoutPlans />} />
          <Route path="/activity" element={<Progress />} />
          <Route path="/social" element={<Social />} />
          <Route path="/achievements" element={<Profile />} />
          <Route path="/settings" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}