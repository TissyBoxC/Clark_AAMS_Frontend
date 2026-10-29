import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  clearCourses as clearMyCourses,
  createCourse,
  deleteCourse,
  fetchMyCourses,
  updateCourse,
} from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { EmptyState, Field, Loading, PageMeta } from '../../components/ui';
import { useConfirm } from '../../components/useConfirm';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import {
  MAX_WEEK,
  WEEKDAY_LABELS,
  dateOfWeekDay,
  isCourseInWeek,
  lessonRangeText,
  maxLessonOf,
  monthDayLabel,
  termWeek,
  weekText,
  weekdayOf,
} from '../../lib/schedule';
import { getLessonTimes, getTermStart } from '../../lib/term-settings';
import type { ICourseType, ICourseDraftType } from '../../types';

interface IFormStateType {
  name: string;
  dayOfWeek: number;
  startLesson: string;
  endLesson: string;
  location: string;
  teacher: string;
  weeks: string;
  rule: 'ALL' | 'ODD' | 'EVEN';
}

const EMPTY_FORM: IFormStateType = {
  name: '',
  dayOfWeek: 1,
  startLesson: '1',
  endLesson: '2',
  location: '',
  teacher: '',
  weeks: '1-16',
  rule: 'ALL',
};

function weekInputOf(course: ICourseType): string {
  if (Array.isArray(course.weekRanges) && course.weekRanges.length > 0) {
    return course.weekRanges
      .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
      .join(',');
  }
  return `${course.startWeek}-${course.endWeek}`;
}

function parseWeeks(value: string): [number, number][] {
  const ranges: [number, number][] = [];

  value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const parts = item.split(/[-~—]/).map((piece) => Number.parseInt(piece.trim(), 10));

      if (parts.length === 1 && Number.isFinite(parts[0])) {
        ranges.push([parts[0], parts[0]]);
        return;
      }

      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        const start = Math.min(parts[0], parts[1]);
        const end = Math.max(parts[0], parts[1]);
        ranges.push([start, end]);
      }
    });

  return ranges;
}

export default function SchedulePage() {
  const { confirm, confirmElement } = useConfirm();
  const { notify } = useToast();

  const [courses, setCourses] = useState<ICourseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  /*
   * 学期设置存在本机，在设置页改。回到课表页时重读一次，
   * 否则刚改完的起始日要刷新页面才生效。
   */
  const [termStart, setTermStartState] = useState<string>(() => getTermStart());
  const [lessonTimes, setLessonTimesState] = useState<string[]>(() => getLessonTimes());

  useEffect(() => {
    function reread(): void {
      setTermStartState(getTermStart());
      setLessonTimesState(getLessonTimes());
    }
    // 从别的页面切回来
    window.addEventListener('focus', reread);
    // 同一页面内改完 localStorage 也能收到
    window.addEventListener('storage', reread);
    return () => {
      window.removeEventListener('focus', reread);
      window.removeEventListener('storage', reread);
    };
  }, []);
  /*
   * 默认显示今天所在的周，而不是死板地从第 1 周开始。
   * 学期过了大半还把人按在第一周，等于每次都要手动翻。
   * 没配第一周周一、或今天在学期之外时，termWeek 会夹到 [1, maxWeeks]。
   */
  const [week, setWeek] = useState(() => termWeek(getTermStart(), new Date(), MAX_WEEK));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<IFormStateType>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const todayWeekday = weekdayOf(new Date());
  const todayWeek = useMemo(() => termWeek(termStart, new Date(), MAX_WEEK), [termStart]);

  /** 表头里每天对应的日期；没配起始日就返回 null。 */
  function topDateOfDay(day: number): Date | null {
    if (!termStart) {
      return null;
    }
    return dateOfWeekDay(termStart, week, day);
  }

  /** 当前查看的这周，是不是今天所在的那一周。 */
  const isCurrentWeek = todayWeek === week;

  /** 这一格是不是「今天」。 */
  function isToday(day: number): boolean {
    return isCurrentWeek && day === todayWeekday;
  }

  const maxWeeks = useMemo(() => {
    const lastWeek = courses.reduce((max, course) => Math.max(max, course.endWeek || 1), 0);
    return Math.min(Math.max(lastWeek + 1, 16), 30);
  }, [courses]);

  const lessons = useMemo(() => Math.min(Math.max(maxLessonOf(courses), 12), 16), [courses]);
  const weekCourses = useMemo(
    () => courses.filter((course) => isCourseInWeek(course, week)),
    [courses, week],
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const list = await fetchMyCourses();
        if (!cancelled) {
          setCourses(list);
          setError('');
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

  function openCreate(day?: number, lesson?: number): void {
    setEditingId(null);
    setFormError('');
    setForm({
      ...EMPTY_FORM,
      dayOfWeek: day ?? 1,
      startLesson: String(lesson ?? 1),
      endLesson: String((lesson ?? 1) + 1),
    });
    setEditorOpen(true);
  }

  function openEdit(course: ICourseType): void {
    setEditingId(course.id);
    setFormError('');
    setForm({
      name: course.name,
      dayOfWeek: course.dayOfWeek,
      startLesson: String(course.startLesson),
      endLesson: String(course.endLesson),
      location: course.location,
      teacher: course.teacher,
      weeks: weekInputOf(course),
      rule: course.weekRule ?? 'ALL',
    });
    setEditorOpen(true);
  }

  async function refreshCourses(): Promise<void> {
    const list = await fetchMyCourses();
    setCourses(list);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError('');

    const startLesson = Number.parseInt(form.startLesson, 10);
    const endLesson = Number.parseInt(form.endLesson, 10);
    const weekRanges = parseWeeks(form.weeks);

    if (!form.name.trim()) {
      setFormError('课程名还没填，写上课表上显示的名字就行。');
      return;
    }
    if (!Number.isFinite(startLesson) || startLesson < 1) {
      setFormError('起始节次至少是第 1 节。');
      return;
    }
    if (!Number.isFinite(endLesson) || endLesson < startLesson) {
      setFormError('结束节次不能早于起始节次。');
      return;
    }
    if (weekRanges.length === 0) {
      setFormError('周次这样填试试：1-16，或者 1-8,10-16 表示跳开第九周。');
      return;
    }

    const draft: ICourseDraftType = {
      name: form.name.trim(),
      dayOfWeek: form.dayOfWeek,
      startLesson,
      endLesson,
      location: form.location.trim(),
      teacher: form.teacher.trim(),
      weekRanges,
      weekRule: form.rule,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await updateCourse(editingId, draft);
        notify('课程已更新', 'success');
      } else {
        await createCourse(draft);
        notify('课程已添加', 'success');
      }
      await refreshCourses();
      setEditorOpen(false);
    } catch (saveError) {
      setFormError(userMessageFor(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!editingId) {
      return;
    }

    const target = courses.find((course) => course.id === editingId);
    const confirmed = await confirm({
      title: '删除这门课？',
      body: (
        <p>
          删除后这一门课会从课表里消失，其它课不受影响。
          {target ? ` 确定删除「${target.name}」吗？` : ''}
        </p>
      ),
      confirmText: '删除课程',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCourse(editingId);
      await refreshCourses();
      setEditorOpen(false);
      notify('课程已删除', 'success');
    } catch (deleteError) {
      notify(userMessageFor(deleteError), 'error');
    }
  }

  async function handleClear(): Promise<void> {
    const confirmed = await confirm({
      title: '清空整份课表？',
      body: (
        <p>
          清空后这学期的 {courses.length} 门课都会删掉，无法恢复。
          如果只是想重新导入，可以先导出到别处留个底。
        </p>
      ),
      confirmText: '清空课表',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await clearMyCourses();
      await refreshCourses();
      notify('课表已清空', 'success');
    } catch (clearError) {
      notify(userMessageFor(clearError), 'error');
    }
  }

  return (
    <WorkspaceShell
      title="我的课表"
      description="按周查看课程。点任意一门课可以改节次、教室或周次。"
      wide
      actions={(
        <>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => openCreate()}>
            添加课程
          </button>
          {courses.length > 0 ? (
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => void handleClear()}>
              清空课表
            </button>
          ) : null}
        </>
      )}
    >
      <PageMeta title="我的课表 · 珂拉课程表" description="按周查看和修改你的课程表。" />

      {error ? (
        <div className="notice notice--danger">
          <span>{error}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card">
          <Loading text="正在读取课表…" />
        </div>
      ) : courses.length === 0 ? (
        <div className="card">
          <EmptyState
            title="课表还是空的"
            action={(
              <>
                <Link className="btn btn--primary btn--sm" to="/user/import">从教务系统导入</Link>
                <Link className="btn btn--quiet btn--sm" to="/user/recognition">上传课表截图</Link>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => openCreate()}>
                  手动添加课程
                </button>
              </>
            )}
          >
            这份课表还没有任何课程。开学初用导入或识别一次就能填满，
            只有一两门课时也可以手动加。
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="card card--flat" style={{ padding: '1rem 1.25rem' }}>
            <div className="schedule__bar">
              <div className="week-picker">
                <button
                  className="week-chip"
                  type="button"
                  aria-label="上一周"
                  onClick={() => setWeek((value) => Math.max(1, value - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(maxWeeks, 12) }, (_, index) => index + 1).map((item) => (
                  <button
                    key={item}
                    className="week-chip"
                    type="button"
                    aria-pressed={item === week}
                    onClick={() => setWeek(item)}
                  >
                    {item}
                  </button>
                ))}
                <button
                  className="week-chip"
                  type="button"
                  aria-label="下一周"
                  onClick={() => setWeek((value) => Math.min(maxWeeks, value + 1))}
                >
                  ›
                </button>
              </div>
              <div className="row">
                <span className="tiny">第 {week} 周 · {weekCourses.length} 门课</span>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => setWeek(1)}
                >
                  回到第一周
                </button>
              </div>
            </div>
          </section>

          <div className="schedule__scroll">
            <div
              className="timetable"
              style={{ gridTemplateColumns: `64px repeat(7, minmax(112px, 1fr))` }}
              role="table"
              aria-label={`第 ${week} 周课表`}
            >
              <div className="timetable__corner" style={{ gridColumn: 1, gridRow: 1 }}>节次</div>
              {WEEKDAY_LABELS.map((label, index) => {
                const day = index + 1;
                // 配了第一周周一才能算出具体日期
                const date = topDateOfDay(day);
                return (
                  <div
                    key={label}
                    className="timetable__day"
                    style={{ gridColumn: index + 2, gridRow: 1 }}
                  >
                    <b>{label}</b>
                    <span>{date ? monthDayLabel(date) : ' '}</span>
                  </div>
                );
              })}

              {Array.from({ length: lessons }, (_, index) => index + 1).map((lesson) => (
                <Fragment key={lesson}>
                  <div
                    className="timetable__lesson"
                    style={{ gridColumn: 1, gridRow: lesson + 1 }}
                  >
                    <b>{lesson}</b>
                    <span>{lessonTimes[lesson - 1] ?? ''}</span>
                  </div>

                  {WEEKDAY_LABELS.map((_label, dayIndex) => {
                    const day = dayIndex + 1;
                    const starting = weekCourses.find(
                      (course) => course.dayOfWeek === day && course.startLesson === lesson,
                    );

                    if (starting) {
                      const span = Math.max(1, starting.endLesson - starting.startLesson + 1);
                      const tone = (courses.indexOf(starting) % 6);

                      return (
                        <button
                          key={`${day}-${lesson}`}
                          className={`timetable__course course-tone-${tone}`}
                          type="button"
                          style={{
                            gridColumn: day + 1,
                            gridRow: `${lesson + 1} / span ${span}`,
                          }}
                          onClick={() => openEdit(starting)}
                          aria-label={`${starting.name}，${WEEKDAY_LABELS[day - 1]}${lessonRangeText(starting)}，点击修改`}
                        >
                          <b>{starting.name}</b>
                          {starting.location ? <span>{starting.location}</span> : null}
                          <span>{weekText(starting)}</span>
                        </button>
                      );
                    }

                    const covered = weekCourses.some(
                      (course) => course.dayOfWeek === day
                        && course.startLesson < lesson
                        && course.endLesson >= lesson,
                    );

                    if (covered) {
                      return null;
                    }

                    return (
                      <div
                        key={`${day}-${lesson}`}
                        // 只有正在看本周时，那一列才算「今天」。
                        // 翻到别的周还标今天，会让人以为那周也过这一天。
                        className={`timetable__cell ${isToday(day) ? 'timetable__cell--today' : ''}`}
                        style={{ gridColumn: day + 1, gridRow: lesson + 1 }}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          <section className="card">
            <div className="card__head">
              <div>
                <h2 className="card__title">第 {week} 周的课</h2>
                <p className="card__sub">列表和上面的表格是同一份数据，改一处两边都会变。</p>
              </div>
            </div>
            <div className="course-list">
              {weekCourses
                .slice()
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startLesson - b.startLesson)
                .map((course) => (
                  <div className="course-row" key={`row-${course.id}`}>
                    <span className="course-row__day">
                      <b>{WEEKDAY_LABELS[course.dayOfWeek - 1]?.slice(1)}</b>
                      {lessonRangeText(course).replace('第 ', '').replace(' 节', '')}
                    </span>
                    <span>
                      <strong>{course.name}</strong>
                      <span>
                        {[course.location, course.teacher, weekText(course)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => openEdit(course)}>
                      修改
                    </button>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}

      {editorOpen ? (
        <div className="overlay" role="presentation" onClick={() => setEditorOpen(false)}>
          <form
            className="dialog dialog--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-editor-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <div className="dialog__head">
              <div>
                <h2 className="dialog__title" id="course-editor-title">
                  {editingId ? '修改课程' : '添加课程'}
                </h2>
                <p className="tiny" style={{ marginTop: '0.3rem' }}>
                  周次这样填：1-16 表示整学期，1-8,10-16 表示跳过第九周。
                </p>
              </div>
              <button className="icon-button" type="button" aria-label="关闭" onClick={() => setEditorOpen(false)}>
                ✕
              </button>
            </div>

            <div className="dialog__body">
              <Field label="课程名称" htmlFor="course-name">
                <input
                  id="course-name"
                  className="input"
                  value={form.name}
                  placeholder="例如 高等数学"
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </Field>

              <div className="form-grid form-grid--2">
                <Field label="星期" htmlFor="course-day">
                  <select
                    id="course-day"
                    className="select"
                    value={form.dayOfWeek}
                    onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}
                  >
                    {WEEKDAY_LABELS.map((label, index) => (
                      <option key={label} value={index + 1}>{label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="周次" htmlFor="course-weeks">
                  <input
                    id="course-weeks"
                    className="input"
                    value={form.weeks}
                    placeholder="1-16"
                    onChange={(event) => setForm((current) => ({ ...current, weeks: event.target.value }))}
                  />
                </Field>

                <Field label="起始节次" htmlFor="course-start">
                  <input
                    id="course-start"
                    className="input"
                    type="number"
                    min={1}
                    max={16}
                    value={form.startLesson}
                    onChange={(event) => setForm((current) => ({ ...current, startLesson: event.target.value }))}
                  />
                </Field>

                <Field label="结束节次" htmlFor="course-end">
                  <input
                    id="course-end"
                    className="input"
                    type="number"
                    min={1}
                    max={16}
                    value={form.endLesson}
                    onChange={(event) => setForm((current) => ({ ...current, endLesson: event.target.value }))}
                  />
                </Field>

                <Field label="上课地点" htmlFor="course-location">
                  <input
                    id="course-location"
                    className="input"
                    value={form.location}
                    placeholder="例如 A101"
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  />
                </Field>

                <Field label="任课老师" htmlFor="course-teacher">
                  <input
                    id="course-teacher"
                    className="input"
                    value={form.teacher}
                    placeholder="例如 张老师"
                    onChange={(event) => setForm((current) => ({ ...current, teacher: event.target.value }))}
                  />
                </Field>
              </div>

              <Field label="单双周" htmlFor="course-rule" hint="大多数课选「每周都上」就行。">
                <select
                  id="course-rule"
                  className="select"
                  value={form.rule}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    rule: event.target.value as IFormStateType['rule'],
                  }))}
                >
                  <option value="ALL">每周都上</option>
                  <option value="ODD">只在单周</option>
                  <option value="EVEN">只在双周</option>
                </select>
              </Field>

              {formError ? (
                <div className="notice notice--danger">
                  <span>{formError}</span>
                </div>
              ) : null}
            </div>

            <div className="dialog__foot">
              {editingId ? (
                <button className="btn btn--danger btn--sm" type="button" onClick={() => void handleDelete()}>
                  删除课程
                </button>
              ) : null}
              <button className="btn btn--ghost" type="button" onClick={() => setEditorOpen(false)}>
                取消
              </button>
              <button className="btn btn--primary" type="submit" disabled={isSaving}>
                {isSaving ? '正在保存…' : editingId ? '保存修改' : '添加课程'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmElement}
    </WorkspaceShell>
  );
}
