import { useEffect, useState, type FormEvent } from 'react';

import { fetchAdminAiConfig, recognizeCourses, updateAdminAiConfig } from '../../api/admin-api';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatJson } from '../../utils/json';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

function AdminAiPage() {
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [clearApiKey, setClearApiKey] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('未加载');
  const [keyState, setKeyState] = useState<string>('未读取');
  const [recognizeStatus, setRecognizeStatus] = useState<string>('待上传');
  const [resultText, setResultText] = useState<string>('');
  const [recognizeFiles, setRecognizeFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);

  useBodyClass('admin-route');
  usePageMeta('AI 识别配置', '配置 珂拉课程表 的 AI 视觉模型与识别测试能力。');

  async function loadConfig(): Promise<void> {
    setSaveStatus('正在读取配置...');

    try {
      const config = await fetchAdminAiConfig();
      setBaseUrl(config.baseUrl || '');
      setModel(config.model || '');
      setApiKey('');
      setClearApiKey(false);
      setKeyState(config.apiKeyConfigured ? '已保存访问密钥' : '还没有填写访问密钥');
      setSaveStatus('配置已加载');
    } catch (error) {
      setSaveStatus(userMessageFor(error));
      setKeyState('读取失败');
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

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setSaveStatus('正在保存配置...');

    try {
      const config = await updateAdminAiConfig({
        baseUrl,
        model,
        apiKey: apiKey || undefined,
        clearApiKey,
      });
      setApiKey('');
      setClearApiKey(false);
      setKeyState(config.apiKeyConfigured ? '已保存访问密钥' : '还没有填写访问密钥');
      setSaveStatus('配置已保存');
    } catch (error) {
      setSaveStatus(userMessageFor(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRecognize(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (recognizeFiles.length === 0) {
      setRecognizeStatus('请先选择课表图片');
      return;
    }

    setIsRecognizing(true);
    setRecognizeStatus('正在上传并识别...');

    try {
      const result = await recognizeCourses(recognizeFiles);
      setResultText(formatJson(result));
      setRecognizeStatus('识别完成');
    } catch (error) {
      setRecognizeStatus(userMessageFor(error));
      setResultText('');
    } finally {
      setIsRecognizing(false);
    }
  }

  return (
    <AdminLayout
      title='AI 识别配置'
      description='配置 OpenAI-compatible 视觉模型，并直接测试课程识别能力。'
      activeKey='ai'
      badgeText={keyState}
    >
      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>识别模型</h2>
              <p>服务地址填到 /v1 就够了，后面的部分会自动补上。</p>
            </div>
            <span className={styles.statusText}>{saveStatus}</span>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleSave}>
              <label className={styles.field}>
                <span>服务地址</span>
                <input className={styles.input} required placeholder='https://api.openai.com/v1' value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>模型</span>
                <input className={styles.input} required placeholder='gpt-4o-mini' value={model} onChange={(event) => setModel(event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>访问密钥</span>
                <input className={styles.input} type='password' autoComplete='new-password' placeholder='留空则保留原 key' value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
                <span className={styles.hint}>{keyState}</span>
              </label>
              <label className={styles.check}>
                <input type='checkbox' checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} />
                清除已保存的访问密钥
              </label>
              <div className={styles.actions}>
                <button className={styles.button} type='submit' disabled={isSaving}>
                  {isSaving ? '保存中...' : '保存配置'}
                </button>
                <button className={styles.buttonSecondary} type='button' onClick={() => void loadConfig()}>
                  重新加载
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>识别测试</h2>
              <p>可以一次选多张图片。图片越清晰，识别越准。</p>
            </div>
            <span className={styles.statusText}>{recognizeStatus}</span>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleRecognize}>
              <label className={styles.field}>
                <span>课表图片</span>
                <input
                  className={styles.input}
                  type='file'
                  accept='image/*'
                  multiple
                  required
                  onChange={(event) => setRecognizeFiles(Array.from(event.target.files ?? []))}
                />
                <span className={styles.hint}>已选择 {recognizeFiles.length} 张图片。</span>
              </label>
              <div className={styles.actions}>
                <button className={styles.button} type='submit' disabled={isRecognizing}>
                  {isRecognizing ? '识别中...' : '开始识别'}
                </button>
              </div>
            </form>
            <label className={styles.field}>
              <span>要求返回纯数据</span>
              <textarea className={`${styles.textarea} ${styles.resultConsole}`} spellCheck={false} placeholder='识别结果会显示在这里' value={resultText} readOnly></textarea>
            </label>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminAiPage;
