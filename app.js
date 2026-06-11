const STORAGE_KEY = "personal-fragments-v1";

const form = document.querySelector("#entry-form");
const idInput = document.querySelector("#entry-id");
const contentInput = document.querySelector("#entry-content");
const saveButton = document.querySelector("#save-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const searchInput = document.querySelector("#search-input");
const timeline = document.querySelector("#timeline");
const manageList = document.querySelector("#manage-list");
const emptyState = document.querySelector("#empty-state");
const entryCount = document.querySelector("#entry-count");
const viewLabel = document.querySelector("#view-label");
const exportButton = document.querySelector("#export-button");
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

contentInput.addEventListener("paste", (event) => {
  const clipboardItems = event.clipboardData?.items || [];
  const imageItem = [...clipboardItems].find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;

  event.preventDefault();

  const file = imageItem.getAsFile();
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const existingEntry = entries.find((item) => item.id === idInput.value);
    saveEntry({
      existingEntry,
      content: contentInput.value.trim(),
      imageData: reader.result
    });
  });
  reader.readAsDataURL(file);
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

  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }

  saveEntries();
  resetForm();
  render();
}

cancelEditButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
exportButton.addEventListener("click", exportEntries);
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

  entryCount.textContent = entries.length;
  timeline.innerHTML = "";
  manageList.innerHTML = "";
  viewLabel.textContent = activeTag ? `#${activeTag}` : "全部笔记";
  emptyState.hidden = visibleEntries.length > 0;
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
