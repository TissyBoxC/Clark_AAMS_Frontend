import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { sendEmailVerifyCode, verifyEmailCode } from '../../api/user-api';
import AuthSceneLayout from '../../components/AuthSceneLayout';
import { CodeIcon, MailIcon } from '../../components/AuthSceneIcons';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredUser } from '../../hooks/useRequiredUser';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';
import { useAuthStore } from '../../store/auth-context';
import { getStoredLoginCode } from '../../utils/auth-storage';
import { safeRedirect } from '../../utils/navigation';
import { userMessageFor } from '../../constants/error-codes';

type EmailDomainType = '@qq.com' | '@foxmail.com';

const EMAIL_CODE_COOLDOWN_SECONDS = 300;

function normalizeEmailDomain(value: string): EmailDomainType {
  return value.toLowerCase() === '@foxmail.com' || value.toLowerCase() === 'foxmail.com' ? '@foxmail.com' : '@qq.com';
}

function parseEmailParts(value: string): { prefix: string; domain: EmailDomainType } {
  const trimmedValue = value.trim();
  const [prefix = '', rawDomain = 'qq.com'] = trimmedValue.split('@');

  return {
    prefix,
    domain: normalizeEmailDomain(rawDomain),
  };
}

function buildEmail(prefix: string, domain: string): string {
  const trimmedPrefix = prefix.trim();

  if (trimmedPrefix.includes('@')) {
    return trimmedPrefix;
  }

  return `${trimmedPrefix}${domain}`;
}

function isSupportedEmail(value: string): boolean {
  return /^[^\s@]+@(qq\.com|foxmail\.com)$/i.test(value.trim());
}

function parseCooldownSeconds(message: string): number {
  const matchedSeconds = message.match(/请\s*(\d+)\s*秒后再试/);

  return matchedSeconds ? Number(matchedSeconds[1]) : 0;
}

function shouldShowEmailRequiredNotice(search: string): boolean {
  return new URLSearchParams(search).get('notice') === 'email-required';
}

function VerifyPage() {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { refreshUser, updateUser } = useAuthStore();
  const { user, isReady } = useRequiredUser();
  const [emailPrefixDraft, setEmailPrefixDraft] = useState<string | null>(null);
  const [emailDomainDraft, setEmailDomainDraft] = useState<EmailDomainType | null>(null);
  const [code, setCode] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>(() => (shouldShowEmailRequiredNotice(location.search) ? '请先完成邮箱验证' : ''));
  const [statusVariant, setStatusVariant] = useState<'success' | 'error' | ''>(() => (shouldShowEmailRequiredNotice(location.search) ? 'error' : ''));
  const [hasSentCode, setHasSentCode] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const redirectTimerRef = useRef<number | null>(null);

  useBodyClass('verify-page');
  usePageMeta('邮箱验证', '珂拉课程表 邮箱验证页，支持发送验证码并在成功后返回用户中心。');

  const userEmailParts = useMemo(() => parseEmailParts(user.email), [user.email]);
  const emailPrefix = emailPrefixDraft ?? userEmailParts.prefix;
  const emailDomain = emailDomainDraft ?? userEmailParts.domain;

  const email = buildEmail(emailPrefix, emailDomain);
  const isCooldownActive = cooldownSeconds > 0;
  const redirectAfterVerify = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeRedirect(params.get('redirect'), '/user');
  }, [location.search]);

  useEffect(() => {
    if (!isCooldownActive) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds((currentSeconds) => Math.max(0, currentSeconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isCooldownActive, cooldownSeconds]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  function resetStatus(): void {
    setStatusMessage('');
    setStatusVariant('');
  }

  function resetSentStateForEmailChange(): void {
    setHasSentCode(false);
    setCode('');
    resetStatus();
  }

  async function handleSendCode(): Promise<void> {
    resetStatus();

    const normalizedEmail = email.trim();
    const storedLoginCode = getStoredLoginCode();
    const loginCode = storedLoginCode || user.loginCode || '';

    if (!isSupportedEmail(normalizedEmail)) {
      setStatusMessage('请输入有效的 QQ 邮箱或 Foxmail 邮箱。');
      setStatusVariant('error');
      return;
    }

    if (cooldownSeconds > 0) {
      setStatusMessage(`两次发送间隔一分钟，请 ${cooldownSeconds} 秒后再取新码。`);
      setStatusVariant('error');
      return;
    }

    setIsSending(true);

    try {
      const nextUser = await sendEmailVerifyCode(normalizedEmail, loginCode);
      updateUser(nextUser);
      const { prefix, domain } = parseEmailParts(nextUser.email || normalizedEmail);
      setEmailPrefixDraft(prefix);
      setEmailDomainDraft(domain);
      setHasSentCode(true);
      setCode('');
      setCooldownSeconds(EMAIL_CODE_COOLDOWN_SECONDS);
      setStatusMessage('验证码已发送，请检查邮箱。');
      setStatusVariant('success');
    } catch (error) {
      const errorMessage = userMessageFor(error);
      const retryAfterSeconds = parseCooldownSeconds(errorMessage);

      if (retryAfterSeconds > 0) {
        setHasSentCode(true);
        setCooldownSeconds(retryAfterSeconds);
        setStatusMessage(`请 ${retryAfterSeconds} 秒后再发送。如果邮箱已经收到验证码，现在就可以填写。`);
      } else {
        setStatusMessage(errorMessage);
      }

      setStatusVariant('error');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    resetStatus();

    if (!hasSentCode) {
      await handleSendCode();
      return;
    }

    setIsSubmitting(true);

    try {
      const verifiedUser = await verifyEmailCode(code.trim());

      try {
        await refreshUser();
      } catch {
        updateUser(verifiedUser);
      }

      setStatusMessage('邮箱验证成功，正在返回用户中心。');
      setStatusVariant('success');
      redirectTimerRef.current = window.setTimeout(() => {
        navigate(redirectAfterVerify, {
          replace: true,
          delay: 0,
        });
      }, 900);
    } catch (error) {
      setStatusMessage(userMessageFor(error));
      setStatusVariant('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return <LoadingView description='正在检查当前登录状态。' />;
  }

  const isVerified = Boolean(user.emailVerified);
  const sendCodeLabel = isSending
    ? '发送中...'
    : isCooldownActive
      ? `${cooldownSeconds} 秒后可重新发送`
      : '发送验证码';
  const primaryButtonLabel = hasSentCode ? (isSubmitting ? '校验中...' : '校验验证码') : sendCodeLabel;
  const primaryButtonDisabled = isVerified || isSending || isSubmitting || (!hasSentCode && isCooldownActive);

  return (
    <>
      <AuthSceneLayout>
        <section className='auth-scene-card'>
          <div className='auth-scene-card__header'>
            <h1>邮箱验证</h1>
            <p>{isVerified ? '当前邮箱已经完成验证。' : '发送验证码并完成确认后，将自动返回用户中心。'}</p>
          </div>

          <form id='verify-page-form' className='auth-scene-form' onSubmit={handleSubmit}>
            <div className='auth-scene-field auth-scene-field--split'>
              <label className='auth-scene-field__segment'>
                <span className='auth-scene-field__icon'>
                  <MailIcon />
                </span>
                <input
                  id='verify-email'
                  name='qqEmail'
                  autoComplete='email'
                  placeholder='邮箱'
                  required
                  readOnly={isVerified}
                  value={emailPrefix}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    resetSentStateForEmailChange();

                    if (nextValue.includes('@')) {
                      const { prefix, domain } = parseEmailParts(nextValue);
                      setEmailPrefixDraft(prefix);
                      setEmailDomainDraft(domain);
                      return;
                    }

                    setEmailPrefixDraft(nextValue);
                  }}
                />
              </label>
              <label className='auth-scene-field__segment auth-scene-field__segment--select'>
                <select
                  disabled={isVerified}
                  value={emailDomain}
                  onChange={(event) => {
                    resetSentStateForEmailChange();
                    setEmailDomainDraft(normalizeEmailDomain(event.target.value));
                  }}
                >
                  <option value='@qq.com'>@qq.com</option>
                  <option value='@foxmail.com'>@foxmail.com</option>
                </select>
              </label>
            </div>

            <label className='auth-scene-field'>
              <span className='auth-scene-field__icon'>
                <CodeIcon />
              </span>
              <input
                name='code'
                autoComplete='one-time-code'
                placeholder='邮箱验证码'
                required
                disabled={isVerified}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>

            <button
              className='auth-scene-code-send'
              id={hasSentCode ? 'verify-submit-button' : 'send-email-code-button'}
              type={hasSentCode ? 'submit' : 'button'}
              disabled={primaryButtonDisabled}
              onClick={hasSentCode ? undefined : () => void handleSendCode()}
            >
              {primaryButtonLabel}
            </button>

            <div className='auth-scene-actions'>
              <div className='auth-scene-link-row'>
                <a className='auth-scene-link' href='/user'>
                  返回工作台
                </a>
                {hasSentCode ? (
                  <button
                    className='auth-scene-link'
                    type='button'
                    disabled={isVerified || isSending || isCooldownActive}
                    onClick={() => void handleSendCode()}
                  >
                    {sendCodeLabel}
                  </button>
                ) : null}
              </div>
            </div>

            <div className={`auth-scene-status${statusVariant ? ` ${statusVariant}` : ''}`} id='verify-status'>
              {statusMessage || (hasSentCode ? '请填写邮箱中的验证码，然后点击“校验验证码”。' : '如果验证码几分钟内未到达，请确认邮箱填写正确后重新发送。')}
            </div>
          </form>
        </section>
      </AuthSceneLayout>
      <SupportFab />
    </>
  );
}

export default VerifyPage;
