import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { adminLogin, fetchAdminSetupStatus } from '../../api/admin-api';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';
import { safeRedirect } from '../../utils/navigation';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

function AdminLoginPage() {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useBodyClass('admin-route');
  usePageMeta('后台登录', '珂拉课程表 后台登录页。');

  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const target = safeRedirect(params.get('redirect') ?? '/admin/dashboard', '/admin/dashboard');

    return target === '/admin' ? '/admin/dashboard' : target;
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    async function loadSetupStatus(): Promise<void> {
      try {
        const setupStatus = await fetchAdminSetupStatus();

        if (isMounted && !setupStatus.configured && setupStatus.registrationAvailable) {
          navigate('/admin/register', {
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

    if (!normalizedUsername || !password) {
      setStatusMessage('请填写后台账号和密码。');
      return;
    }

    setIsSubmitting(true);

    try {
      const loginResult = await adminLogin(normalizedUsername, password);

      if (!loginResult.authenticated) {
        setStatusMessage('登录没有完成。请重新输入密码再试一次；如果还是这样，联系维护的同学。');
        return;
      }

      navigate(redirectUrl, {
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
                <small>后台运维</small>
            </span>
          </a>
          <div>
            <p className={styles.eyebrow}>管理员登录</p>
            <h1>登录管理台</h1>
            <p className={styles.statusText}>管理台可以查看学校列表、发布版本、调整识别设置和取件码记录。这些操作会影响所有用户，请只在自己确认的情况下修改。</p>
          </div>
          <div className={styles.adminAuthSignals}>
              <span>首次设置</span>
              <span>登录状态</span>
              <span>环境正常</span>
          </div>
        </aside>

        <section className={`${styles.panel} ${styles.authCard}`}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>后台入口</p>
            <h2>珂拉课程表 后台登录</h2>
            <p>登录后进入学校适配器、版本管理、AI 配置和取件码后台。</p>
          </div>
        </div>
        <div className={styles.panelBody}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>账号</span>
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
                autoComplete='current-password'
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button className={styles.button} type='submit' disabled={isSubmitting}>
                {isSubmitting ? '登录中...' : '登录'}
              </button>
              <a className={styles.buttonSecondary} href='/'>
                返回站点
              </a>
            </div>
            <div className={`${styles.statusText} ${statusMessage ? styles.statusError : ''}`}>
              {statusMessage || '如果系统尚未初始化，将自动跳转到管理员注册页；管理员已存在时请直接登录。'}
            </div>
          </form>
        </div>
      </section>
      </div>
    </main>
  );
}

export default AdminLoginPage;
