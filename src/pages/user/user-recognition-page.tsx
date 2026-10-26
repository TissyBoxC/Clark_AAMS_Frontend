import { useEffect, useRef, useState, type FormEvent } from 'react';

import { uploadCourseImages } from '../../api/course-pickup-api';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';
import { copyText } from '../../utils/clipboard';
import { normalizeCourse } from '../../types/schedule-types.ts';
import type { ICourseType } from '../../types/schedule-types.ts';
import { userMessageFor } from '../../constants/error-codes';

function UserRecognitionPage() {
  const { user, isReady } = useRequiredVerifiedUser();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [toolStatus, setToolStatus] = useState<string>('等待上传截图。');
  const [toolHint, setToolHint] = useState<string>('识别完成后，这里会显示取件码和识别出的课程。');
  const [pickupCode, setPickupCode] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  /** 识别出的课程，转成可读列表展示；完整数据只用于复制。 */
  const [courses, setCourses] = useState<ICourseType[]>([]);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState<boolean>(false);
  const [pickupModalCode, setPickupModalCode] = useState<string>('');
  const [pickupModalStatus, setPickupModalStatus] = useState<string>('');
  const [pickupModalStatusVariant, setPickupModalStatusVariant] = useState<'success' | 'error' | ''>('');

  usePageMeta('课表识别', '上传课表截图，识别成课程并生成取件码。');

  const currentUserLabel = user.username || `用户 ${user.id}`;

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  function setToolState(message: string, code: string, hint: string): void {
    setToolStatus(message);
    setPickupCode(code);
    setToolHint(hint);
  }

  function updateSelectedFiles(files: File[]): void {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setSelectedFiles([]);
      setToolState('未发现可用的图片文件。', '', '请上传 PNG、JPG、WebP 等截图图片。');
      return;
    }

    setSelectedFiles(imageFiles);
    setToolState(`已选择 ${imageFiles.length} 张截图。`, '', '确认无误后点一下，就开始识别。');
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isRecognizing) {
      return;
    }

    if (selectedFiles.length === 0) {
      setToolState('请先选择课表截图。', '', '点击上传区域或直接拖入图片文件。');
      return;
    }

    setToolState('正在上传截图...', '', '图片会送到识别服务处理，只用于这次识别。');
    setIsRecognizing(true);
    setProgress(12);

    if (progressTimerRef.current) {
      window.clearTimeout(progressTimerRef.current);
    }

    // 延迟切换到第二阶段状态，避免极快请求导致状态闪烁。
    progressTimerRef.current = window.setTimeout(() => {
      setToolState('AI 正在识别...', '', '一次传多张图，需要的时间会久一些。');
      setProgress(68);
    }, 900);

    try {
      const result = await uploadCourseImages(selectedFiles, (value) => setProgress(value));

      if (progressTimerRef.current) {
        window.clearTimeout(progressTimerRef.current);
      }

      setToolState('识别完成。', result.pickupCode, '已生成取件码，后续可凭此再次回查结果。');
      setProgress(100);
      setCourses((result.courses || []).map((item, index) =>
        normalizeCourse(item as unknown as Record<string, unknown>, index + 1),
      ));
      setPickupModalCode(result.pickupCode);
      setPickupModalStatus('');
      setPickupModalStatusVariant('');
      setIsPickupModalOpen(true);
    } catch (error) {
      if (progressTimerRef.current) {
        window.clearTimeout(progressTimerRef.current);
      }

      setToolState(
        userMessageFor(error),
        '',
        '识别服务暂时没有响应，请稍后再用清晰的课表截图重试。',
      );
      setProgress(0);
      setCourses([]);
    } finally {
      progressTimerRef.current = null;
      setIsRecognizing(false);
    }
  }

  async function handleCopyPickupCode(): Promise<void> {
    try {
      await copyText(pickupModalCode);
      setPickupModalStatus('取件码已复制。');
      setPickupModalStatusVariant('success');
    } catch {
      setPickupModalStatus('复制失败，请手动保存取件码。');
      setPickupModalStatusVariant('error');
    }
  }

  if (!isReady) {
    return <LoadingView description='正在检查你的邮箱验证状态。' />;
  }

  return (
    <>
      <UserWorkspaceShell
        user={user}
        title='课表识别'
        description='上传课表截图，识别成课程并生成可回查的取件码。'
        contentClassName='dashboard-content-wide'
      >
        <div className='workspace-layout workspace-layout-wide'>
          <section className='surface-card workspace-card user-workspace-summary'>
            <div className='workspace-card__header'>
              <p className='eyebrow'>课表识别</p>
              <h2>上传截图，识别课表</h2>
              <p>这一页负责把课表截图变成课程，并生成取件码；之后想再次取回结果，去「取件码回查」。</p>
            </div>

            <div className='workspace-points'>
              <div className='workspace-point'>
                <strong>支持多图识别</strong>
                <span>可以一次上传多张课表截图，识别完成后会给出课程和 8 位取件码。</span>
              </div>
              <div className='workspace-point'>
                <strong>结果便于回查</strong>
                <span>请保存系统生成的取件码，后续可通过回查工具重新取回本次识别结果。</span>
              </div>
            </div>

            <div className='workspace-directory-meta'>
              <div className='workspace-directory-meta__item'>
                <span>当前用户</span>
                <strong>{currentUserLabel}</strong>
              </div>
              <div className='workspace-directory-meta__item'>
                <span>工作模式</span>
                <strong>上传识别</strong>
              </div>
            </div>

            <div className='button-row'>
              <a className='button-secondary' href='/user'>
                返回用户中心
              </a>
              <a className='button-ghost' href='/docs/user-guide/screenshot-import'>
                查看识别指南
              </a>
              <a className='button-ghost' href='/user/pickup'>
                打开取件码回查
              </a>
            </div>
          </section>

          <section className='surface-card workspace-card tool-card'>
            <div className='workspace-card__header'>
              <p className='eyebrow'>识别控制台</p>
              <h2>课表识别控制台</h2>
              <p id='recognition-user-summary'>当前登录用户：{currentUserLabel}。</p>
            </div>

            <div className='tool-console-grid'>
              <div className='tool-console-controls'>
                <form className='tool-form active' id='upload-form' onSubmit={handleUpload}>
                  <div
                    className={`drop-zone${isDragging ? ' dragging' : ''}`}
                    id='drop-zone'
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      updateSelectedFiles(Array.from(event.dataTransfer.files));
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      id='image-input'
                      name='images'
                      type='file'
                      accept='image/*'
                      multiple
                      required
                      onChange={(event) => updateSelectedFiles(Array.from(event.target.files ?? []))}
                    />
                    <span className='drop-mark'>+</span>
                    <strong>拖入课表截图，或点击选择图片文件。</strong>
                    <span>支持多张截图，识别完成后会给出课程和可以反复使用的取件码。</span>
                  </div>

                  <div className='file-pills' id='file-list'>
                    {selectedFiles.length === 0
                      ? <span>暂未选择截图。</span>
                      : selectedFiles.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}
                  </div>

                  <div className='button-row'>
                    <button className='button-primary' type='submit' disabled={isRecognizing}>
                      {isRecognizing ? '识别中...' : '上传并识别'}
                    </button>
                  </div>
                </form>
              </div>

              <div className='tool-console-output'>
                <div className='result-head'>
                  <div>
                    <strong id='tool-status'>{toolStatus}</strong>
                    <div className='form-status' id='tool-hint'>
                      {toolHint}
                    </div>
                  </div>
                  <div className='code-chip' id='pickup-code' hidden={!pickupCode}>
                    {pickupCode}
                  </div>
                </div>

                <progress className='progress-meter' id='progress-bar' value={progress} max={100} aria-label='识别进度'>
                  {progress}%
                </progress>

                {courses.length > 0 ? (
                  <ul className='pickup-course-list' id='recognition-course-list'>
                    {courses.map((course) => (
                      <li key={course.id}>
                        <strong>{course.name}</strong>
                        <span>
                          周{course.dayOfWeek === 0 ? '日' : ['一', '二', '三', '四', '五', '六'][course.dayOfWeek - 1]}
                          {' · '}
                          第 {course.startLesson}-{course.endLesson} 节
                          {course.location ? ` · ${course.location}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='schedule-muted'>识别出的课程会显示在这里。</p>
                )}

                <div className='form-status'>
                  建议同时保留原始截图和取件码，方便识别失败时重试，或之后通过回查工具重新取回结果。
                </div>
              </div>
            </div>
          </section>
        </div>
      </UserWorkspaceShell>

      <div
        className='modal-backdrop'
        id='pickup-modal'
        hidden={!isPickupModalOpen}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setIsPickupModalOpen(false);
          }
        }}
      >
        <div className='surface-card modal-card' role='dialog' aria-modal='true' aria-labelledby='pickup-modal-title'>
          <button
            className='modal-close'
            id='pickup-modal-close'
            type='button'
            aria-label='关闭'
            onClick={() => setIsPickupModalOpen(false)}
          >
            ×
          </button>
          <p className='eyebrow'>取件码</p>
          <h2 id='pickup-modal-title'>识别完成</h2>
          <p>请记下这个取件码。之后在「取件码回查」里输入它，就能取回这次识别出的课表。</p>
          <div className='code-chip pickup-modal-code' id='pickup-modal-code'>
            {pickupModalCode}
          </div>
          <div className='button-row pickup-modal-actions'>
            <button className='button-primary' id='copy-pickup-code-button' type='button' onClick={() => void handleCopyPickupCode()}>
              复制取件码
            </button>
            <button className='button-secondary' id='pickup-modal-ok' type='button' onClick={() => setIsPickupModalOpen(false)}>
              关闭
            </button>
          </div>
          <div className={`form-status${pickupModalStatusVariant ? ` ${pickupModalStatusVariant}` : ''}`} id='pickup-modal-status'>
            {pickupModalStatus || '建议现在就复制并保存取件码，方便之后再次回查。'}
          </div>
        </div>
      </div>

      <SupportFab />
    </>
  );
}

export default UserRecognitionPage;
