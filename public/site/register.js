import {navigateWithTransition, requestApi, safeRedirect, setStoredLoginCode} from "/site/app.js";

const form = document.querySelector("#register-form");
const statusBox = document.querySelector("#register-status");
const loginLinks = Array.from(document.querySelectorAll("[data-login-link]"));

const redirectUrl = safeRedirect(new URLSearchParams(window.location.search).get("redirect") || "/user/index.html");

loginLinks.forEach((link) => {
  link.href = `/auth/login.html?redirect=${encodeURIComponent(redirectUrl)}`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "";
  statusBox.className = "form-status";
  const formData = new FormData(form);
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");

  if (password !== passwordConfirm) {
    statusBox.textContent = "两次输入的密码不一致。";
    statusBox.classList.add("error");
    return;
  }

  try {
    const user = await requestApi("/api/v1/user/register", {
      method: "POST",
      body: {
        username: formData.get("username"),
        qqEmail: formData.get("qqEmail"),
        password
      }
    });
    setStoredLoginCode(user.loginCode);
    navigateWithTransition(redirectUrl, {replace: true});
  } catch (error) {
    statusBox.textContent = error.message || "注册失败";
    statusBox.classList.add("error");
  }
});
