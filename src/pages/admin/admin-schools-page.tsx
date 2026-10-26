import { useEffect, useState, type FormEvent } from 'react';

import { createSchoolScaffold } from '../../api/admin-api';
import { fetchSchools } from '../../api/school-api';
import type { ISchoolScaffoldPayloadType, ISchoolType } from '../../types/app-types';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatJson } from '../../utils/json';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

const INITIAL_SCAFFOLD_FORM: ISchoolScaffoldPayloadType = {
  schoolId: 'njupt',
  classPrefix: 'Njupt',
  name: '南京邮电大学',
  shortName: 'NJUPT',
  loginMode: 'webview',
  loginUrl: 'https://example.edu.cn/login',
  successUrlPatterns: 'https://example.edu.cn/main*',
  enabled: true,
  academicImport: true,
  imageRecognition: false,
  overwrite: false,
};

function AdminSchoolsPage() {
  const [schools, setSchools] = useState<ISchoolType[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('等待提交');
  const [tableStatus, setTableStatus] = useState<string>('加载中');
  const [scaffoldForm, setScaffoldForm] = useState<ISchoolScaffoldPayloadType>(INITIAL_SCAFFOLD_FORM);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useBodyClass('admin-route');
  usePageMeta('学校适配器管理', '查看现有学校配置，并生成新的学校适配器脚手架。');

  async function loadSchools(): Promise<void> {
    setTableStatus('加载中');

    try {
      const nextSchools = await fetchSchools();
      setSchools(nextSchools);
      setTableStatus(`已加载 ${nextSchools.length} 所学校`);
    } catch (error) {
      setSchools([]);
      setTableStatus(userMessageFor(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSchools();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage('正在生成脚手架...');

    try {
      const result = await createSchoolScaffold(scaffoldForm);
      setStatusMessage(`脚手架生成成功：${formatJson(result)}`);
      void loadSchools();
    } catch (error) {
      setStatusMessage(userMessageFor(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout
      title='学校适配器管理'
      description='查看当前学校列表，并生成新的学校适配器脚手架。'
      activeKey='schools'
      badgeText={`${schools.length} 所学校`}
    >
      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>当前学校</h2>
              <p>读取 /api/v1/schools 的现有配置。</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.buttonSecondary} type='button' onClick={() => void loadSchools()}>
                刷新
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.statusText}>{tableStatus}</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>学校 ID</th>
                    <th>名称</th>
                    <th>简称</th>
                    <th>能力</th>
                    <th>登录地址</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.length === 0 ? (
                    <tr>
                      <td colSpan={5}>暂无数据</td>
                    </tr>
                  ) : (
                    schools.map((school) => (
                      <tr key={school.id}>
                        <td>{school.id}</td>
                        <td>{school.name}</td>
                        <td>{school.shortName || '-'}</td>
                        <td>
                          {school.capabilities?.academicImport ? '教务导入 ' : ''}
                          {school.capabilities?.imageRecognition ? '图片识别' : ''}
                          {!school.capabilities?.academicImport && !school.capabilities?.imageRecognition ? '-' : ''}
                        </td>
                        <td>{school.login?.loginUrl || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>生成学校脚手架</h2>
              <p>该接口将根据表单内容生成新的学校适配器代码骨架。</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>学校 ID</span>
                  <input className={styles.input} pattern='[a-z][a-z0-9_]*' required value={scaffoldForm.schoolId} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, schoolId: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>类名前缀</span>
                  <input className={styles.input} value={scaffoldForm.classPrefix} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, classPrefix: event.target.value }))} />
                </label>
              </div>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>学校名称</span>
                  <input className={styles.input} required value={scaffoldForm.name} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, name: event.target.value }))} />
                </label>
                <label className={styles.field}>
                  <span>学校简称</span>
                  <input className={styles.input} required value={scaffoldForm.shortName} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, shortName: event.target.value }))} />
                </label>
              </div>
              <div className={styles.formGridTwo}>
                <label className={styles.field}>
                  <span>登录模式</span>
                  <select className={styles.select} value={scaffoldForm.loginMode} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, loginMode: event.target.value }))}>
                    <option value='webview'>webview</option>
                    <option value='cookie'>cookie</option>
                    <option value='html'>html</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>登录地址</span>
                  <input className={styles.input} required value={scaffoldForm.loginUrl} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, loginUrl: event.target.value }))} />
                </label>
              </div>
              <label className={styles.field}>
                <span>成功 URL 规则</span>
                <textarea className={styles.textarea} required value={scaffoldForm.successUrlPatterns} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, successUrlPatterns: event.target.value }))}></textarea>
              </label>
              <div className={styles.checkRow}>
                <label className={styles.check}>
                  <input type='checkbox' checked={scaffoldForm.enabled} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, enabled: event.target.checked }))} />
                  启用
                </label>
                <label className={styles.check}>
                  <input type='checkbox' checked={scaffoldForm.academicImport} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, academicImport: event.target.checked }))} />
                  教务导入
                </label>
                <label className={styles.check}>
                  <input type='checkbox' checked={scaffoldForm.imageRecognition} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, imageRecognition: event.target.checked }))} />
                  图片识别
                </label>
                <label className={styles.check}>
                  <input type='checkbox' checked={scaffoldForm.overwrite} onChange={(event) => setScaffoldForm((previous) => ({ ...previous, overwrite: event.target.checked }))} />
                  覆盖文件
                </label>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} type='submit' disabled={isSubmitting}>
                  {isSubmitting ? '生成中...' : '生成脚手架'}
                </button>
              </div>
              <div className={`${styles.statusText} ${statusMessage.includes('失败') ? styles.statusError : ''}`}>{statusMessage}</div>
            </form>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminSchoolsPage;
