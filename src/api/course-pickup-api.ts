/*
 * 课程导入与课表识别相关的 API 工具。
 * 上传流程仍使用 XMLHttpRequest，因为大图上传时界面需要实时进度事件。
 */

import type {
  ICourseImportHtmlPayloadType,
  ICourseImportHtmlResultType,
  ICourseImportResultType,
  ICourseImportSessionType,
  ICourseRecognitionResultType,
  JsonValueType,
} from '../types/app-types';

import { getStoredLoginCode } from '../utils/auth-storage';

import { buildApiUrl, HttpError, requestEnvelope, requestJson } from './http';

interface IXhrEnvelopeType<T> {
  code?: number;
  message?: string;
  data?: T;
}

export async function parseCourseHtmlImport(
  payload: ICourseImportHtmlPayloadType,
): Promise<ICourseImportHtmlResultType> {
  return requestEnvelope<ICourseImportHtmlResultType>('/api/v1/imports/courses/html', {
    method: 'POST',
    includeAuth: false,
    body: payload,
  });
}

export async function parseSchoolCourseImport(
  schoolId: string,
  loginSession: ICourseImportSessionType,
): Promise<ICourseImportResultType> {
  return requestEnvelope<ICourseImportResultType>(
    `/api/v1/imports/${encodeURIComponent(schoolId)}/courses/pickup`,
    {
      method: 'POST',
      includeAuth: false,
      body: {
        loginSession,
      },
    },
  );
}

export async function fetchCoursePickupJson(code: string): Promise<JsonValueType> {
  return requestJson<JsonValueType>(`/api/v1/course-pickups/${encodeURIComponent(code)}`);
}

export async function uploadCourseImages(
  files: File[],
  onProgress: (value: number) => void,
): Promise<ICourseRecognitionResultType> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    const loginCode = getStoredLoginCode();

    files.forEach((file) => {
      formData.append('images', file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl('/api/v1/course-pickups'));
    xhr.withCredentials = true;
    xhr.timeout = 180000;

    if (loginCode) {
      xhr.setRequestHeader('X-Clark-Aams-Login-Code', loginCode);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return;
      }

      // 进度条前半段表示网络上传，后半段预留给后端 OCR 识别完成阶段。
      const percent = Math.round((event.loaded / event.total) * 52);
      onProgress(Math.max(10, percent));
    });

    xhr.addEventListener('load', () => {
      try {
        const payload = JSON.parse(xhr.responseText || '{}') as IXhrEnvelopeType<ICourseRecognitionResultType>;

        if (xhr.status < 200 || xhr.status >= 300 || payload.code !== 0 || !payload.data) {
          reject(new HttpError(payload.message || `HTTP ${xhr.status}`, xhr.status, payload));
          return;
        }

        onProgress(90);
        resolve(payload.data);
      } catch {
        reject(new HttpError(xhr.responseText || `HTTP ${xhr.status}`, xhr.status, xhr.responseText));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('网络请求失败'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('识别请求超时'));
    });

    xhr.send(formData);
  });
}
