import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { registerAccount } from '../../api/account';
import { Field, PageMeta } from '../../components/ui';
import { userMessageFor } from '../../lib/errors';
import { useAuth } from '../../store/useAuth';

function checkPassword(password: string): string {
  if (password.length < 6) {
    return '密码至少 6 位，太短的密码容易被猜到。';
  }
  if (/^\d+$/.test(password)) {
    return '密码全是数字，建议再加几个字母。';
  }
  return '';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    const passwordProblem = checkPassword(password);
    if (!username.trim()) {
      setError('给自己起一个名字，之后登录也能用它。');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('邮箱看起来不完整，请检查 @ 前后有没有漏掉。');
      return;
    }
    if (passwordProblem) {
      setError(passwordProblem);
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一样，请再确认一次。');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAccount(username, email, password);
      await refresh();
      navigate('/verify?from=register', { replace: true });
    } catch (submitError) {
      setError(userMessageFor(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <PageMeta title="创建账号 · 珂拉课程表" description="创建账号，把这一学期的课表整理到一处。" />

      <aside className="auth__side">
        <Link className="brand" to="/">
          <span className="brand__mark">珂</span>
          <span className="brand__name">
            珂拉课程表
            <small>clarkhub.cn</small>
          </span>
        </Link>

        <div>
          <p className="auth__quote">开学那一周，把课表一次整理好，后面十几周都省事。</p>
          <ul className="auth__points">
            <li>课表、识别记录和题目解析历史都跟着账号走。</li>
            <li>验证一次邮箱，导入和识别就能直接用。</li>
            <li>不想用了随时可以退出所有设备，登录码会立刻失效。</li>
          </ul>
        </div>

        <p className="auth__side-foot">
          我们只要求一个邮箱和密码。不需要学号，也不需要学校教务系统的密码。
        </p>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <div>
            <h1 className="auth__title">创建账号</h1>
            <p className="auth__sub" style={{ marginTop: '0.5rem' }}>
              填好下面三项就能用。注册完成后会请你验证一次邮箱，这之后导入和识别才开放。
            </p>
          </div>

          <form className="auth__form" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <Field label="用户名" htmlFor="username" hint="登录时可以用它，也可以改用邮箱。">
              <input
                id="username"
                className="input"
                type="text"
                autoComplete="nickname"
                placeholder="例如 林小舟"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>

            <Field label="邮箱" htmlFor="email" hint="用来接收验证码，也用来找回账号。">
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="123456789@qq.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label="密码" htmlFor="password" hint="至少 6 位，建议字母和数字混着用。">
              <div className="input-affix">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="设置一个密码"
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

            <Field label="再输一次密码" htmlFor="confirm">
              <input
                id="confirm"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="再输一遍"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>

            {error ? (
              <div className="auth__note auth__note--error" role="alert">
                {error}
              </div>
            ) : null}

            <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '正在创建…' : '创建账号'}
            </button>
          </form>

          <p className="auth__foot">
            已经有账号了？<Link to="/login">直接登录</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
