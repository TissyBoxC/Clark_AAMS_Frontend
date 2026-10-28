import { useState, type FormEvent } from 'react';

import { analyzeChoiceQuestion, analyzeOpenQuestion } from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { Field, PageMeta } from '../../components/ui';
import { userMessageFor } from '../../lib/errors';
import { useAuth } from '../../store/useAuth';
import type { IQuestionResultType } from '../../types';

type QuestionMode = 'choice' | 'open';

export default function QuestionsPage() {
  const { user } = useAuth();

  const [mode, setMode] = useState<QuestionMode>('choice');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [material, setMaterial] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<IQuestionResultType | null>(null);

  function updateOption(index: number, value: string): void {
    setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');

    if (content.trim().length < 4) {
      setError('把题目完整贴进来，太短的片段读不出考点。');
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      if (mode === 'choice') {
        const filled = options.map((item) => item.trim()).filter(Boolean);
        if (filled.length < 2) {
          setError('选择题至少要有两个选项。');
          setIsSubmitting(false);
          return;
        }
        const analysis = await analyzeChoiceQuestion('single_choice', content.trim(), filled);
        setResult(analysis);
      } else {
        const analysis = await analyzeOpenQuestion({
          questionType: 'fill_blank',
          content: content.trim(),
          material: material.trim() || undefined,
          referenceAnswer: referenceAnswer.trim() || undefined,
          studentAnswer: studentAnswer.trim() || undefined,
        });
        setResult(analysis);
      }
    } catch (submitError) {
      setError(userMessageFor(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const answer = typeof result?.answer === 'string' ? result.answer : '';
  const analysisText = typeof result?.analysis === 'string' ? result.analysis : '';
  const hasReadableResult = Boolean(answer || analysisText);

  return (
    <WorkspaceShell
      title="题目解析"
      description="把做不出来的题贴进来，看它怎么解、错在哪一步。"
      actions={(
        <span className="tag tag--brand">已解析 {user?.questionAnalysisCount ?? 0} 道</span>
      )}
    >
      <PageMeta title="题目解析 · 珂拉课程表" description="粘贴题目，查看解题思路与答案。" />

      <div className="segmented" role="tablist" aria-label="题目类型">
        <button
          className="segmented__item"
          type="button"
          role="tab"
          aria-pressed={mode === 'choice'}
          onClick={() => { setMode('choice'); setResult(null); setError(''); }}
        >
          选择题
        </button>
        <button
          className="segmented__item"
          type="button"
          role="tab"
          aria-pressed={mode === 'open'}
          onClick={() => { setMode('open'); setResult(null); setError(''); }}
        >
          填空与主观题
        </button>
      </div>

      <form className="card stack gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Field
          label="题目内容"
          htmlFor="question-content"
          hint="连同题干和已知条件一起贴进来，公式用文字写也没关系。"
        >
          <textarea
            id="question-content"
            className="textarea"
            value={content}
            placeholder="例如：已知函数 f(x)=x²-4x+3，求它在区间 [0,3] 上的最小值。"
            onChange={(event) => setContent(event.target.value)}
          />
        </Field>

        {mode === 'choice' ? (
          <div className="stack gap-3">
            <span className="field__label">选项</span>
            <div className="form-grid form-grid--2">
              {options.map((option, index) => (
                <input
                  key={`option-${index}`}
                  className="input"
                  value={option}
                  placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                  aria-label={`选项 ${String.fromCharCode(65 + index)}`}
                  onChange={(event) => updateOption(index, event.target.value)}
                />
              ))}
            </div>
            <div className="row">
              {options.length < 6 ? (
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => setOptions((current) => [...current, ''])}
                >
                  再加一个选项
                </button>
              ) : null}
              {options.length > 2 ? (
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => setOptions((current) => current.slice(0, -1))}
                >
                  去掉最后一个
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <Field label="材料或背景" htmlFor="question-material" hint="选填。阅读题、案例分析可以放这里。">
              <textarea
                id="question-material"
                className="textarea"
                value={material}
                placeholder="有材料就贴在这里"
                onChange={(event) => setMaterial(event.target.value)}
              />
            </Field>
            <div className="form-grid form-grid--2">
              <Field label="参考答案" htmlFor="question-reference" hint="选填。想让它对照标准答案讲解时填。">
                <input
                  id="question-reference"
                  className="input"
                  value={referenceAnswer}
                  onChange={(event) => setReferenceAnswer(event.target.value)}
                />
              </Field>
              <Field label="我的答案" htmlFor="question-student" hint="选填。填了会指出错在哪一步。">
                <input
                  id="question-student"
                  className="input"
                  value={studentAnswer}
                  onChange={(event) => setStudentAnswer(event.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        {error ? (
          <div className="notice notice--danger">
            <span>{error}</span>
          </div>
        ) : null}

        <div className="row">
          <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '正在解析…' : '开始解析'}
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              setContent('');
              setOptions(['', '', '', '']);
              setMaterial('');
              setReferenceAnswer('');
              setStudentAnswer('');
              setResult(null);
              setError('');
            }}
          >
            清空重写
          </button>
        </div>
      </form>

      {result ? (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">解析结果</h2>
          </div>

          {hasReadableResult ? (
            <div className="stack gap-4">
              {answer ? (
                <div className="result__code">
                  <div>
                    <span>答案</span>
                    <strong style={{ letterSpacing: 0, fontFamily: 'var(--font-sans)', fontSize: '1.125rem' }}>
                      {answer}
                    </strong>
                  </div>
                </div>
              ) : null}

              {analysisText ? (
                <div>
                  <span className="field__label">解题思路</span>
                  <p
                    style={{
                      marginTop: '0.5rem',
                      whiteSpace: 'pre-wrap',
                      color: 'var(--ink-600)',
                      lineHeight: 1.9,
                    }}
                  >
                    {analysisText}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="notice notice--amber">
              <span>
                这次没有拿到可以逐句阅读的解析。可以换一种写法，把题目和选项分成几行再试一次。
              </span>
            </div>
          )}
        </section>
      ) : null}

      <section className="card card--sunken">
        <h2 className="card__title">解析能做到什么</h2>
        <p className="card__sub" style={{ marginTop: 'var(--sp-2)' }}>
          它给的是思路和步骤，不是保证正确的标准答案。
          涉及图表、专业符号特别多的题目，解析可能不完整，最后还是以课本和老师讲解为准。
        </p>
      </section>
    </WorkspaceShell>
  );
}
