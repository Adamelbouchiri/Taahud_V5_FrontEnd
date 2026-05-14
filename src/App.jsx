import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OtpPage from './pages/OtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Project pages — outside the dashboard, full-screen
import PublicProjectsPage from './pages/PublicProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import EditProjectPage from './pages/EditProjectPage';
import ApplyPage from './pages/ApplyPage';

// Per-arena browse pages. Each owns its own access gate
// (RequireArenaAccess) so the route blocks render until the user's
// access is confirmed — no flash of restricted content on refresh.
import PublicArenaPage from './pages/arenas/PublicArenaPage';
import PrivateArenaPage from './pages/arenas/PrivateArenaPage';
import SolidarityArenaPage from './pages/arenas/SolidarityArenaPage';
import DeveloperArenaPage from './pages/arenas/DeveloperArenaPage';
import IsnadArenaPage from './pages/arenas/IsnadArenaPage';

// Dashboard layout + pages
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ProfilePage from './pages/dashboard/ProfilePage';
import ComingSoonPage from './pages/dashboard/ComingSoonPage';

// Route guards
import RequireAuth from './components/RequireAuth';
import RequireGuest from './components/RequireGuest';
import RequireNonSupplier from './components/RequireNonSupplier';


/* ============================================================
 *  Routing — three guard layers
 *  ----------------------------------------------------------------
 *    RequireAuth          must have a token
 *    RequireGuest         must NOT have a token (login/register only)
 *    RequireNonSupplier   blocks suppliers from project routes
 *
 *  Most protected routes also stack RequireNonSupplier inside
 *  RequireAuth so suppliers see the "coming soon" view instead of
 *  the project page. Auth check happens first because it's the
 *  cheaper gate (no network call).
 * ============================================================ */

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppShell />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  // `dir` is read from the active language; LanguageContext also
  // mirrors it to <html dir="..."> so child portals / overlays
  // inherit the direction correctly.
  const { dir } = useTranslation();

  return (
    <div dir={dir} className="font-sans">
      <Routes>
        {/* ===== Fully public ===== */}
        <Route path="/" element={<LandingPage />} />

        {/* ===== Guest-only (auth pages) =====
            If a logged-in user lands here, bounce them to /dashboard. */}
        <Route
          path="/login"
          element={
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <RegisterPage />
            </RequireGuest>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RequireGuest>
              <ForgotPasswordPage />
            </RequireGuest>
          }
        />

        {/* /otp is special: the user always has a token by the
            time they reach it (set during register/login), but
            their phone isn't verified yet. So we require auth
            here, but don't apply the guest-only guard. */}
        <Route
          path="/otp"
          element={
            <RequireAuth>
              <OtpPage />
            </RequireAuth>
          }
        />

        {/* ===== Project flows =====
            Full-screen, no sidebar.
            - Browse routes (/projects, /projects/:arena): auth only.
              The page enforces arena viewability per the screenshot
              matrix (suppliers can see /projects/public; others see
              the arenas in their viewableBy).
            - Write routes (new, :id/apply): blocked for suppliers,
              who don't have a project flow yet. */}
        <Route
          path="/projects"
          element={
            <RequireAuth>
              <PublicProjectsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/public"
          element={<RequireAuth><PublicArenaPage /></RequireAuth>}
        />
        <Route
          path="/projects/private"
          element={<RequireAuth><PrivateArenaPage /></RequireAuth>}
        />
        <Route
          path="/projects/solidarity"
          element={<RequireAuth><SolidarityArenaPage /></RequireAuth>}
        />
        <Route
          path="/projects/arena"
          element={<RequireAuth><DeveloperArenaPage /></RequireAuth>}
        />
        <Route
          path="/projects/isnad"
          element={<RequireAuth><IsnadArenaPage /></RequireAuth>}
        />
        {/* Legacy alias — keep old links working. */}
        <Route
          path="/projects/assignment"
          element={<Navigate to="/projects/isnad" replace />}
        />
        <Route
          path="/projects/new"
          element={
            <RequireAuth>
              <RequireNonSupplier>
                <CreateProjectPage />
              </RequireNonSupplier>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <RequireAuth>
              <RequireNonSupplier>
                <ProjectDetailsPage />
              </RequireNonSupplier>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <RequireAuth>
              <RequireNonSupplier>
                <EditProjectPage />
              </RequireNonSupplier>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/apply"
          element={
            <RequireAuth>
              <RequireNonSupplier>
                <ApplyPage />
              </RequireNonSupplier>
            </RequireAuth>
          }
        />

        {/* ===== Dashboard (auth required) =====
            Suppliers can access the dashboard — DashboardHome
            shows them the supplier coming-soon view inline. */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Coming-soon features. Each renders the same component
              with a different variant preset. Add them here so the
              sidebar links resolve to a real page (not a 404). */}
          <Route path="ai-analysis" element={<ComingSoonPage variant="ai" />} />
          <Route path="analytics" element={<ComingSoonPage variant="analytics" />} />
          <Route path="reports" element={<ComingSoonPage variant="reports" />} />
          <Route path="messages" element={<ComingSoonPage variant="messages" />} />
          <Route path="notifications" element={<ComingSoonPage variant="notifications" />} />
        </Route>

        {/* ===== Legacy redirects ===== */}
        <Route path="/dashboard/projects" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard/projects/new" element={<Navigate to="/projects/new" replace />} />
        <Route path="/dashboard/browse" element={<Navigate to="/projects" replace />} />
        <Route path="/dashboard/applications" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
