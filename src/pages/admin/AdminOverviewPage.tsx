import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchPickupRecords, fetchQuotaDashboard, scopeLabel } from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { EmptyState, Loading, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { formatDateTime } from '../../lib/schedule';
import { useAuth } from '../../store/useAuth';
import type { IPickupRecordType, IQuotaDashboardType } from '../../types';

export default function AdminOverviewPage() {
  const { displayName } = useAuth();
  const { notify } = useToast();

  const [quota, setQuota] = useState<IQuotaDashboardType | null>(null);
  const [pickups, setPickups] = useState<IPickupRecordType[]>([]);
  const [quotaError, setQuotaError] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function load(): Promise<void> {
    setQuotaError('');
    setPickupError('');

    const [quotaResult, pickupResult] = await Promise.allSettled([
      fetchQuotaDashboard(),
      fetchPickupRecords(),
    ]);

    if (quotaResult.status === 'fulfilled') {
      setQuota(quotaResult.value);
    } else {
      setQuotaError(userMessageFor(quotaResult.reason));
    }

    if (pickupResult.status === 'fulfilled') {
      setPickups(pickupResult.value);
    } else {
      setPickupError(userMessageFor(pickupResult.reason));
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      const [quotaResult, pickupResult] = await Promise.allSettled([
        fetchQuotaDashboard(),
        fetchPickupRecords(),
      ]);

      if (cancelled) {
        return;
      }

      if (quotaResult.status === 'fulfilled') {
        setQuota(quotaResult.value);
      } else {
        setQuotaError(userMessageFor(quotaResult.reason));
      }

      if (pickupResult.status === 'fulfilled') {
        setPickups(pickupResult.value);
      } else {
        setPickupError(userMessageFor(pickupResult.reason));
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeUsers = quota?.users.length ?? 0;
  const scopeCount = quota?.scopes.length ?? 0;
  const today = new Date();

  return (
    <AdminShell
      title="运行概览"
      description={`${displayName || '管理员'}，这里是今天的运行情况。`}
      actions={(
        <button className="a-btn" type="button" onClick={() => { void load(); notify('已重新读取'); }}>
          刷新数据
        </button>
      )}
    >
      <PageMeta title="运行概览 · 珂拉课程表管理台" description="查看今日用量、取件码记录与常用维护入口。" />

      {isLoading ? (
        <div className="a-card">
          <Loading text="正在读取今日数据…" />
        </div>
      ) : (
        <>
          <div className="a-grid a-grid--4">
            <div className="a-stat">
              <span>今日调用次数</span>
              <strong>{quota ? quota.totalCalls : '—'}</strong>
              <small>{today.getMonth() + 1} 月 {today.getDate()} 日起算</small>
            </div>
            <div className="a-stat">
              <span>涉及的用途</span>
              <strong>{scopeCount}</strong>
              <small>识别、取件码、题目解析</small>
            </div>
            <div className="a-stat">
              <span>使用中的账号</span>
              <strong>{activeUsers}</strong>
              <small>今天有过操作的账号</small>
            </div>
            <div className="a-stat">
              <span>取件码记录</span>
              <strong>{pickups.length}</strong>
              <small>累计保存的取件码</small>
            </div>
          </div>

          {quotaError ? (
            <div className="a-note a-note--bad">
              {quotaError}
              <div style={{ marginTop: '0.5rem' }}>
                <button className="a-btn a-btn--quiet" type="button" onClick={() => void load()}>
                  重新读取
                </button>
              </div>
            </div>
          ) : null}

          {quota?.inMemoryOnly ? (
            <div className="a-note a-note--warn">
              今天的次数是服务运行期间累计的：服务重启后会从零开始，
              同时运行多台服务时会各自计数。这里看到的是趋势，不是账目。
            </div>
          ) : null}

          <div className="a-grid a-grid--2">
            <section className="a-card">
              <div className="a-card__head">
                <div>
                  <h2 className="a-card__title">今日用量按用途</h2>
                  <p className="a-card__sub">哪一块被用得最多，通常说明学生当前最需要它。</p>
                </div>
              </div>

              {quota && quota.scopes.length > 0 ? (
                <div className="a-table-wrap">
                  <table className="a-table">
                    <thead>
                      <tr>
                        <th>用途</th>
                        <th>次数</th>
                        <th>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quota.scopes.map((item) => {
                        const calls = item.calls ?? item.count ?? 0;
                        const ratio = quota.totalCalls > 0 ? Math.round((calls / quota.totalCalls) * 100) : 0;
                        return (
                          <tr key={item.scope}>
                            <td><strong>{scopeLabel(item.scope)}</strong></td>
                            <td>{calls}</td>
                            <td>{ratio}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="今天还没有用量">
                  还没有学生使用识别或解析。等有学生操作后，这里会按用途列出次数。
                </EmptyState>
              )}
            </section>

            <section className="a-card">
              <div className="a-card__head">
                <div>
                  <h2 className="a-card__title">最近的取件码</h2>
                  <p className="a-card__sub">最新生成的八个取件码，点进记录页可以查看内容。</p>
                </div>
                <Link className="a-btn" to="/admin/pickups">全部记录</Link>
              </div>

              {pickupError ? (
                <div className="a-note a-note--bad">{pickupError}</div>
              ) : pickups.length === 0 ? (
                <EmptyState
                  title="还没有生成过取件码"
                  action={<Link className="a-btn" to="/admin/pickups">去创建取件码</Link>}
                >
                  取件码在学生识别或导入成功后自动生成。需要提前准备一份时，也可以在记录页手动新建。
                </EmptyState>
              ) : (
                <div className="a-table-wrap">
                  <table className="a-table">
                    <thead>
                      <tr>
                        <th>取件码</th>
                        <th>图片</th>
                        <th>更新时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickups.slice(0, 8).map((item) => (
                        <tr key={item.code}>
                          <td><strong>{item.code}</strong></td>
                          <td>{item.images?.length ?? 0} 张</td>
                          <td>{formatDateTime(item.updatedAt ?? item.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="a-card">
            <div className="a-card__head">
              <h2 className="a-card__title">常用维护入口</h2>
            </div>
            <div className="a-grid a-grid--4">
              {[
                { to: '/admin/ai', title: '识别服务', note: '换模型、换服务地址' },
                { to: '/admin/email', title: '邮件通知', note: '验证邮件能不能发出去' },
                { to: '/admin/schools', title: '学校接入', note: '新增一所能导入的学校' },
                { to: '/admin/versions', title: '版本发布', note: '通知学生更新' },
              ].map((item) => (
                <Link className="a-card" to={item.to} key={item.to}>
                  <div className="a-card__title">{item.title}</div>
                  <p className="a-card__sub">{item.note}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
