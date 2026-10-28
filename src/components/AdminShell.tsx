import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { adminLogout } from '../api/admin';
import { Icon, type IconName } from './Icons';
import { useAuth } from '../store/useAuth';
import { useToast } from './useToast';

interface IAdminNavItemType {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const GROUPS: Array<{ title: string; items: IAdminNavItemType[] }> = [
  {
    title: '总览',
    items: [{ to: '/admin', label: '运行概览', icon: 'home', end: true }],
  },
  {
    title: '内容与识别',
    items: [
      { to: '/admin/ai', label: '识别服务', icon: 'server' },
      { to: '/admin/email', label: '邮件通知', icon: 'mail' },
      { to: '/admin/pickups', label: '取件码记录', icon: 'ticket' },
    ],
  },
  {
    title: '接入与发布',
    items: [
      { to: '/admin/schools', label: '学校接入', icon: 'globe' },
      { to: '/admin/versions', label: '版本发布', icon: 'download' },
    ],
  },
  {
    title: '运维',
    items: [{ to: '/admin/quota', label: '用量与配额', icon: 'chart' }],
  },
];

export default function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { displayName, signOut } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  async function handleSignOut(): Promise<void> {
    try {
      await adminLogout();
    } catch {
      // 后台会话可能已经过期，继续走本地清理。
    }
    await signOut();
    notify('已退出管理台');
    navigate('/login', { replace: true });
  }

  const isActive = (item: IAdminNavItemType) => (
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="admin-scope">
      <div className="admin">
        <aside className="admin__rail" aria-label="管理台导航">
          <Link className="admin__brand" to="/admin">
            <span className="admin__brand-mark">珂</span>
            <strong>
              珂拉课程表
              <small>管理台</small>
            </strong>
          </Link>

          <nav className="admin__nav">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <div className="admin__nav-group">{group.title}</div>
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    className="admin__nav-item"
                    to={item.to}
                    aria-current={isActive(item) ? 'page' : undefined}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="admin__rail-foot">
            <div className="admin__identity">
              <Icon name="shield" size={16} />
              <span>{displayName || '管理员'}</span>
            </div>
            <Link className="admin__nav-item" to="/user">
              <Icon name="user" />
              查看学生工作台
            </Link>
            <button className="admin__nav-item" type="button" onClick={() => void handleSignOut()}>
              <Icon name="logout" />
              退出管理台
            </button>
          </div>
        </aside>

        <div className="admin__main">
          <div className="admin__mobile-top">
            <Link className="admin__brand" to="/admin">
              <span className="admin__brand-mark">珂</span>
              <strong>管理台</strong>
            </Link>
            <button className="a-btn a-btn--quiet" type="button" onClick={() => void handleSignOut()}>
              退出
            </button>
          </div>

          <div className="admin__mobile-nav">
            {GROUPS.flatMap((group) => group.items).map((item) => (
              <Link key={item.to} to={item.to} aria-current={isActive(item) ? 'page' : undefined}>
                {item.label}
              </Link>
            ))}
          </div>

          <header className="admin__topbar">
            <div>
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className="row row--end">{actions}</div> : null}
          </header>

          <div className="admin__body">{children}</div>
        </div>
      </div>
    </div>
  );
}
