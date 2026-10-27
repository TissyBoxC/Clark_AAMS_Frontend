import { useEffect, useState, type FormEvent } from 'react';

import { adminRegister, fetchAdminSetupStatus } from '../../api/admin-api';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

function AdminRegisterPage() {
  const navigate = useTransitionNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useBodyClass('admin-route');
  usePageMeta('设置管理员账号 · 珂拉课程表', '第一次使用时的管理员账号设置。');

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
          setStatusMessage(userMessageFor(error));
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
      setStatusMessage(userMessageFor(error));
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
              <strong>珂拉课程表</strong>
                <small>初始化</small>
            </span>
          </a>
          <div>
            <p className={styles.eyebrow}>首个管理员</p>
            <h1>设置管理员账号</h1>
            <p className={styles.statusText}>这一步只会出现一次。建好账号后，这个入口就会自动关闭，之后再进管理台都从登录页进。请把密码存好，忘记后只能到服务器上重置。</p>
          </div>
          <div className={styles.adminAuthSignals}>
              <span>只出现一次</span>
              <span>密码要记牢</span>
              <span>建好后入口关闭</span>
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
