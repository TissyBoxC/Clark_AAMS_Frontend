/*
 * 题目解析请求体的契约测试（P3-4）。
 *
 * 三端共用同一套字段名（下划线命名）。这里断言 Web 送出的
 * 请求体形状与 App `ClarkBackendApi` 完全一致，
 * 避免出现 Web 发 camelCase、App 发 snake_case 这种分裂。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  IFillBlankAnalyzePayloadType,
  IQuestionAnalyzePayloadType,
} from '../api/question-api.ts';

/** 与 App analyzeQuestion 构造的请求体一致。 */
function buildChoicePayload(
  questionType: string,
  content: string,
  options: string[],
): IQuestionAnalyzePayloadType {
  return {
    question_type: questionType,
    question_content: content,
    options,
  };
}

/** 与 App analyzeFillBlankQuestion 一致：空字符串不发送该字段。 */
function buildFillBlankPayload(
  questionType: string,
  content: string,
  extra: { material?: string; referenceAnswer?: string; studentAnswer?: string },
): IFillBlankAnalyzePayloadType {
  const payload: IFillBlankAnalyzePayloadType = {
    question_type: questionType,
    question_content: content,
  };

  if (extra.material && extra.material.trim()) {
    payload.material = extra.material.trim();
  }
  if (extra.referenceAnswer && extra.referenceAnswer.trim()) {
    payload.reference_answer = extra.referenceAnswer.trim();
  }
  if (extra.studentAnswer && extra.studentAnswer.trim()) {
    payload.student_answer = extra.studentAnswer.trim();
  }

  return payload;
}

test('选择题请求体使用下划线字段名', () => {
  const payload = buildChoicePayload('单选题', '题干', ['选项一', '选项二']);

  assert.deepEqual(Object.keys(payload).sort(), ['options', 'question_content', 'question_type']);
  assert.equal(payload.question_type, '单选题');
  assert.equal(payload.question_content, '题干');
  assert.deepEqual(payload.options, ['选项一', '选项二']);
});

test('填空题请求体省略空的可选字段', () => {
  const payload = buildFillBlankPayload('填空题', '题干', {
    material: '',
    referenceAnswer: '',
    studentAnswer: '',
  });

  assert.deepEqual(Object.keys(payload).sort(), ['question_content', 'question_type']);
});

test('填空题可选字段有值时按下划线命名发送', () => {
  const payload = buildFillBlankPayload('简答题', '题干', {
    material: '一段材料',
    referenceAnswer: '参考答案',
    studentAnswer: '我的答案',
  });

  assert.equal(payload.material, '一段材料');
  assert.equal(payload.reference_answer, '参考答案');
  assert.equal(payload.student_answer, '我的答案');
});

test('可选字段首尾空白被裁掉，纯空白视为未填', () => {
  const payload = buildFillBlankPayload('简答题', '题干', {
    material: '  有内容  ',
    referenceAnswer: '   ',
  });

  assert.equal(payload.material, '有内容');
  assert.equal(payload.reference_answer, undefined);
});
