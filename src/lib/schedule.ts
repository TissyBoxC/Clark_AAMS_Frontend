/* 课表与日期相关的纯函数。周次判定与 App 端保持同一套语义。 */

import type { ICourseType, IRawCourseType } from '../types';

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];

/** 默认作息：学校没有单独配置时使用。 */
export const DEFAULT_LESSON_TIMES = [
  '08:00', '08:55', '10:00', '10:55', '14:00', '14:55', '16:00', '16:55', '19:00', '19:55', '20:50', '21:45',
];

export const MAX_WEEK = 30;

export function expandWeeks(course: Pick<ICourseType, 'weeks' | 'weekRanges' | 'weekRule' | 'startWeek' | 'endWeek'>): number[] {
  if (Array.isArray(course.weeks) && course.weeks.length > 0) {
    return Array.from(new Set(course.weeks)).sort((a, b) => a - b);
  }

  const rangeStart = course.startWeek || 1;
  const rangeEnd = course.endWeek || rangeStart;
  const rule = course.weekRule ?? 'ALL';
  const result: number[] = [];

  for (let week = Math.max(1, rangeStart); week <= Math.min(MAX_WEEK, rangeEnd); week += 1) {
    if (rule === 'ODD' && week % 2 === 0) {
      continue;
    }
    if (rule === 'EVEN' && week % 2 !== 0) {
      continue;
    }
    result.push(week);
  }

  return result;
}

/** 「1-8周」「1-16周(单)」这样的短描述。 */
export function weekText(course: ICourseType): string {
  const ranges = Array.isArray(course.weekRanges) && course.weekRanges.length > 0
    ? course.weekRanges
    : null;

  if (ranges) {
    const body = ranges
      .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
      .join(',');
    const suffix = course.weekRule === 'ODD' ? '(单)' : course.weekRule === 'EVEN' ? '(双)' : '';
    return `${body}周${suffix}`;
  }

  const weeks = expandWeeks(course);
  if (weeks.length === 0) {
    return '未设置周次';
  }

  return `${weeks[0]}-${weeks[weeks.length - 1]}周`;
}

export function isCourseInWeek(course: ICourseType, week: number): boolean {
  return expandWeeks(course).includes(week);
}

export function lessonRangeText(course: Pick<ICourseType, 'startLesson' | 'endLesson'>): string {
  if (course.startLesson === course.endLesson) {
    return `第 ${course.startLesson} 节`;
  }
  return `第 ${course.startLesson}-${course.endLesson} 节`;
}

export function lessonTimeText(lesson: number, startTimes: string[]): string {
  const start = startTimes[lesson - 1];
  if (!start) {
    return '';
  }

  const [hourText, minuteText] = start.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return '';
  }

  const endMinutes = hour * 60 + minute + 45;
  const endHour = Math.floor(endMinutes / 60) % 24;
  const endMinute = endMinutes % 60;

  return `${start}-${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

function localDate(value: string): Date | null {
  const parts = value.split('-').map((item) => Number.parseInt(item, 10));
  if (parts.length < 3 || parts.some((item) => Number.isNaN(item))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function termWeek(termStart: string, today: Date, maxWeeks: number): number {
  const start = localDate(termStart);
  if (!start) {
    return 1;
  }

  const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const currentOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((currentOfDay.getTime() - startOfDay.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(week, 1), maxWeeks);
}

export function weekdayOf(date: Date): number {
  const value = date.getDay();
  return value === 0 ? 7 : value;
}

export function todayLabel(date = new Date()): string {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · 周${WEEKDAY_SHORT[weekdayOf(date) - 1]}`;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 把导入/识别返回的原始课程补齐成可展示的课程对象。 */
export function normalizeCourse(raw: IRawCourseType, index: number): ICourseType {
  const weeks = Array.isArray(raw.weeks)
    ? raw.weeks.map((week) => Number(week)).filter((week) => Number.isFinite(week) && week >= 1)
    : [];

  const startWeek = Number(raw.startWeek ?? (weeks.length > 0 ? weeks[0] : 1)) || 1;
  const endWeek = Number(raw.endWeek ?? (weeks.length > 0 ? weeks[weeks.length - 1] : startWeek)) || startWeek;

  return {
    id: index + 1,
    name: String(raw.name ?? '').trim() || '未命名课程',
    dayOfWeek: Number(raw.dayOfWeek ?? raw.day ?? 1) || 1,
    startLesson: Number(raw.startLesson ?? raw.startSection ?? 1) || 1,
    endLesson: Number(raw.endLesson ?? raw.endSection ?? raw.startLesson ?? raw.startSection ?? 1) || 1,
    location: String(raw.location ?? raw.position ?? ''),
    teacher: String(raw.teacher ?? ''),
    rawTime: String(raw.rawTime ?? ''),
    weeks,
    weekRanges: weeks.length > 0 ? [[weeks[0], weeks[weeks.length - 1]]] : [[startWeek, endWeek]],
    weekRule: 'ALL',
    startWeek,
    endWeek,
  };
}

export function coursesOfDay(courses: ICourseType[], dayOfWeek: number, week: number): ICourseType[] {
  return courses
    .filter((course) => course.dayOfWeek === dayOfWeek && isCourseInWeek(course, week))
    .sort((a, b) => a.startLesson - b.startLesson);
}

export function maxLessonOf(courses: ICourseType[]): number {
  return courses.reduce((max, course) => Math.max(max, course.endLesson), 0);
}
