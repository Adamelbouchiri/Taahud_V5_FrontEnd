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
import PartnersPage from './pages/PartnersPage';

// Legal pages — public, no guards
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import RefundPolicyPage from './pages/legal/RefundPolicyPage';
import CookiesPolicyPage from './pages/legal/CookiesPolicyPage';

// Project pages — outside the dashboard, full-screen
import PublicProjectsPage from './pages/PublicProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProjectStepsPage from './pages/ProjectStepsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import EditProjectPage from './pages/EditProjectPage';
import ApplyPage from './pages/ApplyPage';
import PartnershipOfferPage from './pages/PartnershipOfferPage';

// Subscription pages — plans picker + Stripe return URLs
import SubscribePage from './pages/subscribe/SubscribePage';
import SubscribeSuccessPage from './pages/subscribe/SubscribeSuccessPage';
import SubscribeCancelPage from './pages/subscribe/SubscribeCancelPage';
// Moyasar embedded checkout — our own /pay/:sessionId page that
// renders Moyasar.js's card form (Moyasar has no hosted checkout).
import CheckoutPage from './pages/subscribe/CheckoutPage';

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
import PartnershipsPage from './pages/dashboard/PartnershipsPage';
import WalletPage from './pages/dashboard/WalletPage';
import ComingSoonPage from './pages/dashboard/ComingSoonPage';

// Route guards
import RequireAuth from './components/RequireAuth';
import RequireVerified from './components/RequireVerified';
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
import AdminProjectEditPage from './pages/admin/AdminProjectEditPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminPartnershipsPage from './pages/admin/AdminPartnershipsPage';
import AdminPartnerApplicationsPage from './pages/admin/AdminPartnerApplicationsPage';
import AdminSubscriptionsPage from './pages/admin/AdminSubscriptionsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminActivityPage from './pages/admin/AdminActivityPage';


/* ============================================================
 *  Routing — guard layers
 *  ----------------------------------------------------------------
 *    RequireAuth          must have a token
 *    RequireVerified      must have a verified phone (snapshot from
 *                         services/auth.js); bounces to /otp otherwise
 *    RequireGuest         must NOT have a token (login/register only)
 *    RequireNonSupplier   blocks suppliers from project routes
 *
 *  Protected routes stack RequireVerified inside RequireAuth so an
 *  authenticated-but-unverified user can't reach the platform via the
 *  back button — they're sent to /otp. The /otp route itself uses
 *  RequireAuth ALONE (wrapping it in RequireVerified would loop).
 *  Many routes also stack RequireNonSupplier so suppliers see the
 *  "coming soon" view instead of the project page. Auth is checked
 *  first because it's the cheaper gate (no network call).
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
        {/* Public "Become a Partner" directory + application form.
            Wired to the public POST /api/partners/apply endpoint. */}
        <Route path="/partners" element={<PartnersPage />} />

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
              <RequireVerified>
                <PublicProjectsPage />
              </RequireVerified>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/public"
          element={<RequireAuth><RequireVerified><PublicArenaPage /></RequireVerified></RequireAuth>}
        />
        <Route
          path="/projects/private"
          element={<RequireAuth><RequireVerified><PrivateArenaPage /></RequireVerified></RequireAuth>}
        />
        <Route
          path="/projects/solidarity"
          element={<RequireAuth><RequireVerified><SolidarityArenaPage /></RequireVerified></RequireAuth>}
        />
        <Route
          path="/projects/arena"
          element={<RequireAuth><RequireVerified><DeveloperArenaPage /></RequireVerified></RequireAuth>}
        />
        <Route
          path="/projects/isnad"
          element={<RequireAuth><RequireVerified><IsnadArenaPage /></RequireVerified></RequireAuth>}
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
              <RequireVerified>
                <RequireNonSupplier>
                  <CreateProjectPage />
                </RequireNonSupplier>
              </RequireVerified>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <RequireAuth>
              <RequireVerified>
                <RequireNonSupplier>
                  <ProjectDetailsPage />
                </RequireNonSupplier>
              </RequireVerified>
            </RequireAuth>
          }
        />
        {/* Project steps / milestones — the provider defines an
            amount-weighted plan and the owner reviews each step. Same
            non-supplier gate as the detail page; the page itself scopes
            actions to owner vs provider and blocks everyone else. */}
        <Route
          path="/projects/:id/steps"
          element={
            <RequireAuth>
              <RequireVerified>
                <RequireNonSupplier>
                  <ProjectStepsPage />
                </RequireNonSupplier>
              </RequireVerified>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <RequireAuth>
              <RequireVerified>
                <RequireNonSupplier>
                  <EditProjectPage />
                </RequireNonSupplier>
              </RequireVerified>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/apply"
          element={
            <RequireAuth>
              <RequireVerified>
                <RequireServiceProvider>
                  <ApplyPage />
                </RequireServiceProvider>
              </RequireVerified>
            </RequireAuth>
          }
        />
        {/* Solidarity-arena partnership offers — the partnership
            counterpart to /apply. Same service-provider gate; the
            page itself refines on arena + solidarity_addon. */}
        <Route
          path="/projects/:id/partner"
          element={
            <RequireAuth>
              <RequireVerified>
                <RequireServiceProvider>
                  <PartnershipOfferPage />
                </RequireServiceProvider>
              </RequireVerified>
            </RequireAuth>
          }
        />

        {/* ===== Subscription flow =====
            All routes require an authenticated user. The /subscribe
            page itself is reachable even when has_access is false
            so trial-expired users can still pick a plan. The success
            and cancel URLs are the ones we hand to Stripe Checkout
            via createCheckout({ success_url, cancel_url }). */}
        {/* The manage-subscription page renders inside DashboardLayout so
            it keeps the persistent sidebar + topbar (the layout already
            supplies UserProvider, so SubscribePage needs no extra one). A
            pathless layout route lets us keep the public-looking /subscribe
            URL while nesting it under the dashboard chrome. */}
        <Route
          element={
            <RequireAuth>
              <RequireVerified>
                <DashboardLayout />
              </RequireVerified>
            </RequireAuth>
          }
        >
          <Route path="/subscribe" element={<SubscribePage />} />
        </Route>
        <Route
          path="/subscribe/success"
          element={
            <RequireAuth>
              <RequireVerified>
                <SubscribeSuccessPage />
              </RequireVerified>
            </RequireAuth>
          }
        />
        <Route
          path="/subscribe/cancel"
          element={
            <RequireAuth>
              <RequireVerified>
                <SubscribeCancelPage />
              </RequireVerified>
            </RequireAuth>
          }
        />
        {/* Moyasar embedded checkout. The subscribe/checkout endpoint
            returns a URL like https://taahud.sa/pay/mch_xxx — our own
            frontend route — which the existing redirect logic sends the
            browser to. This page fetches its config and renders the
            Moyasar.js card form. Auth-gated like the rest of the flow. */}
        <Route
          path="/pay/:sessionId"
          element={
            <RequireAuth>
              <RequireVerified>
                <CheckoutPage />
              </RequireVerified>
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
              <RequireVerified>
                <DashboardLayout />
              </RequireVerified>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="partnerships" element={<PartnershipsPage />} />
          {/* Escrow wallet — where a provider requests a payout of the
              money owners paid into their step milestones. The page is
              harmless for a user with no wallet (empty history), so it
              carries no extra gate beyond the dashboard's. */}
          <Route path="wallet" element={<WalletPage />} />

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
              <RequireVerified>
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              </RequireVerified>
            </RequireAuth>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="projects/new" element={<AdminProjectCreatePage />} />
          <Route path="projects/:id" element={<AdminProjectDetailPage />} />
          {/* PATCH /admin/projects/:id — admins bypass the owner-only
              restriction on the user-facing EditProjectPage. Status and
              partner stay on the detail page's force-* actions, which
              carry a reason and their own audit entries. */}
          <Route path="projects/:id/edit" element={<AdminProjectEditPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="partnerships" element={<AdminPartnershipsPage />} />
          {/* "Become a Partner" program — separate from /partnerships
              (Solidarity offers). force-delete is gated inside the page
              on the super-admin role. */}
          <Route path="partner-applications" element={<AdminPartnerApplicationsPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          {/* Escrow payout review queue — approve/reject provider
              withdrawal requests. Rejecting credits the money back. */}
          <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
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
