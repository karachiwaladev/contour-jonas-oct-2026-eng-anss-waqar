# Todo

A simple todo app. You can create tasks, mark them done or not done, and delete them.
Tasks are saved in the browser's **localStorage**, so they survive reloads.

- **Due dates** (optional, date only): unfinished tasks past their date show **Overdue** in red, and tasks due today show **Due today**.
- **Tags**: enter them comma-separated when adding a task (`work, urgent`). They are trimmed, lowercased and de-duplicated.
- **Filters**: **All / Active / Completed**, plus one tag at a time (or "All tags"). Both filters apply together.

Built for ticket #4, with filters, due dates and tags added in #5. It is plain HTML, CSS and JavaScript, with no build step or dependencies.

## Run it

Serve this folder with any static server and open it in a browser:

```bash
node ../.claude/skills/factory-loop/serve.js . 4173
# then open http://127.0.0.1:4173/
```

Opening `index.html` directly from disk also works in most browsers.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup: the new-task form and the task list |
| `app.js` | Storage layer (`store`) and task actions, plus rendering |
| `styles.css` | Styles, with automatic light and dark mode |

## Data

Tasks are stored under the localStorage key `todo.tasks.v1`, as a JSON array:

```json
[{ "id": "…", "title": "Buy milk", "done": false, "createdAt": "2026-10-26T07:30:00.000Z",
   "dueDate": "2026-10-28", "tags": ["home"] }]
```

`dueDate` (`YYYY-MM-DD` or `null`) and `tags` were added in #5 and are optional. Tasks saved by older
versions load with no due date and no tags. Keep any future fields optional in the same way.
