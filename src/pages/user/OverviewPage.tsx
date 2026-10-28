import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchMyCourses } from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { EmptyState, Loading, PageMeta } from '../../components/ui';
import { userMessageFor } from '../../lib/errors';
import {
  WEEKDAY_LABELS,
  lessonRangeText,
  todayLabel,
  weekText,
  weekdayOf,
} from '../../lib/schedule';
import { useAuth } from '../../store/useAuth';
import type { ICourseType } from '../../types';

const ENTRIES = [
  { to: '/user/schedule', label: '我的课表', note: '按周看课，改节次和教室都在这里' },
  { to: '/user/import', label: '教务导入', note: '开学时一次取回整学期课表' },
  { to: '/user/recognition', label: '截图识别', note: '传同学发来的课表图，识别成课程' },
  { to: '/user/pickup', label: '取件码', note: '凭 8 位码取回之前保存的课表' },
];

export default function OverviewPage() {
  const { user, displayName, isVerified } = useAuth();
  const [courses, setCourses] = useState<ICourseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const todayWeekday = weekdayOf(today);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const list = await fetchMyCourses();
        if (!cancelled) {
          setCourses(list);
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

  // 今天是第几周取决于学期起始日，这里不猜周次，只按星期列出当天的课，
  // 每门课右侧标出它自己的周次，单双周课程不会被误显示成每周都有。
  const todayCourses = courses
    .filter((course) => course.dayOfWeek === todayWeekday)
    .sort((a, b) => a.startLesson - b.startLesson);

  return (
    <WorkspaceShell
      title={`你好，${displayName || '同学'}`}
      description={isVerified
        ? '这周的课都在这，想改哪门课直接进课表。'
        : '先验证一次邮箱，导入和识别才会开放。'}
      actions={(
        <Link className="btn btn--primary btn--sm" to="/user/schedule">
          打开我的课表
        </Link>
      )}
    >
      <PageMeta title="概览 · 珂拉课程表" description="查看今天的课、账号状态和常用入口。" />

      {!isVerified ? (
        <div className="notice notice--amber">
          <div>
            <strong className="notice__title">邮箱还没有验证</strong>
            导入、识别和题目解析需要先确认这个账号属于你。验证一次之后就不用再验证了。
          </div>
          <Link className="btn btn--soft btn--sm" to="/verify">去验证邮箱</Link>
        </div>
      ) : null}

      {error ? (
        <div className="notice notice--danger">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="overview">
        <div className="stack gap-5">
          <section className="card">
            <div className="card__head">
              <div>
                <h2 className="card__title">今天的课</h2>
                <p className="card__sub">{todayLabel(today)} · {WEEKDAY_LABELS[todayWeekday - 1]}</p>
              </div>
              <span className="tag">{courses.length} 门课在课表里</span>
            </div>

            {isLoading ? (
              <Loading text="正在读取课表…" />
            ) : todayCourses.length === 0 ? (
              <EmptyState
                title="今天没有课"
                action={<Link className="btn btn--soft btn--sm" to="/user/schedule">看看整周安排</Link>}
              >
                课表里今天没有排课，可能这门课只在单周或双周上，
                也可能是课表还没导进来。切到课表页按周查看会更清楚。
              </EmptyState>
            ) : (
              <div className="today">
                {todayCourses.map((course) => (
                  <div className="today__row" key={`${course.id}-${course.startLesson}`}>
                    <span className="today__time">{lessonRangeText(course).replace('第 ', '').replace(' 节', '')} 节</span>
                    <div>
                      <div className="today__name">{course.name}</div>
                      <div className="today__meta">
                        {[course.location, course.teacher].filter(Boolean).join(' · ') || '地点还没填'}
                      </div>
                    </div>
                    <span className="tag tag--brand">{weekText(course)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">接下来做什么</h2>
            </div>
            <div className="action-list">
              {ENTRIES.map((entry, index) => (
                <Link className="action-row" to={entry.to} key={entry.to}>
                  <span className="action-row__num">{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>{entry.label}</strong>
                    <span>{entry.note}</span>
                  </span>
                  <span className="action-row__go" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="stack gap-5">
          <section className="card">
            <div className="card__head">
              <h2 className="card__title">账号</h2>
            </div>
            <dl className="kv">
              <div className="kv__row">
                <dt>用户名</dt>
                <dd>{user?.username || '—'}</dd>
              </div>
              <div className="kv__row">
                <dt>邮箱</dt>
                <dd>{user?.email || '还没有填邮箱'}</dd>
              </div>
              <div className="kv__row">
                <dt>邮箱状态</dt>
                <dd>{isVerified ? '已验证' : '待验证'}</dd>
              </div>
              <div className="kv__row">
                <dt>已解析题目</dt>
                <dd>{user?.questionAnalysisCount ?? 0} 道</dd>
              </div>
            </dl>
            <hr className="divider" />
            <div className="row">
              <Link className="btn btn--quiet btn--sm" to="/user/settings">账号设置</Link>
              <Link className="btn btn--ghost btn--sm" to="/user/questions">去解析一道题</Link>
            </div>
          </section>

          <section className="card card--sunken">
            <h2 className="card__title">小提示</h2>
            <p className="card__sub" style={{ marginTop: '0.6rem' }}>
              课表按周保存。遇到调课，在课表里点那门课改一次，
              之后在手机或另一台电脑上登录，看到的都是改过的版本。
            </p>
            <div className="row" style={{ marginTop: '1rem' }}>
              <Link className="btn btn--soft btn--sm" to="/guide/schedule">课表与周次怎么记</Link>
            </div>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
