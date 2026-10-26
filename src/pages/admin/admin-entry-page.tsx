import { useEffect } from 'react';

import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';

/**
 * 后台入口 `/admin`。
 *
 * <p>背景（审查文档 P1 第 5 项）：此前该页会盲目判断「后台没配置就跳注册、
 * 配置了就跳登录」，完全不看当前是否已登录。结果已登录的管理员刷新
 * `/admin` 反而被踢回登录页。
 *
 * <p>现在身份校验已由外层 `ProtectedRoute allow={['admin']}` 完成——
 * 能进到这个组件，说明已经是管理员。因此这里只剩一件事：
 * 把入口页当作后台首页，直接送往 dashboard。
 *
 * 保留该路由而不是直接重定向到 `/admin/dashboard`，是为了让 `/admin`
 * 这个短地址继续可用（文档、书签、App 里都有引用）。
 */
function AdminEntryPage() {
  const navigate = useTransitionNavigate();

  useBodyClass('admin-route');
  usePageMeta('后台入口', '珂拉课程表 后台入口。');

  useEffect(() => {
    navigate('/admin/dashboard', { replace: true, delay: 0 });
  }, [navigate]);

  return <LoadingView description='正在进入后台工作台。' />;
}

export default AdminEntryPage;
