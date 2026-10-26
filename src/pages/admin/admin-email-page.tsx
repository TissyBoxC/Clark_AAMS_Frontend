import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { IAdminEmailConfigType } from '../../types/app-types';

import { fetchAdminEmailConfig, updateAdminEmailConfig } from '../../api/admin-api';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

const EMPTY_EMAIL_CONFIG: IAdminEmailConfigType = {
  enabled: false,
  provider: '',
  endpoint: '',
  senderAddress: '',
  senderName: '',
  verificationSubject: '',
  htmlTemplate: '',
  apiKeyConfigured: false,
};

function AdminEmailPage() {
  const [config, setConfig] = useState<IAdminEmailConfigType>(EMPTY_EMAIL_CONFIG);
  const [apiKey, setApiKey] = useState<string>('');
  const [clearApiKey, setClearApiKey] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('等待操作');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useBodyClass('admin-route');
  usePageMeta('邮箱配置', '配置 珂拉课程表 邮箱验证码发送服务。');

  async function loadConfig(): Promise<void> {
    setSaveStatus('正在读取配置...');

    try {
      const nextConfig = await fetchAdminEmailConfig();
      setConfig(nextConfig);
      setApiKey('');
      setClearApiKey(false);
      setSaveStatus('配置已加载');
    } catch (error) {
      setSaveStatus(userMessageFor(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConfig();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const currentStatus = useMemo(() => {
    if (!config.apiKeyConfigured) {
      return '未配置密钥或 SMTP 授权码';
    }

    return config.enabled ? '已配置并启用邮箱验证码发送' : '已配置但当前未启用';
  }, [config.apiKeyConfigured, config.enabled]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setSaveStatus('正在保存配置...');

    try {
      const nextConfig = await updateAdminEmailConfig({
        enabled: config.enabled,
        provider: config.provider,
        endpoint: config.endpoint,
        senderAddress: config.senderAddress,
        senderName: config.senderName,
        verificationSubject: config.verificationSubject,
        htmlTemplate: config.htmlTemplate,
        apiKey: apiKey || undefined,
        clearApiKey,
      });
      setConfig(nextConfig);
      setApiKey('');
      setClearApiKey(false);
      setSaveStatus('配置已保存');
    } catch (error) {
      setSaveStatus(userMessageFor(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminLayout
      title='邮箱配置'
      description='配置邮箱验证码发送服务、密钥与模板。'
      activeKey='email'
      badgeText={config.enabled ? '已启用' : '未启用'}
    >
      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>发送服务配置</h2>
              <p>支持 SMTP、QQ 邮箱授权码或自定义 HTTP Provider。</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.buttonSecondary} type='button' onClick={() => void loadConfig()}>
                重新加载
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleSave}>
              <label className={styles.check}>
                <input
                  type='checkbox'
                  checked={config.enabled}
                  onChange={(event) => setConfig((previous) => ({ ...previous, enabled: event.target.checked }))}
                />
                启用邮箱验证码发送
              </label>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>发送方式</span>
                  <input className={styles.input} placeholder='例如 smtp / qq-mail / custom-http' value={config.provider} onChange={(event) => setConfig((previous) => ({ ...previous, provider: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>服务器地址</span>
                  <input className={styles.input} placeholder='例如 smtps://smtp.qq.com:465' value={config.endpoint} onChange={(event) => setConfig((previous) => ({ ...previous, endpoint: event.target.value }))} />
                </label>
              </div>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>发件邮箱</span>
                  <input className={styles.input} placeholder='例如 123456789@qq.com' value={config.senderAddress} onChange={(event) => setConfig((previous) => ({ ...previous, senderAddress: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>发件名称</span>
                  <input className={styles.input} placeholder='例如 珂拉课程表' value={config.senderName} onChange={(event) => setConfig((previous) => ({ ...previous, senderName: event.target.value }))} />
                </label>
              </div>
              <label className={styles.field}>
                <span>验证邮件标题</span>
                <input className={styles.input} placeholder='例如 珂拉课程表 QQ 邮箱验证码' value={config.verificationSubject} onChange={(event) => setConfig((previous) => ({ ...previous, verificationSubject: event.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>API Key / SMTP 授权码</span>
                <input className={styles.input} type='password' autoComplete='new-password' placeholder='留空表示保留已有值' value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
              </label>
              <label className={styles.check}>
                <input type='checkbox' checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} />
                清空已保存的密钥或 SMTP 授权码
              </label>
              <label className={styles.field}>
                <span>HTML 模板</span>
                <textarea className={styles.textarea} spellCheck={false} placeholder='可使用 {{code}} {{email}} {{subject}} {{senderName}} 占位符' value={config.htmlTemplate} onChange={(event) => setConfig((previous) => ({ ...previous, htmlTemplate: event.target.value }))}></textarea>
              </label>
              <div className={styles.actions}>
                <button className={styles.button} type='submit' disabled={isSaving}>
                  {isSaving ? '保存中...' : '保存配置'}
                </button>
              </div>
              <div className={`${styles.statusText} ${saveStatus.includes('失败') || saveStatus.includes('错误') ? styles.statusError : ''}`}>
                {saveStatus}
              </div>
            </form>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>当前状态</h2>
              <p>读取后端保存的邮件发送能力与密钥状态。</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.statusBox}>{currentStatus}</div>
            <div className={styles.stack}>
              <div className={styles.metric}>
                <span>发送方式</span>
                <strong>{config.provider || '还没有选'}</strong>
              </div>
              <div className={styles.metric}>
                <span>发件邮箱</span>
                <strong>{config.senderAddress || '未设置'}</strong>
              </div>
              <div className={styles.metric}>
                <span>发件名称</span>
                <strong>{config.senderName || '未设置'}</strong>
              </div>
            </div>
            <p className={styles.hint}>常见方案：QQ 邮箱使用 SMTP 授权码；如果走自定义 HTTP Provider，可将 endpoint 配置为自建邮件网关地址。</p>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminEmailPage;
