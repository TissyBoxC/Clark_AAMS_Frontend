import { useCallback, useEffect, useState } from 'react';

import { fetchQuotaDashboard } from '../../api/admin-api';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  buildScopeRows,
  buildSummary,
  buildUserRows,
  describeLimitation,
  type IQuotaDashboardType,
} from '../../utils/quota-dashboard.ts';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

/**
 * 配额看板（P5-4）。
 *
 * 回答管理员在「用户说今天用不了」时最先要问的三件事：
 * 今天用了多少、谁用得最多、谁已经打满。
 *
 * 顶部固定展示数据边界（重启归零、數字是嘗試次數）。
 * 这不是免责声明——不写清楚，管理员会把它当历史累计用，
 * 然后困惑「昨天明明几百次，今天怎么是 0」。
 */
function AdminQuotaPage() {
  const [dashboard, setDashboard] = useState<IQuotaDashboardType | null>(null);
  const [status, setStatus] = useState<string>('未加载');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useBodyClass('admin-route');
  usePageMeta('配额看板', '查看识别、解析、取件码的每日用量与达额用户。');

  /**
   * 读取用量。
   *
   * `announce` 区分两种入口：
   * - 首次加载（effect 触发）传 false：不在 effect 里同步 setState，
   *   否则会触发级联渲染；所有状态更新都发生在 await 之后。
   * - 手动刷新（点击触发）传 true：立刻给出「正在读取」的反馈。
   */
  const load = useCallback(async (announce: boolean): Promise<void> => {
    try {
      const next = await fetchQuotaDashboard();
      setDashboard(next);
      setStatus(`已加载，共 ${next.totalCalls} 次调用`);
      setErrorMessage('');
    } catch (error) {
      setDashboard(null);
      setStatus('读取失败');
      setErrorMessage(
        userMessageFor(error),
      );
    }
    void announce;
  }, []);

  useEffect(() => {
    // 用 setTimeout 把首次加载移出 effect 的同步阶段：
    // 直接在 effect 里调用会同步触发 setState，引发级联渲染。
    // 与 admin-versions-page 的写法保持一致。
    const timer = window.setTimeout(() => {
      void load(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  /** 手动刷新：用户点击触发，可以先给出即时反馈。 */
  function refresh(): void {
    setStatus('正在读取用量...');
    setErrorMessage('');
    void load(true);
  }

  const summary = dashboard ? buildSummary(dashboard) : null;
  const scopeRows = dashboard ? buildScopeRows(dashboard) : [];
  const userRows = dashboard ? buildUserRows(dashboard) : [];

  return (
    <AdminLayout
      title='配额看板'
      description='查看识别、解析、取件码的每日用量与达额用户'
      activeKey='quota'
      actions={
        <button type='button' className={styles.button} onClick={refresh}>
          刷新
        </button>
      }
    >
      <section className={styles.panelBody}>
        <div className={styles.panelHead}>
          <h2>数据范围</h2>
        </div>
        <p className={styles.hint}>
          {dashboard ? describeLimitation(dashboard) : '加载后显示统计口径。'}
        </p>
        <p className={styles.statusText}>{status}</p>
        {errorMessage ? (
          <p className={styles.statusError}>{errorMessage}</p>
        ) : null}
      </section>

      {summary ? (
        <section className={styles.panelBody}>
          <div className={styles.panelHead}>
            <h2>今日概览</h2>
          </div>
          <div className={styles.gridThree}>
            <div className={styles.statusItem}>
              <span>总调用</span>
              <strong>{summary.totalCalls}</strong>
            </div>
            <div className={styles.statusItem}>
              <span>活跃用户</span>
              <strong>{summary.activeUsers}</strong>
            </div>
            <div className={styles.statusItem}>
              <span>单人最高</span>
              <strong>{summary.peakUserCalls}</strong>
              <small>用来识别是否有人脚本刷</small>
            </div>
            <div className={styles.statusItem}>
              <span>已达上限</span>
              <strong>{summary.exhaustedUsers}</strong>
            </div>
          </div>
        </section>
      ) : null}

      {scopeRows.length > 0 ? (
        <section className={styles.panelBody}>
          <div className={styles.panelHead}>
            <h2>按业务域</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>业务域</th>
                  <th>调用次数</th>
                </tr>
              </thead>
              <tbody>
                {scopeRows.map((row) => (
                  <tr key={row.scope}>
                    <td>{row.label}</td>
                    <td>{row.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={styles.panelBody}>
        <div className={styles.panelHead}>
          <h2>用户明细</h2>
          <span className={styles.hint}>按用量降序，最多显示前 50 名</span>
        </div>
        {userRows.length === 0 ? (
          <p className={styles.emptyState}>今天还没有调用记录。</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>总次数</th>
                  <th>明细</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {userRows.slice(0, 50).map((row) => (
                  <tr key={row.userId}>
                    <td>{row.label}</td>
                    <td>{row.totalCalls}</td>
                    <td>
                      {row.scopes
                        .map((scope) => `${scope.label} ${scope.count}`)
                        .join(' / ')}
                    </td>
                    <td>
                      {row.hasExhausted ? (
                        <span className={styles.codeTag}>
                          已满：{row.exhaustedLabels.join('、')}
                        </span>
                      ) : (
                        <span className={styles.hint}>正常</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

export default AdminQuotaPage;
