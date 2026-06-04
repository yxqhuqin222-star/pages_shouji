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
const filters = document.querySelector("#filters");
const manageToggle = document.querySelector("#manage-toggle");
const filterButtons = document.querySelectorAll("[data-filter]");

let entries = loadEntries();
let activeFilter = "all";
let activeView = "timeline";

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const now = new Date().toISOString();
  const existingEntry = entries.find((item) => item.id === idInput.value);

  const entry = {
    id: existingEntry?.id || crypto.randomUUID(),
    title: existingEntry?.title || "",
    content: contentInput.value.trim(),
    tags: existingEntry?.tags || [],
    date: existingEntry?.date || now,
    updatedAt: now
  };

  if (!entry.content) return;

  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }

  saveEntries();
  resetForm();
  render();
});

cancelEditButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
manageToggle.addEventListener("click", () => {
  activeView = activeView === "timeline" ? "manage" : "timeline";
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

manageList.addEventListener("click", handleEntryAction);
timeline.addEventListener("click", handleEntryAction);

function handleEntryAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const entry = entries.find((item) => item.id === button.dataset.id);
  if (!entry) return;

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
  timeline.hidden = activeView !== "timeline";
  manageList.hidden = activeView !== "manage";
  filters.hidden = activeView !== "timeline";
  viewLabel.textContent = activeView === "timeline" ? "时间线" : "管理";
  manageToggle.textContent = activeView === "timeline" ? "管理" : "返回时间线";
  emptyState.hidden = visibleEntries.length > 0;

  if (activeView === "manage") {
    renderManageList(visibleEntries);
    return;
  }

  visibleEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "timeline-item";
    item.innerHTML = `
      <time class="item-date" datetime="${entry.date}">${formatDate(entry.date)}</time>
      <div class="item-card">
        <div class="item-header">
          <div>
            <p class="item-content"></p>
          </div>
        </div>
      </div>
    `;

    item.querySelector(".item-content").textContent = entry.content;

    timeline.append(item);
  });
}

function renderManageList(visibleEntries) {
  visibleEntries.forEach((entry, index) => {
    const item = document.createElement("article");
    item.className = "manage-item";
    item.innerHTML = `
      <div class="manage-index">${index + 1}</div>
      <div class="manage-body">
        <time class="item-date" datetime="${entry.date}">${formatDate(entry.date)}</time>
        <p class="item-content"></p>
      </div>
      <div class="item-actions">
        <button class="item-action" type="button" data-action="edit" data-id="${entry.id}">编辑</button>
        <button class="item-action" type="button" data-action="delete" data-id="${entry.id}">删除</button>
      </div>
    `;

    item.querySelector(".item-content").textContent = entry.content;
    manageList.append(item);
  });
}

function getVisibleEntries() {
  const keyword = searchInput.value.trim().toLowerCase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);

  return entries
    .filter((entry) => {
      const entryDate = new Date(entry.date);
      if (activeFilter === "today") return entryDate >= todayStart;
      if (activeFilter === "week") return entryDate >= weekStart;
      return true;
    })
    .filter((entry) => {
      if (!keyword) return true;
      const searchable = [entry.title || "", entry.content || "", (entry.tags || []).join(" ")].join(" ").toLowerCase();
      return searchable.includes(keyword);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
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

  const confirmed = window.confirm(`删除这条信息吗？\n\n${getEntryPreview(entry.content)}`);
  if (!confirmed) return;

  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  resetForm();
  render();
}

function resetForm() {
  form.reset();
  idInput.value = "";
  saveButton.textContent = "添加信息";
  cancelEditButton.hidden = true;
  contentInput.focus();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getEntryPreview(content) {
  return content.length > 42 ? `${content.slice(0, 42)}...` : content;
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
