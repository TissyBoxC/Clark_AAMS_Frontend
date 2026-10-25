import {ensureUserSession, escapeHtml, fetchCurrentUser, navigateWithTransition, qqAvatarUrl, requestApi} from "/site/app.js";

const userEntries = Array.from(document.querySelectorAll("[data-user-entry]"));
const userAvatar = document.querySelector("#home-user-avatar");
const userLabel = document.querySelector("#home-user-label");
const userStatus = document.querySelector("#home-user-status");
const importButton = document.querySelector("#home-import-button");
const importModal = document.querySelector("#school-import-modal");
const importClose = document.querySelector("#school-import-close");
const importList = document.querySelector("#school-import-list");
const importStatus = document.querySelector("#school-import-status");

let cachedSchools = [];
let userTarget = "/auth/login.html";

userEntries.forEach((entry) => {
  entry.addEventListener("click", async (event) => {
    event.preventDefault();
    const fallbackHref = entry.getAttribute("href") || userTarget;
    try {
      const user = await ensureUserSession();
      const targetHref = fallbackHref.includes("/auth/") ? "/user/index.html" : fallbackHref;
      navigateWithTransition(user && user.id > 0 ? targetHref : "/auth/login.html");
    } catch {
      navigateWithTransition(fallbackHref);
    }
  });
});

if (importButton) {
  importButton.addEventListener("click", async () => {
    importModal.hidden = false;
    await loadSchools();
  });
}

if (importClose) {
  importClose.addEventListener("click", () => {
    importModal.hidden = true;
  });
}

if (importModal) {
  importModal.addEventListener("click", (event) => {
    if (event.target === importModal) {
      importModal.hidden = true;
    }
  });
}

async function loadUserState() {
  try {
    const user = await ensureUserSession();
    if (user && user.id > 0) {
      userTarget = "/user/index.html";
      userAvatar.src = qqAvatarUrl(user.email);
      userLabel.textContent = user.username || user.email || "已登录";
      userStatus.classList.add(user.emailVerified ? "ok" : "warn");
      userStatus.innerHTML = user.emailVerified
        ? "<span class=\"dot\"></span><span>已登录，进入用户中心继续管理课表</span>"
        : "<span class=\"dot\"></span><span>已登录，邮箱未验证但不影响导入和识别</span>";
      return;
    }
  } catch {
    // Ignore and show guest state below.
  }

  userTarget = "/auth/login.html";
  userAvatar.src = "/site/logo.png";
  userLabel.textContent = "立即登录";
  userStatus.classList.add("warn");
  userStatus.innerHTML = "<span class=\"dot\"></span><span>登录后即可使用教务导入、课表识别和用户中心</span>";
}

async function loadSchools() {
  importStatus.textContent = "";
  importStatus.className = "form-status";
  if (cachedSchools.length > 0) {
    renderSchoolButtons(cachedSchools);
    return;
  }

  importList.innerHTML = "<span>正在读取学校列表</span>";
  try {
    const data = await requestApi("/api/v1/schools", {includeAuth: false});
    cachedSchools = (data || []).filter((school) => school.capabilities && school.capabilities.academicImport);
    renderSchoolButtons(cachedSchools);
  } catch (error) {
    importList.innerHTML = "";
    importStatus.textContent = error.message || "学校列表读取失败";
    importStatus.className = "form-status error";
  }
}

function renderSchoolButtons(schools) {
  if (!schools.length) {
    importList.innerHTML = "<span>当前没有可用的教务导入学校</span>";
    return;
  }

  importList.innerHTML = schools.map((school) => `
    <button class="school-option" type="button" data-school-id="${escapeHtml(school.id)}">
      <strong>${escapeHtml(school.name)}</strong>
      <span>${escapeHtml((school.login && school.login.loginUrl) || "")}</span>
    </button>
  `).join("");

  importList.querySelectorAll("[data-school-id]").forEach((button) => {
    button.addEventListener("click", () => openImport(button.dataset.schoolId));
  });
}

function openImport(schoolId) {
  const target = `/course-import.html?schoolId=${encodeURIComponent(schoolId)}`;
  const popup = window.open(
    target,
    "clarkCourseImport",
    "width=1280,height=860,menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes"
  );

  if (!popup) {
    importStatus.textContent = "浏览器拦截了导入窗口，请允许弹窗后重试。";
    importStatus.className = "form-status error";
    return;
  }

  importModal.hidden = true;
  popup.focus();
}

loadUserState();

fetchCurrentUser().catch(() => null);
