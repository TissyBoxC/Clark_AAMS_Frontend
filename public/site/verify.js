import {
  captureLoginCodeFromUrl,
  ensureUserSession,
  navigateWithTransition,
  requestApi,
  safeRedirect
} from "/site/app.js";

const summary = document.querySelector("#verify-summary");
const statusBox = document.querySelector("#verify-status");
const verifyForm = document.querySelector("#verify-page-form");
const emailInput = document.querySelector("#verify-email");
const sendCodeButton = document.querySelector("#send-email-code-button");
const submitButton = document.querySelector("#verify-submit-button");

captureLoginCodeFromUrl();
loadUser();

sendCodeButton.addEventListener("click", async () => {
  resetStatus();
  try {
    const user = await requestApi("/api/v1/user/email/code", {
      method: "POST",
      body: {
        qqEmail: emailInput.value
      }
    });
    renderUser(user);
    emailInput.value = user.email || emailInput.value;
    statusBox.textContent = "验证码已发送，请检查邮箱。";
    statusBox.classList.add("success");
  } catch (error) {
    statusBox.textContent = error.message || "验证码发送失败";
    statusBox.classList.add("error");
  }
});

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetStatus();

  const formData = new FormData(verifyForm);
  try {
    const user = await requestApi("/api/v1/user/email/verify", {
      method: "POST",
      body: {
        code: formData.get("code")
      }
    });
    const freshUser = await requestApi("/api/v1/user/me");
    renderUser(freshUser && freshUser.id > 0 ? freshUser : user);
    statusBox.textContent = "邮箱验证成功，正在返回用户中心。";
    statusBox.classList.add("success");
    window.setTimeout(() => {
      navigateWithTransition("/user/index.html?refreshUser=1", {replace: true, delay: 0});
    }, 900);
  } catch (error) {
    statusBox.textContent = error.message || "邮箱验证失败";
    statusBox.classList.add("error");
  }
});

async function loadUser() {
  const user = await ensureUserSession();
  if (!user || user.id <= 0) {
    const redirect = safeRedirect(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.location.replace(`/auth/login.html?redirect=${encodeURIComponent(redirect)}`);
    return;
  }

  renderUser(user);
}

function renderUser(user) {
  const verified = Boolean(user.emailVerified);
  emailInput.value = user.email || "";
  summary.textContent = verified
    ? "当前邮箱已完成验证。"
    : `当前登录用户：${user.username || `用户 ${user.id}`}。完成验证后将自动返回用户中心。`;

  sendCodeButton.disabled = verified;
  submitButton.disabled = verified;
  emailInput.readOnly = verified;
  verifyForm.code.disabled = verified;
}

function resetStatus() {
  statusBox.textContent = "";
  statusBox.className = "form-status";
}
