import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { loginWithCode, loginWithPassword } from '../../api/account';
import { Field, PageMeta } from '../../components/ui';
import { userMessageFor } from '../../lib/errors';
import { useAuth } from '../../store/useAuth';

type LoginMode = 'password' | 'code';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useAuth();

  const [mode, setMode] = useState<LoginMode>('password');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = params.get('next') ?? '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (mode === 'password' && (!account.trim() || !password)) {
      setError('请把账号和密码都填上。');
      return;
    }

    if (mode === 'code' && code.trim().length < 8) {
      setError('登录码是 8 位，请对照「账号设置」里的内容填写。');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = mode === 'password'
        ? await loginWithPassword(account, password)
        : await loginWithCode(code);

      await refresh();

      const isAdmin = user.role === 'admin';
      const target = next && next !== '/login'
        ? next
        : isAdmin
          ? '/admin'
          : '/user';

      navigate(target, { replace: true });
    } catch (submitError) {
      setError(userMessageFor(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <PageMeta title="登录 · 珂拉课程表" description="登录珂拉课程表，查看这周要上的课。" />

      <aside className="auth__side">
        <Link className="brand" to="/">
          <span className="brand__mark">珂</span>
          <span className="brand__name">
            珂拉课程表
            <small>clarkhub.cn</small>
          </span>
        </Link>

        <div>
          <p className="auth__quote">登录之后，这周的课、上周的课、下周的课，翻开就是。</p>
          <ul className="auth__points">
            <li>课表保存在账号里，换设备登录不用重新导入。</li>
            <li>识别和解析的记录会留在账号中，随时回看。</li>
            <li>取件码可以单独分享，不必把账号给别人。</li>
          </ul>
        </div>

        <p className="auth__side-foot">
          上课时间、教室、周次，都按你所在学校的作息记录。遇到调课，改一次就同步到所有设备。
        </p>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <div>
            <h1 className="auth__title">欢迎回来</h1>
            <p className="auth__sub" style={{ marginTop: '0.5rem' }}>
              用邮箱或用户名登录；也可以在另一台设备上拿到登录码，直接用登录码进来。
            </p>
          </div>

          <div className="auth__tabs" role="tablist" aria-label="登录方式">
            <button
              className="auth__tab"
              type="button"
              role="tab"
              aria-selected={mode === 'password'}
              onClick={() => { setMode('password'); setError(''); }}
            >
              账号密码
            </button>
            <button
              className="auth__tab"
              type="button"
              role="tab"
              aria-selected={mode === 'code'}
              onClick={() => { setMode('code'); setError(''); }}
            >
              登录码
            </button>
          </div>

          <form className="auth__form" onSubmit={(event) => void handleSubmit(event)} noValidate>
            {mode === 'password' ? (
              <>
                <Field label="邮箱或用户名" htmlFor="account">
                  <input
                    id="account"
                    className="input"
                    type="text"
                    autoComplete="username"
                    placeholder="123456789@qq.com"
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                  />
                </Field>

                <Field label="密码" htmlFor="password">
                  <div className="input-affix">
                    <input
                      id="password"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="至少 6 位"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      className="input-affix__button"
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? '隐藏' : '显示'}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <Field
                label="登录码"
                htmlFor="login-code"
                hint="登录码在「账号设置」里可以查看和复制，共 8 位。"
              >
                <input
                  id="login-code"
                  className="input"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  placeholder="例如 7K2M9Q4D"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                />
              </Field>
            )}

            {error ? (
              <div className="auth__note auth__note--error" role="alert">
                {error}
              </div>
            ) : null}

            <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '正在登录…' : '登录'}
            </button>
          </form>

          <p className="auth__foot">
            还没有账号？<Link to="/register">创建一个</Link>
          </p>
          <p className="auth__foot">
            管理台入口在<Link to="/admin/login">这里</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
