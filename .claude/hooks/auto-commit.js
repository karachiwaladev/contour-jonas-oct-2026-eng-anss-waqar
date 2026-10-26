// Stop hook: commits everything that changed in the repo and pushes it.
// Commit body comes from .claude/hooks/.commit-msg (written by factory-loop
// ticks, e.g. "Closes #4: Todo app"); the file is cleared after a commit.
// Never force-pushes. Reports the outcome via systemMessage.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

try { JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch {}
const repo = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const msgFile = path.join(repo, ".claude", "hooks", ".commit-msg");

const git = (...args) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const tryGit = (...args) => { try { return { ok: true, out: git(...args) }; } catch (e) { return { ok: false, out: String(e.stderr || e.message).trim() }; } };
const say = (systemMessage) => { process.stdout.write(JSON.stringify({ systemMessage })); process.exit(0); };

if (!tryGit("rev-parse", "--is-inside-work-tree").ok) process.exit(0);

let committed = null;
git("add", "-A");
if (!tryGit("diff", "--cached", "--quiet").ok) {
  const notes = fs.existsSync(msgFile) ? fs.readFileSync(msgFile, "utf8").trim() : "";
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);
  const subject = notes ? `factory-loop: ${notes.split("\n")[0].replace(/^Closes #\d+:\s*/, "")}` : `factory-loop: auto-commit ${stamp} UTC`;
  const files = git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
  const body = [notes, `Files:\n${files.map((f) => `- ${f}`).join("\n")}`].filter(Boolean).join("\n\n");
  const message = `${subject}\n\n${body}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n`;
  const tmp = path.join(repo, ".git", "FACTORY_COMMIT_MSG");
  fs.writeFileSync(tmp, message);
  const res = tryGit("commit", "-q", "-F", tmp);
  if (!res.ok) say(`🏭 auto-commit failed: ${res.out}`);
  if (fs.existsSync(msgFile)) fs.writeFileSync(msgFile, "");
  committed = `${git("rev-parse", "--short", "HEAD")} (${files.length} file${files.length === 1 ? "" : "s"})`;
}

// Push anything not yet on the remote, including commits from an earlier failed push.
const ahead = tryGit("rev-list", "--count", "@{u}..HEAD");
if (ahead.ok && ahead.out === "0") { if (committed) say(`🏭 committed ${committed}, nothing to push`); process.exit(0); }

let push = tryGit("push", "-q", "origin", "HEAD");
if (!push.ok) {
  // Remote moved on: replay our commits on top, then try once more. No force.
  const pull = tryGit("pull", "-q", "--rebase", "--autostash", "origin", git("rev-parse", "--abbrev-ref", "HEAD"));
  if (!pull.ok) { tryGit("rebase", "--abort"); say(`🏭 push failed and rebase hit conflicts — resolve manually. ${pull.out}`); }
  push = tryGit("push", "-q", "origin", "HEAD");
}
say(push.ok ? `🏭 pushed${committed ? ` ${committed}` : ""} to origin` : `🏭 push failed: ${push.out}`);
