import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { adminLogin, adminRegister, fetchSetupStatus } from '../../api/admin';
import { Loading } from '../../components/ui';
import { userMessageFor } from '../../lib/errors';
import { useAuth } from '../../store/useAuth';

type Mode = 'login' | 'setup';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = '管理台入口 · 珂拉课程表';
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const status = await fetchSetupStatus();
        if (cancelled) {
          return;
        }
        setMode(!status.configured && status.registrationAvailable ? 'setup' : 'login');
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        // 读不到状态不等于管理台坏了，先按常规登录页展示，
        // 真正的错误等用户提交时再明确告诉他。
        setError(userMessageFor(loadError));
        setMode('login');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (!username.trim() || password.length < 6) {
      setError('用户名和至少 6 位的密码都要填上。');
      return;
    }

    if (mode === 'setup' && password !== confirmPassword) {
      setError('两次输入的密码不一样，请再确认一次。');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'setup') {
        await adminRegister(username, password);
      } else {
        await adminLogin(username, password);
      }
      await refresh();
      navigate('/admin', { replace: true });
    } catch (submitError) {
      setError(userMessageFor(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-scope">
      <div className="admin-login">
        <div className="admin-login__card">
          <div className="admin__brand" style={{ padding: 0 }}>
            <span className="admin__brand-mark">珂</span>
            <strong>
              珂拉课程表
              <small>管理台</small>
            </strong>
          </div>

          <div>
            <h1>{mode === 'setup' ? '创建管理员账号' : '管理员登录'}</h1>
            <p style={{ marginTop: '0.5rem' }}>
              {mode === 'setup'
                ? '这台服务还没有管理员。第一次进入需要先建一个，建好后用这个账号登录管理台。'
                : '管理台用来维护学校接入、识别服务、取件码和版本发布。学生看课表请走学生入口。'}
            </p>
          </div>

          {isLoading ? (
            <Loading text="正在确认管理台状态…" />
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} noValidate style={{ display: 'grid', gap: '0.8rem' }}>
              <div className="a-field">
                <label htmlFor="admin-username">管理员用户名</label>
                <input
                  id="admin-username"
                  className="a-input"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>

              <div className="a-field">
                <label htmlFor="admin-password">密码</label>
                <input
                  id="admin-password"
                  className="a-input"
                  type="password"
                  autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {mode === 'setup' ? (
                <div className="a-field">
                  <label htmlFor="admin-password-confirm">再输一次密码</label>
                  <input
                    id="admin-password-confirm"
                    className="a-input"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              ) : null}

              {error ? <div className="a-note a-note--bad">{error}</div> : null}

              <button className="a-btn a-btn--primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? '正在处理…' : mode === 'setup' ? '创建并进入' : '登录管理台'}
              </button>
            </form>
          )}

          <div className="a-note">
            这里只给维护者使用。学生查看课表、导入课程请回到
            {' '}
            <Link to="/login" style={{ color: '#cfe7ff' }}>学生登录</Link>
            {' '}
            或
            {' '}
            <Link to="/" style={{ color: '#cfe7ff' }}>网站首页</Link>
            。
          </div>
        </div>
      </div>
    </div>
  );
}
