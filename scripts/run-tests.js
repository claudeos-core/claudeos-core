#!/usr/bin/env node
// Cross-platform test runner: expands tests/*.test.js via the glob package
// (already a runtime dep) and forwards matched paths to `node --test`.
// Required because Windows cmd.exe does not expand glob patterns, so
// `node --test tests/*.test.js` receives a literal path and fails in CI.

const { spawnSync } = require("node:child_process");
const { globSync } = require("glob");

const files = globSync("tests/*.test.js").sort();
if (files.length === 0) {
  console.error("No test files matched tests/*.test.js");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
