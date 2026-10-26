import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import type { IAdminAppVersionConfigType, IAppVersionCheckRequestType, IAppVersionCheckResultType, IAppVersionSourceType } from '../../types/app-types';

import { checkAppVersion, fetchAdminVersionConfig, patchAdminVersionConfig } from '../../api/admin-api';
import { buildApiUrl, isUnauthorizedError } from '../../api/http';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

const EMPTY_VERSION_CONFIG: IAdminAppVersionConfigType = {
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

const EMPTY_CHECK_FORM: IAppVersionCheckRequestType = {
  platform: 'android',
  channel: 'stable',
  currentVersion: '1.0.0',
  currentBuild: 1,
};

type TVersionConfigLoadStateType = 'idle' | 'loading' | 'loaded' | 'error';

const SCALAR_CONFIG_KEYS = [
  'latestVersion',
  'latestBuild',
  'minimumSupportedVersion',
  'minimumSupportedBuild',
  'title',
  'optionalUpdateMessage',
  'requiredUpdateMessage',
  'releasePageUrl',
] as const satisfies readonly (keyof IAdminAppVersionConfigType)[];

const ADMIN_VERSION_CONFIG_URL = buildApiUrl('/api/v1/admin/app-version/config');
const APP_VERSION_CHECK_URL = buildApiUrl('/api/v1/app/version/check');

function createEmptySource(): IAppVersionSourceType {
  return {
    type: 'gitee',
    label: '',
    url: '',
    primary: false,
    description: '',
  };
}

function toReleaseNotesArray(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toCurrentConfigPreview(config: IAdminAppVersionConfigType): string {
  return JSON.stringify(
    {
      ...config,
      releaseNotes: toReleaseNotesArray(config.releaseNotes),
    },
    null,
    2,
  );
}

function normalizeVersionConfig(config: IAdminAppVersionConfigType): IAdminAppVersionConfigType {
  return {
    ...EMPTY_VERSION_CONFIG,
    ...config,
    downloadSources: Array.isArray(config.downloadSources) ? config.downloadSources : [],
  };
}

function isSameDownloadSources(
  previousSources: IAppVersionSourceType[],
  nextSources: IAppVersionSourceType[],
): boolean {
  return JSON.stringify(previousSources) === JSON.stringify(nextSources);
}

function buildVersionConfigPatch(
  previousConfig: IAdminAppVersionConfigType,
  nextConfig: IAdminAppVersionConfigType,
): Partial<IAdminAppVersionConfigType> {
  const patch: Partial<IAdminAppVersionConfigType> = {};

  SCALAR_CONFIG_KEYS.forEach((key) => {
    if (!Object.is(previousConfig[key], nextConfig[key])) {
      patch[key] = nextConfig[key] as never;
    }
  });

  if (!Object.is(previousConfig.releaseNotes, nextConfig.releaseNotes)) {
    patch.releaseNotes = nextConfig.releaseNotes;
  }

  if (!isSameDownloadSources(previousConfig.downloadSources, nextConfig.downloadSources)) {
    patch.downloadSources = nextConfig.downloadSources;
  }

  return patch;
}

function AdminVersionsPage() {
  const navigate = useTransitionNavigate();
  const [config, setConfig] = useState<IAdminAppVersionConfigType>(EMPTY_VERSION_CONFIG);
  const [savedConfig, setSavedConfig] = useState<IAdminAppVersionConfigType | null>(null);
  const [configLoadState, setConfigLoadState] = useState<TVersionConfigLoadStateType>('idle');
  const [saveStatus, setSaveStatus] = useState<string>('等待操作');
  const [checkForm, setCheckForm] = useState<IAppVersionCheckRequestType>(EMPTY_CHECK_FORM);
  const [checkStatus, setCheckStatus] = useState<string>('等待校验');
  const [checkResult, setCheckResult] = useState<IAppVersionCheckResultType | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const currentConfigPreview = useMemo(() => (savedConfig ? toCurrentConfigPreview(savedConfig) : ''), [savedConfig]);
  const isConfigEditable = Boolean(savedConfig) && !isSaving;

  useBodyClass('admin-route');
  usePageMeta('客户端版本管理', '维护 珂拉课程表 客户端版本配置、下载源与版本校验。');

  const loadConfig = useCallback(async (): Promise<void> => {
    setConfigLoadState('loading');
    setSaveStatus('正在读取配置...');

    try {
      const nextConfig = await fetchAdminVersionConfig();
      const normalizedConfig = normalizeVersionConfig(nextConfig);
      setConfig(normalizedConfig);
      setSavedConfig(normalizedConfig);
      setConfigLoadState('loaded');
      setSaveStatus('配置已加载');
    } catch (error) {
      setConfigLoadState('error');

      if (isUnauthorizedError(error)) {
        setSaveStatus('登录已过期，请重新登录后再查看版本信息。');
        navigate('/admin/login?redirect=%2Fadmin%2Fversions', {
          replace: true,
        });
        return;
      }

      setSaveStatus(userMessageFor(error));
    }
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConfig();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadConfig]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!savedConfig) {
      setSaveStatus('请先成功读取当前版本配置后再保存。');
      return;
    }

    const patch = buildVersionConfigPatch(savedConfig, config);

    if (Object.keys(patch).length === 0) {
      setSaveStatus('没有检测到改动，无需提交。');
      return;
    }

    setIsSaving(true);
    setSaveStatus('正在保存已修改字段...');

    try {
      const nextConfig = await patchAdminVersionConfig(patch);
      const normalizedConfig = normalizeVersionConfig(nextConfig);
      setConfig(normalizedConfig);
      setSavedConfig(normalizedConfig);
      setSaveStatus(`配置已部分保存：${Object.keys(patch).join('、')}`);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setSaveStatus('登录已过期，请重新登录后再保存版本信息。');
        navigate('/admin/login?redirect=%2Fadmin%2Fversions', {
          replace: true,
        });
        return;
      }

      setSaveStatus(userMessageFor(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCheck(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCheckStatus('正在校验版本...');

    try {
      const result = await checkAppVersion(checkForm);
      setCheckResult(result);
      setCheckStatus('版本校验完成');
    } catch (error) {
      setCheckStatus(userMessageFor(error));
      setCheckResult(null);
    }
  }

  return (
    <AdminLayout
      title='客户端版本管理'
      description='维护最新版本、最低支持版本、更新文案与下载源。'
      activeKey='versions'
      badgeText={config.latestVersion ? `v${config.latestVersion}` : '待发布'}
    >
      <div className={styles.pageGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>当前版本配置</h2>
              <p>登录后台后通过 HttpSession Cookie 调用 GET {ADMIN_VERSION_CONFIG_URL} 读取。</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.buttonSecondary} type='button' onClick={() => void loadConfig()}>
                重新读取
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            {!savedConfig ? (
              <div className={styles.emptyState}>
                {configLoadState === 'loading'
                  ? '正在读取版本信息...'
                  : '尚未读取到当前版本配置。请确认已登录后台后点击“重新读取”。'}
              </div>
            ) : (
              <>
                <div className={styles.statusGrid}>
                  <article className={styles.statusItem}>
                    <span>最新版本</span>
                    <strong>{savedConfig.latestVersion ? `${savedConfig.latestVersion} (${savedConfig.latestBuild})` : '还没有发布过版本'}</strong>
                    <p>客户端发现高于当前版本时会提示更新。</p>
                  </article>
                  <article className={styles.statusItem}>
                    <span>最低支持</span>
                    <strong>{savedConfig.minimumSupportedVersion ? `${savedConfig.minimumSupportedVersion} (${savedConfig.minimumSupportedBuild})` : '还没有设置最低版本'}</strong>
                    <p>低于该版本时会触发强制更新。</p>
                  </article>
                  <article className={styles.statusItem}>
                    <span>更新标题</span>
                    <strong>{savedConfig.title || '还没有填写标题'}</strong>
                    <p>{savedConfig.optionalUpdateMessage || '暂无可选更新文案'}</p>
                  </article>
                  <article className={styles.statusItem}>
                    <span>发布页</span>
                    <strong>{savedConfig.releasePageUrl || '还没有填写下载页地址'}</strong>
                    <p>{savedConfig.requiredUpdateMessage || '暂无强制更新文案'}</p>
                  </article>
                </div>

                <div className={styles.stack}>
                  <div className={styles.statusBox}>
                    <strong>发布说明</strong>
                    <p>{toReleaseNotesArray(savedConfig.releaseNotes).join(' / ') || '暂无发布说明'}</p>
                  </div>
                  <div className={styles.sourceList}>
                    {savedConfig.downloadSources.length === 0 ? <div className={styles.emptyState}>当前没有下载源。</div> : null}
                    {savedConfig.downloadSources.map((source, index) => (
                      <div key={`${source.type}-${source.url}-${index}`} className={styles.sourceCard}>
                        <span className={styles.codeTag}>{source.primary ? '主源' : source.type || 'source'}</span>
                        <strong>{source.label || '未命名下载源'}</strong>
                        <p className={styles.statusText}>{source.url || '还没有填写下载地址'}</p>
                        <p className={styles.statusText}>{source.description || '暂无说明'}</p>
                      </div>
                    ))}
                  </div>
                  <label className={styles.field}>
                    <span>当前后端配置 JSON</span>
                    <textarea className={styles.textarea} value={currentConfigPreview} readOnly></textarea>
                  </label>
                </div>
              </>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>可视化模块修改</h2>
              <p>按版本策略、更新文案、发布信息和下载源分模块维护；保存时仅提交已修改字段。</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.buttonSecondary} type='button' onClick={() => void loadConfig()}>
                刷新
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleSave}>
              <fieldset className={styles.formFieldset} disabled={!isConfigEditable}>
                <section className={styles.sourceCard}>
                  <div className={styles.subPanelHead}>
                    <div>
                      <h3>版本策略</h3>
                      <p className={styles.statusText}>维护最新版本与最低支持版本，用于判断可选更新和强制更新。</p>
                    </div>
                    <span className={styles.codeTag}>更新策略</span>
                  </div>
                  <div className={styles.formGridTwo}>
                    <label className={styles.field}>
                      <span>最新版本号</span>
                      <input className={styles.input} required value={config.latestVersion} onChange={(event) => setConfig((previous) => ({ ...previous, latestVersion: event.target.value }))} />
                    </label>
                    <label className={styles.field}>
                      <span>最新 Build</span>
                      <input className={styles.input} type='number' min={0} required value={config.latestBuild} onChange={(event) => setConfig((previous) => ({ ...previous, latestBuild: Number(event.target.value) }))} />
                    </label>
                  </div>
                  <div className={styles.formGridTwo}>
                    <label className={styles.field}>
                      <span>最低支持版本号</span>
                      <input className={styles.input} required value={config.minimumSupportedVersion} onChange={(event) => setConfig((previous) => ({ ...previous, minimumSupportedVersion: event.target.value }))} />
                    </label>
                    <label className={styles.field}>
                      <span>最低支持 Build</span>
                      <input className={styles.input} type='number' min={0} required value={config.minimumSupportedBuild} onChange={(event) => setConfig((previous) => ({ ...previous, minimumSupportedBuild: Number(event.target.value) }))} />
                    </label>
                  </div>
                </section>

                <section className={styles.sourceCard}>
                  <div className={styles.subPanelHead}>
                    <div>
                      <h3>更新文案</h3>
                      <p className={styles.statusText}>面向客户端弹窗展示的标题、可选更新说明与强制更新说明。</p>
                    </div>
                    <span className={styles.codeTag}>提示文案</span>
                  </div>
                  <label className={styles.field}>
                    <span>更新标题</span>
                    <input className={styles.input} value={config.title} onChange={(event) => setConfig((previous) => ({ ...previous, title: event.target.value }))} />
                  </label>
                  <label className={styles.field}>
                    <span>可选更新文案</span>
                    <textarea className={styles.textarea} value={config.optionalUpdateMessage} onChange={(event) => setConfig((previous) => ({ ...previous, optionalUpdateMessage: event.target.value }))}></textarea>
                  </label>
                  <label className={styles.field}>
                    <span>强制更新文案</span>
                    <textarea className={styles.textarea} value={config.requiredUpdateMessage} onChange={(event) => setConfig((previous) => ({ ...previous, requiredUpdateMessage: event.target.value }))}></textarea>
                  </label>
                </section>

                <section className={styles.sourceCard}>
                  <div className={styles.subPanelHead}>
                    <div>
                      <h3>发布信息</h3>
                      <p className={styles.statusText}>维护发布页地址和多行发布说明，每行会提交为一个 release note。</p>
                    </div>
                    <span className={styles.codeTag}>发布信息</span>
                  </div>
                  <label className={styles.field}>
                    <span>发布页地址</span>
                    <input className={styles.input} value={config.releasePageUrl} onChange={(event) => setConfig((previous) => ({ ...previous, releasePageUrl: event.target.value }))} />
                  </label>
                  <label className={styles.field}>
                    <span>发布说明</span>
                    <textarea className={styles.textarea} value={config.releaseNotes} onChange={(event) => setConfig((previous) => ({ ...previous, releaseNotes: event.target.value }))}></textarea>
                  </label>
                </section>

                <section className={styles.sourceCard}>
                  <div className={styles.subPanelHead}>
                    <div>
                      <h3>下载源</h3>
                      <p className={styles.statusText}>维护客户端可跳转的下载地址，主下载源建议只保留一个。</p>
                    </div>
                    <button className={styles.buttonSecondary} type='button' onClick={() => setConfig((previous) => ({ ...previous, downloadSources: [...previous.downloadSources, createEmptySource()] }))}>
                      新增下载源
                    </button>
                  </div>
                  <div className={styles.sourceList}>
                    {config.downloadSources.length === 0 ? <div className={styles.emptyState}>当前没有下载源。</div> : null}
                    {config.downloadSources.map((source, index) => (
                      <div key={`${source.type}-${source.label}-${index}`} className={styles.sourceCard}>
                        <div className={styles.formGridTwo}>
                          <label className={styles.field}>
                            <span>类型</span>
                            <input className={styles.input} value={source.type} onChange={(event) => setConfig((previous) => ({ ...previous, downloadSources: previous.downloadSources.map((item, itemIndex) => (itemIndex === index ? { ...item, type: event.target.value } : item)) }))} />
                          </label>
                          <label className={styles.field}>
                            <span>名称</span>
                            <input className={styles.input} value={source.label} onChange={(event) => setConfig((previous) => ({ ...previous, downloadSources: previous.downloadSources.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)) }))} />
                          </label>
                        </div>
                        <label className={styles.field}>
                          <span>地址</span>
                          <input className={styles.input} value={source.url} onChange={(event) => setConfig((previous) => ({ ...previous, downloadSources: previous.downloadSources.map((item, itemIndex) => (itemIndex === index ? { ...item, url: event.target.value } : item)) }))} />
                        </label>
                        <label className={styles.check}>
                          <input type='checkbox' checked={source.primary} onChange={(event) => setConfig((previous) => ({ ...previous, downloadSources: previous.downloadSources.map((item, itemIndex) => (itemIndex === index ? { ...item, primary: event.target.checked } : item)) }))} />
                          设为主下载源
                        </label>
                        <label className={styles.field}>
                          <span>说明</span>
                          <textarea className={styles.textarea} value={source.description || ''} onChange={(event) => setConfig((previous) => ({ ...previous, downloadSources: previous.downloadSources.map((item, itemIndex) => (itemIndex === index ? { ...item, description: event.target.value } : item)) }))}></textarea>
                        </label>
                        <div className={styles.sourceActions}>
                          <button className={styles.buttonDanger} type='button' onClick={() => setConfig((previous) => ({ ...previous, downloadSources: previous.downloadSources.filter((_, itemIndex) => itemIndex !== index) }))}>
                            删除下载源
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </fieldset>

              <div className={styles.actions}>
                <button className={styles.button} type='submit' disabled={isSaving || !savedConfig}>
                  {isSaving ? '保存中...' : '保存已修改字段'}
                </button>
              </div>
              <div className={`${styles.statusText} ${saveStatus.includes('失败') || saveStatus.includes('失效') ? styles.statusError : ''}`}>{saveStatus}</div>
            </form>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>版本校验</h2>
              <p>直接调用 {APP_VERSION_CHECK_URL} 观察策略输出。</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleCheck}>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>平台</span>
                  <input className={styles.input} value={checkForm.platform} onChange={(event) => setCheckForm((previous) => ({ ...previous, platform: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>渠道</span>
                  <input className={styles.input} value={checkForm.channel} onChange={(event) => setCheckForm((previous) => ({ ...previous, channel: event.target.value }))} />
                </label>
              </div>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>当前版本号</span>
                  <input className={styles.input} required value={checkForm.currentVersion} onChange={(event) => setCheckForm((previous) => ({ ...previous, currentVersion: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>当前 Build</span>
                  <input className={styles.input} type='number' min={0} value={checkForm.currentBuild} onChange={(event) => setCheckForm((previous) => ({ ...previous, currentBuild: Number(event.target.value) }))} />
                </label>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} type='submit'>执行校验</button>
              </div>
            </form>
            <div className={styles.statusText}>{checkStatus}</div>
            <div className={styles.stack}>
              <div className={styles.metric}>
                <span>更新类型</span>
                <strong>{checkResult?.updateType || '未执行'}</strong>
              </div>
              <div className={styles.metric}>
                <span>最新版本</span>
                <strong>
                  {checkResult?.latestVersion
                    ? `${checkResult.latestVersion} (${checkResult.latestBuild ?? '-'})`
                    : '未返回'}
                </strong>
              </div>
              <div className={styles.metric}>
                <span>最低支持</span>
                <strong>
                  {checkResult?.minimumSupportedVersion
                    ? `${checkResult.minimumSupportedVersion} (${checkResult.minimumSupportedBuild ?? '-'})`
                    : '未返回'}
                </strong>
              </div>
              <div className={styles.statusBox}>{checkResult?.message || '等待校验结果'}</div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminVersionsPage;
