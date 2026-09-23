import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import WorkoutPlans from "./pages/WorkoutPlans";
import Progress from "./pages/Progress";
import Social from "./pages/Social";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import LeaderboardPage from "./pages/LeaderboardPage";
import { ProgrammeCatalog, ProgrammeDetail, MyProgrammes } from "./pages/Programmes";
import ProgrammeBuilder from "./pages/ProgrammeBuilder";
import { MyProgrammeSchedule, ProgrammeWorkoutSession } from "./pages/ProgrammeWorkout";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import { CommunityFeed, CommunityPost, MemberDiscovery, CommunityProfile, CommunityRequests, CommunitySettings } from "./pages/Community";
import { ConversationList, Conversation } from "./pages/Messages";
import { NotificationCenter, ModerationQueue } from "./pages/CommunityNotifications";
import AdminOverview from "./pages/AdminOverview";
import { Toaster } from "react-hot-toast";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function currentRole() {
  try { return JSON.parse(localStorage.getItem('user') || '{}').role; }
  catch { return undefined; }
}

function RequireRole({ role, children }: { role: 'Admin' | 'Member'; children: ReactNode }) {
  return currentRole() === role ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
          },
        }}
      />
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
          <Route path="/" element={currentRole() === 'Admin' ? <AdminOverview /> : <Dashboard />} />
          <Route path="/admin" element={<RequireRole role="Admin"><AdminOverview /></RequireRole>} />
          <Route path="/workouts" element={<WorkoutPlans />} />
          <Route path="/activity" element={<Progress />} />
          <Route path="/social" element={<Social />} />
          <Route path="/achievements" element={<Profile />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/programmes" element={<ProgrammeCatalog />} />
          <Route path="/programmes/new" element={<RequireRole role="Admin"><ProgrammeBuilder /></RequireRole>} />
          <Route path="/programmes/:id/edit" element={<RequireRole role="Admin"><ProgrammeBuilder /></RequireRole>} />
          <Route path="/programmes/:id" element={<ProgrammeDetail />} />
          <Route path="/my-programmes" element={<MyProgrammes />} />
          <Route path="/my-programmes/:enrollmentId" element={<MyProgrammeSchedule />} />
          <Route path="/my-programmes/:enrollmentId/sessions/:sessionId" element={<ProgrammeWorkoutSession />} />
          <Route path="/exercise-library" element={<RequireRole role="Admin"><ExerciseLibrary /></RequireRole>} />
          <Route path="/community" element={<CommunityFeed />} />
          <Route path="/community/people" element={<MemberDiscovery />} />
          <Route path="/community/requests" element={<CommunityRequests />} />
          <Route path="/community/settings" element={<CommunitySettings />} />
          <Route path="/community/posts/:id" element={<CommunityPost />} />
          <Route path="/community/members/:id" element={<CommunityProfile />} />
          <Route path="/messages" element={<ConversationList />} />
          <Route path="/messages/:id" element={<Conversation />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/moderation" element={<RequireRole role="Admin"><ModerationQueue /></RequireRole>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
