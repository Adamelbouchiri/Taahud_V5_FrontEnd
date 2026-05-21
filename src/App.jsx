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
import StorePage from './pages/StorePage';
import ServicesPage from './pages/ServicesPage';
import ContactPage from './pages/ContactPage';

// Legal pages — public, no guards
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import RefundPolicyPage from './pages/legal/RefundPolicyPage';
import CookiesPolicyPage from './pages/legal/CookiesPolicyPage';

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
import ApplicationsPage from './pages/dashboard/ApplicationsPage';
import ComingSoonPage from './pages/dashboard/ComingSoonPage';

// Route guards
import RequireAuth from './components/RequireAuth';
import RequireGuest from './components/RequireGuest';
import RequireNonSupplier from './components/RequireNonSupplier';
import RequireServiceProvider from './components/RequireServiceProvider';
import { RequireAdmin, RequireSuperAdmin } from './components/RequireAdmin';

// Admin layout + pages — gated by RequireAdmin / RequireSuperAdmin.
import AdminLayout from './components/admin/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminProjectDetailPage from './pages/admin/AdminProjectDetailPage';
import AdminProjectCreatePage from './pages/admin/AdminProjectCreatePage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminActivityPage from './pages/admin/AdminActivityPage';


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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/cookies-policy" element={<CookiesPolicyPage />} />
        {/* /store is publicly accessible — same URL is linked from
            the landing navbar (for guests) and from both the user
            and admin sidebars (for authenticated users). The page
            itself shows a coming-soon screen for now. */}
        <Route path="/store" element={<StorePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />

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
              The page enforces arena viewability per the V5 matrix
              in config/projectConstants.js (suppliers no longer see
              the public arena — Tendersalerts is their separate
              system).
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
              <RequireServiceProvider>
                <ApplyPage />
              </RequireServiceProvider>
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
          <Route path="applications" element={<ApplicationsPage />} />

          {/* Coming-soon features. Each renders the same component
              with a different variant preset. Add them here so the
              sidebar links resolve to a real page (not a 404). */}
          <Route path="ai-analysis" element={<ComingSoonPage variant="ai" />} />
          <Route path="analytics" element={<ComingSoonPage variant="analytics" />} />
          {/* Reports was merged into analytics — keep the path as a redirect
              so any existing bookmarks/links land on the unified page. */}
          <Route path="reports" element={<Navigate to="/dashboard/analytics" replace />} />
          <Route path="messages" element={<ComingSoonPage variant="messages" />} />
          <Route path="notifications" element={<ComingSoonPage variant="notifications" />} />
        </Route>

        {/* ===== Admin console =====
            Two layered guards: RequireAuth checks the token, and
            RequireAdmin gates on the roles snapshot persisted at
            login (see services/auth.js). Super-admin-only routes
            stack RequireSuperAdmin on top.

            The BE enforces the same rules — these guards just
            keep the UI from rendering "forbidden" shells. */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            </RequireAuth>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="projects/new" element={<AdminProjectCreatePage />} />
          <Route path="projects/:id" element={<AdminProjectDetailPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route
            path="roles"
            element={
              <RequireSuperAdmin>
                <AdminRolesPage />
              </RequireSuperAdmin>
            }
          />
        </Route>

        {/* ===== Legacy redirects ===== */}
        <Route path="/dashboard/projects" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard/projects/new" element={<Navigate to="/projects/new" replace />} />
        {/* /dashboard/browse intentionally removed — browsing always
            enters via the dashboard sidebar's arena-specific links so
            users land in the arena that suits their account type. */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
