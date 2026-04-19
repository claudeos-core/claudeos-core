/**
 * ClaudeOS-Core — Language Configuration (single source of truth)
 *
 * The 10-language map for generated documentation output. Used by:
 *  - bin/lib/cli-utils.js (re-exports as SUPPORTED_LANGS / LANG_CODES / isValidLang)
 *  - bin/lib/lang-selector.js (interactive picker)
 *  - lib/memory-scaffold.js (translation prompt — re-exports as LANG_LABELS)
 *
 * Adding a language: add the entry here. All consumers pick it up automatically.
 *
 * Format: lang code → human-readable name (native script + English in parens
 * for non-English languages). Order is preserved by Object.keys, which drives
 * the lang-selector display order — `en` first, then alphabetical-ish.
 */

const LANGUAGES = {
  en:      "English",
  ko:      "한국어 (Korean)",
  "zh-CN": "简体中文 (Chinese Simplified)",
  ja:      "日本語 (Japanese)",
  es:      "Español (Spanish)",
  vi:      "Tiếng Việt (Vietnamese)",
  hi:      "हिन्दी (Hindi)",
  ru:      "Русский (Russian)",
  fr:      "Français (French)",
  de:      "Deutsch (German)",
};

const LANG_CODES = Object.keys(LANGUAGES);

function isValidLang(lang) {
  return LANG_CODES.includes(lang);
}

module.exports = { LANGUAGES, LANG_CODES, isValidLang };
