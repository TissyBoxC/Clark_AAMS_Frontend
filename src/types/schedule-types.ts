/*
 * 课程与课表设置的数据模型（P3-3）。
 *
 * 字段与 App 的 `lib/models/course.dart` 对齐，
 * 周次真相源同样是 `weekPattern`（区间 + 单双周），
 * `startWeek` / `endWeek` 仅为兼容旧数据保留。
 */

import type { IWeekPatternType, WeekRuleWire } from '../utils/schedule-algorithm.ts';

import { expandWeeks, weekPatternFromWeeks } from '../utils/schedule-algorithm.ts';

/** 一门课。 */
export interface ICourseType {
  id: number;
  name: string;
  /** 兼容字段，由 weekPattern 派生。 */
  startWeek: number;
  /** 兼容字段，由 weekPattern 派生。 */
  endWeek: number;
  /** 1 = 周一 … 7 = 周日。 */
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location: string;
  teacher: string;
  rawTime: string;
  /** 周次唯一真相源。 */
  weekPattern: IWeekPatternType;
  colorValue?: number | null;
}

/** 课表设置（学期起始、作息时间等）。 */
export interface IScheduleSettingsType {
  termStartDate: string;
  maxWeeks: number;
  durationPerLesson: number;
  startTimes: string[];
}

export const DEFAULT_SCHEDULE_SETTINGS: IScheduleSettingsType = {
  termStartDate: '',
  maxWeeks: 18,
  durationPerLesson: 45,
  startTimes: [],
};

/** 课程占用的节数。 */
export function courseDuration(course: ICourseType): number {
  return course.endLesson - course.startLesson + 1;
}

/**
 * 课程在第 week 周是否上课。唯一判定依据是 weekPattern。
 *
 * 没有 weekPattern 的旧数据回退到 startWeek..endWeek 区间，
 * 与 App `Course.matchesWeek` 一致。
 */
export function courseMatchesWeek(course: ICourseType, week: number): boolean {
  if (course.weekPattern.ranges.length === 0) {
    return week >= course.startWeek && week <= course.endWeek;
  }

  return expandWeeks(course.weekPattern).includes(week);
}

/** 取出某周某天的所有课程，按开始节次排序。 */
export function coursesOfDay(courses: ICourseType[], dayOfWeek: number, week: number): ICourseType[] {
  return courses
    .filter((course) => course.dayOfWeek === dayOfWeek && courseMatchesWeek(course, week))
    .sort((a, b) => a.startLesson - b.startLesson);
}

/** 把后端/导入结果的原始课程转换为本地课程。 */
export function normalizeCourse(raw: Record<string, unknown>, id: number): ICourseType {
  const weeks = Array.isArray(raw.weeks)
    ? raw.weeks.map((week) => Number(week)).filter((week) => Number.isFinite(week))
    : [];

  const rawRanges = Array.isArray(raw.weekRanges) ? raw.weekRanges : null;
  const derived = weekPatternFromWeeks(weeks);

  const weekPattern: IWeekPatternType = rawRanges
    ? {
      ranges: rawRanges
        .map((item) => {
          if (!Array.isArray(item)) {
            return null;
          }

          return { start: Number(item[0]), end: Number(item[1]) };
        })
        .filter((item): item is { start: number; end: number } => item !== null),
      rule: (raw.weekRule as WeekRuleWire) ?? 'ALL',
    }
    : derived;

  const firstWeek = weekPattern.ranges.length > 0 ? weekPattern.ranges[0].start : 1;
  const lastRange = weekPattern.ranges[weekPattern.ranges.length - 1];
  const lastWeek = lastRange ? lastRange.end : 1;

  return {
    id,
    name: String(raw.name ?? ''),
    startWeek: Number(raw.startWeek ?? firstWeek),
    endWeek: Number(raw.endWeek ?? lastWeek),
    dayOfWeek: Number(raw.day ?? raw.dayOfWeek ?? 1),
    startLesson: Number(raw.startSection ?? raw.startLesson ?? 1),
    endLesson: Number(raw.endSection ?? raw.endLesson ?? 1),
    location: String(raw.position ?? raw.location ?? ''),
    teacher: String(raw.teacher ?? ''),
    rawTime: String(raw.rawTime ?? ''),
    weekPattern,
    colorValue: raw.colorValue == null ? null : Number(raw.colorValue),
  };
}
