/*
 * 手工新增 / 编辑课程的表单逻辑（P3-3）。
 *
 * 单独成文件的原因与 `role-routing.ts` 相同：这里是纯函数、不依赖 http，
 * 因此可以被 `node --test` 直接覆盖。表单最容易出错的是**载荷自相矛盾**，
 * 而那件事完全可以在没有浏览器的环境里测清楚。
 *
 * 设计对齐 App 的 `WeekPattern`：周次 = 区间 + 单双周规则。
 * 三端只有这一套模型，Web 不再自创「任意周次列表」——
 * 那会造出一个后端和 App 都表达不了的状态。
 */

import type { ICourseUpsertPayloadType } from '../api/course-api.ts';

/** 周次规则，与后端 `WeekRule` / App `WeekRule` 一致。 */
export type WeekModeType = 'all' | 'odd' | 'even';

/** 表单的受控输入值。 */
export interface ICourseFormValuesType {
  name: string;
  /** 1..7 表示周一至周日。 */
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location: string;
  teacher: string;
  weekMode: WeekModeType;
  /** 周次区间。 */
  rangeStart: number;
  rangeEnd: number;
}

const MAX_DAY = 7;
const MIN_LESSON = 1;
const MAX_LESSON = 12;
const MIN_WEEK = 1;
const MAX_WEEK = 30;

function clampInt(value: number, min: number, max: number, fallback: number): number {
  const numeric =
    typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, numeric));
}

/** 归一化周次区间：夹取范围并在顺序颠倒时交换。 */
function normalizeRange(start: number, end: number): [number, number] {
  let from = clampInt(start, MIN_WEEK, MAX_WEEK, MIN_WEEK);
  let to = clampInt(end, MIN_WEEK, MAX_WEEK, MAX_WEEK);
  if (to < from) {
    [from, to] = [to, from];
  }
  return [from, to];
}

/**
 * 把表单输入转成后端载荷。
 *
 * 只提交 `weekRanges` + `weekRule`，**不提交 `weeks`**：
 * 后端以区间+规则为真相源；再给一份语义可能不同的 `weeks`，
 * 「按哪套解释」就成了未定义行为，App 与 Web 可能算出不同结果。
 */
export function buildCoursePayload(values: ICourseFormValuesType): ICourseUpsertPayloadType {
  // 节次：先各自夹取，再在顺序颠倒时交换——
  // 用户从下往上拖选很常见，直接报错不如顺着意图理解。
  let startLesson = clampInt(values.startLesson, MIN_LESSON, MAX_LESSON, MIN_LESSON);
  let endLesson = clampInt(values.endLesson, MIN_LESSON, MAX_LESSON, MAX_LESSON);
  if (endLesson < startLesson) {
    [startLesson, endLesson] = [endLesson, startLesson];
  }

  const [rangeStart, rangeEnd] = normalizeRange(values.rangeStart, values.rangeEnd);

  const payload: ICourseUpsertPayloadType = {
    name: values.name.trim(),
    dayOfWeek: clampInt(values.dayOfWeek, 1, MAX_DAY, 1),
    startLesson,
    endLesson,
    weekRanges: [[rangeStart, rangeEnd]],
    weekRule: values.weekMode === 'odd' ? 'ODD' : values.weekMode === 'even' ? 'EVEN' : 'ALL',
  };

  // 可选字段：空白视为「没填」，不提交空串污染服务端数据
  const location = values.location.trim();
  if (location) {
    payload.location = location;
  }
  const teacher = values.teacher.trim();
  if (teacher) {
    payload.teacher = teacher;
  }

  return payload;
}

/** 表单摘要文案，用于确认提示。 */
export function formatWeekSummary(values: ICourseFormValuesType): string {
  const [from, to] = normalizeRange(values.rangeStart, values.rangeEnd);
  const base = `${from}-${to}周`;
  if (values.weekMode === 'odd') {
    return `${base} 单周`;
  }
  if (values.weekMode === 'even') {
    return `${base} 双周`;
  }
  return base;
}

/** 表单是否可提交（只校验必填；范围问题由 `buildCoursePayload` 夹取）。 */
export function isCourseFormValid(values: ICourseFormValuesType): boolean {
  return values.name.trim().length > 0;
}

/** 从服务端的课程记录回填表单，用于「编辑」。 */
export function valuesFromCourse(course: {
  name: string;
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location?: string;
  teacher?: string;
  weekRanges?: [number, number][];
  weekRule?: string;
}): ICourseFormValuesType {
  const firstRange = course.weekRanges?.[0];
  const rule = (course.weekRule ?? 'ALL').toString().trim().toUpperCase();
  return {
    name: course.name,
    dayOfWeek: course.dayOfWeek,
    startLesson: course.startLesson,
    endLesson: course.endLesson,
    location: course.location ?? '',
    teacher: course.teacher ?? '',
    weekMode: rule === 'ODD' ? 'odd' : rule === 'EVEN' ? 'even' : 'all',
    rangeStart: firstRange?.[0] ?? MIN_WEEK,
    rangeEnd: firstRange?.[1] ?? MAX_WEEK,
  };
}

/** 空表单的默认值，用于「新增」。 */
export function emptyCourseForm(): ICourseFormValuesType {
  return {
    name: '',
    dayOfWeek: 1,
    startLesson: MIN_LESSON,
    endLesson: 2,
    location: '',
    teacher: '',
    weekMode: 'all',
    rangeStart: MIN_WEEK,
    rangeEnd: 16,
  };
}
