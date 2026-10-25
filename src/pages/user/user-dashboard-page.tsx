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

function UserDashboardPage() {
  const location = useLocation();
  const { refreshUser } = useAuthStore();
  const { user, isReady } = useRequiredUser();
  const [accountStatus, setAccountStatus] = useState<string>('');
  const [accountStatusVariant, setAccountStatusVariant] = useState<'success' | 'error' | ''>('');

  usePageMeta('用户中心', '查看 Clark AAMS 账户状态，并进入教务导入、课表识别和使用指南。');

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
      setAccountStatus('登录码已复制。');
      setAccountStatusVariant('success');
    } catch {
      setAccountStatus('复制失败，请稍后重试。');
      setAccountStatusVariant('error');
    }
  }

  if (!isReady) {
    return <LoadingView description='正在加载用户信息。' />;
  }

  const displayName = user.username || `用户 ${user.id}`;
  const avatarUrl = qqAvatarUrl(user.email);
  const emailText = user.email || '未填写邮箱';
  const isVerified = Boolean(user.emailVerified);
  const analysisCount = Number(user.questionAnalysisCount || 0);

  return (
    <>
      <UserWorkspaceShell
        user={user}
        title='用户中心'
        description='查看账户状态，并从左侧菜单进入教务导入、课表识别、取件码回查和使用指南。'
      >
        {!isVerified ? (
          <div className='dashboard-alert' id='dashboard-email-alert'>
            <div>
              <strong>邮箱尚未验证</strong>
              <span>使用功能前需要先完成邮箱验证。完成验证后，这条提示会在刷新用户中心后自动消失。</span>
            </div>
            <a className='inline-link' href='/auth/verify?notice=email-required'>
              前往邮箱验证
            </a>
          </div>
        ) : null}

        <div className='dashboard-grid dashboard-grid-compact'>
          <div className='dashboard-column'>
            <section className='surface-card dashboard-card profile-summary' id='overview'>
              <div className='profile-banner'>
                <p className='eyebrow'>账户概览</p>
                <h2 id='summary-title' className='profile-title'>
                  {displayName}
                </h2>
                <p id='summary-copy' hidden aria-hidden='true'>
                  {isVerified ? '邮箱已验证，当前账户状态完整。' : '邮箱未验证，完成验证后即可使用功能菜单。'}
                </p>
                <img className='profile-avatar' id='summary-avatar' src={avatarUrl} alt='' />
              </div>
              <div className='profile-summary-body'>
                <div className='metric-grid'>
                  <div className='metric-item'>
                    <span>题目解析次数</span>
                    <strong id='metric-analysis-count'>{analysisCount}</strong>
                    <small>按后端成功返回结果累计</small>
                  </div>
                  <div className='metric-item'>
                    <span>邮箱状态</span>
                    <strong id='metric-email-state'>{isVerified ? '已验证' : '未验证'}</strong>
                    <small id='metric-email-copy'>
                      {isVerified ? '验证提示已关闭' : '验证完成后即可解锁功能菜单'}
                    </small>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className='dashboard-column'>
            <section className='surface-card dashboard-card' id='account'>
              <p className='eyebrow'>账户信息</p>
              <h2>账户资料</h2>
              <div className='data-list' id='account-data-list'>
                <div className='data-row'>
                  <span>用户 ID</span>
                  <strong>{user.id}</strong>
                </div>
                <div className='data-row'>
                  <span>用户名</span>
                  <strong>{displayName}</strong>
                </div>
                <div className='data-row'>
                  <span>QQ 邮箱</span>
                  <strong>{emailText}</strong>
                </div>
                <div className='data-row'>
                  <span>邮箱状态</span>
                  <strong>{isVerified ? '已验证' : '未验证'}</strong>
                </div>
                <div className='data-row'>
                  <span>登录码</span>
                  <div className='data-value-inline'>
                    <code aria-label='登录码已隐藏'>{user.loginCode ? '•••• •••• ••••' : '未生成'}</code>
                    <button className='mini-copy-button' type='button' onClick={() => void handleCopyLoginCode()}>
                      复制
                    </button>
                  </div>
                </div>
                <div className='data-row'>
                  <span>题目解析次数</span>
                  <strong>{analysisCount}</strong>
                </div>
              </div>
              <div className='button-row dashboard-account-actions'>
                {!isVerified ? (
                  <a className='button-secondary' href='/auth/verify?notice=email-required'>
                    管理邮箱验证
                  </a>
                ) : null}
              </div>
              <div className={`form-status${accountStatusVariant ? ` ${accountStatusVariant}` : ''}`} id='account-status'>
                {accountStatus}
              </div>
              <p className='auth-foot'>登录码属于敏感凭证，请不要在公共设备或第三方聊天窗口里长期保存。</p>
            </section>
          </div>
        </div>
      </UserWorkspaceShell>

      <SupportFab />
    </>
  );
}

export default UserDashboardPage;
