// Stop hook: appends user prompts from the session transcript that haven't
// been logged yet to .claude/prompts.jsonl (one JSON object per line).
const fs = require("fs");
const path = require("path");

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
const { session_id, transcript_path } = input;
if (!transcript_path || !fs.existsSync(transcript_path)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const outFile = path.join(projectDir, ".claude", "prompts.jsonl");
const stateFile = path.join(projectDir, ".claude", "hooks", ".prompts-logged.json");

let state = {};
try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
const seen = new Set(state[session_id] || []);

const promptText = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content) || content.some((b) => b.type === "tool_result")) return null;
  const text = content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return text || null;
};

const lines = [];
for (const raw of fs.readFileSync(transcript_path, "utf8").split("\n")) {
  if (!raw.trim()) continue;
  let entry;
  try { entry = JSON.parse(raw); } catch { continue; }
  // Skip tool results, skill/command expansions and subagent traffic.
  if (entry.type !== "user" || entry.isSidechain || entry.turnCompanion) continue;
  if (!entry.uuid || seen.has(entry.uuid)) continue;
  const prompt = promptText(entry.message && entry.message.content);
  if (prompt === null) continue;
  seen.add(entry.uuid);
  lines.push(JSON.stringify({
    timestamp: entry.timestamp,
    session_id,
    uuid: entry.uuid,
    // Prompts the user typed vs. ones injected by /loop or cron jobs.
    source: entry.isMeta ? "scheduled" : "user",
    prompt,
  }));
}

if (lines.length) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.appendFileSync(outFile, lines.join("\n") + "\n");
}
state[session_id] = [...seen];
fs.mkdirSync(path.dirname(stateFile), { recursive: true });
fs.writeFileSync(stateFile, JSON.stringify(state));
