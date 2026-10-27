import type { ReactNode } from 'react';

import { adminLogout } from '../api/admin-api';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';

import styles from './AdminLayout.module.css';

interface IAdminLayoutPropsType {
  title: string;
  description: string;
  activeKey:
    | 'dashboard'
    | 'schools'
    | 'versions'
    | 'ai'
    | 'email'
    | 'pickups'
    | 'quota';
  badgeText?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const NAV_ITEMS = [
  { key: 'dashboard', href: '/admin/dashboard', label: '概览', icon: 'HOME' },
  { key: 'schools', href: '/admin/schools', label: '学校管理', icon: 'SCH' },
  { key: 'versions', href: '/admin/versions', label: '版本管理', icon: 'VER' },
  { key: 'ai', href: '/admin/ai', label: 'AI 识别配置', icon: 'AI' },
  { key: 'email', href: '/admin/email', label: '邮箱配置', icon: 'MAIL' },
  { key: 'pickups', href: '/admin/pickups', label: '取件码管理', icon: 'JSON' },
  { key: 'quota', href: '/admin/quota', label: '配额看板', icon: 'AI' },
] as const;

function AdminLayout({
  title,
  description,
  activeKey,
  badgeText,
  actions,
  children,
}: IAdminLayoutPropsType) {
  const navigate = useTransitionNavigate();

  async function handleLogout(): Promise<void> {
    try {
      await adminLogout();
    } finally {
      navigate('/admin/login', {
        replace: true,
      });
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label='管理台菜单'>
        <a className={styles.sidebarHead} href='/admin/dashboard' aria-label='珂拉课程表 管理台'>
          <img src='/site/logo.png' alt='' />
          <span className={styles.brandLockup}>
            <strong>珂拉课程表</strong>
            <small>管理台</small>
          </span>
        </a>

        <div className={styles.profileCard}>
          <span className={styles.profileMeta}>当前区域</span>
          <strong>管理台</strong>
          <span className={styles.profileMeta}>学校、版本、识别与邮件</span>
          <span className={styles.profileSignal}>线上环境</span>
        </div>

        <div className={styles.navSection}>
          <div className={styles.sectionTitle}>管理模块</div>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              className={`${styles.navLink} ${activeKey === item.key ? styles.navLinkActive : ''}`}
              href={item.href}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>

        <div className={styles.navSection}>
          <div className={styles.sectionTitle}>站点入口</div>
          <a className={styles.navLink} href='/'>
            <span className={styles.navIcon}>站点</span>
            <span>项目主页</span>
          </a>
          <a className={styles.navLink} href='/api'>
            <span className={styles.navIcon}>API</span>
            <span>开发文档</span>
          </a>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.headerActions}>
            {badgeText ? <span className={styles.badge}>{badgeText}</span> : null}
            {actions}
            <button className={styles.logoutButton} type='button' onClick={() => void handleLogout()}>
              退出后台
            </button>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

export default AdminLayout;
