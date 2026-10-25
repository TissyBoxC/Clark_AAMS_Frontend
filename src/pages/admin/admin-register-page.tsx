import { useEffect, useState, type FormEvent } from 'react';

import { adminRegister, fetchAdminSetupStatus } from '../../api/admin-api';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';

import styles from './admin-pages.module.css';

function AdminRegisterPage() {
  const navigate = useTransitionNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useBodyClass('admin-route');
  usePageMeta('管理员初始化注册', 'Clark AAMS 首个管理员账号初始化页。');

  useEffect(() => {
    let isMounted = true;

    async function loadSetupStatus(): Promise<void> {
      try {
        const setupStatus = await fetchAdminSetupStatus();

        if (isMounted && (setupStatus.configured || !setupStatus.registrationAvailable)) {
          navigate('/admin/login', {
            replace: true,
            delay: 0,
          });
          return;
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error instanceof Error ? error.message : '初始化状态读取失败');
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    }

    void loadSetupStatus();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatusMessage('');

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password || !confirmPassword) {
      setStatusMessage('请填写完整的管理员注册信息。');
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage('两次输入的密码不一致。');
      return;
    }

    setIsSubmitting(true);

    try {
      await adminRegister(normalizedUsername, password);
      navigate('/admin/dashboard', {
        replace: true,
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '创建管理员失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return <LoadingView description='正在检查后台初始化状态。' />;
  }

  return (
    <main className={styles.authShell}>
      <div className={styles.adminAuthLayout}>
        <aside className={`${styles.panel} ${styles.adminAuthStory}`}>
          <a className={styles.adminAuthBrand} href='/'>
            <img src='/site/logo.png' alt='' />
            <span>
              <strong>Clark AAMS</strong>
                <small>初始化</small>
            </span>
          </a>
          <div>
            <p className={styles.eyebrow}>首个管理员</p>
            <h1>初始化页面只出现一次，所以必须把风险和下一步说清楚。</h1>
            <p className={styles.statusText}>创建首个管理员后，注册入口会自动关闭；后续所有后台操作都从登录页进入。</p>
          </div>
          <div className={styles.adminAuthSignals}>
              <span>一次性初始化</span>
              <span>需要密码</span>
              <span>完成后关闭</span>
          </div>
        </aside>

        <section className={`${styles.panel} ${styles.authCard}`}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>初始化</p>
            <h2>创建首个管理员账号</h2>
            <p>该页面仅在后台尚未完成初始化时可用。创建成功后将自动进入后台管理台。</p>
          </div>
        </div>
        <div className={styles.panelBody}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>管理员账号</span>
              <input
                className={styles.input}
                autoComplete='username'
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>密码</span>
              <input
                className={styles.input}
                type='password'
                autoComplete='new-password'
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>确认密码</span>
              <input
                className={styles.input}
                type='password'
                autoComplete='new-password'
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button className={styles.button} type='submit' disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '创建管理员账号'}
              </button>
              <a className={styles.buttonSecondary} href='/admin/login'>
                返回登录页
              </a>
            </div>
            <div className={`${styles.statusText} ${statusMessage ? styles.statusError : ''}`}>
              {statusMessage || '完成初始化后，该注册入口会自动关闭。'}
            </div>
          </form>
        </div>
      </section>
      </div>
    </main>
  );
}

export default AdminRegisterPage;
