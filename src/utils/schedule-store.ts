/*
 * 课表的本地存储与冲突检测（P3-3）。
 *
 * 后端目前是无状态的（课程随导入响应返回，由客户端自行保存），
 * 因此 Web 侧沿用 App 的做法：课程存在 localStorage。
 *
 * 存储键带用户维度前缀，避免同一浏览器多账号互相覆盖。
 */

import type { ICourseType, IScheduleSettingsType } from '../types/schedule-types.ts';

import { DEFAULT_SCHEDULE_SETTINGS, courseMatchesWeek } from '../types/schedule-types.ts';

const COURSES_KEY_PREFIX = 'clark_aams_courses_v1:';
const SETTINGS_KEY_PREFIX = 'clark_aams_schedule_settings_v1:';

/** 课时冲突。 */
export interface IScheduleConflictType {
  /** 冲突的两门课。 */
  first: ICourseType;
  second: ICourseType;
  /** 冲突的周次（升序，取交集）。 */
  weeks: number[];
  /** 冲突的文字描述，可直接展示。 */
  description: string;
}

function coursesKey(ownerId: string): string {
  return `${COURSES_KEY_PREFIX}${ownerId}`;
}

function settingsKey(ownerId: string): string {
  return `${SETTINGS_KEY_PREFIX}${ownerId}`;
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as unknown;
  } catch {
    // 存储被禁用或内容损坏时，退化为「没有数据」而不是抛错
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 配额满或被禁用：静默失败，页面仍可用（只是刷新后丢失）
  }
}

/** 读取某用户的课程。 */
export function loadCourses(ownerId: string): ICourseType[] {
  const parsed = readJson(coursesKey(ownerId));

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is ICourseType => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const course = item as Partial<ICourseType>;

    return typeof course.name === 'string'
      && typeof course.dayOfWeek === 'number'
      && typeof course.startLesson === 'number'
      && typeof course.endLesson === 'number'
      && Boolean(course.weekPattern);
  });
}

/** 覆盖保存课程。 */
export function saveCourses(ownerId: string, courses: ICourseType[]): void {
  writeJson(coursesKey(ownerId), courses);
}

/** 读取课表设置（缺失时返回默认值）。 */
export function loadScheduleSettings(ownerId: string): IScheduleSettingsType {
  const parsed = readJson(settingsKey(ownerId));

  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_SCHEDULE_SETTINGS };
  }

  const settings = parsed as Partial<IScheduleSettingsType>;

  return {
    termStartDate: typeof settings.termStartDate === 'string'
      ? settings.termStartDate
      : DEFAULT_SCHEDULE_SETTINGS.termStartDate,
    maxWeeks: typeof settings.maxWeeks === 'number'
      ? settings.maxWeeks
      : DEFAULT_SCHEDULE_SETTINGS.maxWeeks,
    durationPerLesson: typeof settings.durationPerLesson === 'number'
      ? settings.durationPerLesson
      : DEFAULT_SCHEDULE_SETTINGS.durationPerLesson,
    startTimes: Array.isArray(settings.startTimes)
      ? settings.startTimes.filter((time): time is string => typeof time === 'string')
      : [...DEFAULT_SCHEDULE_SETTINGS.startTimes],
  };
}

/** 保存课表设置。 */
export function saveScheduleSettings(ownerId: string, settings: IScheduleSettingsType): void {
  writeJson(settingsKey(ownerId), settings);
}

/** 清空某用户的课表数据。 */
export function clearSchedule(ownerId: string): void {
  try {
    window.localStorage.removeItem(coursesKey(ownerId));
    window.localStorage.removeItem(settingsKey(ownerId));
  } catch {
    // 忽略
  }
}

/** 两门课是否在同一时间段（同一天且节次重叠）。 */
function overlapsInTime(a: ICourseType, b: ICourseType): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) {
    return false;
  }

  return a.startLesson <= b.endLesson && b.startLesson <= a.endLesson;
}

/**
 * 检测课表中的时间冲突。
 *
 * 只在**真正同时上课**时才报冲突：两门课同一天同一节，
 * 但周次完全不同（如单周与双周交替）不算冲突——
 * 这是单双周排课的常见场景，误报会非常扰人。
 */
export function detectConflicts(courses: ICourseType[], maxWeek = 30): IScheduleConflictType[] {
  const conflicts: IScheduleConflictType[] = [];

  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const first = courses[i];
      const second = courses[j];

      if (!overlapsInTime(first, second)) {
        continue;
      }

      const sharedWeeks: number[] = [];

      for (let week = 1; week <= maxWeek; week += 1) {
        if (courseMatchesWeek(first, week) && courseMatchesWeek(second, week)) {
          sharedWeeks.push(week);
        }
      }

      if (sharedWeeks.length === 0) {
        continue;
      }

      const sections = `${Math.max(first.startLesson, second.startLesson)}-${Math.min(first.endLesson, second.endLesson)}`;

      conflicts.push({
        first,
        second,
        weeks: sharedWeeks,
        description: `「${first.name}」与「${second.name}」在周${first.dayOfWeek}第${sections}节冲突（第${sharedWeeks.join('、')}周）`,
      });
    }
  }

  return conflicts;
}
