/*
 * 手工新增/编辑课程时的载荷构造（P3-3）。
 *
 * 课表有三套「周次」表达，它们是**互斥**的：
 *
 *     weeks:      [1,2,3,...]        显式列举每一周
 *     weekRanges: [[1,16]]           区间表示（真相源）
 *     weekRule:   'ALL'|'ODD'|'EVEN' 区间内的奇偶筛选
 *
 * 后端以 `weekRanges` + `weekRule` 为准。如果表单同时提交了
 * `weeks` 和一个含义不同的 `weekRule`，服务端按哪一套解释就成了
 * 未定义行为——App 与 Web 可能算出不同结果。
 *
 * 这些用例盯住的就是「表单选择 → 载荷」这一步不能自相矛盾。
 *
 * 设计上刻意对齐 App 的 `WeekPattern`（区间 + 单双周），
 * 没有做「任意周次列表」：那会造出一个后端和 App 都表达不了的状态。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCoursePayload,
  emptyCourseForm,
  formatWeekSummary,
  isCourseFormValid,
  valuesFromCourse,
  type ICourseFormValuesType,
} from '../utils/course-form.ts';

const base: ICourseFormValuesType = {
  name: '高等数学',
  dayOfWeek: 1,
  startLesson: 1,
  endLesson: 2,
  location: 'A101',
  teacher: '张老师',
  weekMode: 'all',
  rangeStart: 1,
  rangeEnd: 16,
};

test('连续周：只提交 weekRanges + weekRule=ALL，不带 weeks', () => {
  const payload = buildCoursePayload(base);
  assert.deepEqual(payload.weekRanges, [[1, 16]]);
  assert.equal(payload.weekRule, 'ALL');
  assert.equal(payload.weeks, undefined, 'weekRanges 已表达全部周次，不应再给 weeks');
});

test('单周模式：区间不变，weekRule=ODD', () => {
  const payload = buildCoursePayload({ ...base, weekMode: 'odd' });
  assert.deepEqual(payload.weekRanges, [[1, 16]]);
  assert.equal(payload.weekRule, 'ODD');
  assert.equal(payload.weeks, undefined);
});

test('双周模式：weekRule=EVEN', () => {
  const payload = buildCoursePayload({ ...base, weekMode: 'even' });
  assert.equal(payload.weekRule, 'EVEN');
});

test('节次与星期被夹到合法范围', () => {
  const payload = buildCoursePayload({
    ...base,
    dayOfWeek: 9,
    startLesson: 0,
    endLesson: 99,
  });
  assert.equal(payload.dayOfWeek, 7, '星期最大 7');
  assert.equal(payload.startLesson, 1, '节次最小 1');
  assert.ok(payload.endLesson <= 12, `结束节次应被夹住，实际 ${payload.endLesson}`);
});

test('结束节次早于开始节次时自动交换，而不是产出非法区间', () => {
  // 用户从下往上拖选很常见
  const payload = buildCoursePayload({ ...base, startLesson: 5, endLesson: 3 });
  assert.equal(payload.startLesson, 3);
  assert.equal(payload.endLesson, 5);
});

test('课程名首尾空白被裁掉', () => {
  const payload = buildCoursePayload({ ...base, name: '  高等数学  ' });
  assert.equal(payload.name, '高等数学');
});

test('周次区间起点大于终点时自动交换', () => {
  const payload = buildCoursePayload({ ...base, rangeStart: 16, rangeEnd: 1 });
  assert.deepEqual(payload.weekRanges, [[1, 16]]);
});

test('周次区间被夹到 1..30', () => {
  const payload = buildCoursePayload({ ...base, rangeStart: 0, rangeEnd: 40 });
  assert.deepEqual(payload.weekRanges, [[1, 30]]);
});

test('可选字段为空串时不提交，避免污染服务端数据', () => {
  const payload = buildCoursePayload({ ...base, location: '  ', teacher: '' });
  assert.equal(payload.location, undefined);
  assert.equal(payload.teacher, undefined);
});

test('周次摘要能区分全周/单周/双周', () => {
  assert.equal(formatWeekSummary({ ...base, weekMode: 'all' }), '1-16周');
  assert.equal(formatWeekSummary({ ...base, weekMode: 'odd' }), '1-16周 单周');
  assert.equal(formatWeekSummary({ ...base, weekMode: 'even' }), '1-16周 双周');
});

test('表单必填校验：课程名为空不可提交', () => {
  assert.equal(isCourseFormValid(base), true);
  assert.equal(isCourseFormValid({ ...base, name: '   ' }), false);
});

test('从服务端记录回填表单（编辑场景）', () => {
  const values = valuesFromCourse({
    name: '线性代数',
    dayOfWeek: 3,
    startLesson: 5,
    endLesson: 6,
    location: 'B203',
    teacher: '李老师',
    weekRanges: [[2, 12]],
    weekRule: 'EVEN',
  });
  assert.equal(values.name, '线性代数');
  assert.equal(values.weekMode, 'even');
  assert.equal(values.rangeStart, 2);
  assert.equal(values.rangeEnd, 12);
});

test('回填时小写 weekRule 也能识别（历史数据可能是小写）', () => {
  // App 侧踩过这个坑：小写 odd 被静默当成全周，周次全错
  const values = valuesFromCourse({
    name: 'x',
    dayOfWeek: 1,
    startLesson: 1,
    endLesson: 1,
    weekRule: ' odd ',
  });
  assert.equal(values.weekMode, 'odd');
});

test('回填 → 构造 的往返不丢信息', () => {
  const original: ICourseFormValuesType = {
    ...base,
    weekMode: 'odd',
    rangeStart: 3,
    rangeEnd: 15,
  };
  const payload = buildCoursePayload(original);
  const back = valuesFromCourse({
    name: payload.name,
    dayOfWeek: payload.dayOfWeek,
    startLesson: payload.startLesson,
    endLesson: payload.endLesson,
    location: payload.location,
    teacher: payload.teacher,
    weekRanges: payload.weekRanges,
    weekRule: payload.weekRule,
  });
  assert.deepEqual(back, original);
});

test('空表单有合理的默认值', () => {
  const form = emptyCourseForm();
  assert.equal(form.weekMode, 'all');
  assert.equal(form.dayOfWeek, 1);
  assert.ok(form.rangeEnd >= form.rangeStart);
  assert.equal(isCourseFormValid(form), false, '空表单不可直接提交');
});
