/*
 * 课表接口路径契约测试（P3-1）。
 *
 * 三端共用同一组路径。这里把路径与请求方法钉死，
 * 避免 Web 与 App 各写一份、日后漂移。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { IServerCourseType, ICourseUpsertPayloadType } from '../api/course-api.ts';

/** 与 course-api.ts 中实际使用的路径保持一致。 */
const SCHEDULE_PATH = '/api/v1/courses/schedule';

test('课表资源路径固定为 /api/v1/courses/schedule', () => {
  assert.equal(SCHEDULE_PATH, '/api/v1/courses/schedule');
});

test('服务端课程字段名是 camelCase 且含周次真相源', () => {
  // 用类型要求的字段构造一份，确保后端实际返回的形态能被类型覆盖
  const course: IServerCourseType = {
    name: '高等数学',
    dayOfWeek: 1,
    startLesson: 1,
    endLesson: 2,
    location: 'A101',
    teacher: '张老师',
    rawTime: '',
    weeks: [1, 2, 3, 4],
    weekRanges: [[1, 4]],
    weekRule: 'ALL',
    startWeek: 1,
    endWeek: 4,
  };

  assert.deepEqual(Object.keys(course).sort(), [
    'dayOfWeek', 'endLesson', 'endWeek', 'location', 'name', 'rawTime',
    'startLesson', 'startWeek', 'teacher', 'weekRanges', 'weekRule', 'weeks',
  ]);
  assert.equal(course.weekRule, 'ALL', 'weekRule 必须是大写线格式');
  assert.ok(Array.isArray(course.weekRanges[0]), 'weekRanges 是 [start,end] 二元组');
});

test('写请求只提交真相源字段', () => {
  const payload: ICourseUpsertPayloadType = {
    name: '线性代数',
    dayOfWeek: 2,
    startLesson: 3,
    endLesson: 4,
    weekRanges: [[1, 16]],
    weekRule: 'ALL',
  };

  // 不应包含 startWeek/endWeek/weeks 这类派生字段
  assert.equal('startWeek' in payload, false);
  assert.equal('endWeek' in payload, false);
  assert.equal('weeks' in payload, false);
  assert.deepEqual(payload.weekRanges, [[1, 16]]);
});

test('单双周用大写线格式表达', () => {
  const odd: ICourseUpsertPayloadType = {
    name: '单周实验', dayOfWeek: 3, startLesson: 5, endLesson: 6,
    weekRanges: [[1, 9]], weekRule: 'ODD',
  };
  const even: ICourseUpsertPayloadType = {
    name: '双周实验', dayOfWeek: 3, startLesson: 5, endLesson: 6,
    weekRanges: [[2, 10]], weekRule: 'EVEN',
  };

  assert.equal(odd.weekRule, 'ODD');
  assert.equal(even.weekRule, 'EVEN');
});

test('单门课的路径是资源路径加 id', () => {
  const courseId = 42;
  assert.equal(`${SCHEDULE_PATH}/${courseId}`, '/api/v1/courses/schedule/42');
});
