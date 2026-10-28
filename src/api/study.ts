/* 我的课表、学校导入、取件码、题目解析 */

import type {
  ICourseDraftType,
  ICourseType,
  IImportResultType,
  IImportSessionType,
  ILessonTimeProfileType,
  IPickupRecordType,
  IQuestionResultType,
  IRawCourseType,
  IRecognitionResultType,
  ISchoolType,
} from '../types';
import { requestEnvelope, uploadWithProgress } from '../lib/http';

/* ---------- 学校 ---------- */

export async function fetchSchools(): Promise<ISchoolType[]> {
  return requestEnvelope<ISchoolType[]>('/api/v1/schools', { withAuth: false });
}

export async function fetchImportableSchools(): Promise<ISchoolType[]> {
  const schools = await fetchSchools();
  return schools.filter((school) => school.capabilities?.academicImport !== false);
}

export async function fetchSchool(schoolId: string): Promise<ISchoolType> {
  return requestEnvelope<ISchoolType>(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
    withAuth: false,
  });
}

export async function fetchLessonTimes(schoolId: string): Promise<ILessonTimeProfileType> {
  return requestEnvelope<ILessonTimeProfileType>(
    `/api/v1/schools/${encodeURIComponent(schoolId)}/lesson-times`,
    { withAuth: false },
  );
}

/* ---------- 我的课表 ---------- */

export async function fetchMyCourses(): Promise<ICourseType[]> {
  return requestEnvelope<ICourseType[]>('/api/v1/courses/schedule');
}

export async function createCourse(draft: ICourseDraftType): Promise<ICourseType> {
  return requestEnvelope<ICourseType>('/api/v1/courses/schedule', {
    method: 'POST',
    body: draft,
  });
}

export async function updateCourse(courseId: number, draft: ICourseDraftType): Promise<ICourseType> {
  return requestEnvelope<ICourseType>(`/api/v1/courses/schedule/${courseId}`, {
    method: 'PUT',
    body: draft,
  });
}

export async function deleteCourse(courseId: number): Promise<void> {
  await requestEnvelope<{ deleted: number }>(`/api/v1/courses/schedule/${courseId}`, {
    method: 'DELETE',
  });
}

export async function clearCourses(): Promise<{ removed: number }> {
  return requestEnvelope<{ removed: number }>('/api/v1/courses/schedule', {
    method: 'DELETE',
  });
}

/* ---------- 识别与取件码 ---------- */

export async function recognizeCourseImages(
  files: File[],
  onProgress: (value: number) => void,
): Promise<IRecognitionResultType> {
  return uploadWithProgress<IRecognitionResultType>(
    '/api/v1/course-pickups',
    files,
    'images',
    onProgress,
  );
}

export async function fetchPickup(code: string): Promise<IRawCourseType[]> {
  return requestEnvelope<IRawCourseType[]>(`/api/v1/course-pickups/${encodeURIComponent(code.trim())}`, {
    withAuth: false,
  });
}

/* ---------- 教务导入 ---------- */

export async function importFromSchool(
  schoolId: string,
  session: IImportSessionType,
): Promise<IImportResultType> {
  return requestEnvelope<IImportResultType>(
    `/api/v1/imports/${encodeURIComponent(schoolId)}/courses/pickup`,
    { method: 'POST', body: { loginSession: session } },
  );
}

export async function importFromHtml(
  school: string,
  html: string,
): Promise<IImportResultType> {
  return requestEnvelope<IImportResultType>('/api/v1/imports/courses/html', {
    method: 'POST',
    body: { school, html },
  });
}

/* ---------- 题目解析 ---------- */

export async function analyzeChoiceQuestion(
  questionType: string,
  content: string,
  options: string[],
): Promise<IQuestionResultType> {
  return requestEnvelope<IQuestionResultType>('/api/v1/questions/analyze', {
    method: 'POST',
    body: { question_type: questionType, question_content: content, options },
  });
}

export async function analyzeOpenQuestion(payload: {
  questionType: string;
  content: string;
  material?: string;
  referenceAnswer?: string;
  studentAnswer?: string;
}): Promise<IQuestionResultType> {
  return requestEnvelope<IQuestionResultType>('/api/v1/questions/analyze/fill-blank', {
    method: 'POST',
    body: {
      question_type: payload.questionType,
      question_content: payload.content,
      material: payload.material,
      reference_answer: payload.referenceAnswer,
      student_answer: payload.studentAnswer,
    },
  });
}

export type { IPickupRecordType };
