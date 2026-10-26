import { useEffect, useState, type FormEvent } from 'react';

import { createSchoolScaffold } from '../../api/admin-api';
import { fetchSchools } from '../../api/school-api';
import type { ISchoolScaffoldPayloadType, ISchoolType } from '../../types/app-types';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';

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
  usePageMeta('学校管理', '查看已接入的学校，也可以新增一所。');

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
    setStatusMessage('正在创建学校入口...');

    try {
      const result = await createSchoolScaffold(scaffoldForm);
      // 不要把返回值整个打印出来：管理员要的是「做成了没有」，不是一份数据。
      // 返回值是 JSON 联合类型，取名字前要先确认它确实是对象。
      const createdName =
        result && typeof result === 'object' && !Array.isArray(result) && typeof result.name === 'string'
          ? result.name
          : '';
      setStatusMessage(createdName ? `${createdName} 的导入入口已建好。` : '学校导入入口已建好。');
      void loadSchools();
    } catch (error) {
      setStatusMessage(userMessageFor(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout
      title='学校管理'
      description='这里列出已经接入的学校。'
      activeKey='schools'
      badgeText={`${schools.length} 所学校`}
    >
      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>当前学校</h2>
              <p>这里列出已经接入的学校。</p>
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
                      <td colSpan={5}>还没有学校。可以新增一所，或等待自动读取。</td>
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
              <h2>新增学校</h2>
              <p>填好下面的信息，就能为这所学校建一个导入入口。</p>
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
                  {isSubmitting ? '生成中...' : '新增学校'}
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
