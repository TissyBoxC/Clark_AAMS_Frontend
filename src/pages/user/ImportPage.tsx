import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchImportableSchools, importFromHtml } from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { EmptyState, Field, Loading, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { normalizeCourse, weekText } from '../../lib/schedule';
import { saveCoursesToSchedule } from '../../lib/save-courses';
import type { ICourseType, IImportResultType, ISchoolType } from '../../types';

export default function ImportPage() {
  const { notify } = useToast();

  const [schools, setSchools] = useState<ISchoolType[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [schoolId, setSchoolId] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<IImportResultType | null>(null);

  const school = useMemo(
    () => schools.find((item) => item.id === schoolId) ?? null,
    [schoolId, schools],
  );

  const previewCourses: ICourseType[] = useMemo(
    () => (result?.courses ?? []).map((raw, index) => normalizeCourse(raw, index)),
    [result],
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const list = await fetchImportableSchools();
        if (!cancelled) {
          setSchools(list);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(userMessageFor(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchools(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openSchoolPage(): void {
    if (!school?.login?.loginUrl) {
      setError('这所学校还没有配置登录入口，可以改用截图识别。');
      return;
    }

    const popup = window.open(
      school.login.loginUrl,
      'clarkSchoolPage',
      'width=1280,height=860,resizable=yes,scrollbars=yes',
    );

    if (!popup) {
      setError('浏览器拦住了新窗口。允许弹出窗口后，再点一次按钮。');
      return;
    }

    setError('');
    popup.focus();
  }

  async function handleParse(): Promise<void> {
    if (!school) {
      setError('先选一所学校。');
      return;
    }

    const html = pageContent.trim();
    if (!html.startsWith('<')) {
      setError('把学校课表页里的课表整个复制过来，从开头的尖括号开始。');
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const imported = await importFromHtml(school.id, html);
      setResult(imported);

      if ((imported.courses ?? []).length === 0) {
        setError('这段内容里没有找到课程。换学校课表页再复制一次，注意把表格边框整个框进去。');
      } else {
        notify(`读出 ${imported.courses?.length ?? 0} 门课程`, 'success');
      }
    } catch (parseError) {
      setError(userMessageFor(parseError));
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const { saved, skipped } = await saveCoursesToSchedule(result?.courses ?? []);
      notify(
        skipped > 0
          ? `已保存 ${saved} 门课程，${skipped} 门缺少课程名没有保存`
          : `已保存 ${saved} 门课程到课表`,
        'success',
      );
    } catch (saveError) {
      notify(userMessageFor(saveError), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkspaceShell
      title="教务导入"
      description="从学校教务系统一次取回整学期课表，省掉逐条录入的时间。"
      actions={(
        <Link className="btn btn--quiet btn--sm" to="/user/recognition">
          改用截图识别
        </Link>
      )}
    >
      <PageMeta title="教务导入 · 珂拉课程表" description="从学校教务系统读取整学期课表。" />

      {error ? (
        <div className="notice notice--danger">
          <span>{error}</span>
        </div>
      ) : null}

      <section className="card">
        <div className="card__head">
          <div>
            <h2 className="card__title">第一步 · 选学校</h2>
            <p className="card__sub">
              列表里是已经对接过教务系统的学校。选好之后，下面会给出这所学校的具体做法。
            </p>
          </div>
        </div>

        {isLoadingSchools ? (
          <Loading text="正在读取学校列表…" />
        ) : schools.length === 0 ? (
          <EmptyState
            title="目前没有可以一键导入的学校"
            action={(
              <>
                <Link className="btn btn--primary btn--sm" to="/user/recognition">上传课表截图</Link>
                <Link className="btn btn--quiet btn--sm" to="/user/schedule">手动添加课程</Link>
              </>
            )}
          >
            这不代表你的学校用不了。只是还没接上自动读取，
            用截图识别同样能得到完整课表，之后也能正常按周查看。
          </EmptyState>
        ) : (
          <div className="action-list">
            {schools.map((item) => (
              <button
                key={item.id}
                className="action-row"
                type="button"
                onClick={() => { setSchoolId(item.id); setResult(null); setError(''); }}
                aria-pressed={item.id === schoolId}
                style={{ textAlign: 'left', border: 0, cursor: 'pointer' }}
              >
                <span className="action-row__num">{item.id === schoolId ? '✓' : '·'}</span>
                <span>
                  <strong>{item.name}</strong>
                  <span>{item.shortName ? `${item.shortName} · 支持读取整学期课表` : '支持读取整学期课表'}</span>
                </span>
                <span className="action-row__go" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {school ? (
        <section className="card">
          <div className="card__head">
            <div>
              <h2 className="card__title">第二步 · 取回课表内容</h2>
              <p className="card__sub">
                点下面的按钮会打开 {school.name} 的登录页，用你自己的学号密码登录，
                进到课表页后把整张课表复制下来。
              </p>
            </div>
            <button className="btn btn--primary btn--sm" type="button" onClick={openSchoolPage}>
              打开{school.name}课表页
            </button>
          </div>

          <ol className="stack gap-3" style={{ paddingLeft: '1.1rem', margin: 0, color: 'var(--ink-600)', fontSize: 'var(--text-small)' }}>
            <li>在新窗口里登录学校系统，一直点到能看见整张课表的那一页。</li>
            <li>在课表区域从左上角拖到右下角，复制选中的内容。</li>
            <li>回到这里，粘贴到下面的框里，点「开始整理」。</li>
          </ol>

          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Field
              label="课表内容"
              htmlFor="import-content"
              hint="从开头的尖括号开始粘贴。内容只用于这次整理，不会保存你的学校密码。"
            >
              <textarea
                id="import-content"
                className="textarea"
                value={pageContent}
                placeholder="把学校课表页里复制的内容粘贴到这里"
                onChange={(event) => setPageContent(event.target.value)}
              />
            </Field>
          </div>

          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn--primary" type="button" disabled={isParsing} onClick={() => void handleParse()}>
              {isParsing ? '正在整理…' : '开始整理'}
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => { setPageContent(''); setResult(null); setError(''); }}
            >
              清空重来
            </button>
          </div>
        </section>
      ) : null}

      {result && previewCourses.length > 0 ? (
        <section className="card">
          <div className="card__head">
            <div>
              <h2 className="card__title">第三步 · 核对并保存</h2>
              <p className="card__sub">
                共整理出 {previewCourses.length} 门课程
                {result.pickupCode ? `，取件码 ${result.pickupCode}` : ''}。
                确认没问题再保存，保存后会出现在「我的课表」里。
              </p>
            </div>
          </div>

          <div className="course-list">
            {previewCourses.map((course) => (
              <div className="course-row" key={`${course.name}-${course.dayOfWeek}-${course.startLesson}`}>
                <span className="course-row__day">
                  <b>周{course.dayOfWeek}</b>
                  {course.startLesson}-{course.endLesson}
                </span>
                <span>
                  <strong>{course.name}</strong>
                  <span>{[course.location, course.teacher, weekText(course)].filter(Boolean).join(' · ')}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn--primary" type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? '正在保存…' : '保存到我的课表'}
            </button>
            <Link className="btn btn--quiet" to="/user/schedule">先去课表看看</Link>
          </div>
        </section>
      ) : null}

      <section className="card card--sunken">
        <h2 className="card__title">导入前先知道</h2>
        <div className="stack gap-3" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-small)', color: 'var(--ink-600)' }}>
          <p>
            学校系统的密码在你和学校之间使用，我们拿不到，也不保存。
            整理出来的课程会先列出来给你核对，确认后才写进课表。
          </p>
          <p>
            如果学校页面要求短信验证或图形验证码，按学校页面的提示操作即可，这一步代替不了。
          </p>
        </div>
      </section>
    </WorkspaceShell>
  );
}
