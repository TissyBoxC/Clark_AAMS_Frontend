import { useState, type FormEvent } from 'react';

import { createSchoolScaffold } from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import type { ISchoolScaffoldDraftType } from '../../types';

const EMPTY: ISchoolScaffoldDraftType = {
  schoolId: '',
  classPrefix: '',
  name: '',
  shortName: '',
  loginMode: 'form',
  loginUrl: '',
  successUrlPatterns: '',
  enabled: true,
  academicImport: true,
  imageRecognition: true,
  overwrite: false,
};

export default function AdminSchoolsPage() {
  const { notify } = useToast();

  const [form, setForm] = useState<ISchoolScaffoldDraftType>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof ISchoolScaffoldDraftType>(key: K, value: ISchoolScaffoldDraftType[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (!form.schoolId.trim() || !form.name.trim()) {
      setError('学校标识和学校全称都要填，学生靠它们认出自己的学校。');
      return;
    }
    if (form.academicImport && !form.loginUrl.trim()) {
      setError('要支持整学期导入，就得填上登录入口地址。');
      return;
    }

    setIsSaving(true);
    try {
      await createSchoolScaffold(form);
      notify('学校已创建', 'success');
      setForm(EMPTY);
    } catch (saveError) {
      setError(userMessageFor(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell title="学校接入" description="新增一所可以从教务系统导入的学校。创建后需要再核对一次课程表页面能否正常读取。">
      <PageMeta title="学校接入 · 珂拉课程表管理台" description="为学校创建导入通道，让对应学校的学生一次取回整学期课表。" />

      <form className="a-card" onSubmit={(event) => void handleSubmit(event)} noValidate style={{ display: 'grid', gap: '1rem' }}>
        <div className="a-card__head">
          <div>
            <h2 className="a-card__title">基本信息</h2>
            <p className="a-card__sub">学生在导入页看到的名称，就是这里填的学校全称。</p>
          </div>
        </div>

        <div className="a-grid a-grid--2">
          <div className="a-field">
            <label htmlFor="school-id">学校标识</label>
            <input
              id="school-id"
              className="a-input"
              value={form.schoolId}
              placeholder="例如 jit"
              onChange={(event) => update('schoolId', event.target.value)}
            />
            <span className="a-hint">英文短名，建好后不建议再改。</span>
          </div>

          <div className="a-field">
            <label htmlFor="school-name">学校全称</label>
            <input
              id="school-name"
              className="a-input"
              value={form.name}
              placeholder="例如 嘉兴南湖学院"
              onChange={(event) => update('name', event.target.value)}
            />
          </div>

          <div className="a-field">
            <label htmlFor="school-short">简称</label>
            <input
              id="school-short"
              className="a-input"
              value={form.shortName}
              placeholder="例如 南湖学院"
              onChange={(event) => update('shortName', event.target.value)}
            />
          </div>

          <div className="a-field">
            <label htmlFor="school-prefix">班级前缀</label>
            <input
              id="school-prefix"
              className="a-input"
              value={form.classPrefix}
              placeholder="例如 计科"
              onChange={(event) => update('classPrefix', event.target.value)}
            />
          </div>
        </div>

        <div className="a-grid a-grid--2">
          <div className="a-field">
            <label htmlFor="school-login-url">登录入口地址</label>
            <input
              id="school-login-url"
              className="a-input"
              value={form.loginUrl}
              placeholder="https://jw.example.edu.cn/"
              onChange={(event) => update('loginUrl', event.target.value)}
            />
          </div>

          <div className="a-field">
            <label htmlFor="school-login-mode">登录方式</label>
            <select
              id="school-login-mode"
              className="a-select"
              value={form.loginMode}
              onChange={(event) => update('loginMode', event.target.value)}
            >
              <option value="form">网页登录</option>
              <option value="sso">单点登录</option>
              <option value="other">其它</option>
            </select>
          </div>
        </div>

        <div className="a-field">
          <label htmlFor="school-patterns">成功页特征</label>
          <textarea
            id="school-patterns"
            className="a-textarea"
            value={form.successUrlPatterns}
            placeholder="/xs_main.aspx&#10;/xskbcx.aspx"
            onChange={(event) => update('successUrlPatterns', event.target.value)}
          />
          <span className="a-hint">每行一个，或用逗号分隔。指的是课表页面地址里会出现的那一段。</span>
        </div>

        <div className="a-grid a-grid--4">
          <label className="a-field" htmlFor="school-enabled">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="school-enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => update('enabled', event.target.checked)}
              />
              对学生可见
            </span>
          </label>

          <label className="a-field" htmlFor="school-import">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="school-import"
                type="checkbox"
                checked={form.academicImport}
                onChange={(event) => update('academicImport', event.target.checked)}
              />
              支持整学期导入
            </span>
          </label>

          <label className="a-field" htmlFor="school-recognition">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="school-recognition"
                type="checkbox"
                checked={form.imageRecognition}
                onChange={(event) => update('imageRecognition', event.target.checked)}
              />
              支持截图识别
            </span>
          </label>

          <label className="a-field" htmlFor="school-overwrite">
            <span className="row" style={{ gap: '0.5rem' }}>
              <input
                id="school-overwrite"
                type="checkbox"
                checked={form.overwrite}
                onChange={(event) => update('overwrite', event.target.checked)}
              />
              覆盖同名学校
            </span>
          </label>
        </div>

        {error ? <div className="a-note a-note--bad">{error}</div> : null}

        <div className="a-note a-note--warn">
          创建之后请用一所真实学校的账号走一遍导入，确认能读出课程。
          学生看到这所学校就说明已经生效，读不出来的话先把它关掉。
        </div>

        <div className="row">
          <button className="a-btn a-btn--primary" type="submit" disabled={isSaving}>
            {isSaving ? '正在创建…' : '创建学校'}
          </button>
          <button className="a-btn a-btn--quiet" type="button" onClick={() => { setForm(EMPTY); setError(''); }}>
            清空表单
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
