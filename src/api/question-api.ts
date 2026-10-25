/*
 * 题目解析接口（P3-4）。
 *
 * 与 App `ClarkBackendApi.analyzeQuestion` / `analyzeFillBlankQuestion`
 * 共用同一套请求体字段（下划线命名），三端一致。
 */

import { requestEnvelope } from './http';

/** 选择题解析请求。 */
export interface IQuestionAnalyzePayloadType {
  question_type: string;
  question_content: string;
  options: string[];
}

/** 填空/主观题解析请求。 */
export interface IFillBlankAnalyzePayloadType {
  question_type: string;
  question_content: string;
  material?: string;
  reference_answer?: string;
  student_answer?: string;
}

/** 解析结果（后端返回结构较自由，按常用字段取值）。 */
export interface IQuestionAnalysisResultType {
  answer?: string;
  analysis?: string;
  [key: string]: unknown;
}

/** 解析选择题。 */
export async function analyzeQuestion(
  payload: IQuestionAnalyzePayloadType,
): Promise<IQuestionAnalysisResultType> {
  return requestEnvelope<IQuestionAnalysisResultType>('/api/v1/questions/analyze', {
    method: 'POST',
    body: payload,
  });
}

/** 解析填空/主观题。 */
export async function analyzeFillBlankQuestion(
  payload: IFillBlankAnalyzePayloadType,
): Promise<IQuestionAnalysisResultType> {
  return requestEnvelope<IQuestionAnalysisResultType>('/api/v1/questions/analyze/fill-blank', {
    method: 'POST',
    body: payload,
  });
}
