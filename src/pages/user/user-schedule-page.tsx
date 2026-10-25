import { useMemo, useState } from 'react';

import type { IUserType } from '../../types/app-types';
import type { ICourseType, IScheduleSettingsType } from '../../types/schedule-types.ts';

import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';
import {
  courseMatchesWeek,
  coursesOfDay,
} from '../../types/schedule-types.ts';
import {
  currentWeek as computeCurrentWeek,
  endTime,
  lessonCount as computeLessonCount,
  weekMonday,
  weekPatternText,
} from '../../utils/schedule-algorithm.ts';
import {
  detectConflicts,
  loadCourses,
  loadScheduleSettings,
  saveScheduleSettings,
} from '../../utils/schedule-store.ts';

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 课程配色，与 App 的 courseColors 同一套色板。 */
const COURSE_COLORS = [
  '#2563eb', '#0891b2', '#059669', '#65a30d', '#ca8a04',
  '#ea580c', '#dc2626', '#e11d48', '#c026d3', '#7c3aed',
  '#4f46e5', '#0f766e', '#16a34a', '#84cc16', '#f59e0b',
  '#f97316', '#ef4444', '#f43f5e', '#d946ef', '#8b5cf6',
];

/** 按课程名稳定取色：同名课永远同一个颜色，与 App 一致。 */
function colorForCourse(course: ICourseType): string {
  if (typeof course.colorValue === 'number') {
    return `#${(course.colorValue & 0xffffff).toString(16).padStart(6, '0')}`;
  }

  let hash = 0;

  for (let index = 0; index < course.name.length; index += 1) {
    hash = ((hash << 5) - hash + course.name.charCodeAt(index)) | 0;
  }

  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function UserSchedulePage() {
  const { user, isReady } = useRequiredVerifiedUser();

  // 用户确定前先渲染加载态；此时组件已挂载但还没有 ownerId。
  if (!isReady || !user) {
    return <LoadingView description={isReady ? '正在读取用户信息。' : '正在确认邮箱验证状态。'} />;
  }

  // 以 ownerId 作为 key 交给内部组件：切换账号时整棵子树重建，
  // 状态自然按新用户从 localStorage 重新初始化，
  // 不需要在 effect 或渲染期同步 setState。
  return <ScheduleBoard key={String(user.id)} user={user} />;
}

function ScheduleBoard({ user }: { user: IUserType }) {
  const ownerId = String(user.id);

  // localStorage 是同步可读的，用惰性初始化，避免空态闪烁。
  // 本页只读：课程由导入/取件码流程写入，这里不需要 setter。
  const [courses] = useState<ICourseType[]>(() => loadCourses(ownerId));
  const [settings, setSettings] = useState<IScheduleSettingsType>(() => loadScheduleSettings(ownerId));
  const [settingsDraft, setSettingsDraft] = useState<IScheduleSettingsType>(settings);
  const [viewWeek, setViewWeek] = useState<number>(
    () => computeCurrentWeek(settings.termStartDate, new Date(), settings.maxWeeks),
  );
  const [statusMessage, setStatusMessage] = useState<string>('');

  usePageMeta('我的课表', '周视图、今日课程、学期设置与冲突提示。');

  const currentWeek = useMemo(
    () => computeCurrentWeek(settings.termStartDate, new Date(), settings.maxWeeks),
    [settings],
  );

  /** 该周真正会上的课，按周过滤。 */
  const weekCourses = useMemo(
    () => courses.filter((course) => courseMatchesWeek(course, viewWeek)),
    [courses, viewWeek],
  );

  const lessonRows = useMemo(() => {
    const maxEnd = courses.reduce((max, course) => Math.max(max, course.endLesson), 0);

    return computeLessonCount(settings.startTimes.length, maxEnd);
  }, [courses, settings.startTimes.length]);

  const conflicts = useMemo(() => detectConflicts(courses, settings.maxWeeks), [courses, settings.maxWeeks]);

  /** 今日课程：只有查看本周时才有意义。 */
  const todayCourses = useMemo(() => {
    if (viewWeek !== currentWeek) {
      return [];
    }

    const jsDay = new Date().getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    return coursesOfDay(courses, dayOfWeek, viewWeek);
  }, [courses, viewWeek, currentWeek]);

  function handleSaveSettings(): void {
    const maxWeeks = Math.min(Math.max(Number(settingsDraft.maxWeeks) || 18, 1), 30);

    const next: IScheduleSettingsType = {
      ...settingsDraft,
      maxWeeks,
    };

    saveScheduleSettings(ownerId, next);
    setSettings(next);
    setStatusMessage('学期设置已保存。');
  }

  function lessonTimeText(rowIndex: number): string {
    const start = settings.startTimes[rowIndex]?.replace(/：/g, ':');

    if (!start || !start.trim()) {
      return '';
    }

    return `${start}-${endTime(start, settings.durationPerLesson)}`;
  }

  const monday = settings.termStartDate ? weekMonday(settings.termStartDate, viewWeek) : null;

  return (
    <UserWorkspaceShell
      user={user}
      title='我的课表'
      description={`第 ${viewWeek} 周 · 共 ${settings.maxWeeks} 周`}
    >
      <div className='schedule-page'>
      <section className='surface-card schedule-panel'>
        <div className='schedule-panel-head'>
          <h2>周视图</h2>
          <div className='button-row'>
            <button
              type='button'
              className='button-ghost'
              onClick={() => setViewWeek((week) => Math.max(1, week - 1))}
              disabled={viewWeek <= 1}
            >
              上一周
            </button>
            <button
              type='button'
              className='button-ghost'
              onClick={() => setViewWeek(currentWeek)}
            >
              回到本周
            </button>
            <button
              type='button'
              className='button-ghost'
              onClick={() => setViewWeek((week) => Math.min(settings.maxWeeks, week + 1))}
              disabled={viewWeek >= settings.maxWeeks}
            >
              下一周
            </button>
          </div>
        </div>

        <p className='schedule-muted'>
          第 {viewWeek} 周 / 共 {settings.maxWeeks} 周
          {monday ? `，本周从 ${formatDate(monday)} 开始` : '，尚未设置学期起始日期'}
          {viewWeek === currentWeek ? '（当前周）' : ''}
        </p>

        {courses.length === 0 ? (
          <p className='schedule-empty'>
            还没有课表数据。请先通过「教务导入」或「取件码回查」获取课程，
            Web 端会把课程保存在本机浏览器中。
          </p>
        ) : (
          <div className='schedule-grid-wrap'>
            <table className='schedule-grid'>
              <thead>
                <tr>
                  <th className='schedule-time-col'>节次</th>
                  {DAY_LABELS.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: lessonRows }, (_, rowIndex) => {
                  const lesson = rowIndex + 1;
                  const timeText = lessonTimeText(rowIndex);

                  return (
                    <tr key={lesson}>
                      <th className='schedule-time-col'>
                        <span className='lesson-index'>{lesson}</span>
                        {timeText ? <span className='lesson-time'>{timeText}</span> : null}
                      </th>
                      {DAY_LABELS.map((label, dayIndex) => {
                        const dayOfWeek = dayIndex + 1;
                        // 只在该课程起始行渲染，跨行由 rowSpan 覆盖
                        const cellCourses = weekCourses.filter(
                          (course) => course.dayOfWeek === dayOfWeek && course.startLesson === lesson,
                        );

                        if (cellCourses.length === 0) {
                          return <td key={label} className='schedule-cell schedule-cell-empty' />;
                        }

                        return (
                          <td
                            key={label}
                            className='schedule-cell'
                            rowSpan={Math.max(...cellCourses.map((course) => course.endLesson - course.startLesson + 1))}
                          >
                            {cellCourses.map((course) => (
                              <div
                                key={course.id}
                                className='schedule-course'
                                style={{ borderLeftColor: colorForCourse(course) }}
                                title={`${course.name}\n${course.location}\n${weekPatternText(course.weekPattern)}`}
                              >
                                <strong>{course.name}</strong>
                                {course.location ? <span>{course.location}</span> : null}
                                {course.teacher ? <span>{course.teacher}</span> : null}
                                <span className='course-weeks'>{weekPatternText(course.weekPattern)}</span>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className='surface-card schedule-panel'>
        <div className='schedule-panel-head'>
          <h2>今日课程</h2>
        </div>
        {viewWeek !== currentWeek ? (
          <p className='schedule-muted'>当前查看的是第 {viewWeek} 周，切回本周可查看今日课程。</p>
        ) : todayCourses.length === 0 ? (
          <p className='schedule-empty'>今天没有课。</p>
        ) : (
          <ul className='today-list'>
            {todayCourses.map((course) => (
              <li key={course.id}>
                <span className='today-sections'>
                  第 {course.startLesson}-{course.endLesson} 节
                </span>
                <strong>{course.name}</strong>
                <span className='schedule-muted'>{course.location}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='surface-card schedule-panel'>
        <div className='schedule-panel-head'>
          <h2>冲突提示</h2>
          <span className={conflicts.length > 0 ? 'badge badge-warn' : 'badge'}>
            {conflicts.length} 处
          </span>
        </div>
        {conflicts.length === 0 ? (
          <p className='schedule-empty'>没有检测到时间冲突。单双周交替的课程不会被误报。</p>
        ) : (
          <ul className='conflict-list'>
            {conflicts.map((conflict) => (
              <li key={`${conflict.first.id}-${conflict.second.id}`}>{conflict.description}</li>
            ))}
          </ul>
        )}
      </section>

      <section className='surface-card schedule-panel'>
        <div className='schedule-panel-head'>
          <h2>学期设置</h2>
        </div>
        <div className='schedule-form-grid'>
          <label>
            学期起始日期
            <input
              type='date'
              value={settingsDraft.termStartDate}
              onChange={(event) => setSettingsDraft((draft) => ({
                ...draft,
                termStartDate: event.target.value,
              }))}
            />
          </label>
          <label>
            总周数（1-30）
            <input
              type='number'
              min={1}
              max={30}
              value={settingsDraft.maxWeeks}
              onChange={(event) => setSettingsDraft((draft) => ({
                ...draft,
                maxWeeks: Number(event.target.value),
              }))}
            />
          </label>
          <label>
            每节时长（分钟）
            <input
              type='number'
              min={1}
              max={180}
              value={settingsDraft.durationPerLesson}
              onChange={(event) => setSettingsDraft((draft) => ({
                ...draft,
                durationPerLesson: Number(event.target.value),
              }))}
            />
          </label>
        </div>
        <div className='button-row'>
          <button type='button' className='button-primary' onClick={handleSaveSettings}>
            保存设置
          </button>
        </div>
        {statusMessage ? <p className='schedule-muted'>{statusMessage}</p> : null}
      </section>

      </div>
      <SupportFab />
    </UserWorkspaceShell>
  );
}

export default UserSchedulePage;
