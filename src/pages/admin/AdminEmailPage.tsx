import { useEffect, useState, type FormEvent } from 'react';

import { fetchEmailConfig, saveEmailConfig } from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { Loading, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import type { IEmailConfigType } from '../../types';

export default function AdminEmailPage() {
  const { notify } = useToast();

  const [form, setForm] = useState<Omit<IEmailConfigType, 'apiKeyConfigured'>>({
    enabled: false,
    provider: '',
    endpoint: '',
    senderAddress: '',
    senderName: '',
    verificationSubject: '',
    htmlTemplate: '',
  });
  const [apiKey, setApiKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const config = await fetchEmailConfig();
        if (!cancelled) {
          setForm({
            enabled: config.enabled,
            provider: config.provider,
            endpoint: config.endpoint,
            senderAddress: config.senderAddress,
            senderName: config.senderName,
            verificationSubject: config.verificationSubject,
            htmlTemplate: config.htmlTemplate,
          });
          setHasSavedKey(config.apiKeyConfigured);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(userMessageFor(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (form.enabled && (!form.senderAddress.trim() || !form.endpoint.trim())) {
      setError('启用邮件通知之前，发信邮箱和发信服务地址都要填。');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveEmailConfig({
        ...form,
        apiKey: apiKey.trim() || undefined,
        clearApiKey: clearKey,
      });
      setHasSavedKey(saved.apiKeyConfigured);
      setApiKey('');
      setClearKey(false);
      notify('邮件设置已保存', 'success');
    } catch (saveError) {
      setError(userMessageFor(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell title="邮件通知" description="学生注册与验证邮箱时发出去的邮件，都按这里的设置发送。">
      <PageMeta title="邮件通知 · 珂拉课程表管理台" description="维护验证邮件的发送账号与正文模板。" />

      {isLoading ? (
        <div className="a-card">
          <Loading text="正在读取当前设置…" />
        </div>
      ) : (
        <form className="a-card" onSubmit={(event) => void handleSubmit(event)} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="a-card__head">
            <div>
              <h2 className="a-card__title">发送方式</h2>
              <p className="a-card__sub">关掉之后，学生注册后收不到验证码，导入与识别也无法开通。</p>
            </div>
            <span className={`a-tag ${form.enabled ? 'a-tag--ok' : 'a-tag--warn'}`}>
              {form.enabled ? '已启用' : '未启用'}
            </span>
          </div>

          <label className="a-field" htmlFor="mail-enabled">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="mail-enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => update('enabled', event.target.checked)}
              />
              启用邮件通知
            </span>
          </label>

          <div className="a-grid a-grid--2">
            <div className="a-field">
              <label htmlFor="mail-provider">发信服务商</label>
              <input
                id="mail-provider"
                className="a-input"
                value={form.provider}
                placeholder="例如 resend"
                onChange={(event) => update('provider', event.target.value)}
              />
            </div>

            <div className="a-field">
              <label htmlFor="mail-endpoint">发信服务地址</label>
              <input
                id="mail-endpoint"
                className="a-input"
                value={form.endpoint}
                placeholder="https://api.example.com/emails"
                onChange={(event) => update('endpoint', event.target.value)}
              />
            </div>

            <div className="a-field">
              <label htmlFor="mail-sender">发信邮箱</label>
              <input
                id="mail-sender"
                className="a-input"
                value={form.senderAddress}
                placeholder="noreply@clarkhub.cn"
                onChange={(event) => update('senderAddress', event.target.value)}
              />
            </div>

            <div className="a-field">
              <label htmlFor="mail-sender-name">发信人名称</label>
              <input
                id="mail-sender-name"
                className="a-input"
                value={form.senderName}
                placeholder="珂拉课程表"
                onChange={(event) => update('senderName', event.target.value)}
              />
            </div>
          </div>

          <div className="a-field">
            <label htmlFor="mail-key">访问密钥</label>
            <input
              id="mail-key"
              className="a-input"
              type="password"
              value={apiKey}
              placeholder={hasSavedKey ? '已保存，留空表示保持不变' : '填写发信服务给你的访问密钥'}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <span className="a-hint">保存之后这里只会显示是否已经保存，不会再显示明文。</span>
          </div>

          <label className="a-field" htmlFor="mail-clear-key">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="mail-clear-key"
                type="checkbox"
                checked={clearKey}
                onChange={(event) => setClearKey(event.target.checked)}
              />
              清除已保存的访问密钥
            </span>
          </label>

          <div className="a-field">
            <label htmlFor="mail-subject">验证邮件标题</label>
            <input
              id="mail-subject"
              className="a-input"
              value={form.verificationSubject}
              placeholder="珂拉课程表 · 邮箱验证码"
              onChange={(event) => update('verificationSubject', event.target.value)}
            />
          </div>

          <div className="a-field">
            <label htmlFor="mail-template">邮件正文</label>
            <textarea
              id="mail-template"
              className="a-textarea"
              value={form.htmlTemplate}
              placeholder="<p>你的验证码是 {{code}}，10 分钟内有效。</p>"
              onChange={(event) => update('htmlTemplate', event.target.value)}
            />
            <span className="a-hint">
              正文里的花括号占位必须原样保留，否则学生收到的邮件里不会出现验证码。
            </span>
          </div>

          {error ? <div className="a-note a-note--bad">{error}</div> : null}

          <div className="row">
            <button className="a-btn a-btn--primary" type="submit" disabled={isSaving}>
              {isSaving ? '正在保存…' : '保存设置'}
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
