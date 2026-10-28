/* 把识别/导入/取件码得到的课程写进「我的课表」。 */

import { createCourse } from '../api/study';
import { normalizeCourse } from './schedule';
import type { IRawCourseType } from '../types';

export interface ISaveResultType {
  saved: number;
  skipped: number;
}

export async function saveCoursesToSchedule(rawCourses: IRawCourseType[]): Promise<ISaveResultType> {
  let saved = 0;
  let skipped = 0;

  for (const [index, raw] of rawCourses.entries()) {
    const course = normalizeCourse(raw, index);

    if (!course.name || course.name === '未命名课程') {
      skipped += 1;
      continue;
    }

    await createCourse({
      name: course.name,
      dayOfWeek: course.dayOfWeek,
      startLesson: course.startLesson,
      endLesson: course.endLesson,
      location: course.location,
      teacher: course.teacher,
      weekRanges: course.weekRanges,
      weekRule: course.weekRule,
    });

    saved += 1;
  }

  return { saved, skipped };
}
