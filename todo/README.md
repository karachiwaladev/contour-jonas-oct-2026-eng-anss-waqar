# Todo

A simple todo app. You can create tasks, mark them done or not done, and delete them.
Tasks are saved in the browser's **localStorage**, so they survive reloads.

Built for ticket #4. It is plain HTML, CSS and JavaScript, with no build step or dependencies.

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
[{ "id": "…", "title": "Buy milk", "done": false, "createdAt": "2026-10-26T07:30:00.000Z" }]
```

New fields (such as a due date or tags) should be optional, so tasks saved by older versions still load.
