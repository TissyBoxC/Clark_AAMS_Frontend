import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import LoadingView from '../components/LoadingView';
import { markPageEntering } from '../utils/navigation';

import { useTransitionNavigate } from '../hooks/useTransitionNavigate';

const HomePage = lazy(() => import('../pages/site/home-page'));
const ApiPage = lazy(() => import('../pages/site/api-page'));
const LoginPage = lazy(() => import('../pages/auth/login-page'));
const RegisterPage = lazy(() => import('../pages/auth/register-page'));
const VerifyPage = lazy(() => import('../pages/auth/verify-page'));
const AdminEntryPage = lazy(() => import('../pages/admin/admin-entry-page'));
const UserDashboardPage = lazy(() => import('../pages/user/user-dashboard-page'));
const UserImportPage = lazy(() => import('../pages/user/user-import-page'));
const UserRecognitionPage = lazy(() => import('../pages/user/user-recognition-page'));
const UserPickupPage = lazy(() => import('../pages/user/user-pickup-page'));
const CourseImportPage = lazy(() => import('../pages/site/course-import-page'));
const GuidePage = lazy(() => import('../pages/guide/guide-page'));
const AdminLoginPage = lazy(() => import('../pages/admin/admin-login-page'));
const AdminRegisterPage = lazy(() => import('../pages/admin/admin-register-page'));
const AdminDashboardPage = lazy(() => import('../pages/admin/admin-dashboard-page'));
const AdminAiPage = lazy(() => import('../pages/admin/admin-ai-page'));
const AdminEmailPage = lazy(() => import('../pages/admin/admin-email-page'));
const AdminSchoolsPage = lazy(() => import('../pages/admin/admin-schools-page'));
const AdminVersionsPage = lazy(() => import('../pages/admin/admin-versions-page'));
const AdminPickupsPage = lazy(() => import('../pages/admin/admin-pickups-page'));
const NotFoundPage = lazy(() => import('../pages/shared/not-found-page'));

interface IAliasRedirectPropsType {
  to: string;
}

function AliasRedirect({ to }: IAliasRedirectPropsType) {
  const location = useLocation();

  return (
    <Navigate
      replace
      to={{
        pathname: to,
        search: location.search,
        hash: location.hash,
      }}
    />
  );
}

function RouteEffects() {
  const location = useLocation();
  const transitionNavigate = useTransitionNavigate();

  useEffect(() => {
    markPageEntering();

    if (location.hash) {
      window.setTimeout(() => {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.hash, location.key]);

  useEffect(() => {
    function handleInternalNavigation(event: MouseEvent): void {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const linkElement = target.closest('a[href]');

      if (!(linkElement instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        (linkElement.target && linkElement.target !== '_self') ||
        linkElement.hasAttribute('download') ||
        linkElement.dataset.noTransition !== undefined
      ) {
        return;
      }

      const rawHref = linkElement.getAttribute('href') ?? '';

      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        return;
      }

      const url = new URL(linkElement.href, window.location.href);

      if (url.origin !== window.location.origin || /\.md$/i.test(url.pathname)) {
        return;
      }

      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        if (url.hash && url.hash !== window.location.hash) {
          return;
        }

        return;
      }

      event.preventDefault();
      transitionNavigate(`${url.pathname}${url.search}${url.hash}`);
    }

    document.addEventListener('click', handleInternalNavigation);

    return () => {
      document.removeEventListener('click', handleInternalNavigation);
    };
  }, [transitionNavigate]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <Suspense fallback={<LoadingView />}>
        <Routes>
          <Route path='/' element={<HomePage />} />

          <Route path='/api' element={<ApiPage />} />
          <Route path='/api/index.html' element={<AliasRedirect to='/api' />} />
          <Route path='/api.html' element={<AliasRedirect to='/api' />} />

          <Route path='/auth/login' element={<LoginPage />} />
          <Route path='/auth/login.html' element={<AliasRedirect to='/auth/login' />} />
          <Route path='/login' element={<AliasRedirect to='/auth/login' />} />

          <Route path='/auth/register' element={<RegisterPage />} />
          <Route path='/auth/register.html' element={<AliasRedirect to='/auth/register' />} />
          <Route path='/register' element={<AliasRedirect to='/auth/register' />} />

          <Route path='/auth/verify' element={<VerifyPage />} />
          <Route path='/auth/verify.html' element={<AliasRedirect to='/auth/verify' />} />
          <Route path='/verify' element={<AliasRedirect to='/auth/verify' />} />

          <Route path='/user' element={<UserDashboardPage />} />
          <Route path='/user/index.html' element={<AliasRedirect to='/user' />} />
          <Route path='/user.html' element={<AliasRedirect to='/user' />} />
          <Route path='/my' element={<AliasRedirect to='/user' />} />
          <Route path='/my.html' element={<AliasRedirect to='/user' />} />

          <Route path='/user/import' element={<UserImportPage />} />
          <Route path='/user/import.html' element={<AliasRedirect to='/user/import' />} />

          <Route path='/user/recognition' element={<UserRecognitionPage />} />
          <Route
            path='/user/recognition.html'
            element={<AliasRedirect to='/user/recognition' />}
          />

          <Route path='/user/pickup' element={<UserPickupPage />} />
          <Route path='/user/pickup.html' element={<AliasRedirect to='/user/pickup' />} />

          <Route path='/course-import' element={<CourseImportPage />} />
          <Route path='/course-import.html' element={<AliasRedirect to='/course-import' />} />

          <Route path='/docs/user-guide/:slug' element={<GuidePage />} />

          <Route path='/admin/login' element={<AdminLoginPage />} />
          <Route path='/admin/login.html' element={<AliasRedirect to='/admin/login' />} />

          <Route path='/admin/register' element={<AdminRegisterPage />} />
          <Route path='/admin/register.html' element={<AliasRedirect to='/admin/register' />} />

          <Route path='/admin' element={<AdminEntryPage />} />
          <Route path='/admin/index.html' element={<AliasRedirect to='/admin' />} />
          <Route path='/admin/dashboard' element={<AdminDashboardPage />} />
          <Route path='/admin/dashboard.html' element={<AliasRedirect to='/admin/dashboard' />} />
          <Route path='/admin/ai' element={<AdminAiPage />} />
          <Route path='/admin/ai.html' element={<AliasRedirect to='/admin/ai' />} />
          <Route path='/admin/email' element={<AdminEmailPage />} />
          <Route path='/admin/email.html' element={<AliasRedirect to='/admin/email' />} />
          <Route path='/admin/schools' element={<AdminSchoolsPage />} />
          <Route path='/admin/schools.html' element={<AliasRedirect to='/admin/schools' />} />
          <Route path='/admin/versions' element={<AdminVersionsPage />} />
          <Route path='/admin/versions.html' element={<AliasRedirect to='/admin/versions' />} />
          <Route path='/admin/pickups' element={<AdminPickupsPage />} />
          <Route path='/admin/pickups.html' element={<AliasRedirect to='/admin/pickups' />} />

          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}