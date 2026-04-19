/**
 * Single source of truth for the 9 guide files Pass 3 must generate.
 *
 * Used by:
 *   - bin/commands/init.js Guard 3 (fails Pass 3 if any are missing)
 *   - content-validator/index.js [5/9] (reports MISSING/EMPTY)
 *
 * Adding a guide: edit this file only.
 */

const EXPECTED_GUIDE_FILES = [
  "01.onboarding/01.overview.md",
  "01.onboarding/02.quickstart.md",
  "01.onboarding/03.glossary.md",
  "02.usage/01.faq.md",
  "02.usage/02.real-world-examples.md",
  "02.usage/03.do-and-dont.md",
  "03.troubleshooting/01.troubleshooting.md",
  "04.architecture/01.file-map.md",
  "04.architecture/02.pros-and-cons.md",
];

module.exports = { EXPECTED_GUIDE_FILES };
