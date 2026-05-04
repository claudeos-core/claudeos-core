# Similar Tools के साथ तुलना

इस page पर ClaudeOS-Core की तुलना दूसरे Claude Code tools से करते हैं जो उसी area में काम करते हैं (project-aware Claude Code configuration).

> अंग्रेज़ी मूल: [docs/comparison.md](../comparison.md). हिन्दी version English के साथ sync रहता है.

**यह scope की तुलना है, quality का judgement नहीं.** नीचे दिए गए ज़्यादातर tools अपने काम में बढ़िया हैं. मक़सद बस यह समझाना है कि ClaudeOS-Core आपकी problem में fit होता है या उनमें से कोई better fit है.

---

## TL;DR

अगर आप चाहते हैं कि **`.claude/rules/` automatically generate हो, वो भी आपके actual code के basis पर**, तो ClaudeOS-Core यही करता है.

कुछ और चाहिए (curated preset bundles, planning workflows, agent orchestration, multi-tool config sync) तो Claude Code ecosystem के दूसरे tools शायद better fit होंगे.

---

## ClaudeOS-Core दूसरे tools से अलग कैसे है

ClaudeOS-Core की defining qualities:

- **असली source code पढ़ता है** (deterministic Node.js scanner. कोई LLM stack guess नहीं करता).
- **Fact-injected prompts वाला 4-pass Claude pipeline** (paths/conventions एक बार निकलते हैं, फिर reuse होते हैं).
- **5 post-generation validators**: structure के लिए `claude-md-validator`, path-claim और content के लिए `content-validator`, intermediate JSON के लिए `pass-json-validator`, legacy plan files के लिए `plan-validator`, disk ↔ sync-map consistency के लिए `sync-checker`.
- **10 output languages, language-invariant validation के साथ.**
- **Per-project output**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer. सब आपके code से derived, किसी preset bundle से नहीं.

इसी area के दूसरे Claude Code tools (इन्हें layer कर सकते हैं, या ज़रूरत के हिसाब से कोई एक चुन सकते हैं):

- **Claude `/init`**: Claude Code में built-in. एक LLM call में single `CLAUDE.md` लिखता है. छोटे projects पर quick one-file setup के लिए best.
- **Preset/bundle tools**: curated agents, skills, या rules ship करते हैं जो "ज़्यादातर projects" पर काम करें. तब best जब आपकी conventions bundle के defaults से match करें.
- **Planning/workflow tools**: feature development के लिए structured methodologies (specs, phases, etc.) देते हैं. तब best जब Claude Code के ऊपर process layer चाहिए.
- **Hook/DX tools**: Claude Code sessions में auto-save, code-quality hooks, या DX improvements जोड़ते हैं.
- **Cross-agent rule converters**: rules को Claude Code, Cursor वग़ैरह में sync रखते हैं.

ये tools ज़्यादातर **complementary हैं, competing नहीं.** ClaudeOS-Core "code से per-project rules generate करो" वाला काम करता है. बाक़ी tools अलग jobs करते हैं. ज़्यादातर को साथ use कर सकते हैं.

---

## ClaudeOS-Core कब सही fit है

✅ Claude Code generic conventions की जगह आपके project की conventions follow करे.
✅ नया project शुरू कर रहे हैं (या team onboard कर रहे हैं) और fast setup चाहिए.
✅ Codebase evolve होने के साथ-साथ `.claude/rules/` को manually maintain करते-करते थक गए हैं.
✅ [12 supported stacks](stacks.md) में से किसी एक पर काम करते हैं.
✅ Deterministic, repeatable output चाहिए (एक ही code → हर बार वही rules).
✅ Non-English language में output चाहिए (10 languages built-in).

## ClaudeOS-Core कब सही fit नहीं है

❌ Agents/skills/rules का curated preset bundle चाहिए जो scan step के बिना day one से काम करे.
❌ Stack supported नहीं है और contribute करने में interest नहीं है.
❌ Agent orchestration, planning workflows, या coding methodology चाहिए. उनमें specialized tool use करें.
❌ बस single `CLAUDE.md` चाहिए, पूरा standards/rules/skills set नहीं. `claude /init` काफ़ी है.

---

## Scope में narrower vs wider क्या है

ClaudeOS-Core broad-coverage bundles से **narrower** है (preset agents, hooks, या methodology ship नहीं करता. सिर्फ़ project के rules). और single artifact पर focus करने वाले tools से **wider** है (CLAUDE.md plus standards, skills, guides, और memory की multi-directory tree generate करता है). project के लिए जो axis matter करती हो उसके हिसाब से चुनें.

---

## "बस Claude /init use क्यों न करें?"

Fair question. `claude /init` Claude Code में built-in है और एक LLM call में single `CLAUDE.md` लिखता है. यह fast और zero-config है.

**अच्छा काम करता है जब:**

- Project छोटा है (≤30 files).
- Claude एक quick file-tree look से stack guess कर ले, ये ठीक है.
- सिर्फ़ `CLAUDE.md` चाहिए, पूरा `.claude/rules/` set नहीं.

**दिक्क़त होती है जब:**

- Project में कोई custom convention है जो Claude quick look में नहीं पकड़ पाता (जैसे JPA की जगह MyBatis, custom response wrapper, unusual package layout).
- Output team के बीच reproducible चाहिए.
- Project इतना बड़ा है कि एक Claude call analysis पूरी होने से पहले context window से टकरा जाता है.

ClaudeOS-Core उन्हीं cases के लिए बना है जहाँ `/init` struggle करता है. अगर `/init` से काम चल रहा है, तो शायद ClaudeOS-Core की ज़रूरत नहीं.

---

## "बस rules manually क्यों न लिखें?"

यह भी fair है. `.claude/rules/` hand-writing सबसे accurate option है. अपने project को आप ही सबसे बेहतर जानते हैं.

**अच्छा काम करता है जब:**

- एक project है, अकेले developer हैं, और scratch से rules लिखने में time invest करने में दिक्क़त नहीं.
- Conventions stable और well-documented हैं.

**दिक्क़त होती है जब:**

- नए projects अक्सर शुरू होते हैं (हर एक में rule-writing time लगता है).
- Team बढ़ती है और लोग भूल जाते हैं कि rules में क्या है.
- Conventions evolve होती हैं, और rules पीछे drift हो जाते हैं.

ClaudeOS-Core single run में useful rule set तक ज़्यादातर रास्ता तय कर देता है. बाक़ी hand-tuning है. कई users को blank file से शुरू करने से यह time का बेहतर use लगता है.

---

## "Preset bundle use करने से क्या फ़र्क़ है?"

Everything Claude Code जैसे bundles rules / skills / agents का curated set देते हैं जो "ज़्यादातर projects" पर काम करे. जब project bundle के assumptions से fit बैठे तो fast adoption के लिए बढ़िया हैं.

**Bundles अच्छा काम करते हैं जब:**

- Project की conventions bundle के defaults से match हों (जैसे standard Spring Boot या standard Next.js).
- Stack में unusual choices नहीं हैं (जैसे JPA की जगह MyBatis).
- Starting point चाहिए और वहाँ से customize करने में ख़ुश हैं.

**Bundles में दिक्क़त होती है जब:**

- Stack non-default tooling use करता है (bundle के "Spring Boot" rules JPA assume करते हैं).
- कोई strong project-specific convention है जो bundle नहीं जानता.
- Rules code के साथ-साथ evolve हों, ये चाहिए.

ClaudeOS-Core bundles को complement कर सकता है: project-specific rules के लिए ClaudeOS-Core, general workflow rules के लिए bundle layer कर लें.

---

## Similar tools में choose कैसे करें

ClaudeOS-Core और किसी दूसरे project-aware Claude Code tool में से चुनना है, तो ख़ुद से पूछें:

1. **Tool मेरा code पढ़े, या मैं अपना project describe करूँ?**
   Code-reading → ClaudeOS-Core. Description → ज़्यादातर बाक़ी.

2. **हर बार वही output चाहिए?**
   हाँ → ClaudeOS-Core (deterministic). नहीं → कोई भी चलेगा.

3. **पूरा standards/rules/skills/guides चाहिए, या सिर्फ़ CLAUDE.md?**
   पूरा set → ClaudeOS-Core. सिर्फ़ CLAUDE.md → Claude `/init`.

4. **Output language English है, या कोई और?**
   English-only → कई tools fit होते हैं. दूसरी languages → ClaudeOS-Core (10 languages built-in).

5. **Agent orchestration, planning workflows, या hooks चाहिए?**
   हाँ → उसी काम का dedicated tool use करें. ClaudeOS-Core ये नहीं करता.

ClaudeOS-Core और कोई दूसरा tool साथ-साथ use किया है, तो [अपने experience के साथ issue खोलें](https://github.com/claudeos-core/claudeos-core/issues). इससे यह comparison और accurate बनती है.

---

## यह भी देखें

- [architecture.md](architecture.md): ClaudeOS-Core को deterministic क्या बनाता है
- [stacks.md](stacks.md): ClaudeOS-Core जो 12 stacks support करता है
- [verification.md](verification.md): post-generation safety net जो दूसरे tools के पास नहीं
