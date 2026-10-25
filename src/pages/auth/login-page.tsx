import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { loginLandingPath } from '../../utils/role-routing';
import { loginUser } from '../../api/user-api';
import AuthSceneLayout from '../../components/AuthSceneLayout';
import {
  ArrowRightIcon,
  CodeIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from '../../components/AuthSceneIcons';
import SupportFab from '../../components/SupportFab';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';
import { useAuthStore } from '../../store/auth-context';
import { safeRedirect } from '../../utils/navigation';

type LoginMethodType = 'email' | 'code';

function LoginPage() {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { isAuthResolved, updateUser, user } = useAuthStore();
  const [loginMethod, setLoginMethod] = useState<LoginMethodType>('email');
  const [qqEmail, setQqEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginCode, setLoginCode] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useBodyClass('auth-page');
  usePageMeta('登录', 'Clark AAMS 用户登录页，支持 QQ 邮箱密码登录与登录码恢复。');

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

    const trimmedQqEmail = qqEmail.trim();
    const trimmedLoginCode = loginCode.trim();

    if (loginMethod === 'email' && (!trimmedQqEmail || !password)) {
      setStatusMessage('请填写完整的邮箱登录信息。');
      return;
    }

    if (loginMethod === 'code' && !trimmedLoginCode) {
      setStatusMessage('请输入登录码。');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextUser = await loginUser(
        loginMethod === 'email'
          ? {
              qqEmail: trimmedQqEmail,
              password,
            }
          : {
              loginCode: trimmedLoginCode,
            },
      );
      updateUser(nextUser);

      // 登录后按身份分流（P1-1）：管理员账号现在也走这条登录路径，
      // 因此不能无条件跳 /user。登录响应里带了 role，可直接决定去向。
      const target = loginLandingPath(nextUser.role, redirectUrl);
      navigate(target, {
        replace: true,
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '登录失败');
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
            <h1>{loginMethod === 'email' ? '登录' : '恢复会话'}</h1>
            <p>
              {loginMethod === 'email'
                ? '用 QQ 邮箱继续你的 Clark AAMS 课程工作流。'
                : '输入保存过的登录码，恢复之前的使用状态。'}
            </p>
          </div>

          <div className='auth-scene-tabs' role='tablist' aria-label='登录方式'>
            <button
              className={loginMethod === 'email' ? 'active' : ''}
              type='button'
              onClick={() => {
                setLoginMethod('email');
                setStatusMessage('');
              }}
            >
              QQ 邮箱
            </button>
            <button
              className={loginMethod === 'code' ? 'active' : ''}
              type='button'
              onClick={() => {
                setLoginMethod('code');
                setStatusMessage('');
              }}
            >
              登录码恢复
            </button>
          </div>

          <form className='auth-scene-form' id='login-form' onSubmit={handleSubmit}>
            {loginMethod === 'email' ? (
              <>
                <label className='auth-scene-field'>
                  <span className='auth-scene-field__icon'>
                    <MailIcon />
                  </span>
                  <input
                    name='qqEmail'
                    type='email'
                    autoComplete='email'
                    placeholder='邮箱'
                    value={qqEmail}
                    onChange={(event) => setQqEmail(event.target.value)}
                  />
                </label>

                <label className='auth-scene-field'>
                  <span className='auth-scene-field__icon'>
                    <LockIcon />
                  </span>
                  <input
                    name='password'
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete='current-password'
                    placeholder='密码'
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
              </>
            ) : (
              <label className='auth-scene-field'>
                <span className='auth-scene-field__icon'>
                  <CodeIcon />
                </span>
                <input
                  name='loginCode'
                  autoComplete='one-time-code'
                  placeholder='登录码'
                  value={loginCode}
                  onChange={(event) => setLoginCode(event.target.value)}
                />
              </label>
            )}

            <div className='auth-scene-actions'>
              <div className='auth-scene-link-row'>
                <a className='auth-scene-link' href={`/auth/register?redirect=${encodeURIComponent(redirectUrl)}`}>
                  注册账号
                </a>
                {loginMethod === 'email' ? (
                  <button
                    className='auth-scene-link'
                    type='button'
                    onClick={() => {
                      setLoginMethod('code');
                      setStatusMessage('');
                    }}
                  >
                    登录码恢复
                  </button>
                ) : (
                  <button
                    className='auth-scene-link'
                    type='button'
                    onClick={() => {
                      setLoginMethod('email');
                      setStatusMessage('');
                    }}
                  >
                    QQ 邮箱登录
                  </button>
                )}
              </div>

              <button className='auth-scene-submit' type='submit' disabled={isSubmitting}>
                <span>{isSubmitting ? '登录中...' : '登录'}</span>
                <ArrowRightIcon />
              </button>
            </div>

            <div className={`auth-scene-status${statusMessage ? ' error' : ''}`} id='login-status'>
              {statusMessage
                || (loginMethod === 'email'
                  ? '输入 QQ 邮箱与密码后即可继续使用。'
                  : '登录码通常会在注册成功后生成，并长期保存在用户中心。')}
            </div>
          </form>
        </section>
      </AuthSceneLayout>
      <SupportFab />
    </>
  );
}

export default LoginPage;
