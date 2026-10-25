const LOGIN_CODE_KEY = "clarkAamsLoginCode";
const PAGE_TRANSITION_KEY = "clarkAamsPageTransition";

function withStorage(operation, fallback) {
  try {
    return operation(window.localStorage);
  } catch {
    return fallback;
  }
}

export function safeRedirect(value, fallback = "/user/index.html") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (!document.body) {
    throw new Error("当前环境无法访问剪贴板。");
  }

  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0
    ? selection.getRangeAt(0).cloneRange()
    : null;
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  const isCopied = document.execCommand("copy");
  input.remove();

  if (selection) {
    selection.removeAllRanges();
    if (previousRange) {
      selection.addRange(previousRange);
    }
  }

  activeElement?.focus();

  if (!isCopied) {
    throw new Error("复制命令未执行成功。");
  }
}

export function getStoredLoginCode() {
  return withStorage((storage) => storage.getItem(LOGIN_CODE_KEY)?.trim() || "", "");
}

export function setStoredLoginCode(loginCode) {
  const normalizedLoginCode = String(loginCode || "").trim();

  if (!normalizedLoginCode) {
    return;
  }
  withStorage((storage) => {
    storage.setItem(LOGIN_CODE_KEY, normalizedLoginCode);
  }, undefined);
}

export function clearStoredLoginCode() {
  withStorage((storage) => {
    storage.removeItem(LOGIN_CODE_KEY);
  }, undefined);
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function navigateWithTransition(url, options = {}) {
  const {replace = false, delay = 190} = options;
  if (!url) {
    return;
  }

  if (prefersReducedMotion() || !document.body) {
    if (replace) {
      window.location.replace(url);
      return;
    }
    window.location.assign(url);
    return;
  }

  sessionStorage.setItem(PAGE_TRANSITION_KEY, "1");
  document.body.classList.add("page-motion-ready", "page-leaving");
  window.setTimeout(() => {
    if (replace) {
      window.location.replace(url);
      return;
    }
    window.location.assign(url);
  }, delay);
}

export function qqAvatarUrl(email) {
  const match = String(email || "").trim().match(/^([1-9]\d{4,11})@qq\.com$/i);
  if (!match) {
    return "/site/logo.png";
  }
  return `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(match[1])}&s=100`;
}

export async function requestApi(url, options = {}) {
  const {
    body,
    headers = {},
    raw = false,
    includeAuth = true,
    ...fetchOptions
  } = options;
  const finalHeaders = {...headers};
  const loginCode = includeAuth ? getStoredLoginCode() : "";

  let finalBody = body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    finalBody = JSON.stringify(body);
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  if (includeAuth && loginCode) {
    finalHeaders["X-Clark-Aams-Login-Code"] = loginCode;
  }

  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...fetchOptions,
    headers: finalHeaders,
    body: finalBody
  });

  if (raw) {
    return response;
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(text);
    }
  }

  if (!response.ok || !payload || payload.code !== 0) {
    throw new Error(payload && payload.message ? payload.message : `HTTP ${response.status}`);
  }
  return payload.data;
}

export async function fetchCurrentUser() {
  return requestApi("/api/v1/user/me");
}

export async function restoreSessionWithLoginCode() {
  const loginCode = getStoredLoginCode();
  if (!loginCode) {
    return null;
  }
  try {
    const user = await requestApi("/api/v1/user/login", {
      method: "POST",
      body: {loginCode}
    });
    setStoredLoginCode(user.loginCode);
    return user;
  } catch {
    clearStoredLoginCode();
    return null;
  }
}

export async function ensureUserSession() {
  try {
    const user = await fetchCurrentUser();
    if (user && user.id > 0) {
      setStoredLoginCode(user.loginCode);
      return user;
    }
  } catch {
    // 静态页也继续走登录码恢复流程，尽量与 SPA 的会话恢复行为保持一致。
  }

  const user = await restoreSessionWithLoginCode();
  if (user && user.id > 0) {
    return user;
  }
  return {id: 0, username: "", email: "", loginCode: "", emailBound: false, emailVerified: false, questionAnalysisCount: 0};
}

export function captureLoginCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const loginCode = params.get("loginCode");
  if (!loginCode) {
    return;
  }
  setStoredLoginCode(loginCode);
  params.delete("loginCode");
  const cleanSearch = params.toString();
  const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", cleanUrl);
}
