import {
  captureLoginCodeFromUrl,
  ensureUserSession,
  escapeHtml,
  navigateWithTransition,
  requestApi
} from "/site/app.js";

const userSummary = document.querySelector("#import-user-summary");
const schoolList = document.querySelector("#import-school-list");
const schoolStatus = document.querySelector("#import-school-status");

captureLoginCodeFromUrl();
init();

async function init() {
  const user = await ensureUserSession();
  if (!user || user.id <= 0) {
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/auth/login.html?redirect=${encodeURIComponent(redirect)}`);
    return;
  }

  userSummary.textContent = `当前登录用户：${user.username || `用户 ${user.id}`}。选择学校后将进入独立导入页。`;
  await loadSchools();
}

async function loadSchools() {
  schoolStatus.textContent = "";
  schoolStatus.className = "form-status";

  try {
    const schools = await requestApi("/api/v1/schools", {includeAuth: false});
    const importSchools = (schools || []).filter((school) => school.capabilities && school.capabilities.academicImport);

    if (!importSchools.length) {
      schoolList.innerHTML = "<span>当前没有可用的教务导入学校。</span>";
      return;
    }

    schoolList.innerHTML = importSchools.map((school) => `
      <button class="school-option" type="button" data-school-id="${escapeHtml(school.id)}">
        <strong>${escapeHtml(school.name)}</strong>
        <span>${escapeHtml((school.login && school.login.loginUrl) || "点击进入对应导入页")}</span>
      </button>
    `).join("");

    schoolList.querySelectorAll("[data-school-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const schoolId = button.dataset.schoolId || "";
        navigateWithTransition(`/course-import.html?schoolId=${encodeURIComponent(schoolId)}`);
      });
    });
  } catch (error) {
    schoolList.innerHTML = "";
    schoolStatus.textContent = error.message || "学校列表读取失败";
    schoolStatus.classList.add("error");
  }
}
