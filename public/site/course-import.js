import {escapeHtml, requestApi} from "/site/app.js";

const params = new URLSearchParams(window.location.search);
const schoolId = params.get("schoolId") || "";
const schoolName = document.querySelector("#school-name");
const importLead = document.querySelector("#import-lead");
const schoolUrl = document.querySelector("#school-url");
const parseButton = document.querySelector("#parse-button");
const openLoginButton = document.querySelector("#open-login-button");
const copyCollectorButton = document.querySelector("#copy-collector-button");
const importStatus = document.querySelector("#import-status");
const manualHtml = document.querySelector("#manual-html");
const importResultPanel = document.querySelector("#import-result-panel");
const resultClose = document.querySelector("#result-close");
const courseResult = document.querySelector("#course-result");

let school = null;
let schoolWindow = null;
let collectedSession = null;

init();

parseButton.addEventListener("click", parseCourses);
openLoginButton.addEventListener("click", openLoginWindow);
copyCollectorButton.addEventListener("click", copyCollectorScript);
resultClose.addEventListener("click", () => {
  importResultPanel.hidden = true;
});

window.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "clark-aams-course-session") {
    return;
  }
  collectedSession = {
    html: typeof data.html === "string" ? data.html : "",
    cookie: typeof data.cookie === "string" ? data.cookie : "",
    studentId: typeof data.studentId === "string" ? data.studentId : "",
    successUrl: typeof data.url === "string" ? data.url : ""
  };
  if (collectedSession.html) {
    manualHtml.value = collectedSession.html;
  }
  setStatus(`已收到 ${school ? school.name : "学校"} 页面数据，正在尝试解析。`);
  parseCourses();
});

async function init() {
  if (!schoolId) {
    setStatus("缺少 schoolId，请从首页或用户中心重新进入。", true);
    parseButton.disabled = true;
    openLoginButton.disabled = true;
    copyCollectorButton.disabled = true;
    return;
  }
  try {
    school = await requestApi(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
      includeAuth: false
    });
    schoolName.textContent = school.name || school.id;
    importLead.textContent = instructionForSchool(school.id);
    schoolUrl.textContent = (school.login && school.login.loginUrl) || "未提供登录 URL";
  } catch (error) {
    setStatus(error.message || "学校配置读取失败", true);
    parseButton.disabled = true;
    openLoginButton.disabled = true;
    copyCollectorButton.disabled = true;
  }
}

async function parseCourses() {
  if (!school) {
    return;
  }

  const html = readManualHtml() || (collectedSession && collectedSession.html) || "";
  const session = {
    cookie: (collectedSession && collectedSession.cookie) || "",
    studentId: (collectedSession && collectedSession.studentId) || "",
    successUrl: (collectedSession && collectedSession.successUrl) || ((school.login && school.login.loginUrl) || ""),
    extra: {}
  };
  if (html) {
    session.extra.html = html;
  }

  if (!session.extra.html && !session.cookie) {
    setStatus("请先运行采集脚本，或直接粘贴课表 HTML 后再解析。", true);
    manualHtml.focus();
    return;
  }

  parseButton.disabled = true;
  setStatus("正在提交后端解析...");
  try {
    const data = await requestApi(`/api/v1/imports/${encodeURIComponent(school.id)}/courses/pickup`, {
      method: "POST",
      includeAuth: false,
      body: {
        loginSession: session
      }
    });
    importResultPanel.hidden = false;
    courseResult.value = JSON.stringify(data.courses || [], null, 2);
    setStatus(`解析完成，共 ${Array.isArray(data.courses) ? data.courses.length : 0} 门课程。取件码：${data.pickupCode || "未返回"}`);
  } catch (error) {
    setStatus(error.message || "课表解析失败", true);
  } finally {
    parseButton.disabled = false;
  }
}

function openLoginWindow() {
  if (!school || !school.login || !school.login.loginUrl) {
    setStatus("当前学校没有可用的登录地址。", true);
    return;
  }
  schoolWindow = window.open(
    school.login.loginUrl,
    "clarkSchoolLogin",
    "width=1280,height=860,menubar=yes,toolbar=yes,location=yes,status=yes,resizable=yes,scrollbars=yes"
  );
  if (!schoolWindow) {
    setStatus("浏览器拦截了学校登录窗口，请允许弹窗后重试。", true);
    return;
  }
  schoolWindow.focus();
  setStatus("学校原站窗口已打开。进入课表页后运行采集脚本，或把课表 HTML 粘贴到右侧文本框中。");
}

async function copyCollectorScript() {
  if (!school) {
    return;
  }
  const script = collectorScriptFor(school.id);
  try {
    await navigator.clipboard.writeText(script);
    setStatus("采集脚本已复制。请在学校课表页打开控制台并粘贴运行。");
  } catch {
    manualHtml.value = script;
    setStatus("无法直接写入剪贴板，已把采集脚本放入文本框中。", true);
  }
}

function collectorScriptFor(id) {
  const normalized = String(id || "").toLowerCase();
  const selector = normalized === "jit"
    ? "table#Table6, .class-table table"
    : normalized === "jlu"
      ? "table.wut_table"
      : "table#Table6, .class-table table, table.wut_table";
  const endpoint = `${window.location.origin}/api/v1/imports/${encodeURIComponent(school.id)}/courses/pickup`;

  return `(() => {
  const existing = document.getElementById("clark-aams-course-importer");
  if (existing) existing.remove();
  const button = document.createElement("button");
  button.id = "clark-aams-course-importer";
  button.textContent = "Clark 开始解析";
  button.style.cssText = "position:fixed;right:18px;top:18px;z-index:2147483647;border:0;border-radius:14px;padding:12px 18px;background:#7f58d8;color:#fff;font:700 14px system-ui,sans-serif;box-shadow:0 18px 34px rgba(105,80,170,.28);cursor:pointer;";
  button.onclick = async () => {
    button.disabled = true;
    button.textContent = "正在解析...";
    const schoolId = ${JSON.stringify(normalized)};
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
        throw new Error(payload && payload.message ? payload.message : "课表解析失败");
      }
      const code = payload.data && payload.data.pickupCode ? payload.data.pickupCode : "";
      alert("解析完成，取件码：" + code);
      button.textContent = "解析完成";
    } catch (error) {
      alert(error.message || "课表解析失败");
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

function instructionForSchool(id) {
  const normalized = String(id || "").toLowerCase();
  if (normalized === "jit") {
    return "JIT 可以通过 cookie 拉取课表页，也支持直接采集 table#Table6 的 HTML。";
  }
  if (normalized === "jlu") {
    return "JLU 依赖课表页的 DOM 内容，请进入课表页后再运行采集脚本，或直接粘贴 table.wut_table HTML。";
  }
  return "当前学校将按通用课表解析方式处理，请先进入学校课表页并运行采集脚本。";
}

function readManualHtml() {
  const value = manualHtml.value.trim();
  return value.startsWith("<") ? value : "";
}

function setStatus(message, isError = false) {
  importStatus.textContent = message;
  importStatus.className = `form-status${isError ? " error" : ""}`;
}
