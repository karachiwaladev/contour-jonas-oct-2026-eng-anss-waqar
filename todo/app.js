// Todo app: tasks persist in localStorage. Storage is kept separate from
// rendering so the data model can grow without UI rewrites.
//
// Task shape: { id, title, done, createdAt, dueDate?, tags? }
// dueDate ("YYYY-MM-DD") and tags (string[]) were added in #5 and are
// optional, so tasks saved by the #4 version load unchanged.

const store = {
  key: "todo.tasks.v1",

  load() {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.key) || "[]");
      return Array.isArray(tasks) ? tasks.map(normalize) : [];
    } catch {
      return [];
    }
  },

  save(tasks) {
    localStorage.setItem(this.key, JSON.stringify(tasks));
  },
};

function normalize(task) {
  return {
    ...task,
    dueDate: typeof task.dueDate === "string" && task.dueDate ? task.dueDate : null,
    tags: Array.isArray(task.tags) ? task.tags : [],
  };
}

let tasks = store.load();
const filters = { status: "all", tag: null };

const newId = () =>
  (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// "work, Urgent ,work" -> ["work", "urgent"]
function parseTags(text) {
  const tags = text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [...new Set(tags)];
}

function addTask(title, dueDate, tags) {
  tasks.unshift({ id: newId(), title, done: false, createdAt: new Date().toISOString(), dueDate: dueDate || null, tags });
  store.save(tasks);
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  store.save(tasks);
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  store.save(tasks);
}

// --- Dates -----------------------------------------------------------------

// Today as "YYYY-MM-DD" in local time, so it compares directly with <input type="date"> values.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dueState(task) {
  if (!task.dueDate || task.done) return null;
  const now = today();
  if (task.dueDate < now) return "overdue";
  if (task.dueDate === now) return "today";
  return null;
}

function formatDue(dueDate) {
  const [y, m, d] = dueDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// --- Filtering -------------------------------------------------------------

function allTags() {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort();
}

function visibleTasks() {
  return tasks.filter((t) => {
    if (filters.status === "active" && t.done) return false;
    if (filters.status === "completed" && !t.done) return false;
    if (filters.tag && !t.tags.includes(filters.tag)) return false;
    return true;
  });
}

// --- Rendering -------------------------------------------------------------

const form = document.getElementById("new-task");
const input = document.getElementById("title");
const dueInput = document.getElementById("due");
const tagsInput = document.getElementById("tags");
const error = document.getElementById("error");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const statusFilter = document.getElementById("status-filter");
const tagFilter = document.getElementById("tag-filter");

function render() {
  // Drop a tag filter whose last task was deleted.
  const tags = allTags();
  if (filters.tag && !tags.includes(filters.tag)) filters.tag = null;

  renderFilters(tags);

  const shown = visibleTasks();
  list.replaceChildren(...shown.map(renderTask));
  empty.hidden = shown.length > 0;
  empty.textContent = tasks.length ? "No tasks match these filters." : "No tasks yet. Add one above.";

  const remaining = tasks.filter((t) => !t.done).length;
  count.textContent = tasks.length ? `${remaining} of ${tasks.length} remaining` : "";
}

function renderFilters(tags) {
  for (const button of statusFilter.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.status === filters.status));
  }

  tagFilter.hidden = tags.length === 0;
  const chip = (label, value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(filters.tag === value));
    button.addEventListener("click", () => { filters.tag = value; render(); });
    return button;
  };
  tagFilter.replaceChildren(chip("All tags", null), ...tags.map((tag) => chip(`#${tag}`, tag)));
}

function renderTask(task) {
  const li = document.createElement("li");
  const state = dueState(task);
  li.className = ["task", task.done && "done", state && `due-${state}`].filter(Boolean).join(" ");
  li.dataset.id = task.id;

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.done ? "not done" : "done"}`);
  checkbox.addEventListener("change", () => { toggleTask(task.id); render(); });

  const body = document.createElement("span");
  body.className = "body";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = task.title;
  body.append(title);

  if (task.dueDate || task.tags.length) {
    const meta = document.createElement("span");
    meta.className = "meta";
    if (task.dueDate) {
      const due = document.createElement("span");
      due.className = "due";
      const prefix = state === "overdue" ? "Overdue · " : state === "today" ? "Due today · " : "Due ";
      due.textContent = prefix + formatDue(task.dueDate);
      meta.append(due);
    }
    for (const tag of task.tags) {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = `#${tag}`;
      meta.append(chip);
    }
    body.append(meta);
  }

  label.append(checkbox, body);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete";
  del.textContent = "Delete";
  del.setAttribute("aria-label", `Delete "${task.title}"`);
  del.addEventListener("click", () => { deleteTask(task.id); render(); });

  li.append(label, del);
  return li;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) {
    error.hidden = false;
    input.focus();
    return;
  }
  error.hidden = true;
  addTask(title, dueInput.value, parseTags(tagsInput.value));
  form.reset();
  input.focus();
  render();
});

input.addEventListener("input", () => { error.hidden = true; });

statusFilter.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  filters.status = button.dataset.status;
  render();
});

render();
