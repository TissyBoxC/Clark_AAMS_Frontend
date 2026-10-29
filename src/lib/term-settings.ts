/*
 * 学期设置：第一周周一、每节课的上课时间。
 *
 * 存在本机（localStorage），不同步到账号里。
 * 理由：这些是"我这学期在哪个校区、几点上课"的本地事实，
 * 换设备时本来就该重新确认一次，强行同步反而会把旧设备的作息
 * 套到新设备上。
 *
 * 两者都有默认值，用户什么都不配也能正常用：
 *   - 起始日缺失时，课表从第 1 周开始显示
 *   - 作息缺失时用 DEFAULT_LESSON_TIMES
 */

import { DEFAULT_LESSON_TIMES } from './schedule';

const TERM_START_KEY = 'clarkAamsTermStart';
const LESSON_TIMES_KEY = 'clarkAamsLessonTimes';

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // 存不了就只在本次会话有效，不打断用户操作
  }
}

/** 第一周的周一，格式 yyyy-MM-dd。没设置过返回空串。 */
export function getTermStart(): string {
  const raw = readRaw(TERM_START_KEY);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

export function setTermStart(value: string): void {
  writeRaw(TERM_START_KEY, value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
}

/** 每节课的开始时间。没设置过返回默认作息。 */
export function getLessonTimes(): string[] {
  const raw = readRaw(LESSON_TIMES_KEY);
  if (!raw) {
    return [...DEFAULT_LESSON_TIMES];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v) => /^\d{2}:\d{2}$/.test(String(v)))) {
      return parsed.map((v) => String(v));
    }
  } catch {
    // 数据坏了就当没设置过
  }
  return [...DEFAULT_LESSON_TIMES];
}

export function setLessonTimes(times: string[]): void {
  const cleaned = times
    .map((t) => String(t).trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t));
  writeRaw(LESSON_TIMES_KEY, cleaned.length > 0 ? JSON.stringify(cleaned) : null);
}

/** 恢复成出厂的默认作息。 */
export function resetLessonTimes(): void {
  writeRaw(LESSON_TIMES_KEY, null);
}

/**
 * 今天的日期串 yyyy-MM-dd，用于和日期输入框比对。
 * 按本地时区算，不用 UTC——晚上 8 点在中国不该算成"明天"。
 */
export function todayIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
