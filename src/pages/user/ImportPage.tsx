import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchImportableSchools, importFromHtml } from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { EmptyState, Field, Loading, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { normalizeCourse, weekText } from '../../lib/schedule';
import { saveCoursesToSchedule } from '../../lib/save-courses';
import { useExtensionInstalled } from '../../lib/use-extension-installed';
import type { ICourseType, IImportResultType, ISchoolType } from '../../types';

/** 导入扩展的下载地址。放在站点根目录，随前端一起发布。 */
const EXTENSION_DOWNLOAD_URL = '/downloads/clark-aams-extension.zip';

export default function ImportPage() {
  const { notify } = useToast();
  const extensionState = useExtensionInstalled();

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

    /*
     * 用普通标签页打开，不要用 window.open 指定尺寸。
     *
     * 指定了 width/height 的弹窗没有地址栏和工具栏，用户在里面
     * 找不到扩展图标——一键导入也就无从点起。普通标签页保留完整
     * 浏览器界面，扩展按钮才在。
     *
     * rel="noopener" 由 <a> 承担；这里用 anchor 点击而不是 window.open，
     * 是为了让浏览器把它当成用户主动发起的导航，不被弹窗拦截。
     */
    const anchor = document.createElement('a');
    anchor.href = school.login.loginUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setError('');
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
        <>
          <section className="card">
            {extensionState === 'installed' ? (
              <>
                <div className="card__head">
                  <div>
                    <h2 className="card__title">扩展装好了，可以开始导入</h2>
                    <p className="card__sub">
                      点下面的按钮前往 {school.name} 教务系统。在那里登录、打开课表页，
                      然后点浏览器工具栏上的粉色图标。
                    </p>
                  </div>
                  <button className="btn btn--primary btn--sm" type="button" onClick={openSchoolPage}>
                    打开{school.name}教务系统
                  </button>
                </div>

                <ol className="stack gap-3" style={{ paddingLeft: '1.1rem', margin: 0, color: 'var(--ink-600)', fontSize: 'var(--text-small)' }}>
                  <li>在教务系统里登录，一直点到能看见整张课表的那一页。</li>
                  <li>点浏览器工具栏上的粉色图标——在地址栏右边，可能需要先点拼图图标把它固定出来。</li>
                  <li>在弹出的窗口里点「导入现在这一页」，读完会自动放进你的课表。</li>
                </ol>
              </>
            ) : (
              <>
                <div className="card__head">
                  <div>
                    <h2 className="card__title">
                      {extensionState === 'checking' ? '正在确认扩展…' : '装一次扩展，以后点一下就导完'}
                    </h2>
                    <p className="card__sub">
                      装好之后，你在 {school.name} 的教务系统里打开课表页，
                      点一下浏览器上的按钮，课表就自动整理进来了。不用复制、不用粘贴。
                    </p>
                  </div>
                  <a className="btn btn--primary btn--sm" href={EXTENSION_DOWNLOAD_URL} download>
                    下载导入扩展
                  </a>
                </div>

                <ol className="stack gap-3" style={{ paddingLeft: '1.1rem', margin: 0, color: 'var(--ink-600)', fontSize: 'var(--text-small)' }}>
                  <li>下载后解压，得到一个文件夹。</li>
                  <li>在 Chrome 地址栏打开 <code>chrome://extensions</code>，打开右上角「开发者模式」。</li>
                  <li>点「加载已解压的扩展程序」，选中刚才解压出来的文件夹。</li>
                  <li>回到这一页刷新一下，提示会变成「扩展装好了」。</li>
                  <li>打开 {school.name} 教务系统的课表页，点工具栏上的粉色图标，再点「导入现在这一页」。</li>
                </ol>

                <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                  <button className="btn btn--primary" type="button" onClick={openSchoolPage}>
                    先打开{school.name}教务系统
                  </button>
                  <a className="btn btn--ghost" href={EXTENSION_DOWNLOAD_URL} download>
                    下载扩展
                  </a>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <div className="card__head">
              <div>
                <h2 className="card__title">不想装扩展？也可以贴过来</h2>
                <p className="card__sub">
                  在课表页复制整张表格，粘贴到下面，效果是一样的。
                </p>
              </div>
            </div>

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

            <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
              <button className="btn btn--primary" type="button" disabled={isParsing} onClick={() => void handleParse()}>
                {isParsing ? '正在整理…' : '整理成课表'}
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
        </>
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
