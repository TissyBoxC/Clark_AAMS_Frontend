import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredUser } from '../../hooks/useRequiredUser';
import { useAuthStore } from '../../store/auth-context';
import { copyText } from '../../utils/clipboard';
import { qqAvatarUrl } from '../../utils/avatar';

/** 常用入口。放这里而不是只靠左侧导航，是因为多数人登录后第一件事就是进课表。 */
const QUICK_ACTIONS = [
  { href: '/user/schedule', title: '我的课表', copy: '看这一周有什么课' },
  { href: '/user/import', title: '教务导入', copy: '从学校系统一次导入整学期' },
  { href: '/user/recognition', title: '截图识别', copy: '拍下课表照片放进来' },
  { href: '/user/pickup', title: '取件码回查', copy: '用 8 位码取回别人的课表' },
];

function UserDashboardPage() {
  const location = useLocation();
  const { refreshUser } = useAuthStore();
  const { user, isReady } = useRequiredUser();
  const [accountStatus, setAccountStatus] = useState<string>('');
  const [accountStatusVariant, setAccountStatusVariant] = useState<'success' | 'error' | ''>('');

  usePageMeta('今日概览 · 珂拉课程表', '查看账号状态，快速进入课表、导入与识别。');

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (!params.has('refreshUser')) {
      return;
    }

    params.delete('refreshUser');
    const cleanSearch = params.toString();
    const cleanUrl = `${location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${location.hash}`;
    window.history.replaceState(null, '', cleanUrl);
    void refreshUser();
  }, [location.hash, location.pathname, location.search, refreshUser]);

  async function handleCopyLoginCode(): Promise<void> {
    setAccountStatus('');
    setAccountStatusVariant('');

    try {
      await copyText(user.loginCode || '');
      setAccountStatus('登录码已复制，可以粘贴到其他设备登录。');
      setAccountStatusVariant('success');
    } catch {
      setAccountStatus('没能自动复制，请选中登录码手动复制。');
      setAccountStatusVariant('error');
    }
  }

  if (!isReady) {
    return <LoadingView description='正在读取你的账号...' />;
  }

  const displayName = user.username || '同学';
  const avatarUrl = qqAvatarUrl(user.email);
  const emailText = user.email || '还没有填写邮箱';
  const isVerified = Boolean(user.emailVerified);
  const analysisCount = Number(user.questionAnalysisCount || 0);

  return (
    <>
      <UserWorkspaceShell
        user={user}
        title={`你好，${displayName}`}
        description={
          isVerified
            ? '账号状态正常，下面的入口可以直接用。'
            : '先完成邮箱验证，所有功能才会开放。'
        }
      >
        {!isVerified ? (
          <div className='dashboard-alert' id='dashboard-email-alert'>
            <div>
              <strong>还差一步：验证邮箱</strong>
              <span>
                验证之后才能导入课表、识别截图和解析题目。验证完成后回到这一页，提示会自动消失。
              </span>
            </div>
            <a className='inline-link' href='/auth/verify?notice=email-required'>
              去验证邮箱
            </a>
          </div>
        ) : null}

        <section className='surface-card dashboard-card' id='quick-actions'>
          <p className='eyebrow'>常用</p>
          <h2>接下来想做什么</h2>
          <div className='quick-action-grid'>
            {QUICK_ACTIONS.map((action) => (
              <a key={action.href} className='quick-action' href={action.href}>
                <strong>{action.title}</strong>
                <span>{action.copy}</span>
              </a>
            ))}
          </div>
        </section>

        <div className='dashboard-grid dashboard-grid-compact'>
          <div className='dashboard-column'>
            <section className='surface-card dashboard-card profile-summary' id='overview'>
              <div className='profile-banner'>
                <p className='eyebrow'>账号</p>
                <h2 id='summary-title' className='profile-title'>
                  {displayName}
                </h2>
                <img className='profile-avatar' id='summary-avatar' src={avatarUrl} alt='' />
              </div>
              <div className='profile-summary-body'>
                <div className='metric-grid'>
                  <div className='metric-item'>
                    <span>已解析题目</span>
                    <strong id='metric-analysis-count'>{analysisCount}</strong>
                    <small>每成功解析一道题加一次</small>
                  </div>
                  <div className='metric-item'>
                    <span>邮箱</span>
                    <strong id='metric-email-state'>{isVerified ? '已验证' : '待验证'}</strong>
                    <small id='metric-email-copy'>
                      {isVerified ? '可以直接使用各项功能' : '验证后才能使用各项功能'}
                    </small>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className='dashboard-column'>
            <section className='surface-card dashboard-card' id='account'>
              <p className='eyebrow'>账号</p>
              <h2>账号信息</h2>
              <div className='data-list' id='account-data-list'>
                <div className='data-row'>
                  <span>用户名</span>
                  <strong>{displayName}</strong>
                </div>
                <div className='data-row'>
                  <span>邮箱</span>
                  <strong>{emailText}</strong>
                </div>
                <div className='data-row'>
                  <span>邮箱状态</span>
                  <strong>{isVerified ? '已验证' : '待验证'}</strong>
                </div>
                <div className='data-row'>
                  <span>登录码</span>
                  <div className='data-value-inline'>
                    <code aria-label='登录码已隐藏'>{user.loginCode ? '•••• •••• ••••' : '还没生成'}</code>
                    <button className='mini-copy-button' type='button' onClick={() => void handleCopyLoginCode()}>
                      复制登录码
                    </button>
                  </div>
                </div>
              </div>
              <div className='button-row dashboard-account-actions'>
                {!isVerified ? (
                  <a className='button-secondary' href='/auth/verify?notice=email-required'>
                    去验证邮箱
                  </a>
                ) : null}
              </div>
              <div className={`form-status${accountStatusVariant ? ` ${accountStatusVariant}` : ''}`} id='account-status'>
                {accountStatus}
              </div>
              <p className='auth-foot'>
                登录码相当于另一把钥匙，拿到它的人可以登进你的账号。
                在公共电脑上用完请退出登录。
              </p>
            </section>
          </div>
        </div>
      </UserWorkspaceShell>

      <SupportFab />
    </>
  );
}

export default UserDashboardPage;
