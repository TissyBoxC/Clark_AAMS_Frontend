import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { logoutUser } from '../api/user-api';
import { useBodyClass } from '../hooks/useBodyClass';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { useAuthStore } from '../store/auth-context';
import type { IUserType } from '../types/app-types';
import { qqAvatarUrl } from '../utils/avatar';

interface IUserWorkspaceShellProps {
  user: IUserType;
  title: string;
  description: string;
  children: ReactNode;
  contentClassName?: string;
}

interface IUserWorkspaceNavItemType {
  key: 'dashboard' | 'import' | 'recognition' | 'pickup';
  href: string;
  label: string;
  group: 'overview' | 'tools';
  icon: ReactNode;
}

const USER_WORKSPACE_NAV_ITEMS: IUserWorkspaceNavItemType[] = [
  {
    key: 'dashboard',
    href: '/user',
    label: '仪表总览',
    group: 'overview',
    icon: (
      <svg viewBox='0 0 24 24' fill='none'>
        <rect x='3.5' y='4.5' width='7' height='7' rx='2'></rect>
        <rect x='13.5' y='4.5' width='7' height='4' rx='2'></rect>
        <rect x='13.5' y='11.5' width='7' height='8' rx='2'></rect>
        <rect x='3.5' y='14.5' width='7' height='5' rx='2'></rect>
      </svg>
    ),
  },
  {
    key: 'import',
    href: '/user/import',
    label: '教务导入',
    group: 'tools',
    icon: (
      <svg viewBox='0 0 24 24' fill='none'>
        <path d='M12 4v10'></path>
        <path d='M8.5 10.5L12 14l3.5-3.5'></path>
        <path d='M4.5 17.5h15'></path>
      </svg>
    ),
  },
  {
    key: 'recognition',
    href: '/user/recognition',
    label: '课表识别',
    group: 'tools',
    icon: (
      <svg viewBox='0 0 24 24' fill='none'>
        <path d='M8 4H6a2 2 0 0 0-2 2v2'></path>
        <path d='M16 4h2a2 2 0 0 1 2 2v2'></path>
        <path d='M20 16v2a2 2 0 0 1-2 2h-2'></path>
        <path d='M4 16v2a2 2 0 0 0 2 2h2'></path>
        <path d='M9 12h6'></path>
        <path d='M12 9v6'></path>
      </svg>
    ),
  },
  {
    key: 'pickup',
    href: '/user/pickup',
    label: '取件码回查',
    group: 'tools',
    icon: (
      <svg viewBox='0 0 24 24' fill='none'>
        <path d='M7 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z'></path>
        <path d='M8.5 10h7'></path>
        <path d='M8.5 14h3'></path>
        <path d='M15 14h.01'></path>
      </svg>
    ),
  },
];

function getActiveNavKey(pathname: string): IUserWorkspaceNavItemType['key'] {
  if (pathname.startsWith('/user/import')) {
    return 'import';
  }

  if (pathname.startsWith('/user/recognition')) {
    return 'recognition';
  }

  if (pathname.startsWith('/user/pickup')) {
    return 'pickup';
  }

  return 'dashboard';
}

function shouldUseClientNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.altKey
    || event.ctrlKey
    || event.shiftKey
  );
}

function UserWorkspaceShell({
  user,
  title,
  description,
  children,
  contentClassName = '',
}: IUserWorkspaceShellProps) {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { clearUser } = useAuthStore();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [shellStatus, setShellStatus] = useState<string>('');
  const [shellStatusVariant, setShellStatusVariant] = useState<'success' | 'error' | ''>('');

  useBodyClass('dashboard-page');

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const activeNavKey = getActiveNavKey(location.pathname);
  const avatarUrl = useMemo(() => qqAvatarUrl(user.email), [user.email]);
  const displayName = user.username || `用户 ${user.id}`;
  const emailText = user.email || '未填写邮箱';

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string): void {
    if (!shouldUseClientNavigation(event)) {
      return;
    }

    event.preventDefault();
    setIsAccountMenuOpen(false);
    setShellStatus('');
    setShellStatusVariant('');
    navigate(href);
  }

  async function handleLogout(): Promise<void> {
    setShellStatus('');
    setShellStatusVariant('');
    setIsAccountMenuOpen(false);

    try {
      await logoutUser();
      clearUser();
      navigate('/auth/login', {
        replace: true,
      });
    } catch (error) {
      setShellStatus(error instanceof Error ? error.message : '退出登录失败，请稍后重试。');
      setShellStatusVariant('error');
    }
  }

  return (
    <div className='dashboard-shell'>
      <div className='dashboard-sidebar-head'>
        <a className='dashboard-brand' href='/' onClick={(event) => handleNavigate(event, '/')}>
          <img src='/site/logo.png' alt='' />
          <span className='brand-lockup'>
            <strong className='brand-title'>Clark AAMS</strong>
            <small className='brand-domain'>clarkhub.cn</small>
          </span>
        </a>
      </div>

      <header className='dashboard-topbar'>
        <div className='dashboard-topbar-actions'>
          <span className='dashboard-mini-meta'>简体中文</span>
          <div className={`dashboard-account-menu${isAccountMenuOpen ? ' is-open' : ''}`} ref={accountMenuRef}>
            <button
              className='dashboard-account-trigger'
              type='button'
              aria-haspopup='menu'
              aria-expanded={isAccountMenuOpen}
              aria-controls='dashboard-account-menu-items'
              aria-label='打开账号菜单'
              onClick={() => setIsAccountMenuOpen((open) => !open)}
            >
              <div className='dashboard-account'>
                <img src={avatarUrl} alt='' />
                <div>
                  <strong>{displayName}</strong>
                  <span>{emailText}</span>
                </div>
              </div>
              <span className='dashboard-account-chevron' aria-hidden='true'>
                <svg viewBox='0 0 20 20' fill='none'>
                  <path d='M5 7.5 10 12.5 15 7.5'></path>
                </svg>
              </span>
            </button>
            <div className='dashboard-account-dropdown' id='dashboard-account-menu-items' role='menu' hidden={!isAccountMenuOpen}>
              <button className='dashboard-account-menu-item' type='button' role='menuitem' onClick={() => void handleLogout()}>
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <aside className='dashboard-sidebar' aria-label='用户中心导航'>
        <nav className='dashboard-nav'>
          <div className='dashboard-nav-group'>
            <div className='dashboard-nav-title'>总览</div>
            {USER_WORKSPACE_NAV_ITEMS.filter((item) => item.group === 'overview').map((item) => {
              const isActive = item.key === activeNavKey;

              return (
                <a
                  key={item.key}
                  className={`dashboard-nav-link${isActive ? ' active' : ''}`}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => handleNavigate(event, item.href)}
                >
                  <span className='dashboard-nav-icon' aria-hidden='true'>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          <div className='dashboard-nav-group'>
            <div className='dashboard-nav-title'>功能</div>
            {USER_WORKSPACE_NAV_ITEMS.filter((item) => item.group === 'tools').map((item) => {
              const isActive = item.key === activeNavKey;

              return (
                <a
                  key={item.key}
                  className={`dashboard-nav-link${isActive ? ' active' : ''}`}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => handleNavigate(event, item.href)}
                >
                  <span className='dashboard-nav-icon' aria-hidden='true'>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          <div className='dashboard-nav-group'>
            <div className='dashboard-nav-title'>帮助</div>
            <a className='dashboard-nav-link' href='/docs/user-guide/intro' onClick={(event) => handleNavigate(event, '/docs/user-guide/intro')}>
              <span className='dashboard-nav-icon' aria-hidden='true'>
                <svg viewBox='0 0 24 24' fill='none'>
                  <path d='M6.5 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-10'></path>
                  <path d='M6.5 5.5a2 2 0 0 0-2 2v9a2 2 0 0 1 2-2h10'></path>
                  <path d='M9 9h5'></path>
                  <path d='M9 12h5'></path>
                </svg>
              </span>
              <span>使用指南</span>
            </a>
            <a className='dashboard-nav-link' href='/' onClick={(event) => handleNavigate(event, '/')}>
              <span className='dashboard-nav-icon' aria-hidden='true'>
                <svg viewBox='0 0 24 24' fill='none'>
                  <path d='M4 10.5 12 4l8 6.5'></path>
                  <path d='M6.5 9.5v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9'></path>
                  <path d='M10 19.5v-5h4v5'></path>
                </svg>
              </span>
              <span>返回首页</span>
            </a>
          </div>
        </nav>
      </aside>

      <main className='dashboard-main'>
        <section className='dashboard-page-heading'>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </section>

        <div className={`dashboard-content${contentClassName ? ` ${contentClassName}` : ''}`}>
          {shellStatus ? (
            <div className={`form-status dashboard-shell-status${shellStatusVariant ? ` ${shellStatusVariant}` : ''}`}>
              {shellStatus}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

export default UserWorkspaceShell;
