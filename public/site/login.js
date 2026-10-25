import {navigateWithTransition, requestApi, safeRedirect, setStoredLoginCode} from "/site/app.js";

const form = document.querySelector("#login-form");
const statusBox = document.querySelector("#login-status");
const methodSwitch = document.querySelector(".auth-switch");
const methodButtons = Array.from(document.querySelectorAll("[data-login-method]"));
const methodPanels = Array.from(document.querySelectorAll("[data-login-panel]"));
const registerLinks = Array.from(document.querySelectorAll("[data-register-link]"));

let loginMethod = "email";
const redirectUrl = safeRedirect(new URLSearchParams(window.location.search).get("redirect") || "/user/index.html");

registerLinks.forEach((link) => {
  link.href = `/auth/register.html?redirect=${encodeURIComponent(redirectUrl)}`;
});

methodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    loginMethod = button.dataset.loginMethod;
    if (methodSwitch) {
      methodSwitch.style.setProperty("--switch-index", loginMethod === "code" ? "1" : "0");
    }
    methodButtons.forEach((item) => item.classList.toggle("active", item === button));
    methodPanels.forEach((panel) => {
      const active = panel.dataset.loginPanel === loginMethod;
      panel.classList.toggle("active", active);
      panel.toggleAttribute("aria-hidden", !active);
    });
    statusBox.textContent = "";
    statusBox.className = "form-status";
  });
});

if (methodSwitch) {
  methodSwitch.style.setProperty("--switch-index", "0");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "";
  statusBox.className = "form-status";
  const formData = new FormData(form);

  try {
    const payload = loginMethod === "email"
      ? {
          qqEmail: formData.get("qqEmail"),
          password: formData.get("password")
        }
      : {
          loginCode: formData.get("loginCode")
        };

    const user = await requestApi("/api/v1/user/login", {
      method: "POST",
      body: payload
    });
    setStoredLoginCode(user.loginCode);
    navigateWithTransition(redirectUrl, {replace: true});
  } catch (error) {
    statusBox.textContent = error.message || "登录失败";
    statusBox.classList.add("error");
  }
});
