/* 访问控制：未登录送登录页，管理员页面再加一道角色判断。 */

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { FullPageLoading } from './ui';
import { useAuth } from '../store/useAuth';

export function RequireAuth({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { isResolved, user, role } = useAuth();
  const location = useLocation();

  if (!isResolved) {
    return <FullPageLoading text="正在确认登录状态…" />;
  }

  if (!user || role === 'guest') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (adminOnly && role !== 'admin') {
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
}

/** 已经登录的人不需要再看登录页，直接送进各自的工作台。 */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { isResolved, user, role } = useAuth();

  if (!isResolved) {
    return <FullPageLoading text="正在确认登录状态…" />;
  }

  if (user && role !== 'guest') {
    return <Navigate to={role === 'admin' ? '/admin' : '/user'} replace />;
  }

  return <>{children}</>;
}
