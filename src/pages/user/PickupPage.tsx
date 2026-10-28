import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { fetchPickup } from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { EmptyState, Field, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { normalizeCourse, weekText } from '../../lib/schedule';
import { saveCoursesToSchedule } from '../../lib/save-courses';
import type { ICourseType, IRawCourseType } from '../../types';

export default function PickupPage() {
  const { notify } = useToast();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [rawCourses, setRawCourses] = useState<IRawCourseType[] | null>(null);

  const courses: ICourseType[] = useMemo(
    () => (rawCourses ?? []).map((raw, index) => normalizeCourse(raw, index)),
    [rawCourses],
  );

  async function handleLookup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    const normalized = code.trim().toUpperCase();
    if (normalized.length < 6) {
      setError('取件码一般是 8 位，请对照发码的人给你的内容填写。');
      return;
    }

    setIsLoading(true);
    setRawCourses(null);

    try {
      const result = await fetchPickup(normalized);
      setRawCourses(result);
      notify(`取回 ${result.length} 门课程`, 'success');
    } catch (lookupError) {
      setError(userMessageFor(lookupError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const { saved, skipped } = await saveCoursesToSchedule(rawCourses ?? []);
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
      title="取件码"
      description="输入 8 位取件码，取回之前保存或别人分享给你的课表。"
      actions={(
        <Link className="btn btn--quiet btn--sm" to="/user/recognition">
          改用截图识别
        </Link>
      )}
    >
      <PageMeta title="取件码 · 珂拉课程表" description="用取件码取回之前保存的课表。" />

      <section className="card">
        <form className="stack gap-4" onSubmit={(event) => void handleLookup(event)} noValidate>
          <Field
            label="取件码"
            htmlFor="pickup-code"
            hint="8 位，字母不区分大小写。取件码只能取回那一份课表，不能登录账号。"
          >
            <div className="input-affix">
              <input
                id="pickup-code"
                className="input"
                value={code}
                placeholder="例如 7K2M9Q4D"
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                autoComplete="off"
              />
              <button className="input-affix__button" type="submit" disabled={isLoading}>
                {isLoading ? '查找中' : '取回'}
              </button>
            </div>
          </Field>

          {error ? (
            <div className="notice notice--danger">
              <span>{error}</span>
            </div>
          ) : null}
        </form>
      </section>

      {rawCourses === null ? (
        <section className="card">
          <EmptyState title="取回的结果会显示在这里">
            输入取件码后，那份课表会先以列表形式展示出来。
            你可以只看看，也可以一键存进自己的课表。
          </EmptyState>
        </section>
      ) : courses.length === 0 ? (
        <section className="card">
          <EmptyState title="这个取件码里没有课程">
            可能这份记录是空的，也可能发码的人删掉了内容。
            请让对方重新生成一次，或者直接用截图识别。
          </EmptyState>
        </section>
      ) : (
        <section className="card">
          <div className="card__head">
            <div>
              <h2 className="card__title">取回 {courses.length} 门课程</h2>
              <p className="card__sub">存进课表后，这些课会和你原有的课表放在一起。</p>
            </div>
            <button className="btn btn--primary btn--sm" type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? '正在保存…' : '保存到我的课表'}
            </button>
          </div>

          <div className="course-list">
            {courses.map((course) => (
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
        </section>
      )}

      <section className="card card--sunken">
        <h2 className="card__title">取件码从哪来</h2>
        <p className="card__sub" style={{ marginTop: 'var(--sp-2)' }}>
          每次截图识别或教务导入成功后，都会生成一个新的取件码。
          它在「截图识别」的结果里显示，也可以让已经有的同学直接发给你。
        </p>
      </section>
    </WorkspaceShell>
  );
}
