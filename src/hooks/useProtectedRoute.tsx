import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router-dom';

import type { UserRoleType } from '../api/identity-api';

import { fetchIdentity, workspacePathForRole } from '../api/identity-api';
import LoadingView from '../components/LoadingView';
import { safeRedirect } from '../utils/navigation';

import { useTransitionNavigate } from './useTransitionNavigate';

export interface IProtectedRoutePropsType {
  /** 允许访问的角色。 */
  allow: UserRoleType[];
  children: ReactElement;
}

/**
 * 路由守卫。
 *
 * <p>背景（审查文档 P1 第 4 项）：此前 `/admin/**` 与 `/user/**`
 * 都没有任何守卫，直接输 URL 就能进；
 * `/admin` 还会盲跳「没配置就注册、配置了就登录」，
 * 已登录的管理员刷新该页反而被踢回登录页。
 *
 * <p>现在的行为：
 * <ul>
 *   <li>查询 `/auth/me` 得到真实角色；</li>
 *   <li>角色不在允许列表 → 跳该角色自己的工作台（已登录）
 *       或登录页（未登录）；</li>
 *   <li>已登录且角色相符 → 直接渲染，不产生额外跳转，
 *       刷新不会再被踢回登录页。</li>
 * </ul>
 *
 * <p>刻意不在前端「记住」角色，每次都问后端：
 * 角色是安全边界，缓存会导致登出后仍能进页面。
 */
function ProtectedRoute({ allow, children }: IProtectedRoutePropsType) {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [role, setRole] = useState<UserRoleType>('guest');

  useEffect(() => {
    let isMounted = true;

    async function check(): Promise<void> {
      let resolvedRole: UserRoleType;
      try {
        const identity = await fetchIdentity();
        resolvedRole = identity.role;
      } catch {
        // 网络或服务异常时按未登录处理，宁可多要一次登录，
        // 也不要放行不该看的页面。
        resolvedRole = 'guest';
      }

      if (!isMounted) {
        return;
      }

      setRole(resolvedRole);
      setIsChecking(false);

      if (allow.includes(resolvedRole)) {
        return;
      }

      const currentPath = `${location.pathname}${location.search}${location.hash}`;
      if (resolvedRole === 'guest') {
        navigate(`/login?redirect=${encodeURIComponent(safeRedirect(currentPath, '/'))}`, {
          replace: true,
          delay: 0,
        });
        return;
      }

      // 已登录但角色不符：送到该角色自己的工作台，而不是登录页，
      // 否则「管理员访问 /user」会看起来像掉登录。
      navigate(workspacePathForRole(resolvedRole), { replace: true, delay: 0 });
    }

    void check();

    return () => {
      isMounted = false;
    };
    // allow 为字面量数组，调用方保持稳定引用；此处仅依赖路径变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash, navigate]);

  if (isChecking) {
    return <LoadingView description='正在校验登录状态。' />;
  }

  if (!allow.includes(role)) {
    return <LoadingView description='正在跳转到对应工作台。' />;
  }

  return children;
}

export default ProtectedRoute;
