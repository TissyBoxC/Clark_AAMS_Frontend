/*
 * 配额看板的视图整理逻辑（P5-4）。
 *
 * 这些函数把后端快照转成可直接渲染的行数据。
 * 抽成纯函数是为了能直覆盖两个真实风险：
 *
 * 1. 业务域的中文名。后端返回 `recognize` / `analyze` / `pickup`，
 *    界面直接显示英文键名对管理员没有意义。
 * 2. **未知业务域不能显示成「已满」**。后端将来加新业务域时，
 *    前端可能先拿到数据，此时必须原样显示而不是猜一个中文名。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildScopeRows,
  buildSummary,
  buildUserRows,
  describeLimitation,
  scopeLabel,
  type IQuotaDashboardType,
} from './quota-dashboard.ts';

function dashboard(
  overrides: Partial<IQuotaDashboardType> = {},
): IQuotaDashboardType {
  return {
    totalCalls: 0,
    users: [],
    scopes: [],
    inMemoryOnly: true,
    note: '',
    ...overrides,
  };
}

test('已知业务域显示中文名', () => {
  assert.equal(scopeLabel('recognize'), '课表识别');
  assert.equal(scopeLabel('analyze'), '题目解析');
  assert.equal(scopeLabel('pickup'), '取件码');
});

test('未知业务域原样显示，不猜中文名', () => {
  // 猜一个错误的中文名比显示英文更糟：管理员会以为系统有这个功能
  assert.equal(scopeLabel('some-new-scope'), 'some-new-scope');
});

test('业务域行保持后端给的顺序', () => {
  // 后端已按调用量降序排好；前端重排会让两端顺序不一致
  const rows = buildScopeRows(
    dashboard({
      scopes: [
        { scope: 'analyze', calls: 30 },
        { scope: 'recognize', calls: 10 },
      ],
    }),
  );
  assert.deepEqual(
    rows.map((r) => r.scope),
    ['analyze', 'recognize'],
  );
  assert.equal(rows[0].label, '题目解析');
  assert.equal(rows[0].calls, 30);
});

test('用户行的 id 显示为 #数字', () => {
  const rows = buildUserRows(
    dashboard({
      users: [
        { userId: 12, totalCalls: 3, byScope: [], exhaustedScopes: [] },
      ],
    }),
  );
  assert.equal(rows[0].label, '#12');
  assert.equal(rows[0].totalCalls, 3);
});

test('已满业务域被标记成中文名', () => {
  const rows = buildUserRows(
    dashboard({
      users: [
        {
          userId: 5,
          totalCalls: 25,
          byScope: [
            { scope: 'recognize', count: 20 },
            { scope: 'analyze', count: 5 },
          ],
          exhaustedScopes: ['recognize'],
        },
      ],
    }),
  );

  assert.equal(rows[0].hasExhausted, true);
  assert.deepEqual(rows[0].exhaustedLabels, ['课表识别']);
  // 逐项也要标出来，否则看不出是哪一个用满了
  assert.equal(rows[0].scopes[0].exhausted, true);
  assert.equal(rows[0].scopes[1].exhausted, false);
});

test('没有已满用户时不产生标记', () => {
  const rows = buildUserRows(
    dashboard({
      users: [
        { userId: 1, totalCalls: 1, byScope: [], exhaustedScopes: [] },
      ],
    }),
  );
  assert.equal(rows[0].hasExhausted, false);
  assert.deepEqual(rows[0].exhaustedLabels, []);
});

test('概览统计：总量、活跃人数、峰值、已满人数', () => {
  const summary = buildSummary(
    dashboard({
      totalCalls: 30,
      users: [
        {
          userId: 1,
          totalCalls: 20,
          byScope: [],
          exhaustedScopes: ['recognize'],
        },
        { userId: 2, totalCalls: 7, byScope: [], exhaustedScopes: [] },
        { userId: 3, totalCalls: 3, byScope: [], exhaustedScopes: [] },
      ],
    }),
  );

  assert.equal(summary.totalCalls, 30);
  assert.equal(summary.activeUsers, 3);
  // 峰值用来判断「普遍在用」还是「一个人刷」
  assert.equal(summary.peakUserCalls, 20);
  assert.equal(summary.exhaustedUsers, 1);
});

test('空数据时概览全为 0，不报错', () => {
  const summary = buildSummary(dashboard());
  assert.deepEqual(summary, {
    totalCalls: 0,
    activeUsers: 0,
    peakUserCalls: 0,
    exhaustedUsers: 0,
  });
});

test('边界说明优先用后端给的原文', () => {
  // 前端另写一份描述，一旦两边不同步，管理员不知道该信哪个
  const note = '统计来自服务内存计数：进程重启后归零。';
  assert.equal(describeLimitation(dashboard({ note })), note);
});

test('后端没给说明时兜底提到重启归零', () => {
  const text = describeLimitation(dashboard({ note: '' }));
  assert.ok(text.length > 0);
  assert.ok(text.includes('重启'), `兜底说明应提到重启，实际：${text}`);
});
