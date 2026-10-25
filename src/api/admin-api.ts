/*
 * 仅供后台使用的 API 工具。
 * 同时负责在前端友好结构与后端版本/脚手架载荷格式之间做映射。
 */

import type {
  IAdminAiConfigPayloadType,
  IAdminAiConfigType,
  IAdminAuthResultType,
  IAdminAppVersionConfigType,
  IAdminEmailConfigPayloadType,
  IAdminEmailConfigType,
  IAdminSetupStatusType,
  IAppVersionCheckRequestType,
  IAppVersionCheckResultType,
  ICourseType,
  ICoursePickupCreateResultType,
  ICoursePickupRecordType,
  IHealthStatusType,
  JsonValueType,
  ISchoolScaffoldPayloadType,
} from '../types/app-types';

import { requestEnvelope } from './http';

const ADMIN_SESSION_REQUEST_OPTIONS = {
  includeAuth: false,
} as const;

interface IBackendAppVersionSourceType {
  type: string;
  label: string;
  url: string;
  primary: boolean;
  description?: string;
}

interface IBackendAdminAppVersionConfigType {
  latestVersion: string;
  latestBuild: number;
  minimumSupportedVersion: string;
  minimumSupportedBuild: number;
  title: string;
  optionalUpdateMessage: string;
  requiredUpdateMessage: string;
  releasePageUrl: string;
  releaseNotes: string[];
  downloadSources: IBackendAppVersionSourceType[];
}

interface IBackendSchoolScaffoldPayloadType extends Omit<ISchoolScaffoldPayloadType, 'successUrlPatterns'> {
  successUrlPatterns: string[];
  version: number;
}

function normalizeReleaseNotes(value: string | string[]): string {
  return Array.isArray(value) ? value.join('\n') : value;
}

function toBackendReleaseNotes(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeVersionConfig(
  config: IBackendAdminAppVersionConfigType,
): IAdminAppVersionConfigType {
  return {
    ...config,
    releaseNotes: normalizeReleaseNotes(config.releaseNotes),
    downloadSources: Array.isArray(config.downloadSources) ? config.downloadSources : [],
  };
}

function toBackendVersionConfig(
  config: IAdminAppVersionConfigType,
): IBackendAdminAppVersionConfigType {
  return {
    ...config,
    releaseNotes: toBackendReleaseNotes(config.releaseNotes),
    downloadSources: config.downloadSources,
  };
}

function toBackendVersionConfigPatch(
  config: Partial<IAdminAppVersionConfigType>,
): Partial<IBackendAdminAppVersionConfigType> {
  const { releaseNotes, ...restConfig } = config;
  const patch: Partial<IBackendAdminAppVersionConfigType> = {
    ...restConfig,
  };

  if (releaseNotes !== undefined) {
    patch.releaseNotes = toBackendReleaseNotes(releaseNotes);
  }

  return patch;
}

function toBackendSchoolScaffoldPayload(
  payload: ISchoolScaffoldPayloadType,
): IBackendSchoolScaffoldPayloadType {
  // 后端要求把换行或逗号分隔的 URL 模式转换为数组。
  return {
    ...payload,
    version: payload.version ?? 1,
    successUrlPatterns: payload.successUrlPatterns
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export async function fetchAdminSetupStatus(): Promise<IAdminSetupStatusType> {
  return requestEnvelope<IAdminSetupStatusType>('/api/v1/admin/auth/setup', {
    includeAuth: false,
  });
}

export async function adminLogin(username: string, password: string): Promise<IAdminAuthResultType> {
  return requestEnvelope<IAdminAuthResultType>('/api/v1/admin/auth/login', {
    method: 'POST',
    includeAuth: false,
    body: {
      username,
      password,
    },
  });
}

export async function adminRegister(username: string, password: string): Promise<IAdminAuthResultType> {
  return requestEnvelope<IAdminAuthResultType>('/api/v1/admin/auth/register', {
    method: 'POST',
    includeAuth: false,
    body: {
      username,
      password,
    },
  });
}

export async function adminLogout(): Promise<IAdminAuthResultType> {
  return requestEnvelope<IAdminAuthResultType>('/api/v1/admin/auth/logout', {
    method: 'POST',
    includeAuth: false,
    body: {},
  });
}

export async function fetchHealthStatus(): Promise<IHealthStatusType> {
  return requestEnvelope<IHealthStatusType>('/api/v1/health', {
    includeAuth: false,
  });
}

export async function fetchAdminAiConfig(): Promise<IAdminAiConfigType> {
  return requestEnvelope<IAdminAiConfigType>('/api/v1/admin/ai/config', {
    includeAuth: false,
  });
}

export async function updateAdminAiConfig(
  payload: IAdminAiConfigPayloadType,
): Promise<IAdminAiConfigType> {
  return requestEnvelope<IAdminAiConfigType>('/api/v1/admin/ai/config', {
    method: 'PUT',
    includeAuth: false,
    body: payload,
  });
}

export async function recognizeCourses(files: File[]): Promise<ICourseType[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  // P2-2：后端已统一为 {code,message,data} 信封，data 为课程数组。
  return requestEnvelope<ICourseType[]>('/api/v1/courses/recognize', {
    method: 'POST',
    includeAuth: false,
    body: formData,
  });
}

export async function fetchAdminEmailConfig(): Promise<IAdminEmailConfigType> {
  return requestEnvelope<IAdminEmailConfigType>('/api/v1/admin/email/config', {
    includeAuth: false,
  });
}

export async function updateAdminEmailConfig(
  payload: IAdminEmailConfigPayloadType,
): Promise<IAdminEmailConfigType> {
  return requestEnvelope<IAdminEmailConfigType>('/api/v1/admin/email/config', {
    method: 'PUT',
    includeAuth: false,
    body: payload,
  });
}

export async function fetchAdminVersionConfig(): Promise<IAdminAppVersionConfigType> {
  const config = await requestEnvelope<IBackendAdminAppVersionConfigType>('/api/v1/admin/app-version/config', {
    ...ADMIN_SESSION_REQUEST_OPTIONS,
  });

  return normalizeVersionConfig(config);
}

export async function updateAdminVersionConfig(
  payload: IAdminAppVersionConfigType,
): Promise<IAdminAppVersionConfigType> {
  const config = await requestEnvelope<IBackendAdminAppVersionConfigType>('/api/v1/admin/app-version/config', {
    method: 'PUT',
    ...ADMIN_SESSION_REQUEST_OPTIONS,
    body: toBackendVersionConfig(payload),
  });

  return normalizeVersionConfig(config);
}

export async function patchAdminVersionConfig(
  payload: Partial<IAdminAppVersionConfigType>,
): Promise<IAdminAppVersionConfigType> {
  const config = await requestEnvelope<IBackendAdminAppVersionConfigType>('/api/v1/admin/app-version/config', {
    method: 'PATCH',
    ...ADMIN_SESSION_REQUEST_OPTIONS,
    body: toBackendVersionConfigPatch(payload),
  });

  return normalizeVersionConfig(config);
}

export async function checkAppVersion(
  payload: IAppVersionCheckRequestType,
): Promise<IAppVersionCheckResultType> {
  return requestEnvelope<IAppVersionCheckResultType>('/api/v1/app/version/check', {
    method: 'POST',
    includeAuth: false,
    body: payload,
  });
}

export async function createSchoolScaffold(
  payload: ISchoolScaffoldPayloadType,
): Promise<JsonValueType> {
  return requestEnvelope<JsonValueType>('/api/v1/admin/school-scaffold', {
    method: 'POST',
    includeAuth: false,
    body: toBackendSchoolScaffoldPayload(payload),
  });
}

export async function fetchAdminCoursePickups(): Promise<ICoursePickupRecordType[]> {
  return requestEnvelope<ICoursePickupRecordType[]>('/api/v1/admin/course-pickups', {
    includeAuth: false,
  });
}

export async function fetchAdminCoursePickupDetail(
  code: string,
): Promise<ICoursePickupRecordType> {
  return requestEnvelope<ICoursePickupRecordType>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}`,
    {
      includeAuth: false,
    },
  );
}

export async function createAdminCoursePickup(jsonText: string): Promise<ICoursePickupCreateResultType> {
  return requestEnvelope<ICoursePickupCreateResultType>('/api/v1/admin/course-pickups', {
    method: 'POST',
    includeAuth: false,
    body: {
      jsonText,
    },
  });
}

export async function updateAdminCoursePickup(code: string, jsonText: string): Promise<void> {
  await requestEnvelope<Record<string, never>>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}`,
    {
      method: 'PUT',
      includeAuth: false,
      body: {
        jsonText,
      },
    },
  );
}

export async function deleteAdminCoursePickup(code: string): Promise<void> {
  await requestEnvelope<Record<string, never>>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}`,
    {
      method: 'DELETE',
      includeAuth: false,
    },
  );
}

export async function deleteAdminCoursePickupImage(
  code: string,
  fileName: string,
): Promise<void> {
  await requestEnvelope<Record<string, never>>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}/images/${encodeURIComponent(fileName)}`,
    {
      method: 'DELETE',
      includeAuth: false,
    },
  );
}
