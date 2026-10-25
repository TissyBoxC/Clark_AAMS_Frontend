import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { registerUser } from '../../api/user-api';
import AuthSceneLayout from '../../components/AuthSceneLayout';
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from '../../components/AuthSceneIcons';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';
import { useAuthStore } from '../../store/auth-context';
import { safeRedirect } from '../../utils/navigation';

function RegisterPage() {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { isAuthResolved, updateUser, user } = useAuthStore();
  const [username, setUsername] = useState<string>('');
  const [qqEmailPrefix, setQqEmailPrefix] = useState<string>('');
  const [qqEmailDomain, setQqEmailDomain] = useState<string>('@qq.com');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useBodyClass('auth-page');
  usePageMeta('注册', 'Clark AAMS 用户注册页，注册成功后自动生成登录码并进入用户中心。');

  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeRedirect(params.get('redirect') ?? '/user');
  }, [location.search]);

  useEffect(() => {
    if (isAuthResolved && user.id > 0) {
      navigate(redirectUrl, {
        replace: true,
        delay: 0,
      });
    }
  }, [isAuthResolved, navigate, redirectUrl, user.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatusMessage('');

    const trimmedUsername = username.trim();
    const trimmedEmailPrefix = qqEmailPrefix.trim();

    if (!trimmedUsername) {
      setStatusMessage('请输入用户名。');
      return;
    }

    if (!trimmedEmailPrefix) {
      setStatusMessage('请输入 QQ 邮箱。');
      return;
    }

    if (password !== passwordConfirm) {
      setStatusMessage('两次输入的密码不一致。');
      return;
    }

    setIsSubmitting(true);

    try {
      const qqEmail = `${trimmedEmailPrefix}${qqEmailDomain}`;
      const nextUser = await registerUser({
        username: trimmedUsername,
        qqEmail,
        password: password.trim(),
      });
      updateUser(nextUser);
      navigate(redirectUrl, {
        replace: true,
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '注册失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAuthResolved) {
    return <LoadingView description='正在检查当前登录状态。' />;
  }

  return (
    <>
      <AuthSceneLayout>
        <section className='auth-scene-card'>
          <div className='auth-scene-card__header'>
            <h1>注册</h1>
            <p>填写用户名、QQ 邮箱和密码创建账户，完成后会直接进入用户中心。</p>
          </div>

          <form id='register-form' className='auth-scene-form' onSubmit={handleSubmit}>
            <label className='auth-scene-field'>
              <span className='auth-scene-field__icon'>
                <UserIcon />
              </span>
              <input
                name='username'
                autoComplete='username'
                placeholder='用户名'
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <div className='auth-scene-field auth-scene-field--split'>
              <label className='auth-scene-field__segment'>
                <span className='auth-scene-field__icon'>
                  <MailIcon />
                </span>
                <input
                  name='qqEmailPrefix'
                  autoComplete='email'
                  placeholder='邮箱'
                  required
                  value={qqEmailPrefix}
                  onChange={(event) => setQqEmailPrefix(event.target.value)}
                />
              </label>
              <label className='auth-scene-field__segment auth-scene-field__segment--select'>
                <select value={qqEmailDomain} onChange={(event) => setQqEmailDomain(event.target.value)}>
                  <option value='@qq.com'>@qq.com</option>
                  <option value='@foxmail.com'>@foxmail.com</option>
                </select>
              </label>
            </div>

            <label className='auth-scene-field'>
              <span className='auth-scene-field__icon'>
                <LockIcon />
              </span>
              <input
                name='password'
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete='new-password'
                placeholder='密码'
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className='auth-scene-field__toggle'
                type='button'
                aria-label={isPasswordVisible ? '隐藏密码' : '显示密码'}
                onClick={() => setIsPasswordVisible((previous) => !previous)}
              >
                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </label>

            <label className='auth-scene-field'>
              <span className='auth-scene-field__icon'>
                <LockIcon />
              </span>
              <input
                name='passwordConfirm'
                type={isPasswordConfirmVisible ? 'text' : 'password'}
                autoComplete='new-password'
                placeholder='确认密码'
                required
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
              <button
                className='auth-scene-field__toggle'
                type='button'
                aria-label={isPasswordConfirmVisible ? '隐藏确认密码' : '显示确认密码'}
                onClick={() => setIsPasswordConfirmVisible((previous) => !previous)}
              >
                {isPasswordConfirmVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </label>

            <div className='auth-scene-actions'>
              <div className='auth-scene-link-row'>
                <a className='auth-scene-link' href={`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`}>
                  返回登录
                </a>
              </div>

              <button className='auth-scene-submit' type='submit' disabled={isSubmitting}>
                <span>{isSubmitting ? '注册中...' : '下一步'}</span>
                <ArrowRightIcon />
              </button>
            </div>

            <div className={`auth-scene-status${statusMessage ? ' error' : ''}`} id='register-status'>
              {statusMessage || '注册成功后会生成登录码，并可在用户中心继续完成邮箱验证。'}
            </div>
          </form>
        </section>
      </AuthSceneLayout>
      <SupportFab />
    </>
  );
}

export default RegisterPage;
