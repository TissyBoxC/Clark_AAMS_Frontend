/* 后台管理接口。后台会话依赖同源 Cookie，登录后浏览器会自动带上。 */

import type {
  IAiConfigType,
  IEmailConfigType,
  IPickupRecordType,
  IQuotaDashboardType,
  ISchoolScaffoldDraftType,
  ISetupStatusType,
  IVersionConfigType,
} from '../types';
import { requestEnvelope } from '../lib/http';

interface IBackendVersionConfigType extends Omit<IVersionConfigType, 'releaseNotes'> {
  releaseNotes: string[];
}

interface IBackendScaffoldType extends Omit<ISchoolScaffoldDraftType, 'successUrlPatterns'> {
  successUrlPatterns: string[];
  version: number;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/* ---------- 登录与初始化 ---------- */

export async function fetchSetupStatus(): Promise<ISetupStatusType> {
  return requestEnvelope<ISetupStatusType>('/api/v1/admin/auth/setup', { withAuth: false });
}

export async function adminLogin(username: string, password: string): Promise<void> {
  await requestEnvelope<{ authenticated: boolean }>('/api/v1/admin/auth/login', {
    method: 'POST',
    withAuth: false,
    body: { username: username.trim(), password },
  });
}

export async function adminRegister(username: string, password: string): Promise<void> {
  await requestEnvelope<{ authenticated: boolean }>('/api/v1/admin/auth/register', {
    method: 'POST',
    withAuth: false,
    body: { username: username.trim(), password },
  });
}

export async function adminLogout(): Promise<void> {
  await requestEnvelope<{ authenticated: boolean }>('/api/v1/admin/auth/logout', {
    method: 'POST',
    withAuth: false,
    body: {},
  });
}

/* ---------- AI ---------- */

export async function fetchAiConfig(): Promise<IAiConfigType> {
  return requestEnvelope<IAiConfigType>('/api/v1/admin/ai/config', { withAuth: false });
}

export async function saveAiConfig(payload: {
  baseUrl: string;
  model: string;
  apiKey?: string;
  clearApiKey: boolean;
}): Promise<IAiConfigType> {
  return requestEnvelope<IAiConfigType>('/api/v1/admin/ai/config', {
    method: 'PUT',
    withAuth: false,
    body: payload,
  });
}

/* ---------- 邮件 ---------- */

export async function fetchEmailConfig(): Promise<IEmailConfigType> {
  return requestEnvelope<IEmailConfigType>('/api/v1/admin/email/config', { withAuth: false });
}

export async function saveEmailConfig(
  payload: Omit<IEmailConfigType, 'apiKeyConfigured'> & { apiKey?: string; clearApiKey: boolean },
): Promise<IEmailConfigType> {
  return requestEnvelope<IEmailConfigType>('/api/v1/admin/email/config', {
    method: 'PUT',
    withAuth: false,
    body: payload,
  });
}

/* ---------- 版本 ---------- */

export async function fetchVersionConfig(): Promise<IVersionConfigType> {
  const config = await requestEnvelope<IBackendVersionConfigType>(
    '/api/v1/admin/app-version/config',
    { withAuth: false },
  );

  return {
    ...config,
    releaseNotes: Array.isArray(config.releaseNotes) ? config.releaseNotes.join('\n') : '',
    downloadSources: Array.isArray(config.downloadSources) ? config.downloadSources : [],
  };
}

export async function saveVersionConfig(config: IVersionConfigType): Promise<IVersionConfigType> {
  const saved = await requestEnvelope<IBackendVersionConfigType>(
    '/api/v1/admin/app-version/config',
    {
      method: 'PUT',
      withAuth: false,
      body: {
        ...config,
        releaseNotes: splitLines(config.releaseNotes),
      },
    },
  );

  return {
    ...saved,
    releaseNotes: Array.isArray(saved.releaseNotes) ? saved.releaseNotes.join('\n') : '',
    downloadSources: Array.isArray(saved.downloadSources) ? saved.downloadSources : [],
  };
}

/* ---------- 学校接入 ---------- */

export async function createSchoolScaffold(draft: ISchoolScaffoldDraftType): Promise<unknown> {
  const payload: IBackendScaffoldType = {
    ...draft,
    version: 1,
    successUrlPatterns: draft.successUrlPatterns
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  };

  return requestEnvelope<unknown>('/api/v1/admin/school-scaffold', {
    method: 'POST',
    withAuth: false,
    body: payload,
  });
}

/* ---------- 取件码 ---------- */

export async function fetchPickupRecords(): Promise<IPickupRecordType[]> {
  return requestEnvelope<IPickupRecordType[]>('/api/v1/admin/course-pickups', { withAuth: false });
}

export async function fetchPickupRecord(code: string): Promise<IPickupRecordType> {
  return requestEnvelope<IPickupRecordType>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}`,
    { withAuth: false },
  );
}

export async function createPickupRecord(jsonText: string): Promise<IPickupRecordType> {
  return requestEnvelope<IPickupRecordType>('/api/v1/admin/course-pickups', {
    method: 'POST',
    withAuth: false,
    body: { jsonText },
  });
}

export async function updatePickupRecord(code: string, jsonText: string): Promise<void> {
  await requestEnvelope<Record<string, never>>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}`,
    { method: 'PUT', withAuth: false, body: { jsonText } },
  );
}

export async function deletePickupRecord(code: string): Promise<void> {
  await requestEnvelope<Record<string, never>>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}`,
    { method: 'DELETE', withAuth: false },
  );
}

export async function deletePickupImage(code: string, fileName: string): Promise<void> {
  await requestEnvelope<Record<string, never>>(
    `/api/v1/admin/course-pickups/${encodeURIComponent(code)}/images/${encodeURIComponent(fileName)}`,
    { method: 'DELETE', withAuth: false },
  );
}

/* ---------- 配额 ---------- */

export async function fetchQuotaDashboard(): Promise<IQuotaDashboardType> {
  return requestEnvelope<IQuotaDashboardType>('/api/v1/admin/quota', { withAuth: false });
}

/* ---------- 展示用名称 ---------- */

/** 把内部的用量范围换成学生看得懂的说法。未知的范围统一归到「其它用途」。 */
export function scopeLabel(scope: string): string {
  if (scope === 'recognize') {
    return '课表识别';
  }
  if (scope === 'pickup') {
    return '取件码生成';
  }
  if (scope === 'analyze') {
    return '题目解析';
  }
  return '其它用途';
}
