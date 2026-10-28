import { useEffect, useState, type FormEvent } from 'react';

import { fetchVersionConfig, saveVersionConfig } from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { Loading, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import type { IVersionConfigType, IVersionSourceType } from '../../types';

const EMPTY: IVersionConfigType = {
  latestVersion: '',
  latestBuild: 0,
  minimumSupportedVersion: '',
  minimumSupportedBuild: 0,
  title: '',
  optionalUpdateMessage: '',
  requiredUpdateMessage: '',
  releasePageUrl: '',
  releaseNotes: '',
  downloadSources: [],
};

export default function AdminVersionsPage() {
  const { notify } = useToast();

  const [config, setConfig] = useState<IVersionConfigType>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const loaded = await fetchVersionConfig();
        if (!cancelled) {
          setConfig(loaded);
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

  function update<K extends keyof IVersionConfigType>(key: K, value: IVersionConfigType[K]): void {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function updateSource(index: number, patch: Partial<IVersionSourceType>): void {
    setConfig((current) => ({
      ...current,
      downloadSources: current.downloadSources.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      )),
    }));
  }

  function addSource(): void {
    setConfig((current) => ({
      ...current,
      downloadSources: [
        ...current.downloadSources,
        { type: 'apk', label: '', url: '', primary: current.downloadSources.length === 0 },
      ],
    }));
  }

  function removeSource(index: number): void {
    setConfig((current) => ({
      ...current,
      downloadSources: current.downloadSources.filter((_item, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (!config.latestVersion.trim()) {
      setError('最新版本号要填，学生端的「有新版本」提示靠它判断。');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveVersionConfig(config);
      setConfig(saved);
      notify('版本信息已保存', 'success');
    } catch (saveError) {
      setError(userMessageFor(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell title="版本发布" description="改这里之后，打开页面的学生下次进入会收到对应的更新提示。">
      <PageMeta title="版本发布 · 珂拉课程表管理台" description="维护最新版本号、更新说明与下载渠道。" />

      {isLoading ? (
        <div className="a-card">
          <Loading text="正在读取版本信息…" />
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <section className="a-card" style={{ display: 'grid', gap: '1rem' }}>
            <div className="a-card__head">
              <div>
                <h2 className="a-card__title">版本号</h2>
                <p className="a-card__sub">低于最低支持版本的客户端会被要求先更新才能继续用。</p>
              </div>
            </div>

            <div className="a-grid a-grid--2">
              <div className="a-field">
                <label htmlFor="version-latest">最新版本号</label>
                <input
                  id="version-latest"
                  className="a-input"
                  value={config.latestVersion}
                  placeholder="1.9.0"
                  onChange={(event) => update('latestVersion', event.target.value)}
                />
              </div>

              <div className="a-field">
                <label htmlFor="version-build">最新构建号</label>
                <input
                  id="version-build"
                  className="a-input"
                  type="number"
                  min={0}
                  value={config.latestBuild}
                  onChange={(event) => update('latestBuild', Number(event.target.value))}
                />
              </div>

              <div className="a-field">
                <label htmlFor="version-min">最低支持版本</label>
                <input
                  id="version-min"
                  className="a-input"
                  value={config.minimumSupportedVersion}
                  placeholder="1.8.0"
                  onChange={(event) => update('minimumSupportedVersion', event.target.value)}
                />
              </div>

              <div className="a-field">
                <label htmlFor="version-min-build">最低支持构建号</label>
                <input
                  id="version-min-build"
                  className="a-input"
                  type="number"
                  min={0}
                  value={config.minimumSupportedBuild}
                  onChange={(event) => update('minimumSupportedBuild', Number(event.target.value))}
                />
              </div>
            </div>
          </section>

          <section className="a-card" style={{ display: 'grid', gap: '1rem' }}>
            <div className="a-card__head">
              <div>
                <h2 className="a-card__title">提示内容</h2>
                <p className="a-card__sub">可选更新是「提醒一下」，强制更新是「不更新就用不了」。</p>
              </div>
            </div>

            <div className="a-field">
              <label htmlFor="version-title">更新提示标题</label>
              <input
                id="version-title"
                className="a-input"
                value={config.title}
                placeholder="有新版本可以用了"
                onChange={(event) => update('title', event.target.value)}
              />
            </div>

            <div className="a-grid a-grid--2">
              <div className="a-field">
                <label htmlFor="version-optional">可选更新说明</label>
                <textarea
                  id="version-optional"
                  className="a-textarea"
                  value={config.optionalUpdateMessage}
                  placeholder="课表加载更快了，修好了几处显示问题。"
                  onChange={(event) => update('optionalUpdateMessage', event.target.value)}
                />
              </div>

              <div className="a-field">
                <label htmlFor="version-required">强制更新说明</label>
                <textarea
                  id="version-required"
                  className="a-textarea"
                  value={config.requiredUpdateMessage}
                  placeholder="当前版本已经停止支持，请更新后再继续使用。"
                  onChange={(event) => update('requiredUpdateMessage', event.target.value)}
                />
              </div>
            </div>

            <div className="a-field">
              <label htmlFor="version-notes">更新内容</label>
              <textarea
                id="version-notes"
                className="a-textarea"
                value={config.releaseNotes}
                placeholder={'课表周次可以单独设置\n识别结果支持一次看多张图'}
                onChange={(event) => update('releaseNotes', event.target.value)}
              />
              <span className="a-hint">每行一条，学生看到的是一条条列出来的明细。</span>
            </div>

            <div className="a-field">
              <label htmlFor="version-release-url">发布页地址</label>
              <input
                id="version-release-url"
                className="a-input"
                value={config.releasePageUrl}
                placeholder="https://clarkhub.cn/release"
                onChange={(event) => update('releasePageUrl', event.target.value)}
              />
            </div>
          </section>

          <section className="a-card">
            <div className="a-card__head">
              <div>
                <h2 className="a-card__title">下载渠道</h2>
                <p className="a-card__sub">主渠道会排在学生看到的第一位。</p>
              </div>
              <button className="a-btn" type="button" onClick={addSource}>
                添加下载渠道
              </button>
            </div>

            {config.downloadSources.length === 0 ? (
              <div className="a-note">
                还没有下载渠道。加上一个之后，学生点更新就能直接下载到新版本。
              </div>
            ) : (
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>渠道名称</th>
                      <th>下载地址</th>
                      <th>主渠道</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.downloadSources.map((source, index) => (
                      <tr key={`source-${index}`}>
                        <td>
                          <input
                            className="a-input"
                            value={source.label}
                            aria-label={`第 ${index + 1} 个渠道的名称`}
                            placeholder="官网下载"
                            onChange={(event) => updateSource(index, { label: event.target.value, type: source.type || 'apk' })}
                          />
                        </td>
                        <td>
                          <input
                            className="a-input"
                            value={source.url}
                            aria-label={`第 ${index + 1} 个渠道的地址`}
                            placeholder="https://clarkhub.cn/download"
                            onChange={(event) => updateSource(index, { url: event.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={source.primary}
                            aria-label={`把第 ${index + 1} 个渠道设为第一顺位`}
                            onChange={(event) => updateSource(index, { primary: event.target.checked })}
                          />
                        </td>
                        <td>
                          <button className="a-btn a-btn--danger" type="button" onClick={() => removeSource(index)}>
                            删除渠道
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

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
