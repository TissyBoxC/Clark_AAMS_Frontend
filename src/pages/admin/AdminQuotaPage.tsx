import { useEffect, useState } from 'react';

import { fetchQuotaDashboard, scopeLabel } from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { EmptyState, Loading, PageMeta } from '../../components/ui';
import { userMessageFor } from '../../lib/errors';
import type { IQuotaDashboardType } from '../../types';

export default function AdminQuotaPage() {
  const [quota, setQuota] = useState<IQuotaDashboardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(): Promise<void> {
    try {
      const data = await fetchQuotaDashboard();
      setQuota(data);
      setError('');
    } catch (loadError) {
      setError(userMessageFor(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const data = await fetchQuotaDashboard();
        if (!cancelled) {
          setQuota(data);
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

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsers = quota?.users.length ?? 0;

  return (
    <AdminShell
      title="用量与配额"
      description="今天谁用得最多、哪一项接近上限，都在这张表里。"
      actions={(
        <button className="a-btn" type="button" onClick={() => void load()}>
          重新读取
        </button>
      )}
    >
      <PageMeta title="用量与配额 · 珂拉课程表管理台" description="查看今日各项功能的调用次数与账号分布。" />

      <div className="a-note a-note--warn">
        这里的计数来自服务运行期间：服务重启后会从零开始，同时运行多台服务时各自统计。
        它能反映今天的热度，不适合当作结算依据。
      </div>

      {error ? <div className="a-note a-note--bad">{error}</div> : null}

      {isLoading && !quota ? (
        <div className="a-card">
          <Loading text="正在读取今日用量…" />
        </div>
      ) : (
        <>
          <div className="a-grid a-grid--4">
            <div className="a-stat">
              <span>今日总次数</span>
              <strong>{quota?.totalCalls ?? 0}</strong>
              <small>所有用途加在一起</small>
            </div>
            <div className="a-stat">
              <span>使用账号</span>
              <strong>{totalUsers}</strong>
              <small>今天有操作的账号数</small>
            </div>
            <div className="a-stat">
              <span>用途数</span>
              <strong>{quota?.scopes.length ?? 0}</strong>
              <small>识别、取件码、题目解析</small>
            </div>
            <div className="a-stat">
              <span>用尽的账号</span>
              <strong>{quota?.users.filter((item) => item.exhaustedScopes.length > 0).length ?? 0}</strong>
              <small>今天已经不能再操作的</small>
            </div>
          </div>

          <section className="a-card">
            <div className="a-card__head">
              <div>
                <h2 className="a-card__title">按用途</h2>
                <p className="a-card__sub">哪一项被用得最多，通常说明学生当前最需要它。</p>
              </div>
            </div>

            {quota && quota.scopes.length > 0 ? (
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>用途</th>
                      <th>次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quota.scopes.map((item) => (
                      <tr key={item.scope}>
                        <td><strong>{scopeLabel(item.scope)}</strong></td>
                        <td>{item.calls ?? item.count ?? 0}</td>
                      </tr>
                    ))}
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
                <h2 className="a-card__title">按账号</h2>
                <p className="a-card__sub">用尽指的是今天某项额度已经用完，明天会自动恢复。</p>
              </div>
            </div>

            {quota && quota.users.length > 0 ? (
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>账号</th>
                      <th>总次数</th>
                      <th>用途分布</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quota.users.map((row) => (
                      <tr key={row.userId}>
                        <td><strong>账号 {row.userId}</strong></td>
                        <td>{row.totalCalls}</td>
                        <td>
                          {row.byScope.length > 0
                            ? row.byScope
                              .map((scope) => `${scopeLabel(scope.scope)} ${scope.calls ?? scope.count ?? 0} 次`)
                              .join(' · ')
                            : '—'}
                        </td>
                        <td>
                          {row.exhaustedScopes.length > 0 ? (
                            <span className="a-tag a-tag--warn">已用尽</span>
                          ) : (
                            <span className="a-tag a-tag--ok">正常</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="今天还没有账号使用">
                这张表列出今天用过的账号。没有数据时说明今天还没有人识别或解析。
              </EmptyState>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
