import { useEffect, useState } from 'react';

import { fetchAdminSetupStatus } from '../../api/admin-api';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';

import styles from './admin-pages.module.css';

function AdminEntryPage() {
  const navigate = useTransitionNavigate();
  const [statusMessage, setStatusMessage] = useState<string>('正在检查后台初始化状态。');

  useBodyClass('admin-route');
  usePageMeta('后台入口', 'Clark AAMS 后台入口初始化检测页。');

  useEffect(() => {
    let isMounted = true;

    async function checkSetupStatus(): Promise<void> {
      try {
        const setupStatus = await fetchAdminSetupStatus();

        if (!isMounted) {
          return;
        }

        if (!setupStatus.configured && setupStatus.registrationAvailable) {
          navigate('/admin/register', {
            replace: true,
            delay: 0,
          });
          return;
        }

        navigate('/admin/login?redirect=%2Fadmin%2Fdashboard', {
          replace: true,
          delay: 0,
        });
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error instanceof Error ? error.message : '后台初始化状态读取失败');
        }
      }
    }

    void checkSetupStatus();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (statusMessage === '正在检查后台初始化状态。') {
    return <LoadingView description={statusMessage} />;
  }

  return (
    <main className={styles.authShell}>
      <section className={`${styles.panel} ${styles.authCard}`}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Admin Setup</p>
            <h2>后台入口检测失败</h2>
            <p>无法读取管理员初始化状态，请确认后端服务和 `/api/v1/admin/auth/setup` 可访问。</p>
          </div>
        </div>
        <div className={styles.panelBody}>
          <div className={`${styles.statusText} ${styles.statusError}`}>{statusMessage}</div>
          <div className={styles.actions}>
            <a className={styles.buttonSecondary} href='/admin'>重新检测</a>
            <a className={styles.buttonSecondary} href='/'>返回站点</a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminEntryPage;