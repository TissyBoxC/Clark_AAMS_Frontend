import {
  captureLoginCodeFromUrl,
  clearStoredLoginCode,
  copyText,
  ensureUserSession,
  escapeHtml,
  navigateWithTransition,
  qqAvatarUrl,
  requestApi
} from "/site/app.js";

const avatarImage = document.querySelector("#dashboard-avatar");
const topEmail = document.querySelector("#dashboard-email");
const topUserName = document.querySelector("#dashboard-user-name");
const summaryAvatar = document.querySelector("#summary-avatar");
const summaryTitle = document.querySelector("#summary-title");
const summaryCopy = document.querySelector("#summary-copy");
const analysisCount = document.querySelector("#metric-analysis-count");
const emailState = document.querySelector("#metric-email-state");
const emailCopy = document.querySelector("#metric-email-copy");
const emailAlert = document.querySelector("#dashboard-email-alert");
const accountList = document.querySelector("#account-data-list");
const accountStatus = document.querySelector("#account-status");
const logoutButton = document.querySelector("#logout-button");

let currentUser = null;
let actionsBound = false;

captureLoginCodeFromUrl();
init();
window.addEventListener("pageshow", handlePageShow);

async function init() {
  await syncUserState();
  if (!actionsBound) {
    bindActions();
    actionsBound = true;
  }
}

async function syncUserState() {
  const user = await ensureUserSession();
  if (!user || user.id <= 0) {
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/auth/login.html?redirect=${encodeURIComponent(redirect)}`);
    return;
  }

  currentUser = user;
  renderUser(user);
}

function renderUser(user) {
  const verified = Boolean(user.emailVerified);
  const avatarUrl = qqAvatarUrl(user.email);

  avatarImage.src = avatarUrl;
  summaryAvatar.src = avatarUrl;
  topEmail.textContent = user.email || "未填写邮箱";
  topUserName.textContent = user.username || `用户 ${user.id}`;
  summaryTitle.textContent = user.username || `用户 ${user.id}`;
  summaryCopy.textContent = verified
    ? "邮箱已验证，当前账户状态完整。"
    : "邮箱尚未验证，但不会影响你继续使用教务导入和课表识别。";
  analysisCount.textContent = String(Number(user.questionAnalysisCount || 0));
  emailState.textContent = verified ? "已验证" : "未验证";
  emailCopy.textContent = verified
    ? "验证提示已关闭"
    : "验证完成并刷新后，顶部提示会自动消失";

  emailAlert.hidden = verified;
  emailAlert.style.display = verified ? "none" : "";

  accountList.innerHTML = `
    <div class="data-row">
      <span>用户 ID</span>
      <strong>${escapeHtml(user.id)}</strong>
    </div>
    <div class="data-row">
      <span>用户名</span>
      <strong>${escapeHtml(user.username || "")}</strong>
    </div>
    <div class="data-row">
      <span>QQ 邮箱</span>
      <strong>${escapeHtml(user.email || "未填写")}</strong>
    </div>
    <div class="data-row">
      <span>邮箱状态</span>
      <strong>${verified ? "已验证" : "未验证"}</strong>
    </div>
    <div class="data-row">
      <span>登录码</span>
      <div class="data-value-inline">
        <code>${escapeHtml(user.loginCode || "")}</code>
        <button class="mini-copy-button" type="button" data-copy-login-code>复制</button>
      </div>
    </div>
    <div class="data-row">
      <span>题目解析次数</span>
      <strong>${escapeHtml(Number(user.questionAnalysisCount || 0))}</strong>
    </div>
  `;
}

function handlePageShow(event) {
  const params = new URLSearchParams(window.location.search);
  const shouldRefresh = event.persisted || params.has("refreshUser");
  if (!shouldRefresh) {
    return;
  }

  if (params.has("refreshUser")) {
    params.delete("refreshUser");
    const cleanSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  }

  syncUserState().catch(() => null);
}

function bindActions() {
  accountList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-login-code]");
    if (!button) {
      return;
    }

    accountStatus.textContent = "";
    accountStatus.className = "form-status";
    try {
      await copyText(currentUser.loginCode || "");
      accountStatus.textContent = "登录码已复制。";
      accountStatus.classList.add("success");
    } catch {
      accountStatus.textContent = "复制失败，请稍后重试。";
      accountStatus.classList.add("error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    accountStatus.textContent = "";
    accountStatus.className = "form-status";
    try {
      await requestApi("/api/v1/user/logout", {
        method: "POST",
        body: {}
      });
      clearStoredLoginCode();
      navigateWithTransition("/auth/login.html", {replace: true});
    } catch (error) {
      accountStatus.textContent = error.message || "退出失败";
      accountStatus.classList.add("error");
    }
  });
}
