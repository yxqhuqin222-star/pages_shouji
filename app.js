const STORAGE_KEY = "personal-fragments-v1";
const BACKUP_VERSION = 1;
const IMAGE_MAX_EDGE = 1600;
const IMAGE_MAX_BYTES = 900 * 1024;
const IMAGE_QUALITY = 0.82;

const form = document.querySelector("#entry-form");
const idInput = document.querySelector("#entry-id");
const contentInput = document.querySelector("#entry-content");
const saveButton = document.querySelector("#save-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const searchInput = document.querySelector("#search-input");
const timeline = document.querySelector("#timeline");
const manageList = document.querySelector("#manage-list");
const emptyState = document.querySelector("#empty-state");
const countLine = document.querySelector("#count-line");
const viewLabel = document.querySelector("#view-label");
const exportButton = document.querySelector("#export-button");
const backupButton = document.querySelector("#backup-button");
const restoreButton = document.querySelector("#restore-button");
const restoreInput = document.querySelector("#restore-input");
const tagList = document.querySelector("#tag-list");
const allNotesButton = document.querySelector("#all-notes-button");

let entries = loadEntries();
let activeTag = "";

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const existingEntry = entries.find((item) => item.id === idInput.value);
  saveEntry({
    existingEntry,
    content: contentInput.value.trim(),
    imageData: existingEntry?.imageData || ""
  });
});

contentInput.addEventListener("paste", async (event) => {
  const clipboardItems = event.clipboardData?.items || [];
  const imageItem = [...clipboardItems].find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;

  event.preventDefault();

  const file = imageItem.getAsFile();
  if (!file) return;

  try {
    const imageData = await getCompressedImageData(file);
    const existingEntry = entries.find((item) => item.id === idInput.value);
    saveEntry({
      existingEntry,
      content: contentInput.value.trim(),
      imageData
    });
  } catch {
    window.alert("图片读取失败，请换一张图片再试");
  }
});

function saveEntry({ existingEntry, content, imageData }) {
  const now = new Date().toISOString();
  const entry = {
    id: existingEntry?.id || crypto.randomUUID(),
    title: existingEntry?.title || "",
    content,
    imageData,
    tags: existingEntry?.tags || [],
    category: getEntryCategory(content),
    date: existingEntry?.date || now,
    updatedAt: now
  };

  if (!entry.content && !entry.imageData) return;

  const previousEntries = entries;
  const nextEntries = [...entries];
  const existingIndex = nextEntries.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    nextEntries[existingIndex] = entry;
  } else {
    nextEntries.unshift(entry);
  }

  entries = nextEntries;
  try {
    saveEntries();
  } catch {
    entries = previousEntries;
    window.alert("保存失败：浏览器本地存储空间不足。请先导出备份，删除一些大图片后再试。");
    return;
  }

  resetForm();
  render();
}

cancelEditButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
exportButton.addEventListener("click", exportEntries);
backupButton.addEventListener("click", exportBackup);
restoreButton.addEventListener("click", () => restoreInput.click());
restoreInput.addEventListener("change", importBackup);
allNotesButton.addEventListener("click", () => {
  activeTag = "";
  render();
});
timeline.addEventListener("click", handleEntryAction);
document.addEventListener("click", closeOpenMenus);
tagList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;

  activeTag = button.dataset.tag;
  render();
});

function handleEntryAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  event.stopPropagation();
  const entry = entries.find((item) => item.id === button.dataset.id);
  if (!entry) return;

  if (button.dataset.action === "menu") {
    toggleEntryMenu(button);
    return;
  }

  if (button.dataset.action === "edit") {
    startEdit(entry);
  }

  if (button.dataset.action === "delete") {
    deleteEntry(entry.id);
  }
}

function render() {
  const visibleEntries = getVisibleEntries();
  const isFiltered = activeTag || searchInput.value.trim();

  countLine.textContent = isFiltered ? `显示 ${visibleEntries.length} / ${entries.length} 条` : `已收集 ${entries.length} 条`;
  timeline.innerHTML = "";
  manageList.innerHTML = "";
  viewLabel.textContent = activeTag ? `#${activeTag}` : "全部笔记";
  emptyState.hidden = visibleEntries.length > 0;
  renderEmptyState(isFiltered);
  renderTagList();

  visibleEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "timeline-item";
    item.innerHTML = `
      <div class="item-card">
        <div class="item-topline">
          <time class="item-date" datetime="${entry.date}">${formatDate(entry.date)}</time>
          <div class="entry-menu">
            <button class="menu-button" type="button" aria-label="更多操作" data-action="menu" data-id="${entry.id}">...</button>
            <div class="menu-popover" hidden>
              <button type="button" data-action="edit" data-id="${entry.id}">编辑</button>
              <button type="button" data-action="delete" data-id="${entry.id}">删除</button>
            </div>
          </div>
        </div>
        <p class="item-content"></p>
      </div>
    `;

    renderEntryContent(item.querySelector(".item-content"), entry);
    renderEntryImage(item.querySelector(".item-card"), entry);

    timeline.append(item);
  });
}

function renderEmptyState(isFiltered) {
  const title = emptyState.querySelector("h3");
  const description = emptyState.querySelector("p");

  title.textContent = isFiltered ? "没有匹配的碎片" : "还没有碎片";
  description.textContent = isFiltered ? "换个关键词，或切回全部笔记再看看。" : "先写下一条信息，它会按时间出现在这里。";
}

function getVisibleEntries() {
  const keyword = searchInput.value.trim().toLowerCase();

  return entries
    .filter((entry) => {
      if (!activeTag) return true;
      return getEntryTags(entry).includes(activeTag);
    })
    .filter((entry) => {
      if (!keyword) return true;
      const searchable = [entry.title || "", entry.content || "", getEntryTags(entry).join(" ")].join(" ").toLowerCase();
      return searchable.includes(keyword);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTagList() {
  const tags = getAllTags();

  tagList.innerHTML = "";
  allNotesButton.classList.toggle("is-active", activeTag === "");

  if (tags.length === 0) {
    const emptyTag = document.createElement("p");
    emptyTag.className = "tag-empty";
    emptyTag.textContent = "暂无标签";
    tagList.append(emptyTag);
    return;
  }

  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.className = "tag-nav";
    button.type = "button";
    button.dataset.tag = tag;
    button.classList.toggle("is-active", activeTag === tag);
    button.innerHTML = `<span aria-hidden="true">#</span><span></span>`;
    button.querySelector("span:last-child").textContent = tag;
    tagList.append(button);
  });
}

function getAllTags() {
  const tagSet = new Set();

  entries.forEach((entry) => {
    getEntryTags(entry).forEach((tag) => tagSet.add(tag));
  });

  return [...tagSet].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function getEntryTags(entry) {
  const tags = extractTags(entry.content);
  if (tags.length > 0) return tags;
  return [getEntryCategoryLabel(entry)];
}

function extractTags(content) {
  const matches = content?.match(/#[^\s#]+/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1)))];
}

function getContentWithoutTags(content) {
  return (content || "").replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim();
}

function toggleEntryMenu(button) {
  const menu = button.nextElementSibling;
  const shouldOpen = menu.hidden;

  closeOpenMenus();
  menu.hidden = !shouldOpen;
}

function closeOpenMenus(event) {
  if (event?.target.closest(".entry-menu")) return;

  document.querySelectorAll(".menu-popover").forEach((menu) => {
    menu.hidden = true;
  });
}

function startEdit(entry) {
  idInput.value = entry.id;
  contentInput.value = entry.content;
  saveButton.textContent = "保存修改";
  cancelEditButton.hidden = false;
  contentInput.focus();
}

function deleteEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;

  const confirmed = window.confirm(`删除这条信息吗？\n\n${getEntryPreview(entry)}`);
  if (!confirmed) return;

  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  resetForm();
  render();
}

function exportEntries() {
  if (entries.length === 0) {
    window.alert("暂无可导出的内容");
    return;
  }

  const exportRows = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const documentForExport = document.implementation.createHTMLDocument("碎片导出");
  const style = documentForExport.createElement("style");
  const table = documentForExport.createElement("table");
  const headerRow = table.insertRow();

  style.textContent = `
    table { border-collapse: collapse; }
    th, td { border: 1px solid #d4d4d2; padding: 8px; vertical-align: top; white-space: pre-wrap; }
    th { background: #f0f0ee; }
  `;
  documentForExport.head.append(style);

  ["分类", "日期", "内容"].forEach((title) => {
    const cell = documentForExport.createElement("th");
    cell.textContent = title;
    headerRow.append(cell);
  });

  exportRows.forEach((entry) => {
    const row = table.insertRow();
    row.insertCell().textContent = getEntryCategoryLabel(entry);
    row.insertCell().textContent = formatExportDate(entry.date);
    renderExportContent(row.insertCell(), entry, documentForExport);
  });

  documentForExport.body.append(table);

  const html = `\uFEFF${documentForExport.documentElement.outerHTML}`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `碎片导出-${getExportFileDate()}.xls`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `碎片备份-${getExportFileDate()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const backupEntries = parseBackupEntries(reader.result);
      if (backupEntries.length === 0) {
        window.alert("备份文件里没有可恢复的内容");
        return;
      }

      const confirmed = window.confirm(`导入后会覆盖当前 ${entries.length} 条内容，恢复备份中的 ${backupEntries.length} 条内容。继续吗？`);
      if (!confirmed) return;

      const previousEntries = entries;
      entries = backupEntries;

      try {
        saveEntries();
      } catch {
        entries = previousEntries;
        window.alert("导入失败：浏览器本地存储空间不足，当前数据未改变");
        return;
      }

      activeTag = "";
      searchInput.value = "";
      resetForm();
      render();
      window.alert("备份已导入");
    } catch {
      window.alert("无法导入：请选择本工具导出的 JSON 备份文件");
    } finally {
      restoreInput.value = "";
    }
  });
  reader.readAsText(file);
}

function parseBackupEntries(value) {
  const parsed = JSON.parse(value);
  const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries;

  if (!Array.isArray(rawEntries)) {
    throw new Error("Invalid backup");
  }

  return rawEntries.map(normalizeBackupEntry);
}

function normalizeBackupEntry(entry) {
  const now = new Date().toISOString();
  const content = typeof entry.content === "string" ? entry.content : "";
  const imageData = typeof entry.imageData === "string" ? entry.imageData : "";

  if (!content && !imageData) {
    throw new Error("Invalid entry");
  }

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : crypto.randomUUID(),
    title: typeof entry.title === "string" ? entry.title : "",
    content,
    imageData,
    tags: Array.isArray(entry.tags) ? entry.tags.filter((tag) => typeof tag === "string") : [],
    category: getEntryCategory(content, entry.category),
    date: isValidDate(entry.date) ? entry.date : now,
    updatedAt: isValidDate(entry.updatedAt) ? entry.updatedAt : now
  };
}

function renderExportContent(cell, entry, documentForExport) {
  if (entry.content) {
    const content = documentForExport.createElement("div");
    content.textContent = entry.content;
    cell.append(content);
  }

  if (!entry.imageData) return;

  const imageLabel = documentForExport.createElement("div");
  imageLabel.textContent = "[图片]";
  cell.append(imageLabel);

  const image = documentForExport.createElement("img");
  image.src = entry.imageData;
  image.alt = "已保存图片";
  image.width = 240;
  image.style.display = "block";
  image.style.marginTop = "8px";
  image.style.maxWidth = "240px";
  image.style.height = "auto";
  cell.append(image);
}

function getCompressedImageData(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.addEventListener("load", () => {
      URL.revokeObjectURL(url);
      const shouldCompress = file.size > IMAGE_MAX_BYTES || Math.max(image.naturalWidth, image.naturalHeight) > IMAGE_MAX_EDGE;
      if (!shouldCompress) {
        readFileAsDataURL(file).then(resolve, reject);
        return;
      }

      const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas unavailable"));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Image compression failed"));
          return;
        }

        readFileAsDataURL(blob).then(resolve, reject);
      }, "image/jpeg", IMAGE_QUALITY);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    });
    image.src = url;
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function resetForm() {
  form.reset();
  idInput.value = "";
  saveButton.textContent = "发送";
  cancelEditButton.hidden = true;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatExportDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getExportFileDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function getEntryPreview(entry) {
  const preview = entry.content || (entry.imageData ? "[图片]" : "");
  return preview.length > 42 ? `${preview.slice(0, 42)}...` : preview;
}

function getEntryCategory(content, savedCategory) {
  if (savedCategory === "todo" || savedCategory === "other") return savedCategory;
  return (content || "").toLowerCase().includes("todo") ? "todo" : "other";
}

function getEntryCategoryLabel(entry) {
  return getEntryCategory(entry.content, entry.category) === "todo" ? "todo" : "其他";
}

function renderEntryContent(contentElement, entry) {
  const tags = getEntryTags(entry);
  const content = getContentWithoutTags(entry.content);

  contentElement.innerHTML = "";
  tags.forEach((tag) => {
    const tagElement = document.createElement("button");
    tagElement.className = "category-tag";
    tagElement.type = "button";
    tagElement.dataset.tag = tag;
    tagElement.textContent = `#${tag}`;
    tagElement.addEventListener("click", () => {
      activeTag = tag;
      render();
    });
    contentElement.append(tagElement);
  });

  if (content) {
    contentElement.append(document.createTextNode(content));
  }

  contentElement.hidden = !content && !entry.imageData;
}

function renderEntryImage(container, entry) {
  if (!entry.imageData) return;

  const image = document.createElement("img");
  image.className = "entry-image";
  image.src = entry.imageData;
  image.alt = entry.content ? "粘贴图片" : "已保存图片";
  container.append(image);
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
