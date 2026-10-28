import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { rotateLoginCode, sendEmailCode, verifyEmailCode } from '../../api/account';
import WorkspaceShell from '../../components/WorkspaceShell';
import { Field, PageMeta } from '../../components/ui';
import { useConfirm } from '../../components/useConfirm';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { copyText } from '../../lib/storage';
import { useAuth } from '../../store/useAuth';

type SettingsTab = 'profile' | 'email' | 'security';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, displayName, isVerified, refresh, applyUser, signOut } = useAuth();
  const { notify } = useToast();
  const { confirm, confirmElement } = useConfirm();

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [emailCode, setEmailCode] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [error, setError] = useState('');

  async function handleCopyCode(): Promise<void> {
    if (!user?.loginCode) {
      setError('这里拿不到登录码。重新登录一次就能看到。');
      return;
    }
    try {
      await copyText(user.loginCode);
      notify('登录码已复制', 'success');
    } catch {
      notify('没能自动复制，请展开后手动选中', 'error');
    }
  }

  async function handleSendEmailCode(): Promise<void> {
    setError('');
    setEmailStatus('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setError('邮箱看起来不完整，请检查 @ 前后有没有漏掉。');
      return;
    }

    setIsSending(true);
    try {
      await sendEmailCode(emailInput);
      setEmailStatus('验证码已经发出，请查收邮箱。');
      notify('验证码已发出', 'success');
    } catch (sendError) {
      setError(userMessageFor(sendError));
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyEmail(): Promise<void> {
    setError('');

    if (emailCode.trim().length < 4) {
      setError('把邮件里的验证码完整填进来。');
      return;
    }

    setIsVerifying(true);
    try {
      const updated = await verifyEmailCode(emailCode);
      applyUser(updated);
      await refresh();
      setEmailCode('');
      setEmailStatus('邮箱已验证，导入和识别都开放了。');
      notify('邮箱已验证', 'success');
    } catch (verifyError) {
      setError(userMessageFor(verifyError));
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleRotate(): Promise<void> {
    const confirmed = await confirm({
      title: '让所有设备退出登录？',
      body: (
        <p>
          确认后会生成新的登录码，旧码立刻失效。手机、平板和别的电脑上
          都需要用密码或新登录码重新登录一次。当前这台设备不受影响。
        </p>
      ),
      confirmText: '退出所有设备',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsRotating(true);
    try {
      const updated = await rotateLoginCode();
      applyUser(updated);
      notify('旧登录码已失效，新码已生成', 'success');
    } catch (rotateError) {
      notify(userMessageFor(rotateError), 'error');
    } finally {
      setIsRotating(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    const confirmed = await confirm({
      title: '现在退出登录？',
      body: <p>退出后需要重新输入密码或登录码才能进来。课表不会丢，下次登录还在。</p>,
      confirmText: '退出登录',
    });

    if (!confirmed) {
      return;
    }

    await signOut();
    navigate('/login', { replace: true });
  }

  const maskedCode = user?.loginCode
    ? `${user.loginCode.slice(0, 2)}•• ••${user.loginCode.slice(-2)}`
    : '还没有登录码';

  return (
    <WorkspaceShell
      title="账号设置"
      description="改邮箱、看登录码、退出所有设备，都在这一页。"
    >
      <PageMeta title="账号设置 · 珂拉课程表" description="管理邮箱、登录码与登录状态。" />

      <div className="settings-grid">
        <nav className="settings-tabs" aria-label="设置分类">
          <button type="button" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>
            账号资料
          </button>
          <button type="button" aria-selected={tab === 'email'} onClick={() => setTab('email')}>
            邮箱
          </button>
          <button type="button" aria-selected={tab === 'security'} onClick={() => setTab('security')}>
            登录码与安全
          </button>
        </nav>

        <div className="stack gap-5">
          {tab === 'profile' ? (
            <section className="card">
              <div className="card__head">
                <div>
                  <h2 className="card__title">账号资料</h2>
                  <p className="card__sub">用户名和邮箱创建后不能直接改名字，邮箱可以换一个。</p>
                </div>
              </div>

              <dl className="kv">
                <div className="kv__row">
                  <dt>用户名</dt>
                  <dd>{displayName || '—'}</dd>
                </div>
                <div className="kv__row">
                  <dt>邮箱</dt>
                  <dd>{user?.email || '还没有填邮箱'}</dd>
                </div>
                <div className="kv__row">
                  <dt>邮箱状态</dt>
                  <dd>{isVerified ? '已验证' : '待验证'}</dd>
                </div>
                <div className="kv__row">
                  <dt>已解析题目</dt>
                  <dd>{user?.questionAnalysisCount ?? 0} 道</dd>
                </div>
              </dl>

              {!isVerified ? (
                <div className="notice notice--amber" style={{ marginTop: 'var(--sp-4)' }}>
                  <span>验证邮箱后，导入、识别和题目解析才会开放。</span>
                  <Link className="btn btn--soft btn--sm" to="/verify">去验证邮箱</Link>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === 'email' ? (
            <section className="card">
              <div className="card__head">
                <div>
                  <h2 className="card__title">邮箱</h2>
                  <p className="card__sub">
                    换邮箱需要重新验证一次。旧邮箱验证过也不影响已经导入的课表。
                  </p>
                </div>
                <span className={`tag ${isVerified ? 'tag--mint' : 'tag--amber'}`}>
                  {isVerified ? '已验证' : '待验证'}
                </span>
              </div>

              <div className="stack gap-4">
                <Field label="邮箱地址" htmlFor="settings-email" hint="验证码会发到这个地址。">
                  <div className="input-affix">
                    <input
                      id="settings-email"
                      className="input"
                      type="email"
                      value={emailInput}
                      onChange={(event) => setEmailInput(event.target.value)}
                      placeholder="123456789@qq.com"
                    />
                    <button
                      className="input-affix__button"
                      type="button"
                      disabled={isSending}
                      onClick={() => void handleSendEmailCode()}
                    >
                      {isSending ? '发送中' : '发验证码'}
                    </button>
                  </div>
                </Field>

                <Field label="验证码" htmlFor="settings-code" hint="收到邮件后填这里，再点下面的按钮。">
                  <input
                    id="settings-code"
                    className="input"
                    value={emailCode}
                    inputMode="numeric"
                    onChange={(event) => setEmailCode(event.target.value.replace(/\s/g, ''))}
                    placeholder="邮件里的验证码"
                  />
                </Field>

                {emailStatus ? <p className="tiny">{emailStatus}</p> : null}

                <div className="row">
                  <button className="btn btn--primary" type="button" disabled={isVerifying} onClick={() => void handleVerifyEmail()}>
                    {isVerifying ? '正在验证…' : '验证这个邮箱'}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'security' ? (
            <>
              <section className="card">
                <div className="card__head">
                  <div>
                    <h2 className="card__title">登录码</h2>
                    <p className="card__sub">
                      登录码相当于另一把钥匙，拿到它的人可以登进你的账号。别发到群里。
                    </p>
                  </div>
                </div>

                <div className="input-affix" style={{ maxWidth: 360 }}>
                  <input
                    className="input"
                    readOnly
                    aria-label="登录码"
                    value={isCodeVisible && user?.loginCode ? user.loginCode : maskedCode}
                  />
                  <button
                    className="input-affix__button"
                    type="button"
                    onClick={() => setIsCodeVisible((value) => !value)}
                  >
                    {isCodeVisible ? '隐藏' : '显示'}
                  </button>
                </div>

                <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                  <button className="btn btn--soft btn--sm" type="button" onClick={() => void handleCopyCode()}>
                    复制登录码
                  </button>
                  <button className="btn btn--quiet btn--sm" type="button" onClick={() => void handleSignOut()}>
                    退出登录
                  </button>
                </div>
              </section>

              <section className="card">
                <div className="card__head">
                  <div>
                    <h2 className="card__title">退出所有设备</h2>
                    <p className="card__sub">
                      登录码发给过别人，或者在公用电脑上用过，就换一个新的。
                    </p>
                  </div>
                </div>

                <button className="btn btn--danger" type="button" disabled={isRotating} onClick={() => void handleRotate()}>
                  {isRotating ? '正在处理…' : '退出所有设备'}
                </button>

                <p className="tiny" style={{ marginTop: 'var(--sp-3)' }}>
                  换码之后，其他设备下次打开时会要求重新登录，这台设备不受影响。
                </p>
              </section>
            </>
          ) : null}

          {error ? (
            <div className="notice notice--danger">
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </div>

      {confirmElement}
    </WorkspaceShell>
  );
}
