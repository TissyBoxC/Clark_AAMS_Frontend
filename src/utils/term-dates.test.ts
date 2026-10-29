/*
 * 学期日期计算的回归测试。
 *
 * 这几条都是"算错一天就整个课表全错"的地方，值得钉死：
 * 第一周周一是哪天、第 N 周周三是哪天、今天落在第几周。
 *
 * 运行：npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dateOfWeekDay, monthDayLabel, termWeek, weekdayOf } from '../lib/schedule.ts';

test('第一周周一算出来就是起始日本身', () => {
  const date = dateOfWeekDay('2026-09-07', 1, 1);
  assert.ok(date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 8); // 9 月
  assert.equal(date.getDate(), 7);
});

test('第一周周日是起始日往后第六天', () => {
  const date = dateOfWeekDay('2026-09-07', 1, 7);
  assert.ok(date);
  assert.equal(date.getDate(), 13);
  assert.equal(weekdayOf(date), 7, '应当仍是周日');
});

test('第 3 周周三是起始日往后 16 天', () => {
  const date = dateOfWeekDay('2026-09-07', 3, 3);
  assert.ok(date);
  // (3-1)*7 + (3-1) = 16
  assert.equal(date.getDate(), 23);
  assert.equal(weekdayOf(date), 3, '应当仍是周三');
});

test('跨月也正确', () => {
  // 9/28 是第 1 周周一，第 5 周周一是它往后 (5-1)*7 = 28 天，即 10/26
  const date = dateOfWeekDay('2026-09-28', 5, 1);
  assert.ok(date);
  assert.equal(date.getMonth(), 9, '10 月');
  assert.equal(date.getDate(), 26);
  assert.equal(weekdayOf(date), 1, '应当仍是周一');
});

test('日期格式不对时返回 null，不瞎算', () => {
  assert.equal(dateOfWeekDay('', 1, 1), null);
  assert.equal(dateOfWeekDay('不是日期', 1, 1), null);
});

test('表头日期显示成 月/日', () => {
  const date = dateOfWeekDay('2026-09-07', 1, 3);
  assert.ok(date);
  assert.equal(monthDayLabel(date), '9/9');
});

test('今天落在第几周：起始日当天是第 1 周', () => {
  const start = '2026-09-07';
  assert.equal(termWeek(start, new Date(2026, 8, 7), 30), 1);
});

test('今天落在第几周：起始日第 8 天进入第 2 周', () => {
  const start = '2026-09-07';
  assert.equal(termWeek(start, new Date(2026, 8, 14), 30), 2);
});

test('今天落在第几周：学期开始之前夹到第 1 周', () => {
  const start = '2026-09-07';
  assert.equal(termWeek(start, new Date(2026, 7, 1), 30), 1);
});

test('今天落在第几周：超过上限时夹到最大周', () => {
  const start = '2026-09-07';
  assert.equal(termWeek(start, new Date(2027, 5, 1), 20), 20);
});

test('没配起始日时返回第 1 周', () => {
  assert.equal(termWeek('', new Date(2026, 8, 20), 30), 1);
});
