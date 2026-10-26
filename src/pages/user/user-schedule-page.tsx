import { useEffect, useMemo, useState } from 'react';

import type { IUserType } from '../../types/app-types';
import type { ICourseType, IScheduleSettingsType } from '../../types/schedule-types.ts';

import {
  clearMyCourses,
  createMyCourse,
  deleteMyCourse,
  fetchMyCourses,
  updateMyCourse,
} from '../../api/course-api';
import type { ICourseUpsertPayloadType } from '../../api/course-api';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { CourseEditor } from './course-editor';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';
import { userMessageFor } from '../../constants/error-codes';
import {
  courseMatchesWeek,
  coursesOfDay,
  normalizeCourse,
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
  saveCourses,
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

  const [settings, setSettings] = useState<IScheduleSettingsType>(() => loadScheduleSettings(ownerId));
  const [settingsDraft, setSettingsDraft] = useState<IScheduleSettingsType>(settings);
  const [viewWeek, setViewWeek] = useState<number>(
    () => computeCurrentWeek(settings.termStartDate, new Date(), settings.maxWeeks),
  );
  const [statusMessage, setStatusMessage] = useState<string>('');

  // 课表以服务端为准（P3-1）；服务端不可用时回退到本地缓存，页面不至于空白。
  const [courses, setCourses] = useState<ICourseType[]>(() => loadCourses(ownerId));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverCourseIds, setServerCourseIds] = useState<Record<string, number>>({});
  /** 编辑中的课程；`'new'` 表示新增，`null` 表示表单关闭。 */
  const [editing, setEditing] = useState<ICourseType | 'new' | null>(null);
  const [loadError, setLoadError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const serverCourses = await fetchMyCourses();

        if (cancelled) {
          return;
        }

        // 用服务端主键作为本地 id，保证「看到的那门课」与「要改的那门课」是同一个。
        // 退回 index+1 只用于 id 缺失的老后端——但那会导致删除/编辑错位，
        // 所以映射表同样记录真实 id，两者不一致时以映射表为准。
        const mapped = serverCourses.map((course, index) =>
          normalizeCourse(
            course as unknown as Record<string, unknown>,
            course.id > 0 ? course.id : index + 1,
          ),
        );
        // 后端现在会回传真实主键，直接用，不再按数组下标猜。
        // 之前 `id ?? 0` 的写法会让「拿不到 id」悄悄变成「id 是 0」，
        // 而删除接口收到 0 只会返回 404，症状和「课不存在」一模一样。
        const idMap: Record<string, number> = {};
        serverCourses.forEach((course, index) => {
          idMap[mapped[index].id] = course.id;
        });

        setCourses(mapped);
        setServerCourseIds(idMap);
        // 同步写一份本地缓存，离线时可读
        saveCourses(ownerId, mapped);
        setLoadError('');
      } catch (error) {
        if (cancelled) {
          return;
        }
        // 服务端不可用不是致命错误：继续展示本地缓存
        setLoadError('暂时无法从服务器读取课表，正在显示本地缓存。');
        setCourses(loadCourses(ownerId));
        void error;
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
  }, [ownerId]);

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

  /**
   * 新增或编辑一门课（P3-3）。
   *
   * 先落服务端，成功后更新本地视图与服务端 id 映射——
   * 与删除保持一致的方向：以服务端为准，本地只是缓存。
   */
  async function handleSaveCourse(payload: ICourseUpsertPayloadType): Promise<void> {
    if (editing === 'new') {
      const created = (await createMyCourse(payload)) as unknown as Record<string, unknown>;
      const normalized = normalizeCourse(created, courses.length + 1);
      const next = [...courses, normalized];

      setCourses(next);
      saveCourses(ownerId, next);
      setServerCourseIds((previous) => ({
        ...previous,
        [normalized.id]: (created.id as number) ?? 0,
      }));
      setEditing(null);
      setStatusMessage(`已添加「${normalized.name}」。`);
      return;
    }

    if (!editing) {
      return;
    }

    const serverId = serverCourseIds[editing.id];
    if (!serverId) {
      throw new Error('这门课还没同步到服务器，请刷新后重试。');
    }

    const updated = (await updateMyCourse(serverId, payload)) as unknown as Record<string, unknown>;
    const normalized = normalizeCourse(updated, 0);
    // 保留本地 id，避免视图里「这门课换了身份」导致 React key 变化
    normalized.id = editing.id;
    const next = courses.map((item) => (item.id === editing.id ? normalized : item));

    setCourses(next);
    saveCourses(ownerId, next);
    setEditing(null);
    setStatusMessage(`已更新「${normalized.name}」。`);
  }

  /** 删除一门课：先落服务端，成功后再更新本地视图。 */
  async function handleDeleteCourse(course: ICourseType): Promise<void> {
    const serverId = serverCourseIds[course.id];

    if (!serverId) {
      setStatusMessage('这门课还没同步到服务器，请刷新后重试。');
      return;
    }

    try {
      await deleteMyCourse(serverId);
      const next = courses.filter((item) => item.id !== course.id);

      setCourses(next);
      saveCourses(ownerId, next);
      setStatusMessage(`已删除「${course.name}」。`);
    } catch (error) {
      setStatusMessage(userMessageFor(error));
    }
  }

  /** 清空课表。 */
  async function handleClearAll(): Promise<void> {
    if (!window.confirm('确定清空全部课程？此操作不可撤销。')) {
      return;
    }

    try {
      const result = await clearMyCourses();

      setCourses([]);
      saveCourses(ownerId, []);
      setStatusMessage(`已清空 ${result.removed} 门课程。`);
    } catch (error) {
      setStatusMessage(userMessageFor(error));
    }
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
            <button type='button' className='button-primary' onClick={() => setEditing('new')}>
              新增课程
            </button>
            {courses.length > 0 ? (
              <button type='button' className='button-ghost' onClick={() => void handleClearAll()}>
                清空课表
              </button>
            ) : null}
          </div>
        </div>

        <p className='schedule-muted'>
          第 {viewWeek} 周 / 共 {settings.maxWeeks} 周
          {monday ? `，本周从 ${formatDate(monday)} 开始` : '，尚未设置学期起始日期'}
          {viewWeek === currentWeek ? '（当前周）' : ''}
        </p>

        {isLoading ? <p className='schedule-muted'>正在从服务器同步课表…</p> : null}

        {loadError ? <p className='schedule-badge schedule-badge-warn'>{loadError}</p> : null}

        {statusMessage ? <p className='schedule-muted'>{statusMessage}</p> : null}

        {editing ? (
          <CourseEditor
            course={editing === 'new' ? null : editing}
            onSubmit={handleSaveCourse}
            onCancel={() => setEditing(null)}
          />
        ) : null}

        {courses.length === 0 && !isLoading ? (
          <p className='schedule-empty'>
            还没有课表数据。请先通过「教务导入」或「取件码回查」获取课程；
            登录状态下的导入结果会保存到账号，换设备也能看到。
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
                <button
                  type='button'
                  className='button-ghost'
                  onClick={() => setEditing(course)}
                >
                  编辑
                </button>
                <button
                  type='button'
                  className='button-ghost'
                  onClick={() => void handleDeleteCourse(course)}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='surface-card schedule-panel'>
        <div className='schedule-panel-head'>
          <h2>冲突提示</h2>
          <span className={conflicts.length > 0 ? 'schedule-badge schedule-badge-warn' : 'schedule-badge'}>
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
