import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Icon, type IconName } from './Icons';
import { useAuth } from '../store/useAuth';
import { useToast } from './useToast';

interface INavItemType {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const MAIN_NAV: INavItemType[] = [
  { to: '/user', label: '概览', icon: 'home', end: true },
  { to: '/user/schedule', label: '我的课表', icon: 'calendar' },
  { to: '/user/import', label: '教务导入', icon: 'import' },
  { to: '/user/recognition', label: '截图识别', icon: 'image' },
  { to: '/user/pickup', label: '取件码', icon: 'ticket' },
  { to: '/user/questions', label: '题目解析', icon: 'sparkle' },
];

const SECONDARY_NAV: INavItemType[] = [
  { to: '/user/settings', label: '账号设置', icon: 'settings' },
  { to: '/guide', label: '使用指南', icon: 'info' },
];

const MOBILE_NAV: INavItemType[] = [
  { to: '/user', label: '概览', icon: 'home', end: true },
  { to: '/user/schedule', label: '课表', icon: 'calendar' },
  { to: '/user/import', label: '导入', icon: 'import' },
  { to: '/user/recognition', label: '识别', icon: 'image' },
  { to: '/user/settings', label: '我的', icon: 'settings' },
];

function isActive(pathname: string, item: INavItemType): boolean {
  return item.end ? pathname === item.to : pathname.startsWith(item.to);
}

export default function WorkspaceShell({
  title,
  description,
  actions,
  wide,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const { user, displayName, signOut } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const initial = (displayName || user?.username || '同').slice(0, 1);
  const emailState = user?.emailVerified ? '邮箱已验证' : '邮箱待验证';

  async function handleSignOut(): Promise<void> {
    await signOut();
    notify('已退出登录');
  }

  return (
    <div className="ws">
      <aside className="ws__rail" aria-label="工作台导航">
        <Link className="ws__brand brand" to="/">
          <span className="brand__mark">珂</span>
          <span className="brand__name">
            珂拉课程表
            <small>学生工作台</small>
          </span>
        </Link>

        <nav className="ws__nav">
          <span className="ws__nav-group">课程表</span>
          {MAIN_NAV.map((item) => (
            <Link
              key={item.to}
              className="ws__nav-item"
              to={item.to}
              aria-current={isActive(location.pathname, item) ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
          <span className="ws__nav-group">其他</span>
          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.to}
              className="ws__nav-item"
              to={item.to}
              aria-current={isActive(location.pathname, item) ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ws__rail-foot">
          <div className="ws__user">
            <span className="avatar avatar--fallback" aria-hidden="true">{initial}</span>
            <div className="ws__user-meta">
              <strong>{displayName || '同学'}</strong>
              <span>{emailState}</span>
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => void handleSignOut()}>
            <Icon name="logout" className="btn__icon" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="ws__mobile-top">
        <Link className="brand" to="/">
          <span className="brand__mark">珂</span>
          <span className="brand__name">珂拉课程表</span>
        </Link>
        <Link className="avatar avatar--fallback" to="/user/settings" aria-label="账号设置">
          {initial}
        </Link>
      </div>

      <main className="ws__main">
        <div className={`ws__content ${wide ? 'ws__content--wide' : ''}`}>
          <header className="ws__head">
            <div>
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className="row">{actions}</div> : null}
          </header>
          {children}
        </div>
      </main>

      <nav className="ws__tabbar" aria-label="移动端导航">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            className="ws__tab"
            to={item.to}
            aria-current={isActive(location.pathname, item) ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
