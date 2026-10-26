// PreToolUse hook for Bash/PowerShell: blocks destructive commands
// (deleting files, rewriting git history, deleting GitHub resources).
// Exit code 2 blocks the tool call and shows the reason to Claude.
const fs = require("fs");

let input = {};
try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch {}
const cmd = (input.tool_input && input.tool_input.command) || "";

const rules = [
  [/(^|[\s;&|(])(rm|rmdir|unlink|shred)\s/, "deletes files"],
  [/(^|[\s;&|(])(del|erase|rd)\s+\S/i, "deletes files"],
  [/\bRemove-Item\b|\bClear-Content\b/i, "deletes files"],
  [/\bfind\b[^\n]*\s-delete\b/, "deletes files"],
  [/\btruncate\s/, "empties files"],
  [/\bgit\s+push\b[^\n]*(\s--force\b|\s-f\b|--force-with-lease|\s--delete\b|\s-d\b|\s\+\S|\s:\S)/, "force-pushes or deletes a remote ref"],
  [/\bgit\s+reset\b[^\n]*--hard\b/, "discards commits or changes"],
  [/\bgit\s+(clean|filter-branch|filter-repo)\b/, "deletes files or rewrites history"],
  [/\bgit\s+rebase\b/, "rewrites history"],
  [/\bgit\s+commit\b[^\n]*--amend\b/, "rewrites history"],
  [/\bgit\s+(branch|tag)\b[^\n]*\s-[dD]\b/, "deletes a branch or tag"],
  [/\bgit\s+stash\s+(drop|clear)\b/, "discards stashed work"],
  [/\bgit\s+(checkout\s+--(\s|$)|restore\b)/, "discards working-tree changes"],
  [/\bgh\s+\S+\s+delete\b/, "deletes a GitHub resource"],
  // Only the user merges, on GitHub; ticket work never goes straight to main.
  [/\bgh\s+pr\s+merge\b/, "merges a PR (only the user merges, on GitHub)"],
  [/\bgh\s+api\b[^\n]*\/pulls\/\d+\/merge\b/, "merges a PR (only the user merges, on GitHub)"],
  [/\bgit\s+push\b[^\n]*\s(\S+:)?(refs\/heads\/)?main(\s|$)/, "pushes straight to main (ticket work goes through a PR)"],
  [/\bgh\s+repo\s+(archive|rename|edit)\b/, "changes repository settings"],
  [/\bgh\s+api\b[^\n]*(-X|--method)\s*DELETE\b/i, "deletes a GitHub resource"],
  [/(^|[\s;&|(])mkfs(\.\w+)?\s/, "formats a disk"],
  [/(^|[;&|(]\s*)format(\.com)?\s+[a-z]:/i, "formats a disk"],
];

for (const [re, why] of rules) {
  if (re.test(cmd)) {
    process.stderr.write(`Blocked by .claude/hooks/guard.js: this command ${why}, and the factory never takes destructive actions. Find a non-destructive way, or ask the user to run it themselves.`);
    process.exit(2);
  }
}
