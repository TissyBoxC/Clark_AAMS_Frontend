/*
 * 我的课表接口（P3-1）。
 *
 * 服务端成为课表的真相源后，Web 与 App 看到的是同一份数据，
 * 换设备不再丢课表。
 */

import { requestEnvelope } from './http';

/** 服务端返回的课程（周次同时给出展开结果与真相源）。 */
export interface IServerCourseType {
  name: string;
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location: string;
  teacher: string;
  rawTime: string;
  weeks: number[];
  weekRanges: [number, number][];
  weekRule: 'ALL' | 'ODD' | 'EVEN';
  startWeek: number;
  endWeek: number;
}

/** 写入课程的请求体（只提交真相源字段）。 */
export interface ICourseUpsertPayloadType {
  name: string;
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location?: string;
  teacher?: string;
  rawTime?: string;
  weeks?: number[];
  weekRanges?: [number, number][];
  weekRule?: 'ALL' | 'ODD' | 'EVEN';
}

/** 拉取我的课表。 */
export async function fetchMyCourses(): Promise<IServerCourseType[]> {
  return requestEnvelope<IServerCourseType[]>('/api/v1/courses/schedule');
}

/** 整体覆盖我的课表。 */
export async function replaceMyCourses(
  courses: ICourseUpsertPayloadType[],
): Promise<IServerCourseType[]> {
  return requestEnvelope<IServerCourseType[]>('/api/v1/courses/schedule', {
    method: 'PUT',
    body: courses,
  });
}

/** 新增一门课。 */
export async function createMyCourse(
  course: ICourseUpsertPayloadType,
): Promise<IServerCourseType> {
  return requestEnvelope<IServerCourseType>('/api/v1/courses/schedule', {
    method: 'POST',
    body: course,
  });
}

/** 修改一门课。 */
export async function updateMyCourse(
  courseId: number,
  course: ICourseUpsertPayloadType,
): Promise<IServerCourseType> {
  return requestEnvelope<IServerCourseType>(`/api/v1/courses/schedule/${courseId}`, {
    method: 'PUT',
    body: course,
  });
}

/** 删除一门课。 */
export async function deleteMyCourse(courseId: number): Promise<{ deleted: number }> {
  return requestEnvelope<{ deleted: number }>(`/api/v1/courses/schedule/${courseId}`, {
    method: 'DELETE',
  });
}

/** 清空我的课表。 */
export async function clearMyCourses(): Promise<{ removed: number }> {
  return requestEnvelope<{ removed: number }>('/api/v1/courses/schedule', {
    method: 'DELETE',
  });
}
