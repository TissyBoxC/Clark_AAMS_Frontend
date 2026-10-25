/*
 * 共享课表算法 fixture 的 TS 侧验证（P3-2）。
 *
 * 用 Node 自带测试运行器，不引入额外依赖（本机无法访问 npm 源）。
 * fixture 位于本仓库的 `shared/schedule-fixtures.json`，
 * App 仓库有一份**内容相同**的副本（两个仓库互相独立，
 * 无法直接引用同一路径），两端各自跑同一套用例。
 *
 * 运行：npm test
 *      node --test --experimental-strip-types src/**\/*.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  currentWeek,
  endTime,
  expandWeeks,
  isTimeListValid,
  weekPatternFromWeeks,
  weekPatternText,
  type IWeekPatternType,
  type WeekRuleWire,
} from './schedule-algorithm.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../../shared/schedule-fixtures.json');

interface IExpandCase {
  name: string;
  ranges: number[][];
  rule: WeekRuleWire;
  expected: number[];
}

interface IFromWeeksCase {
  name: string;
  weeks: number[];
  expectedRanges: number[][];
  expectedRule: WeekRuleWire;
  expectedExpand: number[];
}

interface IEndTimeCase {
  name: string;
  start: string;
  duration: number;
  expected: string;
}

interface ITimeListCase {
  name: string;
  times: string[];
  expected: boolean;
}

interface ICurrentWeekCase {
  name: string;
  termStartDate: string;
  today: string;
  maxWeeks: number;
  expected: number;
}

interface IFixturesType {
  expand: IExpandCase[];
  fromWeeks: IFromWeeksCase[];
  endTime: IEndTimeCase[];
  isTimeListValid: ITimeListCase[];
  currentWeek: ICurrentWeekCase[];
}

const fixtures: IFixturesType = JSON.parse(readFileSync(fixturePath, 'utf8'));

test('fixture 文件存在且非空', () => {
  assert.ok(fixtures.expand.length > 0, 'expand 用例不能为空');
  assert.ok(fixtures.fromWeeks.length > 0, 'fromWeeks 用例不能为空');
  assert.ok(fixtures.endTime.length > 0, 'endTime 用例不能为空');
  assert.ok(fixtures.isTimeListValid.length > 0, 'isTimeListValid 用例不能为空');
  assert.ok(fixtures.currentWeek.length > 0, 'currentWeek 用例不能为空');
});

test('expand 周次展开与 fixture 一致', () => {
  fixtures.expand.forEach((item) => {
    const pattern: IWeekPatternType = {
      ranges: item.ranges.map(([start, end]) => ({ start, end })),
      rule: item.rule,
    };

    assert.deepEqual(expandWeeks(pattern), item.expected, `用例「${item.name}」`);
  });
});

test('fromWeeks 反推与 fixture 一致', () => {
  fixtures.fromWeeks.forEach((item) => {
    const pattern = weekPatternFromWeeks(item.weeks);

    const actualRanges = pattern.ranges.map((range) => [range.start, range.end]);
    assert.deepEqual(actualRanges, item.expectedRanges, `用例「${item.name}」的区间`);
    assert.equal(pattern.rule, item.expectedRule, `用例「${item.name}」的规则`);
    assert.deepEqual(expandWeeks(pattern), item.expectedExpand, `用例「${item.name}」的展开`);
  });
});

test('endTime 结束时间与 fixture 一致', () => {
  fixtures.endTime.forEach((item) => {
    assert.equal(endTime(item.start, item.duration), item.expected, `用例「${item.name}」`);
  });
});

test('isTimeListValid 作息校验与 fixture 一致', () => {
  fixtures.isTimeListValid.forEach((item) => {
    assert.equal(isTimeListValid(item.times), item.expected, `用例「${item.name}」`);
  });
});

test('currentWeek 当前周与 fixture 一致', () => {
  fixtures.currentWeek.forEach((item) => {
    const [year, month, day] = item.today.split('-').map((part) => Number.parseInt(part, 10));
    const today = new Date(year, month - 1, day);

    assert.equal(
      currentWeek(item.termStartDate, today, item.maxWeeks),
      item.expected,
      `用例「${item.name}」`,
    );
  });
});

test('weekPatternText 与 App 展示格式一致', () => {
  assert.equal(
    weekPatternText(weekPatternFromWeeks([1, 3, 5, 7])),
    '1-7周(单)',
  );
  assert.equal(
    weekPatternText(weekPatternFromWeeks([2, 4, 6, 8])),
    '2-8周(双)',
  );
  assert.equal(
    weekPatternText(weekPatternFromWeeks([1, 2, 3, 4, 5])),
    '1-5周',
  );
  assert.equal(
    weekPatternText(weekPatternFromWeeks([1, 2, 5, 6, 9])),
    '1-2,5-6,9周',
  );
  assert.equal(weekPatternText({ ranges: [], rule: 'ALL' }), '');
});
