/**
 * ClaudeOS-Core — Interactive Language Selector
 *
 * Arrow key interactive selector with fallback to number input.
 * Supports TTY raw mode (arrow keys) and non-TTY (piped input).
 */

const { log, LANG_CODES, SUPPORTED_LANGS, isValidLang } = require("./cli-utils");

// Interactive language selection (arrow key selector)
function selectLangInteractive() {
  return new Promise((resolve) => {
    // Fallback to number input if stdin is not a TTY (e.g., piped input)
    if (!process.stdin.isTTY) {
      const readline = require("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      log("");
      log("╔══════════════════════════════════════════════════╗");
      log("║  Select generated document language (required)   ║");
      log("╚══════════════════════════════════════════════════╝");
      log("");
      log("  Generated files (CLAUDE.md, Standards, Rules,");
      log("  Skills, Guides) will be written in this language.");
      log("");
      LANG_CODES.forEach((code, i) => {
        log(`    ${String(i + 1).padStart(2)}. ${code.padEnd(6)} — ${SUPPORTED_LANGS[code]}`);
      });
      log("");
      rl.question(`  Enter number (1-${LANG_CODES.length}) or language code: `, (answer) => {
        rl.close();
        const trimmed = answer.trim();
        const num = parseInt(trimmed);
        if (num >= 1 && num <= LANG_CODES.length) { resolve(LANG_CODES[num - 1]); return; }
        if (isValidLang(trimmed)) { resolve(trimmed); return; }
        resolve(null);
      });
      return;
    }

    // Arrow key interactive selector
    let selected = 0;
    const total = LANG_CODES.length;

    // Description text per language (shown when hovering)
    const DESC = {
      en:      "Generated files (CLAUDE.md, Standards, Rules,\n  Skills, Guides) will be written in English.",
      ko:      "생성되는 파일(CLAUDE.md, Standards, Rules,\n  Skills, Guides)이 한국어로 작성됩니다.",
      "zh-CN": "生成的文件（CLAUDE.md、Standards、Rules、\n  Skills、Guides）将以简体中文编写。",
      ja:      "生成されるファイル（CLAUDE.md、Standards、Rules、\n  Skills、Guides）は日本語で作成されます。",
      es:      "Los archivos generados (CLAUDE.md, Standards, Rules,\n  Skills, Guides) se escribirán en español.",
      vi:      "Các file được tạo (CLAUDE.md, Standards, Rules,\n  Skills, Guides) sẽ được viết bằng tiếng Việt.",
      hi:      "जनरेट की गई फ़ाइलें (CLAUDE.md, Standards, Rules,\n  Skills, Guides) हिन्दी में लिखी जाएंगी।",
      ru:      "Сгенерированные файлы (CLAUDE.md, Standards, Rules,\n  Skills, Guides) будут написаны на русском языке.",
      fr:      "Les fichiers générés (CLAUDE.md, Standards, Rules,\n  Skills, Guides) seront rédigés en français.",
      de:      "Die generierten Dateien (CLAUDE.md, Standards, Rules,\n  Skills, Guides) werden auf Deutsch verfasst.",
    };

    function render() {
      const output = [];
      // Description line (changes with selection)
      const code = LANG_CODES[selected];
      const descLines = (DESC[code] || DESC.en).split("\n");
      descLines.forEach(l => output.push(`  ${l}`));
      output.push("");
      // Language list
      const BOLD_CYAN = "\x1b[1;36m";
      const RESET = "\x1b[0m";
      for (let i = 0; i < total; i++) {
        const c = LANG_CODES[i];
        const label = SUPPORTED_LANGS[c];
        const num = String(i + 1).padStart(2);
        if (i === selected) {
          output.push(`  ${BOLD_CYAN}❯ ${num}. ${c.padEnd(6)} — ${label}${RESET}`);
        } else {
          output.push(`    ${num}. ${c.padEnd(6)} — ${label}`);
        }
      }
      output.push("");
      const DIM = "\x1b[2m";
      output.push(`  \x1b[1m↑↓\x1b[0m${DIM} Move ${RESET} \x1b[1m1-0\x1b[0m${DIM} Jump ${RESET} \x1b[1mEnter\x1b[0m${DIM} Select ${RESET} \x1b[1mESC\x1b[0m${DIM} Cancel${RESET}`);
      return output;
    }

    // Print header once
    log("");
    log("╔══════════════════════════════════════════════════╗");
    log("║  Select generated document language (required)   ║");
    log("╚══════════════════════════════════════════════════╝");
    log("");

    // Try raw mode BEFORE rendering arrow UI — if unsupported, fall back to number input
    try {
      process.stdin.setRawMode(true);
    } catch (e) {
      // setRawMode not supported (e.g., some Windows terminal emulators)
      // Show description + language list and fall back to number input (no arrow UI rendered)
      log("  Generated files (CLAUDE.md, Standards, Rules,");
      log("  Skills, Guides) will be written in this language.");
      log("");
      const readline = require("readline");
      LANG_CODES.forEach((code, i) => {
        log(`    ${String(i + 1).padStart(2)}. ${code.padEnd(6)} — ${SUPPORTED_LANGS[code]}`);
      });
      log("");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`  Enter number (1-${total}) or language code: `, (answer) => {
        rl.close();
        const trimmed = answer.trim();
        const num = parseInt(trimmed);
        if (num >= 1 && num <= total) { resolve(LANG_CODES[num - 1]); return; }
        if (isValidLang(trimmed)) { resolve(trimmed); return; }
        resolve(null);
      });
      return;
    }

    // Raw mode succeeded — render interactive arrow UI
    const lines = render();
    const listHeight = lines.length;
    process.stdout.write(lines.join("\n") + "\n");

    process.stdin.resume();

    process.stdin.on("data", (key) => {
      const k = key.toString();

      // Ctrl+C
      if (k === "\x03") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeAllListeners("data");
        resolve(null);
        return;
      }

      // ESC (single byte only — arrow keys send \x1b[ or \x1bO which are 3 bytes)
      if (k === "\x1b" && key.length === 1) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeAllListeners("data");
        resolve(null);
        return;
      }

      // Up arrow (normal mode \x1b[A and application mode \x1bOA)
      if (k === "\x1b[A" || k === "\x1bOA") {
        selected = (selected - 1 + total) % total;
      }
      // Down arrow (normal mode \x1b[B and application mode \x1bOB)
      else if (k === "\x1b[B" || k === "\x1bOB") {
        selected = (selected + 1) % total;
      }
      // Number keys 1-9 (direct jump)
      else if (k >= "1" && k <= "9" && parseInt(k) <= total) {
        selected = parseInt(k) - 1;
      }
      // 0 for 10
      else if (k === "0" && total >= 10) {
        selected = 9;
      }
      // Enter
      else if (k === "\r" || k === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeAllListeners("data");
        // Clear the list and reprint final selection
        process.stdout.write(`\x1b[${listHeight}A`);
        for (let i = 0; i < listHeight; i++) {
          process.stdout.write("\x1b[2K\n");
        }
        process.stdout.write(`\x1b[${listHeight}A`);
        log(`  ✅ ${LANG_CODES[selected]} — ${SUPPORTED_LANGS[LANG_CODES[selected]]}`);
        log("");
        resolve(LANG_CODES[selected]);
        return;
      }
      else {
        return; // Ignore other keys
      }

      // Redraw list (clear each line to prevent ghost text from different-length strings)
      process.stdout.write(`\x1b[${listHeight}A`);
      const updated = render();
      process.stdout.write(updated.map(l => `\x1b[2K${l}`).join("\n") + "\n");
    });
  });
}

module.exports = { selectLangInteractive };
