import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { RequireAuth, RedirectIfSignedIn } from './components/guards';
import { FullPageLoading } from './components/ui';

const LandingPage = lazy(() => import('./pages/site/LandingPage'));
const GuidePage = lazy(() => import('./pages/site/GuidePage'));
const NotFoundPage = lazy(() => import('./pages/site/NotFoundPage'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyPage = lazy(() => import('./pages/auth/VerifyPage'));

const OverviewPage = lazy(() => import('./pages/user/OverviewPage'));
const SchedulePage = lazy(() => import('./pages/user/SchedulePage'));
const ImportPage = lazy(() => import('./pages/user/ImportPage'));
const RecognitionPage = lazy(() => import('./pages/user/RecognitionPage'));
const PickupPage = lazy(() => import('./pages/user/PickupPage'));
const QuestionsPage = lazy(() => import('./pages/user/QuestionsPage'));
const SettingsPage = lazy(() => import('./pages/user/SettingsPage'));

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminAiPage = lazy(() => import('./pages/admin/AdminAiPage'));
const AdminEmailPage = lazy(() => import('./pages/admin/AdminEmailPage'));
const AdminSchoolsPage = lazy(() => import('./pages/admin/AdminSchoolsPage'));
const AdminVersionsPage = lazy(() => import('./pages/admin/AdminVersionsPage'));
const AdminPickupsPage = lazy(() => import('./pages/admin/AdminPickupsPage'));
const AdminQuotaPage = lazy(() => import('./pages/admin/AdminQuotaPage'));

/** 页面切换：普通跳转回到顶部，带锚点的跳转滚到对应区块。 */
function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
      return;
    }
    window.scrollTo({ top: 0 });
  }, [location.hash, location.key]);

  return null;
}

export default function AppRoutes() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<FullPageLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/guide/:slug" element={<GuidePage />} />
          <Route path="/docs/user-guide/:slug" element={<Navigate to="/guide" replace />} />

          <Route
            path="/login"
            element={
              <RedirectIfSignedIn>
                <LoginPage />
              </RedirectIfSignedIn>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfSignedIn>
                <RegisterPage />
              </RedirectIfSignedIn>
            }
          />
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />
          <Route path="/auth/register" element={<Navigate to="/register" replace />} />
          <Route
            path="/verify"
            element={
              <RequireAuth>
                <VerifyPage />
              </RequireAuth>
            }
          />
          <Route path="/auth/verify" element={<Navigate to="/verify" replace />} />

          <Route
            path="/user"
            element={
              <RequireAuth>
                <OverviewPage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/schedule"
            element={
              <RequireAuth>
                <SchedulePage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/import"
            element={
              <RequireAuth>
                <ImportPage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/recognition"
            element={
              <RequireAuth>
                <RecognitionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/pickup"
            element={
              <RequireAuth>
                <PickupPage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/questions"
            element={
              <RequireAuth>
                <QuestionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route path="/my" element={<Navigate to="/user" replace />} />
          <Route path="/course-import" element={<Navigate to="/user/import" replace />} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth adminOnly>
                <AdminOverviewPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/ai"
            element={
              <RequireAuth adminOnly>
                <AdminAiPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/email"
            element={
              <RequireAuth adminOnly>
                <AdminEmailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/schools"
            element={
              <RequireAuth adminOnly>
                <AdminSchoolsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/versions"
            element={
              <RequireAuth adminOnly>
                <AdminVersionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/pickups"
            element={
              <RequireAuth adminOnly>
                <AdminPickupsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/quota"
            element={
              <RequireAuth adminOnly>
                <AdminQuotaPage />
              </RequireAuth>
            }
          />

          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
