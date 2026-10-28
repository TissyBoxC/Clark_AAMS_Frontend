import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { sendEmailCode, verifyEmailCode } from '../../api/account';
import { Field, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { useAuth } from '../../store/useAuth';

export default function VerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, refresh } = useAuth();
  const { notify } = useToast();

  const [email, setEmail] = useState(user?.email ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sentAt, setSentAt] = useState(0);

  const isFromRegister = params.get('from') === 'register';

  async function handleSend(): Promise<void> {
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('请填一个能收到邮件的邮箱。');
      return;
    }

    setIsSending(true);
    try {
      await sendEmailCode(email);
      setSentAt(Date.now());
      notify('验证码已发出，请查收邮箱', 'success');
    } catch (sendError) {
      setError(userMessageFor(sendError));
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (code.trim().length < 4) {
      setError('验证码是邮件里的几位数字，请完整填写。');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailCode(code);
      await refresh();
      notify('邮箱已验证，导入和识别都开放了', 'success');
      navigate('/user', { replace: true });
    } catch (verifyError) {
      setError(userMessageFor(verifyError));
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="auth">
      <PageMeta title="验证邮箱 · 珂拉课程表" description="验证邮箱后即可使用导入、识别与题目解析。" />

      <aside className="auth__side">
        <Link className="brand" to="/">
          <span className="brand__mark">珂</span>
          <span className="brand__name">
            珂拉课程表
            <small>clarkhub.cn</small>
          </span>
        </Link>

        <div>
          <p className="auth__quote">
            {isFromRegister ? '最后一步：确认这个邮箱是你的。' : '验证一次邮箱，之后不用再验证。'}
          </p>
          <ul className="auth__points">
            <li>验证后可以导入课表、识别截图、解析题目。</li>
            <li>验证码一般几秒内到，没收到可以再发一次。</li>
            <li>邮箱只用来收验证码和找回账号，不会公开展示。</li>
          </ul>
        </div>

        <p className="auth__side-foot">如果邮箱填错了，可以在「账号设置」里换一个再验证。</p>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <div>
            <h1 className="auth__title">验证邮箱</h1>
            <p className="auth__sub" style={{ marginTop: '0.5rem' }}>
              验证码会发到下面这个邮箱。收到后填进第二个框，就能开始用全部功能。
            </p>
          </div>

          <form className="auth__form" onSubmit={(event) => void handleVerify(event)} noValidate>
            <Field label="邮箱" htmlFor="verify-email" hint="收不到邮件的话，先确认这个地址有没有写错。">
              <div className="input-affix">
                <input
                  id="verify-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="123456789@qq.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button
                  className="input-affix__button"
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isSending}
                >
                  {isSending ? '发送中' : '发验证码'}
                </button>
              </div>
            </Field>

            <Field
              label="验证码"
              htmlFor="verify-code"
              hint={sentAt ? '已经发出了，如果两分钟还没收到，可以再发一次。' : '先点上面的「发验证码」。'}
            >
              <input
                id="verify-code"
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="填邮件里的验证码"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
              />
            </Field>

            {error ? (
              <div className="auth__note auth__note--error" role="alert">
                {error}
              </div>
            ) : null}

            <button className="btn btn--primary btn--block" type="submit" disabled={isVerifying}>
              {isVerifying ? '正在验证…' : '验证并继续'}
            </button>
          </form>

          <p className="auth__foot">
            先跳过也可以，<Link to="/user">回工作台看看</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
