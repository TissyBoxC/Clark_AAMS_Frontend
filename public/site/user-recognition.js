import {
  captureLoginCodeFromUrl,
  copyText,
  ensureUserSession,
  escapeHtml
} from "/site/app.js";

const userSummary = document.querySelector("#recognition-user-summary");
const toolTabs = Array.from(document.querySelectorAll(".tool-tab"));
const uploadForm = document.querySelector("#upload-form");
const pickupForm = document.querySelector("#pickup-form");
const imageInput = document.querySelector("#image-input");
const dropZone = document.querySelector("#drop-zone");
const fileList = document.querySelector("#file-list");
const toolStatus = document.querySelector("#tool-status");
const toolHint = document.querySelector("#tool-hint");
const pickupCode = document.querySelector("#pickup-code");
const progressBar = document.querySelector("#progress-bar");
const courseJson = document.querySelector("#course-json");
const pickupModal = document.querySelector("#pickup-modal");
const pickupModalClose = document.querySelector("#pickup-modal-close");
const pickupModalCode = document.querySelector("#pickup-modal-code");
const pickupModalStatus = document.querySelector("#pickup-modal-status");
const copyPickupCodeButton = document.querySelector("#copy-pickup-code-button");
const pickupModalOk = document.querySelector("#pickup-modal-ok");

let currentPickupCode = "";

captureLoginCodeFromUrl();
init();

async function init() {
  const user = await ensureUserSession();
  if (!user || user.id <= 0) {
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/auth/login.html?redirect=${encodeURIComponent(redirect)}`);
    return;
  }

  userSummary.textContent = `当前登录用户：${user.username || `用户 ${user.id}`}。`;
  initializeWorkspace();
}

function initializeWorkspace() {
  toolTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode;
      toolTabs.forEach((item) => item.classList.toggle("active", item === tab));
      uploadForm.classList.toggle("active", mode === "upload");
      pickupForm.classList.toggle("active", mode === "pickup");
      setProgress(0);
      setToolState("等待操作", "", "识别或回查完成后，会在这里显示状态和结果说明。");
    });
  });

  dropZone.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", renderFiles);

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      setToolState("未发现可用图片", "", "请拖入 PNG、JPG、WebP 等图片文件。");
      return;
    }

    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    imageInput.files = transfer.files;
    renderFiles();
  });

  uploadForm.addEventListener("submit", uploadImages);
  pickupForm.addEventListener("submit", lookupPickupCode);
  copyPickupCodeButton.addEventListener("click", copyPickupCode);
  pickupModalClose.addEventListener("click", closePickupModal);
  pickupModalOk.addEventListener("click", closePickupModal);
  pickupModal.addEventListener("click", (event) => {
    if (event.target === pickupModal) {
      closePickupModal();
    }
  });
}

function renderFiles() {
  const files = Array.from(imageInput.files || []);
  if (!files.length) {
    fileList.innerHTML = "<span>尚未选择图片</span>";
    return;
  }

  fileList.innerHTML = files.map((file) => `<span>${escapeHtml(file.name)}</span>`).join("");
  setToolState(`已选择 ${files.length} 张图片`, "", "点击上传后会开始识别并生成取件码。");
}

async function uploadImages(event) {
  event.preventDefault();
  if (!imageInput.files || imageInput.files.length === 0) {
    setToolState("请先选择课表截图", "", "点击上传区域或直接拖入图片。");
    return;
  }

  const formData = new FormData();
  Array.from(imageInput.files).forEach((file) => formData.append("images", file));

  try {
    setToolState("正在上传图片", "", "图片上传后会交给后端 OCR 服务识别。");
    setProgress(12);
    const response = await uploadWithProgress(formData);
    setToolState("识别完成", response.data.pickupCode, "本次识别已生成取件码，可稍后再次回查。");
    setProgress(100);
    courseJson.value = JSON.stringify(response.data.courses, null, 2);
    showPickupModal(response.data.pickupCode);
  } catch (error) {
    setToolState(error.message || "识别失败", "", "请确认后端 AI 配置可用，并重新上传课表截图。");
    setProgress(0);
    courseJson.value = "";
  }
}

function uploadWithProgress(formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/course-pickups");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 52);
        setProgress(Math.max(10, percent));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const result = JSON.parse(xhr.responseText || "{}");
        if (xhr.status < 200 || xhr.status >= 300 || result.code !== 0) {
          reject(new Error(result.message || `HTTP ${xhr.status}`));
          return;
        }
        setProgress(90);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    xhr.addEventListener("error", () => reject(new Error("网络请求失败")));
    xhr.addEventListener("timeout", () => reject(new Error("识别请求超时")));
    xhr.timeout = 180000;

    window.setTimeout(() => {
      if (progressBar.style.width !== "100%") {
        setToolState("AI 正在识别", "", "多张课表截图时，识别会花费更长时间。");
        setProgress(68);
      }
    }, 900);

    xhr.send(formData);
  });
}

async function lookupPickupCode(event) {
  event.preventDefault();
  const code = String(pickupForm.code.value || "").trim().toUpperCase();
  if (!code) {
    setToolState("请输入取件码", "", "系统会按 8 位取件码读取之前保存的课程 JSON。");
    return;
  }

  try {
    setToolState("正在回查取件码", code, "正在从后端读取课程 JSON。");
    setProgress(36);
    const response = await fetch(`/api/v1/course-pickups/${encodeURIComponent(code)}`, {
      cache: "no-store"
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `HTTP ${response.status}`);
    }

    setToolState("回查完成", code, "取件码记录已成功返回。");
    setProgress(100);
    courseJson.value = JSON.stringify(JSON.parse(text), null, 2);
  } catch (error) {
    setToolState(error.message || "回查失败", code, "请确认取件码正确，或该记录未被后端删除。");
    setProgress(0);
    courseJson.value = "";
  }
}

function setToolState(message, code, hint) {
  toolStatus.textContent = message;
  pickupCode.hidden = !code;
  pickupCode.textContent = code || "";
  toolHint.textContent = hint;
}

function setProgress(value) {
  progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function showPickupModal(code) {
  currentPickupCode = code;
  pickupModalCode.textContent = code;
  pickupModalStatus.textContent = "";
  pickupModalStatus.className = "form-status";
  pickupModal.hidden = false;
}

function closePickupModal() {
  pickupModal.hidden = true;
}

async function copyPickupCode() {
  try {
    await copyText(currentPickupCode);
    pickupModalStatus.textContent = "取件码已复制。";
    pickupModalStatus.className = "form-status success";
  } catch {
    pickupModalStatus.textContent = "复制失败，请手动保存取件码。";
    pickupModalStatus.className = "form-status error";
  }
}
