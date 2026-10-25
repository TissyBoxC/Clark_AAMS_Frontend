/*
 * 周视图渲染所需的分组逻辑测试（P3-3）。
 *
 * 周视图用 rowSpan 表示跨节次课程，因此「哪些课在哪一行起渲染」
 * 必须精确——算错会让整张表错位。这里把分组逻辑抽出来单独验证。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ICourseType } from '../types/schedule-types.ts';

import { weekPatternFromWeeks } from './schedule-algorithm.ts';

/** 与页面中一致的周视图分组：按 天 + 起始节次 聚合。 */
interface IGridEntryType {
  dayOfWeek: number;
  startLesson: number;
  span: number;
  names: string[];
}

function buildGridEntries(courses: ICourseType[]): IGridEntryType[] {
  const buckets = new Map<string, IGridEntryType>();

  courses.forEach((course) => {
    const key = `${course.dayOfWeek}:${course.startLesson}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.names.push(course.name);
      existing.span = Math.max(existing.span, course.endLesson - course.startLesson + 1);
    } else {
      buckets.set(key, {
        dayOfWeek: course.dayOfWeek,
        startLesson: course.startLesson,
        span: course.endLesson - course.startLesson + 1,
        names: [course.name],
      });
    }
  });

  return Array.from(buckets.values());
}

function course(overrides: Partial<ICourseType> & { name: string }): ICourseType {
  return {
    id: Math.random(),
    startWeek: 1,
    endWeek: 16,
    dayOfWeek: 1,
    startLesson: 1,
    endLesson: 2,
    location: '',
    teacher: '',
    rawTime: '',
    weekPattern: weekPatternFromWeeks(
      Array.from({ length: 16 }, (_, index) => index + 1),
    ),
    ...overrides,
  };
}

test('每门课按 天+起始节次 落在唯一格子', () => {
  const entries = buildGridEntries([
    course({ name: 'A', dayOfWeek: 1, startLesson: 1, endLesson: 2 }),
    course({ name: 'B', dayOfWeek: 1, startLesson: 3, endLesson: 4 }),
    course({ name: 'C', dayOfWeek: 2, startLesson: 1, endLesson: 2 }),
  ]);

  assert.equal(entries.length, 3);
  const keys = entries.map((entry) => `${entry.dayOfWeek}:${entry.startLesson}`).sort();
  assert.deepEqual(keys, ['1:1', '1:3', '2:1']);
});

test('跨节次课程的行数等于占用节数', () => {
  const entries = buildGridEntries([
    course({ name: '长课', dayOfWeek: 3, startLesson: 2, endLesson: 5 }),
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].span, 4, '第 2-5 节应跨 4 行');
});

test('同格多门课合并并取最大行数', () => {
  const entries = buildGridEntries([
    course({ name: '短', dayOfWeek: 4, startLesson: 1, endLesson: 1 }),
    course({ name: '长', dayOfWeek: 4, startLesson: 1, endLesson: 3 }),
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].span, 3);
  assert.deepEqual(entries[0].names.sort(), ['短', '长'].sort());
});

test('空课表不产生任何格子', () => {
  assert.equal(buildGridEntries([]).length, 0);
});

test('同一天不同起始节次的课互不覆盖', () => {
  const entries = buildGridEntries([
    course({ name: 'A', dayOfWeek: 5, startLesson: 1, endLesson: 2 }),
    course({ name: 'B', dayOfWeek: 5, startLesson: 2, endLesson: 3 }),
  ]);

  // 起始节次不同 → 两个独立格子（即使节次重叠，视觉上会重叠，
  // 这种情况由冲突检测负责提示，不由布局吞掉）
  assert.equal(entries.length, 2);
});
