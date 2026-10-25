/*
 * 课表周次与时间算法的 Web 侧实现。
 *
 * 与 App 的 `lib/models/course.dart`（WeekPattern）以及
 * `lib/services/schedule_utils.dart` 保持**逐字等价**。
 * 两侧都用 `shared/schedule-fixtures.json` 验证，
 * 任何一端改了算法而没同步另一端，测试会立刻失败。
 */

/** 周次上限。超过这个值的周次在任何环节都不应出现。 */
export const MAX_WEEK = 30;

/** 单双周规则，线上格式与后端 Java 枚举一致（大写）。 */
export type WeekRuleWire = 'ALL' | 'ODD' | 'EVEN';

/** 连续周次区间，闭区间语义。 */
export interface IWeekRangeType {
  start: number;
  end: number;
}

export interface IWeekPatternType {
  ranges: IWeekRangeType[];
  rule: WeekRuleWire;
}

export const EMPTY_WEEK_PATTERN: IWeekPatternType = { ranges: [], rule: 'ALL' };

export function weekRuleFromWire(value: unknown): WeekRuleWire {
  if (value === 'ODD') {
    return 'ODD';
  }
  if (value === 'EVEN') {
    return 'EVEN';
  }
  return 'ALL';
}

/**
 * 展开为升序离散周次。
 *
 * 越界周次在这里统一裁掉：`fromWeeks` 会在入口过滤，
 * 但后端可能直接返回 `[25,40]` 这样的区间，必须有防线。
 */
export function expandWeeks(pattern: IWeekPatternType): number[] {
  const result = new Set<number>();

  pattern.ranges.forEach((range) => {
    const from = Math.max(1, range.start);
    const to = Math.min(MAX_WEEK, range.end);

    for (let week = from; week <= to; week += 1) {
      if (pattern.rule === 'ODD' && week % 2 === 0) {
        continue;
      }
      if (pattern.rule === 'EVEN' && week % 2 !== 0) {
        continue;
      }
      result.add(week);
    }
  });

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * 从离散周次反推区间与规则。
 *
 * 判定出单/双周后，区间按步长 2 合并：`[1,3,5,7]` => `[1,7] + ODD`，
 * 展示为「1-7周(单)」。展开时按 rule 过滤，语义等价。
 */
export function weekPatternFromWeeks(weeks: number[]): IWeekPatternType {
  const sorted = Array.from(
    new Set(weeks.filter((week) => Number.isInteger(week) && week >= 1 && week <= MAX_WEEK)),
  ).sort((a, b) => a - b);

  if (sorted.length === 0) {
    return { ranges: [], rule: 'ALL' };
  }

  let rule: WeekRuleWire = 'ALL';
  if (sorted.length > 1) {
    if (sorted.every((week) => week % 2 === 1)) {
      rule = 'ODD';
    } else if (sorted.every((week) => week % 2 === 0)) {
      rule = 'EVEN';
    }
  }

  const step = rule === 'ALL' ? 1 : 2;
  const ranges: IWeekRangeType[] = [];
  let start = sorted[0];
  let prev = start;

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];

    if (current === prev + step) {
      prev = current;
    } else {
      ranges.push({ start, end: prev });
      start = current;
      prev = current;
    }
  }

  ranges.push({ start, end: prev });
  return { ranges, rule };
}

/** 展示文本，例如 `1-3,5-16周(单)`。与 App 的 `WeekPattern.text` 一致。 */
export function weekPatternText(pattern: IWeekPatternType): string {
  if (pattern.ranges.length === 0) {
    return '';
  }

  const body = pattern.ranges
    .map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`))
    .join(',');

  let suffix = '';
  if (pattern.rule === 'ODD') {
    suffix = '(单)';
  } else if (pattern.rule === 'EVEN') {
    suffix = '(双)';
  }

  return `${body}周${suffix}`;
}

/** 该课程是否在指定周上课。 */
export function isActiveInWeek(pattern: IWeekPatternType, week: number): boolean {
  return expandWeeks(pattern).includes(week);
}

/**
 * 计算结束时间。
 *
 * 全角冒号先归一化：用户手输与部分导入源会给 `08：00`。
 */
export function endTime(startTime: string, durationMinutes: number): string {
  const normalized = startTime.replace(/：/g, ':').trim();
  const parts = normalized.split(':');

  if (parts.length < 2) {
    return startTime;
  }

  const parsedHour = Number.parseInt(parts[0], 10);
  const parsedMinute = Number.parseInt(parts[1], 10);

  if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) {
    return startTime;
  }

  let minute = parsedMinute + durationMinutes;
  const hour = (parsedHour + Math.floor(minute / 60)) % 24;
  minute %= 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 作息时间表是否合法。 */
export function isTimeListValid(times: string[]): boolean {
  if (times.length === 0) {
    return false;
  }

  return times.every((time) => {
    const parts = time.replace(/：/g, ':').split(':');

    if (parts.length !== 2) {
      return false;
    }

    const hour = Number.parseInt(parts[0], 10);
    const minute = Number.parseInt(parts[1], 10);

    if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
      return false;
    }
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return false;
    }
    if (hour < 0 || hour > 24 || minute < 0 || minute > 59) {
      return false;
    }
    if (hour === 24 && minute !== 0) {
      return false;
    }

    return true;
  });
}

/** 把 `YYYY-MM-DD` 解析为当地零点，避免时区把日期偏移一天。 */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 计算当前是第几周。
 *
 * 与 App `ScheduleUtils.currentWeek` 逐字等价：
 * 以学期起始日为第 1 周起点，按 7 天一刀，并夹紧到 [1, maxWeeks]。
 */
export function currentWeek(
  termStartDate: string,
  today: Date,
  maxWeeks: number,
): number {
  if (!termStartDate) {
    return 1;
  }

  const monday = startOfDay(parseLocalDate(termStartDate));
  const diffDays = Math.floor(
    (startOfDay(today).getTime() - monday.getTime()) / (24 * 60 * 60 * 1000),
  );
  const week = Math.floor(diffDays / 7) + 1;

  return Math.min(Math.max(week, 1), maxWeeks);
}

/** 第 week 周的周一。 */
export function weekMonday(termStartDate: string, week: number): Date {
  const start = startOfDay(parseLocalDate(termStartDate));
  return new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
}

/** 课程表需要的行数，范围 [13, 30]。 */
export function lessonCount(startTimesLength: number, maxEndLesson: number): number {
  const count = Math.max(startTimesLength, maxEndLesson);
  return Math.min(Math.max(count, 13), MAX_WEEK);
}
