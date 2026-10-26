import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { fetchAdminSetupStatus } from '../../api/admin-api';
import { fetchIdentity, workspacePathForRole } from '../../api/identity-api';
import LoadingView from '../../components/LoadingView';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';
import { safeRedirect } from '../../utils/navigation';

import type { UserRoleType } from '../../api/identity-api';

/** 某角色允许落脚的工作台路径前缀，用于校验 redirect 是否越权。 */
function redirectAllowedFor(role: UserRoleType, redirect: string): boolean {
  if (!redirect) {
    return false;
  }
  if (role === 'admin') {
    return redirect.startsWith('/admin');
  }
  if (role === 'user') {
    return redirect.startsWith('/user') || redirect.startsWith('/course-import');
  }
  return false;
}

/**
 * 统一登录入口 `/login`。
 *
 * <p>背景（审查文档 P1 第 4 项）：此前前端有两个互不相干的登录页
 * `/auth/login`（用户）与 `/admin/login`（管理员），用户必须事先知道
 * 自己该点哪一个——这正是「登录后按身份进入不同工作台」未实现的直接表现。
 *
 * <p>本页作为单一入口，先问 `/auth/me`：
 * <ul>
 *   <li>已登录 → 直接进该角色自己的工作台（不显示登录表单）；</li>
 *   <li>未登录且后台未初始化 → 引导管理员注册
 *       （后台只能初始化一次，否则会出现没人能进后台的死锁）；</li>
 *   <li>其余 → 前往用户登录页。</li>
 * </ul>
 *
 * <p>为什么不在这一页塞两个表单：用户登录有「邮箱密码 / 登录码恢复」
 * 两种方式，管理员只有账号密码，硬合并会让表单状态互相污染。
 * 用分流入口同样达成「一个入口进、按身份到不同工作台」。
 */
function UnifiedLoginPage() {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const [message, setMessage] = useState<string>('正在识别登录方式...');

  useEffect(() => {
    let isMounted = true;

    async function route(): Promise<void> {
      const params = new URLSearchParams(location.search);
      const redirect = safeRedirect(params.get('redirect'), '');

      // 1) 已登录：送到该角色自己的工作台
      try {
        const identity = await fetchIdentity();
        if (!isMounted) {
          return;
        }
        if (identity.role !== 'guest') {
          const target = redirectAllowedFor(identity.role, redirect)
            ? redirect
            : workspacePathForRole(identity.role);
          navigate(target, { replace: true, delay: 0 });
          return;
        }
      } catch {
        // 身份查询失败时继续走登录流程，不阻断用户
      }

      // 2) 未登录：判断后台是否已初始化
      try {
        const setup = await fetchAdminSetupStatus();
        if (!isMounted) {
          return;
        }
        if (!setup.configured && setup.registrationAvailable) {
          setMessage('这是第一次使用，正在带你去设置管理员账号。');
          navigate('/admin/register', { replace: true, delay: 0 });
          return;
        }
      } catch {
        // 后台状态读取失败不影响普通用户登录
      }

      if (!isMounted) {
        return;
      }
      setMessage('正在打开登录页...');
      const suffix = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
      navigate(`/auth/login${suffix}`, { replace: true, delay: 0 });
    }

    void route();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate]);

  return <LoadingView description={message} />;
}

export default UnifiedLoginPage;
