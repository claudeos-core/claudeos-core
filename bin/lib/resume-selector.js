/**
 * ClaudeOS-Core — Resume/Fresh Selector
 *
 * When previous analysis files exist, prompts the user to continue or start fresh.
 * Arrow key interactive selector with fallback to number input.
 * Supports 10 languages matching lang-selector.js.
 */

const { log } = require("./cli-utils");

// ─── i18n texts ─────────────────────────────────────────────────
const TEXTS = {
  en: {
    warning: "Previous analysis found",
    continue: "Continue",
    continueDesc: "Resume from where it stopped",
    fresh: "Fresh",
    freshDesc: "Delete all and start over",
  },
  ko: {
    warning: "이전 분석 결과가 발견되었습니다",
    continue: "이어서 진행",
    continueDesc: "중단된 지점부터 재개",
    fresh: "처음부터",
    freshDesc: "모두 삭제하고 새로 시작",
  },
  "zh-CN": {
    warning: "发现之前的分析结果",
    continue: "继续",
    continueDesc: "从中断处恢复",
    fresh: "重新开始",
    freshDesc: "删除所有并重新开始",
  },
  ja: {
    warning: "以前の分析結果が見つかりました",
    continue: "続行",
    continueDesc: "中断した箇所から再開",
    fresh: "最初から",
    freshDesc: "すべて削除してやり直す",
  },
  es: {
    warning: "Se encontraron resultados de análisis previos",
    continue: "Continuar",
    continueDesc: "Reanudar desde donde se detuvo",
    fresh: "Desde cero",
    freshDesc: "Eliminar todo y empezar de nuevo",
  },
  vi: {
    warning: "Phát hiện kết quả phân tích trước đó",
    continue: "Tiếp tục",
    continueDesc: "Tiếp tục từ nơi đã dừng",
    fresh: "Làm mới",
    freshDesc: "Xóa tất cả và bắt đầu lại",
  },
  hi: {
    warning: "पिछले विश्लेषण परिणाम मिले",
    continue: "जारी रखें",
    continueDesc: "जहाँ रुका था वहाँ से फिर शुरू करें",
    fresh: "नए सिरे से",
    freshDesc: "सब हटाकर दोबारा शुरू करें",
  },
  ru: {
    warning: "Обнаружены предыдущие результаты анализа",
    continue: "Продолжить",
    continueDesc: "Возобновить с места остановки",
    fresh: "Заново",
    freshDesc: "Удалить всё и начать сначала",
  },
  fr: {
    warning: "Résultats d'analyse précédents trouvés",
    continue: "Continuer",
    continueDesc: "Reprendre là où ça s'est arrêté",
    fresh: "Recommencer",
    freshDesc: "Tout supprimer et recommencer",
  },
  de: {
    warning: "Vorherige Analyseergebnisse gefunden",
    continue: "Fortfahren",
    continueDesc: "Dort fortsetzen, wo es aufgehört hat",
    fresh: "Neustart",
    freshDesc: "Alles löschen und neu beginnen",
  },
};

const CHOICES = ["continue", "fresh"];

/**
 * Prompt user to continue or start fresh.
 * @param {string} lang - selected language code
 * @param {{ pass1Done: number, pass2Done: boolean }} status
 * @returns {Promise<"continue"|"fresh">}
 */
function selectResumeMode(lang, status) {
  const t = TEXTS[lang] || TEXTS.en;
  const pass1Label = `pass1: ${status.pass1Done} completed`;
  const pass2Label = `pass2: ${status.pass2Done ? "✓" : "✗"}`;
  const statusLine = `(${pass1Label}, ${pass2Label})`;

  return new Promise((resolve) => {
    // non-TTY fallback
    if (!process.stdin.isTTY) {
      const readline = require("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      log("");
      log(`  ⚠️  ${t.warning} ${statusLine}`);
      log("");
      log(`    1. ${t.continue} — ${t.continueDesc}`);
      log(`    2. ${t.fresh} — ${t.freshDesc}`);
      log("");
      rl.question("  Enter number (1-2): ", (answer) => {
        rl.close();
        const num = parseInt(answer.trim());
        if (num === 1) { resolve("continue"); return; }
        if (num === 2) { resolve("fresh"); return; }
        log("\n  Cancelled.\n");
        process.exit(0);
      });
      return;
    }

    // Arrow key interactive selector
    let selected = 0;
    const total = 2;

    function render() {
      const output = [];
      const BOLD_CYAN = "\x1b[1;36m";
      const RESET = "\x1b[0m";
      const items = [
        { label: t.continue, desc: t.continueDesc },
        { label: t.fresh, desc: t.freshDesc },
      ];
      for (let i = 0; i < total; i++) {
        const num = i + 1;
        if (i === selected) {
          output.push(`  ${BOLD_CYAN}❯ ${num}. ${items[i].label}  — ${items[i].desc}${RESET}`);
        } else {
          output.push(`    ${num}. ${items[i].label}  — ${items[i].desc}`);
        }
      }
      output.push("");
      const DIM = "\x1b[2m";
      output.push(`  \x1b[1m↑↓\x1b[0m${DIM} Move ${RESET} \x1b[1m1-2\x1b[0m${DIM} Jump ${RESET} \x1b[1mEnter\x1b[0m${DIM} Select ${RESET} \x1b[1mESC\x1b[0m${DIM} Cancel${RESET}`);
      return output;
    }

    // Print header
    log("");
    log(`  ⚠️  ${t.warning} ${statusLine}`);
    log("");

    // Try raw mode
    try {
      process.stdin.setRawMode(true);
    } catch (e) {
      // raw mode not supported — fallback to number input
      log(`    1. ${t.continue} — ${t.continueDesc}`);
      log(`    2. ${t.fresh} — ${t.freshDesc}`);
      log("");
      const readline = require("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question("  Enter number (1-2): ", (answer) => {
        rl.close();
        const num = parseInt(answer.trim());
        if (num === 1) { resolve("continue"); return; }
        if (num === 2) { resolve("fresh"); return; }
        log("\n  Cancelled.\n");
        process.exit(0);
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
        log("\n  Cancelled.\n");
        process.exit(0);
      }

      // ESC
      if (k === "\x1b" && key.length === 1) {
        process.stdin.setRawMode(false);
        log("\n  Cancelled.\n");
        process.exit(0);
      }

      // Up arrow
      if (k === "\x1b[A" || k === "\x1bOA") {
        selected = (selected - 1 + total) % total;
      }
      // Down arrow
      else if (k === "\x1b[B" || k === "\x1bOB") {
        selected = (selected + 1) % total;
      }
      // Number keys
      else if (k === "1") { selected = 0; }
      else if (k === "2") { selected = 1; }
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
        const choice = CHOICES[selected];
        const label = selected === 0 ? t.continue : t.fresh;
        const icon = selected === 0 ? "▶" : "🔄";
        log(`  ${icon} ${label}`);
        log("");
        resolve(choice);
        return;
      }
      else {
        return;
      }

      // Redraw
      process.stdout.write(`\x1b[${listHeight}A`);
      const updated = render();
      process.stdout.write(updated.map(l => `\x1b[2K${l}`).join("\n") + "\n");
    });
  });
}

module.exports = { selectResumeMode };
