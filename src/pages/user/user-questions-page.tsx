import { useState, type FormEvent } from 'react';

import {
  analyzeFillBlankQuestion,
  analyzeQuestion,
  type IQuestionAnalysisResultType,
} from '../../api/question-api';
import { HttpError } from '../../api/http';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';

/** 题型选项，与 App 的题型文本保持一致。 */
const QUESTION_TYPES = ['单选题', '多选题', '判断题', '填空题', '简答题'] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

/** 判断是否走填空/主观题接口（与 App `_shouldSplitTextAnswer` 同样的判断口径）。 */
function usesFillBlankEndpoint(type: QuestionType): boolean {
  return type === '填空题' || type === '简答题';
}

function UserQuestionsPage() {
  const { user, isReady } = useRequiredVerifiedUser();

  const [questionType, setQuestionType] = useState<QuestionType>('单选题');
  const [content, setContent] = useState<string>('');
  const [optionsText, setOptionsText] = useState<string>('');
  const [material, setMaterial] = useState<string>('');
  const [referenceAnswer, setReferenceAnswer] = useState<string>('');
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [result, setResult] = useState<IQuestionAnalysisResultType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Hook 必须在任何提前 return 之前调用，否则违背 hooks 规则
  usePageMeta('题目解析', '粘贴题目，调用 AI 给出答案与解析。');

  if (!isReady) {
    return <LoadingView description='正在确认邮箱验证状态。' />;
  }

  if (!user) {
    return <LoadingView description='正在读取用户信息。' />;
  }

  const isFillBlank = usesFillBlankEndpoint(questionType);
  const isChoice = questionType === '单选题' || questionType === '多选题';

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatusMessage('');

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setStatusMessage('请填写题目内容。');
      return;
    }

    const options = optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (isChoice && options.length < 2) {
      setStatusMessage('选择题至少需要两个选项，每行一个。');
      return;
    }

    setIsSubmitting(true);

    try {
      const next = isFillBlank
        ? await analyzeFillBlankQuestion({
          question_type: questionType,
          question_content: trimmedContent,
          material: material.trim() || undefined,
          reference_answer: referenceAnswer.trim() || undefined,
          student_answer: studentAnswer.trim() || undefined,
        })
        : await analyzeQuestion({
          question_type: questionType,
          question_content: trimmedContent,
          options,
        });

      setResult(next);
    } catch (error) {
      // 用统一的错误分类决定提示措辞（P2-3）
      if (error instanceof HttpError) {
        if (error.kind === 'quota') {
          setStatusMessage('今日解析额度已用完，请明天再试。');
        } else if (error.kind === 'rateLimit') {
          setStatusMessage('操作过于频繁，请稍后再试。');
        } else if (error.kind === 'auth') {
          setStatusMessage('登录状态已过期，请重新登录。');
        } else {
          setStatusMessage(error.message || '解析失败，请稍后重试。');
        }
      } else {
        setStatusMessage(error instanceof Error ? error.message : '解析失败，请稍后重试。');
      }

      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <UserWorkspaceShell
      user={user}
      title='题目解析'
      description='粘贴题目内容，AI 会给出参考答案与解析。'
    >
      <div className='schedule-page'>
        <section className='surface-card schedule-panel'>
          <div className='schedule-panel-head'>
            <h2>题目输入</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className='schedule-form-grid'>
              <label>
                题型
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className='question-field'>
              题目内容
              <textarea
                rows={5}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder='粘贴题干，例如：下列关于函数的说法正确的是……'
              />
            </label>

            {isChoice ? (
              <label className='question-field'>
                选项（每行一个，不需要写 A. B. 前缀）
                <textarea
                  rows={4}
                  value={optionsText}
                  onChange={(event) => setOptionsText(event.target.value)}
                  placeholder={'选项一\n选项二\n选项三\n选项四'}
                />
              </label>
            ) : null}

            {isFillBlank ? (
              <>
                <label className='question-field'>
                  材料（可选）
                  <textarea
                    rows={3}
                    value={material}
                    onChange={(event) => setMaterial(event.target.value)}
                  />
                </label>
                <div className='schedule-form-grid'>
                  <label>
                    参考答案（可选）
                    <input
                      type='text'
                      value={referenceAnswer}
                      onChange={(event) => setReferenceAnswer(event.target.value)}
                    />
                  </label>
                  <label>
                    我的答案（可选）
                    <input
                      type='text'
                      value={studentAnswer}
                      onChange={(event) => setStudentAnswer(event.target.value)}
                    />
                  </label>
                </div>
              </>
            ) : null}

            <div className='button-row'>
              <button type='submit' className='button-primary' disabled={isSubmitting}>
                {isSubmitting ? '解析中…' : '开始解析'}
              </button>
            </div>
          </form>

          {statusMessage ? <p className='schedule-muted'>{statusMessage}</p> : null}
        </section>

        {result ? (
          <section className='surface-card schedule-panel'>
            <div className='schedule-panel-head'>
              <h2>解析结果</h2>
            </div>
            <div className='question-result'>
              {typeof result.answer === 'string' && result.answer ? (
                <p><strong>参考答案：</strong>{result.answer}</p>
              ) : null}
              {typeof result.analysis === 'string' && result.analysis ? (
                <p><strong>解析：</strong>{result.analysis}</p>
              ) : null}
              {typeof result.answer !== 'string' && typeof result.analysis !== 'string' ? (
                <pre className='question-raw'>{JSON.stringify(result, null, 2)}</pre>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <SupportFab />
    </UserWorkspaceShell>
  );
}

export default UserQuestionsPage;
