// Todo app: tasks persist in localStorage. Storage is kept separate from
// rendering so the data model can grow (due dates, tags) without UI rewrites.

const store = {
  key: "todo.tasks.v1",

  load() {
    try {
      const tasks = JSON.parse(localStorage.getItem(this.key) || "[]");
      return Array.isArray(tasks) ? tasks : [];
    } catch {
      return [];
    }
  },

  save(tasks) {
    localStorage.setItem(this.key, JSON.stringify(tasks));
  },
};

let tasks = store.load();

const newId = () =>
  (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function addTask(title) {
  tasks.unshift({ id: newId(), title, done: false, createdAt: new Date().toISOString() });
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

// --- Rendering -------------------------------------------------------------

const form = document.getElementById("new-task");
const input = document.getElementById("title");
const error = document.getElementById("error");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const count = document.getElementById("count");

function render() {
  list.replaceChildren(...tasks.map(renderTask));
  empty.hidden = tasks.length > 0;
  const remaining = tasks.filter((t) => !t.done).length;
  count.textContent = tasks.length
    ? `${remaining} of ${tasks.length} remaining`
    : "";
}

function renderTask(task) {
  const li = document.createElement("li");
  li.className = task.done ? "task done" : "task";
  li.dataset.id = task.id;

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.done ? "not done" : "done"}`);
  checkbox.addEventListener("change", () => { toggleTask(task.id); render(); });

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = task.title;
  label.append(checkbox, title);

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
  addTask(title);
  input.value = "";
  input.focus();
  render();
});

input.addEventListener("input", () => { error.hidden = true; });

render();
