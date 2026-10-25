import type { ILessonTimeProfileType, ISchoolType } from '../types/app-types';

import { requestEnvelope } from './http';

export async function fetchSchools(): Promise<ISchoolType[]> {
  return requestEnvelope<ISchoolType[]>('/api/v1/schools', {
    includeAuth: false,
  });
}

export async function fetchAcademicImportSchools(): Promise<ISchoolType[]> {
  const schools = await fetchSchools();

  return schools.filter((school) => Boolean(school.capabilities?.academicImport));
}

export async function fetchSchoolById(schoolId: string): Promise<ISchoolType> {
  return requestEnvelope<ISchoolType>(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
    includeAuth: false,
  });
}

export async function fetchSchoolLessonTimes(schoolId: string): Promise<ILessonTimeProfileType> {
  return requestEnvelope<ILessonTimeProfileType>(`/api/v1/schools/${encodeURIComponent(schoolId)}/lesson-times`, {
    includeAuth: false,
  });
}

export async function fetchLessonTimeProfiles(): Promise<ILessonTimeProfileType[]> {
  return requestEnvelope<ILessonTimeProfileType[]>('/api/v1/schools/lesson-time-profiles', {
    includeAuth: false,
  });
}
