import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import IntroReveal from "./components/IntroReveal";
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
  const activeRole=currentRole();
  return activeRole === role || (role === 'Member' && activeRole === 'Admin') ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <IntroReveal />
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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login mode="signup" />} />

        {/* Protected app views */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<RequireRole role="Admin"><AdminOverview /></RequireRole>} />
          <Route path="/workouts" element={<WorkoutPlans />} />
          <Route path="/activity" element={<RequireRole role="Member"><Progress /></RequireRole>} />
          <Route path="/social" element={<Social />} />
          <Route path="/achievements" element={<RequireRole role="Member"><Profile /></RequireRole>} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/programmes" element={<ProgrammeCatalog />} />
          <Route path="/programmes/new" element={<RequireRole role="Admin"><ProgrammeBuilder /></RequireRole>} />
          <Route path="/programmes/:id/edit" element={<RequireRole role="Admin"><ProgrammeBuilder /></RequireRole>} />
          <Route path="/programmes/:id" element={<ProgrammeDetail />} />
          <Route path="/my-programmes" element={<RequireRole role="Member"><MyProgrammes /></RequireRole>} />
          <Route path="/my-programmes/:enrollmentId" element={<RequireRole role="Member"><MyProgrammeSchedule /></RequireRole>} />
          <Route path="/my-programmes/:enrollmentId/sessions/:sessionId" element={<RequireRole role="Member"><ProgrammeWorkoutSession /></RequireRole>} />
          <Route path="/exercise-library" element={<RequireRole role="Admin"><ExerciseLibrary /></RequireRole>} />
          <Route path="/community" element={<RequireRole role="Member"><CommunityFeed /></RequireRole>} />
          <Route path="/community/people" element={<RequireRole role="Member"><MemberDiscovery /></RequireRole>} />
          <Route path="/community/requests" element={<RequireRole role="Member"><CommunityRequests /></RequireRole>} />
          <Route path="/community/settings" element={<RequireRole role="Member"><CommunitySettings /></RequireRole>} />
          <Route path="/community/posts/:id" element={<RequireRole role="Member"><CommunityPost /></RequireRole>} />
          <Route path="/community/members/:id" element={<RequireRole role="Member"><CommunityProfile /></RequireRole>} />
          <Route path="/messages" element={<RequireRole role="Member"><ConversationList /></RequireRole>} />
          <Route path="/messages/:id" element={<RequireRole role="Member"><Conversation /></RequireRole>} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/moderation" element={<RequireRole role="Admin"><ModerationQueue /></RequireRole>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to={localStorage.getItem('token') ? "/dashboard" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
