/*
 * 冲突检测与课程查询的测试（P3-3）。
 *
 * 冲突检测最容易出两类错误：
 *   1. 漏报——两门课真撞了却没提示
 *   2. 误报——单双周交替的课被当成冲突
 * 后者尤其烦人，所以单双周是重点用例。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ICourseType } from '../types/schedule-types.ts';

import { weekPatternFromWeeks } from './schedule-algorithm.ts';
import {
  courseDuration,
  courseMatchesWeek,
  coursesOfDay,
  normalizeCourse,
} from '../types/schedule-types.ts';
import { detectConflicts } from './schedule-store.ts';

function makeCourse(overrides: Partial<ICourseType> & { name: string }): ICourseType {
  return {
    id: 1,
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

test('同天同节次且周次重叠 → 冲突', () => {
  const a = makeCourse({ name: '高等数学', dayOfWeek: 1, startLesson: 1, endLesson: 2 });
  const b = makeCourse({ name: '大学英语', dayOfWeek: 1, startLesson: 2, endLesson: 3 });

  const conflicts = detectConflicts([a, b]);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].weeks.slice(0, 3), [1, 2, 3]);
  assert.match(conflicts[0].description, /高等数学/);
  assert.match(conflicts[0].description, /大学英语/);
});

test('不同天不算冲突', () => {
  const a = makeCourse({ name: 'A', dayOfWeek: 1 });
  const b = makeCourse({ name: 'B', dayOfWeek: 2 });

  assert.equal(detectConflicts([a, b]).length, 0);
});

test('同天但节次不重叠不算冲突', () => {
  const a = makeCourse({ name: 'A', dayOfWeek: 1, startLesson: 1, endLesson: 2 });
  const b = makeCourse({ name: 'B', dayOfWeek: 1, startLesson: 3, endLesson: 4 });

  assert.equal(detectConflicts([a, b]).length, 0);
});

test('单双周交替不算冲突（重点：不能误报）', () => {
  const odd = makeCourse({
    name: '单周课',
    dayOfWeek: 3,
    startLesson: 1,
    endLesson: 2,
    weekPattern: weekPatternFromWeeks([1, 3, 5, 7, 9, 11]),
  });
  const even = makeCourse({
    name: '双周课',
    dayOfWeek: 3,
    startLesson: 1,
    endLesson: 2,
    weekPattern: weekPatternFromWeeks([2, 4, 6, 8, 10, 12]),
  });

  assert.equal(detectConflicts([odd, even]).length, 0, '单双周交替不应报冲突');
});

test('部分周重叠时报出交集', () => {
  const a = makeCourse({
    name: 'A',
    dayOfWeek: 2,
    startLesson: 1,
    endLesson: 2,
    weekPattern: weekPatternFromWeeks([1, 2, 3, 4]),
  });
  const b = makeCourse({
    name: 'B',
    dayOfWeek: 2,
    startLesson: 1,
    endLesson: 2,
    weekPattern: weekPatternFromWeeks([3, 4, 5, 6]),
  });

  const conflicts = detectConflicts([a, b]);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].weeks, [3, 4]);
});

test('一门课跨多节，与其中一节重叠也算冲突', () => {
  const long = makeCourse({ name: '实验课', dayOfWeek: 4, startLesson: 1, endLesson: 4 });
  const short = makeCourse({ name: '短课', dayOfWeek: 4, startLesson: 3, endLesson: 3 });

  assert.equal(detectConflicts([long, short]).length, 1);
});

test('三门课互相冲突时两两都报', () => {
  const a = makeCourse({ name: 'A', dayOfWeek: 1, startLesson: 1, endLesson: 2 });
  const b = makeCourse({ name: 'B', dayOfWeek: 1, startLesson: 1, endLesson: 2 });
  const c = makeCourse({ name: 'C', dayOfWeek: 1, startLesson: 1, endLesson: 2 });

  assert.equal(detectConflicts([a, b, c]).length, 3);
});

test('空课表没有冲突', () => {
  assert.equal(detectConflicts([]).length, 0);
});

test('courseMatchesWeek 按 weekPattern 判定', () => {
  const course = makeCourse({
    name: 'X',
    weekPattern: weekPatternFromWeeks([1, 3, 5]),
  });

  assert.equal(courseMatchesWeek(course, 1), true);
  assert.equal(courseMatchesWeek(course, 2), false);
  assert.equal(courseMatchesWeek(course, 5), true);
  assert.equal(courseMatchesWeek(course, 6), false);
});

test('courseMatchesWeek 无 weekPattern 时回退到 startWeek..endWeek', () => {
  const course = makeCourse({
    name: 'Y',
    startWeek: 3,
    endWeek: 6,
    weekPattern: { ranges: [], rule: 'ALL' },
  });

  assert.equal(courseMatchesWeek(course, 2), false);
  assert.equal(courseMatchesWeek(course, 4), true);
  assert.equal(courseMatchesWeek(course, 7), false);
});

test('courseDuration 计算节数', () => {
  assert.equal(courseDuration(makeCourse({ name: 'Z', startLesson: 3, endLesson: 4 })), 2);
  assert.equal(courseDuration(makeCourse({ name: 'Z', startLesson: 5, endLesson: 5 })), 1);
});

test('coursesOfDay 过滤并按开始节次排序', () => {
  const courses = [
    makeCourse({ name: 'late', id: 1, dayOfWeek: 1, startLesson: 5, endLesson: 6 }),
    makeCourse({ name: 'early', id: 2, dayOfWeek: 1, startLesson: 1, endLesson: 2 }),
    makeCourse({ name: 'other-day', id: 3, dayOfWeek: 2, startLesson: 1, endLesson: 2 }),
  ];

  const result = coursesOfDay(courses, 1, 1);
  assert.deepEqual(result.map((course) => course.name), ['early', 'late']);
});

test('normalizeCourse 能从 weekRanges 构造', () => {
  const course = normalizeCourse(
    {
      name: '导入课',
      day: 3,
      startSection: 2,
      endSection: 4,
      weekRanges: [[1, 9]],
      weekRule: 'ODD',
      position: 'A101',
      teacher: '张老师',
    },
    7,
  );

  assert.equal(course.id, 7);
  assert.equal(course.dayOfWeek, 3);
  assert.equal(course.startLesson, 2);
  assert.equal(course.endLesson, 4);
  assert.equal(course.location, 'A101');
  assert.equal(course.weekPattern.rule, 'ODD');
  assert.equal(courseMatchesWeek(course, 3), true);
  assert.equal(courseMatchesWeek(course, 4), false);
});

test('normalizeCourse 只有 weeks 时反推 weekPattern', () => {
  const course = normalizeCourse({ name: '旧数据', day: 1, weeks: [1, 3, 5] }, 8);

  assert.equal(course.weekPattern.rule, 'ODD');
  assert.deepEqual(course.weekPattern.ranges, [{ start: 1, end: 5 }]);
});
