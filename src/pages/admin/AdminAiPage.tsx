import { useEffect, useState, type FormEvent } from 'react';

import { fetchAiConfig, saveAiConfig } from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { Loading, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';

export default function AdminAiPage() {
  const { notify } = useToast();

  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
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
        const config = await fetchAiConfig();
        if (!cancelled) {
          setBaseUrl(config.baseUrl);
          setModel(config.model);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (!baseUrl.trim()) {
      setError('服务地址不能空着。填识别服务所在的位置，例如 https://api.example.com/v1。');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveAiConfig({
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
        clearApiKey: clearKey,
      });
      setHasSavedKey(saved.apiKeyConfigured);
      setApiKey('');
      setClearKey(false);
      notify('设置已保存', 'success');
    } catch (saveError) {
      setError(userMessageFor(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell title="识别服务" description="课表识别与题目解析都走这里的服务。换模型或换地址后，下一次识别就会生效。">
      <PageMeta title="识别服务 · 珂拉课程表管理台" description="维护课表识别使用的服务地址、模型和访问密钥。" />

      {isLoading ? (
        <div className="a-card">
          <Loading text="正在读取当前设置…" />
        </div>
      ) : (
        <form className="a-card" onSubmit={(event) => void handleSubmit(event)} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="a-card__head">
            <div>
              <h2 className="a-card__title">服务连接</h2>
              <p className="a-card__sub">保存后立即生效，不需要重启服务。</p>
            </div>
            <span className={`a-tag ${hasSavedKey ? 'a-tag--ok' : 'a-tag--warn'}`}>
              {hasSavedKey ? '访问密钥已保存' : '还没有保存访问密钥'}
            </span>
          </div>

          <div className="a-grid a-grid--2">
            <div className="a-field">
              <label htmlFor="ai-base-url">服务地址</label>
              <input
                id="ai-base-url"
                className="a-input"
                value={baseUrl}
                placeholder="https://api.example.com/v1"
                onChange={(event) => setBaseUrl(event.target.value)}
              />
              <span className="a-hint">识别服务所在的位置，末尾一般到版本号为止。</span>
            </div>

            <div className="a-field">
              <label htmlFor="ai-model">模型名称</label>
              <input
                id="ai-model"
                className="a-input"
                value={model}
                placeholder="例如 gpt-4o-mini"
                onChange={(event) => setModel(event.target.value)}
              />
              <span className="a-hint">按服务方给出的模型名称填写。</span>
            </div>
          </div>

          <div className="a-field">
            <label htmlFor="ai-key">访问密钥</label>
            <input
              id="ai-key"
              className="a-input"
              type="password"
              value={apiKey}
              placeholder={hasSavedKey ? '已保存，留空表示保持不变' : '填写服务方给你的访问密钥'}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <span className="a-hint">保存之后这里只会显示是否已经保存，不会再显示明文。</span>
          </div>

          <label className="a-field" htmlFor="ai-clear-key">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="ai-clear-key"
                type="checkbox"
                checked={clearKey}
                onChange={(event) => setClearKey(event.target.checked)}
              />
              清除已保存的访问密钥
            </span>
            <span className="a-hint">清除之后，识别会立刻停止工作，直到重新填一个密钥。</span>
          </label>

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
