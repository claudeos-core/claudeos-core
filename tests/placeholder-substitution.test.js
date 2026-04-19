/**
 * Regression tests for placeholder substitution across the CLI.
 *
 * Guards against bug #19 (and the class of bugs around String.prototype.replace
 * second-argument special-character interpretation): when the replacement is
 * passed as a string, sequences like `$1`, `$&`, `$$` are interpreted as
 * regex back-references rather than literal characters. For project paths,
 * domain names, or language labels that may contain `$`, this corrupts the
 * resulting prompt/plan content silently.
 *
 * Fix: all placeholder substitutions use a replacement *function*
 *      `() => literal` which bypasses special-character interpretation.
 *
 * Related fix in lib/plan-parser.js::replaceFileBlock covered by
 * tests/plan-parser.test.js.
 */

const { test, describe, it } = require("node:test");
const assert = require("node:assert");

describe("injectProjectRoot: $ special characters in PROJECT_ROOT path", () => {
  // Isolate the logic for testing without depending on process.cwd()
  function injectProjectRootIsolated(text, projectRoot) {
    const normalizedRoot = projectRoot.replace(/\\/g, "/");
    return text.replace(/\{\{PROJECT_ROOT\}\}/g, () => normalizedRoot);
  }

  const template = "Root: {{PROJECT_ROOT}}/claudeos-core/generated";

  it("preserves $1-style sequences in path as literals", () => {
    const r = injectProjectRootIsolated(template, "/tmp/proj-$1-test");
    assert.ok(r.includes("/tmp/proj-$1-test"),
      "$1 in path must remain literal, not be replaced by a capture group");
  });

  it("preserves $$ in path as literal $$ (not collapsed to $)", () => {
    const r = injectProjectRootIsolated(template, "/tmp/.$$-pid-test");
    assert.ok(r.includes("/tmp/.$$-pid-test"),
      "$$ in path must remain literal $$, not collapse to $");
  });

  it("preserves $& in path as literal (not expanded to whole match)", () => {
    const r = injectProjectRootIsolated(template, "/tmp/$&-matches");
    assert.ok(r.includes("/tmp/$&-matches"),
      "$& in path must remain literal, not expand to the whole match");
    // Extra paranoia: the placeholder itself must not reappear in output
    assert.ok(!r.includes("{{PROJECT_ROOT}}"),
      "the placeholder must not leak back into the output via $& expansion");
  });

  it("preserves backslash paths correctly normalized to forward slashes", () => {
    // Windows-style path with dollar sign
    const r = injectProjectRootIsolated(template, "C:\\Users\\john\\$backup\\proj");
    assert.ok(r.includes("C:/Users/john/$backup/proj"),
      "backslashes must normalize to forward slashes while $ is preserved");
  });

  it("replaces multiple occurrences correctly", () => {
    const multi = "A={{PROJECT_ROOT}}, B={{PROJECT_ROOT}}";
    const r = injectProjectRootIsolated(multi, "/tmp/$1-root");
    const occurrences = (r.match(/\/tmp\/\$1-root/g) || []).length;
    assert.equal(occurrences, 2,
      "both placeholder occurrences must be replaced with the literal path");
  });
});

describe("Pass 1 placeholder substitution: $ special chars in DOMAIN_GROUP", () => {
  // Mirror of the init.js:Pass1 substitution logic
  function substitute(template, domainList, passNum) {
    return template
      .replace(/\{\{DOMAIN_GROUP\}\}/g, () => domainList)
      .replace(/\{\{PASS_NUM\}\}/g, () => String(passNum));
  }

  it("preserves $ in domain names (e.g. Java inner-class style)", () => {
    const template = "Analyze: {{DOMAIN_GROUP}} (pass {{PASS_NUM}})";
    const r = substitute(template, "Outer$Inner, Service$Impl", 1);
    assert.equal(r, "Analyze: Outer$Inner, Service$Impl (pass 1)",
      "$ in domain names (Java inner class style) must be preserved literally");
  });

  it("preserves $1 in domain strings", () => {
    const template = "Analyze: {{DOMAIN_GROUP}}";
    const r = substitute(template, "user-$1-domain, order-$2-domain", 2);
    assert.ok(r.includes("user-$1-domain"),
      "$1 must remain literal in domain names");
    assert.ok(r.includes("order-$2-domain"),
      "$2 must remain literal in domain names");
  });

  it("preserves $$ (double dollar) in domain names", () => {
    const template = "Analyze: {{DOMAIN_GROUP}}";
    const r = substitute(template, "cost-$$-USD", 1);
    assert.ok(r.includes("cost-$$-USD"),
      "$$ must not collapse to $ in domain names");
  });

  it("preserves $& without causing placeholder to reappear", () => {
    // CRITICAL: with string-form replace, $& would insert the matched
    // {{DOMAIN_GROUP}} back into the output — then the second replace for
    // {{PASS_NUM}} is fine but the placeholder leaks through.
    const template = "Analyze: {{DOMAIN_GROUP}}, then {{PASS_NUM}}";
    const r = substitute(template, "payment & $& billing", 1);
    assert.ok(r.includes("payment & $& billing"),
      "$& must be preserved literally");
    assert.ok(!r.includes("{{DOMAIN_GROUP}}"),
      "the DOMAIN_GROUP placeholder must not leak back into the output");
  });
});

describe("LANG_NAME placeholder substitution: defensive against $", () => {
  // Current labels in lang-instructions.json have no $, but the substitution
  // is still defensive against future labels that might.
  function substitute(body, langLabel) {
    return body.replace(/\{\{LANG_NAME\}\}/g, () => langLabel);
  }

  it("standard labels work (English, 한국어, 日本語, etc.)", () => {
    const body = "Write in {{LANG_NAME}}.";
    assert.equal(substitute(body, "한국어 (Korean)"), "Write in 한국어 (Korean).");
    assert.equal(substitute(body, "日本語 (Japanese)"), "Write in 日本語 (Japanese).");
    assert.equal(substitute(body, "Español (Spanish)"), "Write in Español (Spanish).");
  });

  it("defensive: labels with $ would be preserved literally", () => {
    // Hypothetical future label containing $ (e.g., a custom locale code)
    const body = "Write in {{LANG_NAME}}.";
    assert.equal(substitute(body, "Test-$1-Lang"), "Write in Test-$1-Lang.",
      "label with $1 must be preserved literally");
  });
});
