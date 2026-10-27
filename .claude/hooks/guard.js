// PreToolUse hook (Bash, PowerShell, Read, Grep): blocks destructive or unsafe
// actions. That means deleting files, rewriting git history, deleting GitHub
// resources, piping a download into a shell, and reading .env secrets.
// Mirrors the permissions.deny rules in .claude/settings.json; regexes also
// catch variants that prefix-matching deny rules miss (flag order, pipelines,
// PowerShell). Exit code 2 blocks the tool call and shows the reason to Claude.
const fs = require("fs");
const path = require("path");

let input = {};
try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch {}
const tool = input.tool_name || "";
const args = input.tool_input || {};

const block = (why) => {
  process.stderr.write(`Blocked by .claude/hooks/guard.js: this ${why}. The factory never takes destructive or unsafe actions. Find a safe way, or ask the user to do it themselves.`);
  process.exit(2);
};

// .env, .env.local, .env.production … but not committed templates.
const isEnvFile = (p) => {
  const base = path.basename(String(p).replace(/\\/g, "/"));
  return /^\.env(\..+)?$/i.test(base) && !/^\.env\.(example|sample|template|dist)$/i.test(base);
};

// --- Read / Grep: never open .env files ------------------------------------
if (tool === "Read" && isEnvFile(args.file_path || "")) block("reads a .env file, which holds secrets");
if (tool === "Grep") {
  if (args.path && isEnvFile(args.path)) block("searches a .env file, which holds secrets");
  if (args.glob && /(^|[\/{,])\.env(\.[^\/,}]*)?([},]|$)|(^|[\/{,])\.env\*/.test(args.glob)) block("searches .env files, which hold secrets");
}
if (tool === "Read" || tool === "Grep") process.exit(0);

// --- Shell commands ---------------------------------------------------------
const cmd = args.command || "";

const rules = [
  [/(^|[\s;&|(])(rm|rmdir|unlink|shred)\s/, "command deletes files"],
  [/(^|[\s;&|(])(del|erase|rd)\s+\S/i, "command deletes files"],
  [/\bRemove-Item\b|\bClear-Content\b/i, "command deletes files"],
  [/\bfind\b[^\n]*\s-delete\b/, "command deletes files"],
  [/\btruncate\s/, "command empties files"],
  [/\bgit\s+push\b[^\n]*(\s--force\b|\s-f\b|--force-with-lease|\s--delete\b|\s-d\b|\s\+\S|\s:\S)/, "command force-pushes or deletes a remote ref"],
  [/\bgit\s+reset\b[^\n]*--hard\b/, "command discards commits or changes"],
  [/\bgit\s+(clean|filter-branch|filter-repo)\b/, "command deletes files or rewrites history"],
  [/\bgit\s+rebase\b/, "command rewrites history"],
  [/\bgit\s+commit\b[^\n]*--amend\b/, "command rewrites history"],
  [/\bgit\s+(branch|tag)\b[^\n]*\s-[dD]\b/, "command deletes a branch or tag"],
  [/\bgit\s+stash\s+(drop|clear)\b/, "command discards stashed work"],
  [/\bgit\s+(checkout\s+--(\s|$)|restore\b)/, "command discards working-tree changes"],
  [/\bgh\s+\S+\s+delete\b/, "command deletes a GitHub resource"],
  // Only the user merges, on GitHub; ticket work never goes straight to main.
  [/\bgh\s+pr\s+merge\b/, "command merges a PR (only the user merges, on GitHub)"],
  [/\bgh\s+api\b[^\n]*\/pulls\/\d+\/merge\b/, "command merges a PR (only the user merges, on GitHub)"],
  [/\bgit\s+push\b[^\n]*\s(\S+:)?(refs\/heads\/)?main(\s|$)/, "command pushes straight to main (ticket work goes through a PR)"],
  [/\bgh\s+repo\s+(archive|rename|edit)\b/, "command changes repository settings"],
  [/\bgh\s+api\b[^\n]*(-X|--method)\s*DELETE\b/i, "command deletes a GitHub resource"],
  [/(^|[\s;&|(])mkfs(\.\w+)?\s/, "command formats a disk"],
  [/(^|[;&|(]\s*)format(\.com)?\s+[a-z]:/i, "command formats a disk"],
  // Download piped straight into an interpreter: curl … | sh, iwr … | iex, sh -c "$(curl …)".
  [/\b(curl|wget|fetch|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n]*\|\s*(sudo\s+)?(sh|bash|zsh|dash|ksh|fish|pwsh|powershell|iex|Invoke-Expression|python3?|node|perl|ruby)\b/i, "command pipes a download into a shell"],
  [/\b(sh|bash|zsh|dash|ksh)\b[^\n]*(\$\(|<\(|`)\s*(curl|wget)\b/, "command runs a downloaded script"],
  [/\b(iex|Invoke-Expression)\b[^\n]*\(\s*(iwr|irm|Invoke-WebRequest|Invoke-RestMethod|New-Object\s+Net\.WebClient)/i, "command runs a downloaded script"],
];

for (const [re, why] of rules) if (re.test(cmd)) block(why);

// Any command that names a .env file (cat .env, source .env, Get-Content .env.local, grep KEY .env …).
const tokens = cmd.split(/[\s"'`;&|()<>=,]+/).filter(Boolean);
if (tokens.some(isEnvFile)) block("command reads a .env file, which holds secrets");
