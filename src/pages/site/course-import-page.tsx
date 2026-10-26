import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { parseSchoolCourseImport } from '../../api/course-pickup-api';
import { buildAbsoluteApiUrl } from '../../api/http';
import { fetchSchoolById } from '../../api/school-api';
import { copyText } from '../../utils/clipboard';
import type { ICourseImportSessionType, ISchoolType } from '../../types/app-types';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';
import { userMessageFor } from '../../constants/error-codes';

interface ICollectedSessionType {
  html: string;
  cookie: string;
  studentId: string;
  successUrl: string;
}

function instructionForSchool(schoolId: string): string {
  const normalizedSchoolId = String(schoolId).toLowerCase();

  if (normalizedSchoolId === 'jit') {
    return 'JIT 可以通过 cookie 拉取课表页，也支持直接采集 table#Table6 的 HTML。';
  }

  if (normalizedSchoolId === 'jlu') {
    return 'JLU 依赖课表页的 DOM 内容，请进入课表页后再运行采集脚本，或直接粘贴 table.wut_table HTML。';
  }

  return '当前学校将按通用课表解析方式处理，请先进入学校课表页并运行采集脚本。';
}

function readManualHtml(value: string): string {
  const trimmedValue = value.trim();
  return trimmedValue.startsWith('<') ? trimmedValue : '';
}

function collectorScriptFor(school: ISchoolType): string {
  const normalizedSchoolId = String(school.id || '').toLowerCase();
  const selector = normalizedSchoolId === 'jit'
    ? 'table#Table6, .class-table table'
    : normalizedSchoolId === 'jlu'
      ? 'table.wut_table'
      : 'table#Table6, .class-table table, table.wut_table';
  const endpoint = buildAbsoluteApiUrl(`/api/v1/imports/${encodeURIComponent(school.id)}/courses/pickup`);

  return `(() => {
  const existing = document.getElementById("clark-aams-course-importer");
  if (existing) existing.remove();
  const button = document.createElement("button");
  button.id = "clark-aams-course-importer";
  button.textContent = "Clark 开始解析";
  button.style.cssText = "position:fixed;right:18px;top:18px;z-index:2147483647;border:1px solid rgba(255,255,255,.28);border-radius:18px;padding:12px 18px;background:linear-gradient(135deg,oklch(0.58 0.12 178),oklch(0.47 0.11 178));color:#f8fffc;font:700 14px Geist,Microsoft YaHei,sans-serif;box-shadow:0 18px 34px rgba(42,118,101,.28);cursor:pointer;";
  button.onclick = async () => {
    button.disabled = true;
    button.textContent = "正在解析...";
    const schoolId = ${JSON.stringify(normalizedSchoolId)};
    const table = findCourseTable(document, ${JSON.stringify(selector)});
    let html = table ? table.outerHTML : "";
    const params = new URLSearchParams(location.search);
    const studentId = params.get("xh") || params.get("studentId") || params.get("student_id") || "";
    const cookie = document.cookie || "";
    if (schoolId === "jit" && !html) {
      html = await fetchJitCourseHtml(studentId);
    }
    if (schoolId === "jit" && !cookie && !html) {
      alert("JIT 导入未找到课表 table#Table6，也无法通过同源请求获取课表页。请确认你已经在课表页执行脚本。");
      button.textContent = "Clark 开始解析";
      button.disabled = false;
      return;
    }
    try {
      const response = await fetch(${JSON.stringify(endpoint)}, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          loginSession: {
            cookie,
            studentId,
            successUrl: location.href,
            extra: html ? {html} : {}
          }
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload || payload.code !== 0) {
        throw new Error(payload && payload.message ? payload.message : "这次没有解析出课表");
      }
      const code = payload.data && payload.data.pickupCode ? payload.data.pickupCode : "";
      alert("课表已解析。取件码：" + code + "，可以在「取件码」页凭它取回课表。");
      button.textContent = "解析完成";
    } catch (error) {
      alert(userMessageFor(error));
      button.textContent = "Clark 开始解析";
      button.disabled = false;
    }
  };
  document.body.appendChild(button);

  function findCourseTable(doc, selector) {
    const table = doc.querySelector(selector);
    if (table) return table;
    for (const frame of doc.querySelectorAll("iframe, frame")) {
      try {
        const frameDoc = frame.contentDocument || frame.contentWindow.document;
        const frameTable = findCourseTable(frameDoc, selector);
        if (frameTable) return frameTable;
      } catch {}
    }
    return null;
  }

  async function fetchJitCourseHtml(studentId) {
    const id = studentId || new URLSearchParams(location.search).get("xh") || "";
    const encoded = encodeURIComponent(id);
    const candidates = [];
    candidates.push(location.href);
    if (id) {
      candidates.push("/xs_main.aspx?xh=" + encoded);
      candidates.push("/content_xs.aspx?xh=" + encoded);
      candidates.push("/xskbcx.aspx?xh=" + encoded + "&xm=&gnmkdm=N121603");
      candidates.push("/xskbcx.aspx?xh=" + encoded);
    }
    candidates.push("/xs_main.aspx");
    candidates.push("/content_xs.aspx");
    candidates.push("/xskbcx.aspx");
    for (const url of [...new Set(candidates)]) {
      try {
        const response = await fetch(url, {credentials: "include"});
        if (!response.ok) continue;
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, "text/html");
        const table = findCourseTable(doc, "table#Table6, .class-table table");
        if (table) return table.outerHTML;
      } catch {}
    }
    return "";
  }
})();`;
}

function CourseImportPage() {
  const location = useLocation();
  const { isReady } = useRequiredVerifiedUser();
  const schoolId = useMemo(() => new URLSearchParams(location.search).get('schoolId') ?? '', [location.search]);
  const isMissingSchoolId = schoolId.length === 0;
  const [school, setSchool] = useState<ISchoolType | null>(null);
  const [manualHtml, setManualHtml] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>(() => (
    isMissingSchoolId
      ? '缺少 schoolId，请从首页或用户中心重新进入。'
      : '打开学校原站窗口并进入课表页后，再执行取数指令或直接粘贴课表内容。'
  ));
  const [isStatusError, setIsStatusError] = useState<boolean>(() => isMissingSchoolId);
  const [resultJson, setResultJson] = useState<string>('');
  const [isResultVisible, setIsResultVisible] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [collectedSession, setCollectedSession] = useState<ICollectedSessionType | null>(null);

  useBodyClass('course-import-page');
  usePageMeta('教务导入', '登录学校教务后读取课表，生成取件码方便在其他设备取回。');

  const setStatus = useCallback((message: string, isError = false): void => {
    setStatusMessage(message);
    setIsStatusError(isError);
  }, []);

  const parseCourses = useCallback(
    async (sessionOverride?: ICollectedSessionType | null, htmlOverride?: string): Promise<void> => {
      if (!isReady || !school) {
        return;
      }

      const html = readManualHtml(htmlOverride ?? manualHtml) || sessionOverride?.html || collectedSession?.html || '';
      const loginSession: ICourseImportSessionType = {
        cookie: sessionOverride?.cookie || collectedSession?.cookie || '',
        studentId: sessionOverride?.studentId || collectedSession?.studentId || '',
        successUrl:
          sessionOverride?.successUrl ||
          collectedSession?.successUrl ||
          school.login?.loginUrl ||
          '',
        extra: {},
      };

      if (html) {
        loginSession.extra.html = html;
      }

      if (!loginSession.extra.html && !loginSession.cookie) {
        setStatus('请先执行取数指令，或直接粘贴课表内容后再整理。', true);
        return;
      }

      setIsParsing(true);
      setStatus('正在解析课表...');

      try {
        const data = await parseSchoolCourseImport(school.id, loginSession);
        setIsResultVisible(true);
        setResultJson(JSON.stringify(data.courses || [], null, 2));
        setStatus(`解析完成，共 ${Array.isArray(data.courses) ? data.courses.length : 0} 门课程。取件码：${data.pickupCode || '未返回'}`);
      } catch (error) {
        setStatus(userMessageFor(error), true);
      } finally {
        setIsParsing(false);
      }
    },
    [collectedSession, isReady, manualHtml, school, setStatus],
  );

  useEffect(() => {
    if (!isReady || !schoolId) {
      return;
    }

    let isMounted = true;

    async function loadSchool(): Promise<void> {
      try {
        const nextSchool = await fetchSchoolById(schoolId);

        if (isMounted) {
          setSchool(nextSchool);
        }
      } catch (error) {
        if (isMounted) {
          setStatus(userMessageFor(error), true);
        }
      }
    }

    void loadSchool();

    return () => {
      isMounted = false;
    };
  }, [isReady, schoolId, setStatus]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>): void {
      const data = event.data as {
        type?: string;
        html?: string;
        cookie?: string;
        studentId?: string;
        url?: string;
      };

      if (data.type !== 'clark-aams-course-session') {
        return;
      }

      const nextSession: ICollectedSessionType = {
        html: typeof data.html === 'string' ? data.html : '',
        cookie: typeof data.cookie === 'string' ? data.cookie : '',
        studentId: typeof data.studentId === 'string' ? data.studentId : '',
        successUrl: typeof data.url === 'string' ? data.url : '',
      };

      setCollectedSession(nextSession);

      if (nextSession.html) {
        setManualHtml(nextSession.html);
      }

      setStatus(`已收到 ${school ? school.name : '学校'} 页面数据，正在尝试解析。`);
      void parseCourses(nextSession, nextSession.html);
    }

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [parseCourses, school, setStatus]);

  async function handleCopyCollectorScript(): Promise<void> {
    if (!school) {
      return;
    }

    const script = collectorScriptFor(school);

    try {
      await copyText(script);
      setStatus('已复制。这是一个进阶用法：需要你在学校课表页面里的调试窗口运行它，再把结果粘回上面的输入框。如果没有把握，直接用截图识别更省事。');
    } catch {
      setManualHtml(script);
      setStatus('没能自动复制，已经放进下面的输入框，可以手动全选复制。', true);
    }
  }

  function handleOpenLoginWindow(): void {
    if (!school?.login?.loginUrl) {
      setStatus('当前学校没有可用的登录地址。', true);
      return;
    }

    const popup = window.open(
      school.login.loginUrl,
      'clarkSchoolLogin',
      'width=1280,height=860,menubar=yes,toolbar=yes,location=yes,status=yes,resizable=yes,scrollbars=yes',
    );

    if (!popup) {
      setStatus('浏览器拦截了学校登录窗口，请允许弹窗后重试。', true);
      return;
    }

    popup.focus();
    setStatus('学校原站窗口已打开。进入课表页后执行取数指令，或把课表内容粘贴到右侧文本框中。');
  }

  if (!isReady) {
    return <LoadingView description='正在确认邮箱验证状态。' />;
  }

  return (
    <main className='import-shell'>
      <div className='import-layout'>
        <section className='surface-card import-browser-card'>
          <a className='brand' href='/' aria-label='返回首页'>
            <img src='/site/logo.png' alt='' />
            <span className='brand-lockup'>
              <strong className='brand-title'>珂拉课程表</strong>
              <small className='brand-domain'>clarkhub.cn</small>
            </span>
          </a>
          <img className='import-visual' src='/site/globe-hero.svg' alt='' />
          <div className='import-copy'>
            <p className='eyebrow'>School Import</p>
            <h1 id='school-name'>{school?.name || '教务导入'}</h1>
            <p id='import-lead'>
              {school ? instructionForSchool(school.id) : '正在读取学校配置，请稍候。'}
            </p>
          </div>
          <div className='workspace-directory-meta'>
            <div className='workspace-directory-meta__item'>
              <span>当前学校</span>
              <strong>{school?.id || schoolId || '未选择'}</strong>
            </div>
            <div className='workspace-directory-meta__item'>
              <span>数据来源</span>
              <strong>{collectedSession ? '已采集' : manualHtml ? '直接粘贴' : '等待中'}</strong>
            </div>
          </div>
          <div className='button-row'>
            <button className='button-primary' id='parse-button' type='button' disabled={!school || isParsing} onClick={() => void parseCourses()}>
              {isParsing ? '正在解析...' : '开始解析'}
            </button>
            <button className='button-secondary' id='open-login-button' type='button' disabled={!school} onClick={handleOpenLoginWindow}>
              打开学校登录页
            </button>
          </div>
        </section>

        <section className='dashboard-column'>
          <section className='surface-card import-control-card'>
            <p className='eyebrow'>进阶方式</p>
            <h2>取回课表内容</h2>
            <p id='school-url'>{school?.login?.loginUrl || '等待学校信息'}</p>
            <div className='button-row import-control-actions'>
              <button className='button-secondary' id='copy-collector-button' type='button' disabled={!school} onClick={() => void handleCopyCollectorScript()}>
                复制取数指令
              </button>
            </div>
            <div className={`form-status import-status${isStatusError ? ' error' : ''}`} id='import-status'>
              {statusMessage}
            </div>
            <label className='form-field import-manual-field'>
              <span>直接粘贴课表内容</span>
              <textarea
                className='form-input'
                id='manual-html'
                placeholder='如果已经从学校页面复制到课表内容，粘贴到这里再开始整理。'
                value={manualHtml}
                onChange={(event) => setManualHtml(event.target.value)}
              ></textarea>
            </label>
          </section>

          {isResultVisible ? (
            <section className='surface-card import-result-card' id='import-result-panel'>
              <div className='result-head'>
                <div>
                  <p className='eyebrow'>整理结果</p>
                  <h2 className='result-title'>解析结果</h2>
                </div>
                <button className='button-secondary' id='result-close' type='button' onClick={() => setIsResultVisible(false)}>
                  收起
                </button>
              </div>
              <textarea className='result-console' id='course-result' spellCheck={false} placeholder='整理好的课程会显示在这里，可以复制带走' value={resultJson} readOnly></textarea>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default CourseImportPage;
