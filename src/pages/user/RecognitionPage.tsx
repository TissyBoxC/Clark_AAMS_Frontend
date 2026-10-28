import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import { recognizeCourseImages } from '../../api/study';
import WorkspaceShell from '../../components/WorkspaceShell';
import { EmptyState, PageMeta } from '../../components/ui';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { copyText } from '../../lib/storage';
import { normalizeCourse, weekText } from '../../lib/schedule';
import { saveCoursesToSchedule } from '../../lib/save-courses';
import type { ICourseType, IRawCourseType } from '../../types';

export default function RecognitionPage() {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('还没有选择图片。');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [rawCourses, setRawCourses] = useState<IRawCourseType[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const courses: ICourseType[] = useMemo(
    () => rawCourses.map((raw, index) => normalizeCourse(raw, index)),
    [rawCourses],
  );

  function acceptFiles(incoming: FileList | null): void {
    if (!incoming) {
      return;
    }

    const images = Array.from(incoming).filter((file) => file.type.startsWith('image/'));
    setError('');

    if (images.length === 0) {
      setStatus('这里只接收图片，PNG、JPG 都可以。');
      return;
    }

    setFiles(images.slice(0, 9));
    setStatus(`已选好 ${Math.min(images.length, 9)} 张图片，确认后点「开始识别」。`);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    acceptFiles(event.target.files);
  }

  async function handleRecognize(): Promise<void> {
    if (files.length === 0) {
      setStatus('先选一张课表截图。');
      return;
    }

    setIsRecognizing(true);
    setError('');
    setRawCourses([]);
    setPickupCode('');
    setProgress(12);
    setStatus('正在上传图片…');

    try {
      const result = await recognizeCourseImages(files, (value) => setProgress(value));
      setProgress(100);
      setPickupCode(result.pickupCode);
      setRawCourses(result.courses ?? []);

      if ((result.courses ?? []).length === 0) {
        setStatus('识别完成，但没有读出课程。换一张更清楚的图再试一次。');
      } else {
        setStatus(`识别完成，共读出 ${result.courses.length} 门课程。`);
        notify('识别完成，记得先核对再保存', 'success');
      }
    } catch (recognizeError) {
      setError(userMessageFor(recognizeError));
      setStatus('这次没有识别出来。');
      setProgress(0);
    } finally {
      setIsRecognizing(false);
    }
  }

  async function handleCopyCode(): Promise<void> {
    try {
      await copyText(pickupCode);
      notify('取件码已复制', 'success');
    } catch {
      notify('没能自动复制，请手动选中取件码', 'error');
    }
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const { saved, skipped } = await saveCoursesToSchedule(rawCourses);
      notify(
        skipped > 0
          ? `已保存 ${saved} 门课程，${skipped} 门缺少课程名没有保存`
          : `已保存 ${saved} 门课程到课表`,
        'success',
      );
    } catch (saveError) {
      notify(userMessageFor(saveError), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkspaceShell
      title="截图识别"
      description="上传课表截图，读出课程、节次和地点，核对后存进课表。"
      actions={(
        <Link className="btn btn--quiet btn--sm" to="/user/pickup">
          用取件码取回
        </Link>
      )}
    >
      <PageMeta title="截图识别 · 珂拉课程表" description="上传课表截图，识别成可以编辑的课程表。" />

      {error ? (
        <div className="notice notice--danger">
          <span>{error}</span>
        </div>
      ) : null}

      <section className="card">
        <div
          className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div>
            <h2 className="card__title">把课表截图放进来</h2>
            <p className="card__sub">
              一次最多 9 张。截整张课表、格子边框完整的时候识别最准。
            </p>
          </div>

          <div className="row">
            <button
              className="btn btn--primary btn--sm"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              选择图片
            </button>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => { setFiles([]); setRawCourses([]); setPickupCode(''); setProgress(0); setStatus('还没有选择图片。'); setError(''); }}
            >
              清空已选
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="visually-hidden"
              onChange={handleChange}
              aria-label="选择课表截图"
            />
          </div>

          {files.length > 0 ? (
            <div className="file-list">
              {files.map((file) => (
                <div className="file-row" key={`${file.name}-${file.size}`}>
                  <span aria-hidden="true">·</span>
                  {file.name}
                  <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <button
            className="btn btn--primary"
            type="button"
            disabled={isRecognizing || files.length === 0}
            onClick={() => void handleRecognize()}
          >
            {isRecognizing ? '正在识别…' : '开始识别'}
          </button>
          <span className="tiny" aria-live="polite">{status}</span>
        </div>

        {progress > 0 ? (
          <div className="progress" style={{ marginTop: 'var(--sp-3)' }} aria-hidden="true">
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </section>

      {pickupCode ? (
        <section className="card">
          <div className="result__code">
            <div>
              <span>这次的取件码</span>
              <strong>{pickupCode}</strong>
            </div>
            <div className="row">
              <button className="btn btn--soft btn--sm" type="button" onClick={() => void handleCopyCode()}>
                复制取件码
              </button>
              <Link className="btn btn--ghost btn--sm" to="/user/pickup">去取件码页面</Link>
            </div>
          </div>
          <p className="tiny" style={{ marginTop: 'var(--sp-3)' }}>
            记下这个码，换设备时可以直接取回这次识别结果。
          </p>
        </section>
      ) : null}

      {courses.length > 0 ? (
        <section className="card">
          <div className="card__head">
            <div>
              <h2 className="card__title">识别出的课程</h2>
              <p className="card__sub">先核对一遍，缺的课可以在这里补，再保存到课表。</p>
            </div>
            <button className="btn btn--primary btn--sm" type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? '正在保存…' : '保存到我的课表'}
            </button>
          </div>

          <div className="course-list">
            {courses.map((course) => (
              <div className="course-row" key={`${course.name}-${course.dayOfWeek}-${course.startLesson}`}>
                <span className="course-row__day">
                  <b>周{course.dayOfWeek}</b>
                  {course.startLesson}-{course.endLesson}
                </span>
                <span>
                  <strong>{course.name}</strong>
                  <span>{[course.location, course.teacher, weekText(course)].filter(Boolean).join(' · ')}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <Link className="btn btn--quiet btn--sm" to="/user/schedule">到课表里手动补课</Link>
          </div>
        </section>
      ) : files.length === 0 ? (
        <section className="card">
          <EmptyState title="识别结果会显示在这里">
            上传截图并识别成功后，课程会逐条列出来，还会附上一个取件码。
            如果识别出来的课不全，可以在课表页手动补。
          </EmptyState>
        </section>
      ) : null}

      <section className="card card--sunken">
        <h2 className="card__title">识别的边界</h2>
        <div className="stack gap-3" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-small)', color: 'var(--ink-600)' }}>
          <p>手写课表、过度压缩的截图、只截了一半的课表，识别结果都会打折。遇到这种情况换一张图更快。</p>
          <p>识别只读取课程名、节次、地点和老师。图片本身在识别结束后不会留在你的课表里。</p>
        </div>
      </section>
    </WorkspaceShell>
  );
}
