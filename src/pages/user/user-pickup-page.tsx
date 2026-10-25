import { useState, type FormEvent } from 'react';

import { fetchCoursePickupJson } from '../../api/course-pickup-api';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';
import { copyText } from '../../utils/clipboard';

function UserPickupPage() {
  const { user, isReady } = useRequiredVerifiedUser();
  const [pickupLookupCode, setPickupLookupCode] = useState<string>('');
  const [toolStatus, setToolStatus] = useState<string>('等待输入取件码。');
  const [toolHint, setToolHint] = useState<string>('输入 8 位取件码后，可回查之前保存的课程 JSON。');
  const [pickupCode, setPickupCode] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [courseJson, setCourseJson] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [copyStatusVariant, setCopyStatusVariant] = useState<'success' | 'error' | ''>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);

  usePageMeta('取件码回查', '通过 8 位取件码回查 Clark AAMS 已保存的课程 JSON。');

  const currentUserLabel = user.username || `用户 ${user.id}`;

  function setToolState(message: string, code: string, hint: string): void {
    setToolStatus(message);
    setPickupCode(code);
    setToolHint(hint);
  }

  async function handleLookupPickupCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCopyStatus('');
    setCopyStatusVariant('');

    const normalizedCode = pickupLookupCode.trim().toUpperCase();

    if (!normalizedCode) {
      setToolState('请输入取件码。', '', '输入保存过的 8 位取件码后，系统会读取已保存的课程 JSON。');
      return;
    }

    // 前端格式校验与后端取件码约定保持一致，避免发送无效请求。
    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      setToolState('取件码必须是 8 位大写字母或数字。', normalizedCode, '请检查并输入完整的 8 位取件码。');
      return;
    }

    setIsLookingUp(true);

    try {
      setToolState('正在回查取件码...', normalizedCode, '正在从服务器读取已保存的课程 JSON。');
      setProgress(36);
      const result = await fetchCoursePickupJson(normalizedCode);
      setToolState('回查完成。', normalizedCode, '取件码记录已成功返回。');
      setProgress(100);
      setCourseJson(JSON.stringify(result, null, 2));
    } catch (error) {
      setToolState(
        error instanceof Error ? error.message : '回查失败。',
        normalizedCode,
        '请确认取件码填写正确，且对应记录仍保存在服务器中。',
      );
      setProgress(0);
      setCourseJson('');
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleCopyResult(): Promise<void> {
    if (!courseJson) {
      setCopyStatus('当前还没有可复制的回查结果。');
      setCopyStatusVariant('error');
      return;
    }

    try {
      await copyText(courseJson);
      setCopyStatus('课程 JSON 已复制。');
      setCopyStatusVariant('success');
    } catch {
      setCopyStatus('复制失败，请手动选择结果内容后复制。');
      setCopyStatusVariant('error');
    }
  }

  if (!isReady) {
    return <LoadingView description='正在检查你的邮箱验证状态。' />;
  }

  return (
    <>
      <UserWorkspaceShell
        user={user}
        title='取件码回查'
        description='通过 8 位取件码回查之前保存的课程 JSON 结果。'
        contentClassName='dashboard-content-wide'
      >
        <div className='workspace-layout workspace-layout-wide'>
          <section className='surface-card workspace-card user-workspace-summary'>
            <div className='workspace-card__header'>
              <p className='eyebrow'>取件码回查</p>
              <h2>输入取件码，找回结果</h2>
              <p>这个工具从识别流程中独立出来，方便你在不重新上传课表截图的情况下，找回之前保存过的课程 JSON。</p>
            </div>

            <div className='workspace-points'>
              <div className='workspace-point'>
                <strong>无需重复上传</strong>
                <span>只要保留 8 位取件码，就能再次读取之前识别过的课程记录。</span>
              </div>
              <div className='workspace-point'>
                <strong>结果可以继续复用</strong>
                <span>回查成功后可直接复制 JSON，用于调试、导入或本地备份。</span>
              </div>
            </div>

            <div className='workspace-directory-meta'>
              <div className='workspace-directory-meta__item'>
                <span>当前用户</span>
                <strong>{currentUserLabel}</strong>
              </div>
              <div className='workspace-directory-meta__item'>
                <span>访问状态</span>
                <strong>邮箱已验证</strong>
              </div>
            </div>

            <div className='button-row'>
              <a className='button-secondary' href='/user'>
                返回用户中心
              </a>
              <a className='button-ghost' href='/user/recognition'>
                打开课表识别
              </a>
            </div>
          </section>

          <section className='surface-card workspace-card tool-card'>
            <div className='workspace-card__header'>
              <p className='eyebrow'>回查控制台</p>
              <h2>取件码查询</h2>
              <p id='pickup-user-summary'>当前登录用户：{currentUserLabel}。</p>
            </div>

            <div className='tool-console-grid'>
              <div className='tool-console-controls'>
                <form className='tool-form active' id='pickup-form' onSubmit={handleLookupPickupCode}>
                  <label className='form-field'>
                    <span>取件码</span>
                    <input
                      className='form-input'
                      name='code'
                      maxLength={8}
                      autoComplete='off'
                      placeholder='例如 A7K9Q2TX'
                      required
                      value={pickupLookupCode}
                      onChange={(event) => setPickupLookupCode(event.target.value.toUpperCase())}
                    />
                  </label>

                  <div className='button-row'>
                    <button className='button-primary' type='submit' disabled={isLookingUp}>
                      {isLookingUp ? '正在回查...' : '查询 JSON'}
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

                <progress className='progress-meter' id='progress-bar' value={progress} max={100} aria-label='回查进度'>
                  {progress}%
                </progress>

                <textarea
                  className='result-console'
                  id='course-json'
                  spellCheck={false}
                  placeholder='回查结果会显示在这里。'
                  value={courseJson}
                  readOnly
                ></textarea>

                <div className='button-row'>
                  <button className='button-secondary' type='button' onClick={() => void handleCopyResult()}>
                    复制结果 JSON
                  </button>
                </div>

                <div className={`form-status${copyStatusVariant ? ` ${copyStatusVariant}` : ''}`}>
                  {copyStatus || '如果回查失败，请确认记录仍存在，并且输入的是完整 8 位取件码。'}
                </div>
              </div>
            </div>
          </section>
        </div>
      </UserWorkspaceShell>

      <SupportFab />
    </>
  );
}

export default UserPickupPage;
