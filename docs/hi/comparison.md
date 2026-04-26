# समान Tools के साथ तुलना

यह पृष्ठ ClaudeOS-Core की तुलना अन्य Claude Code tools से करता है जो उसी सामान्य क्षेत्र में काम करते हैं (project-aware Claude Code configuration)।

> अंग्रेज़ी मूल: [docs/comparison.md](../comparison.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

**यह scope तुलना है, गुणवत्ता का निर्णय नहीं।** नीचे के अधिकांश tools जो वे करते हैं उसमें उत्कृष्ट हैं। बात यह है कि आपको यह समझने में मदद करें कि क्या ClaudeOS-Core आपकी समस्या में फिट होता है, या क्या उनमें से कोई बेहतर फिट होता है।

---

## TL;DR

यदि आप **आपके कोड में वास्तव में जो है उसके आधार पर `.claude/rules/` को स्वचालित रूप से उत्पन्न करना चाहते हैं**, यह ClaudeOS-Core की विशेषता है।

यदि आप कुछ और चाहते हैं (विस्तृत preset bundles, planning workflows, agent orchestration, multi-tool config sync), तो Claude Code ecosystem में अन्य tools बेहतर फिट होने की संभावना रखते हैं।

---

## ClaudeOS-Core अन्य tools से कैसे भिन्न है

ClaudeOS-Core के परिभाषित गुण:

- **आपके वास्तविक स्रोत कोड को पढ़ता है** (deterministic Node.js scanner — कोई LLM stack का अनुमान नहीं लगाता)।
- **fact-injected prompts के साथ 4-pass Claude pipeline** (paths/conventions एक बार निकाले जाते हैं और फिर से उपयोग किए जाते हैं)।
- **5 post-generation validators** (संरचना के लिए `claude-md-validator`, path-claim और content के लिए `content-validator`, intermediate JSON के लिए `pass-json-validator`, legacy plan files के लिए `plan-validator`, disk ↔ sync-map स्थिरता के लिए `sync-checker`)।
- **language-invariant validation के साथ 10 आउटपुट भाषाएँ**।
- **Per-project आउटपुट**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer — सब आपके कोड से derived, preset bundle से नहीं।

इस सामान्य क्षेत्र में अन्य Claude Code tools (आप उन्हें layer कर सकते हैं या अपनी आवश्यकता के आधार पर एक अलग चुन सकते हैं):

- **Claude `/init`** — Claude Code में built-in; एक LLM call में एक एकल `CLAUDE.md` लिखता है। छोटे projects पर त्वरित one-file setup के लिए सबसे अच्छा।
- **Preset/bundle tools** — curated agents, skills, या rules वितरित करते हैं जो "अधिकांश projects" के लिए काम करते हैं। तब सबसे अच्छा जब आपकी परिपाटियाँ bundle के defaults से मेल खाती हों।
- **Planning/workflow tools** — feature विकास के लिए संरचित methodologies (specs, phases आदि) प्रदान करते हैं। तब सबसे अच्छा जब आप Claude Code के ऊपर एक process layer चाहते हों।
- **Hook/DX tools** — Claude Code sessions में auto-save, code-quality hooks, या developer-experience improvements जोड़ते हैं।
- **Cross-agent rule converters** — आपके rules को Claude Code, Cursor आदि में sync रखते हैं।

ये tools अधिकतर **पूरक हैं, प्रतिस्पर्धी नहीं**। ClaudeOS-Core "आपके कोड से per-project rules उत्पन्न करें" काम संभालता है; अन्य अलग कार्य संभालते हैं। अधिकांश को एक साथ उपयोग किया जा सकता है।

---

## ClaudeOS-Core कब सही फ़िट है

✅ आप चाहते हैं कि Claude Code सामान्य के बजाय आपके project की परिपाटियों का पालन करे।
✅ आप एक नया project शुरू कर रहे हैं (या एक टीम को onboard कर रहे हैं) और तेज़ setup चाहते हैं।
✅ आप मैन्युअल रूप से `.claude/rules/` को maintain करते-करते थक गए हैं क्योंकि आपका codebase विकसित होता है।
✅ आप [12 समर्थित stacks](stacks.md) में से किसी एक में काम करते हैं।
✅ आप deterministic, repeatable आउटपुट चाहते हैं (एक ही कोड → हर बार एक ही rules)।
✅ आपको गैर-English भाषा में आउटपुट चाहिए (10 भाषाएँ built-in)।

## ClaudeOS-Core कब सही फ़िट नहीं है

❌ आप एक curated preset bundle of agents/skills/rules चाहते हैं जो scan step के बिना दिन एक से काम करता है।
❌ आपका stack समर्थित नहीं है और आप एक योगदान करने में रुचि नहीं रखते।
❌ आप agent orchestration, planning workflows, या coding methodology चाहते हैं — उनमें विशेषज्ञता वाले टूल का उपयोग करें।
❌ आपको बस एक एकल `CLAUDE.md` चाहिए, पूरा standards/rules/skills set नहीं — `claude /init` पर्याप्त है।

---

## Scope में क्या narrower vs wider है

ClaudeOS-Core broad-coverage bundles से **narrower** है (यह preset agents, hooks, या methodology ship नहीं करता — केवल आपके project के rules)। यह एक एकल artifact पर ध्यान केंद्रित करने वाले tools से **wider** है (यह CLAUDE.md प्लस standards, skills, guides, और memory की एक multi-directory tree उत्पन्न करता है)। आपके project के लिए कौन सी axis मायने रखती है उसके आधार पर चुनें।

---

## "बस Claude /init का उपयोग क्यों न करें?"

उचित प्रश्न। `claude /init` Claude Code में built-in है और एक LLM call में एक एकल `CLAUDE.md` लिखता है। यह तेज़ और zero-config है।

**यह तब अच्छा काम करता है जब:**

- आपका project छोटा है (≤30 फ़ाइलें)।
- आप Claude द्वारा एक त्वरित file-tree look से आपके stack का अनुमान लगाने में ठीक हैं।
- आपको केवल एक `CLAUDE.md` चाहिए, पूर्ण `.claude/rules/` set नहीं।

**यह तब संघर्ष करता है जब:**

- आपके project में एक custom convention है जिसे Claude एक त्वरित look से नहीं पहचानता (उदा., JPA के बजाय MyBatis, custom response wrapper, असामान्य package layout)।
- आप ऐसा आउटपुट चाहते हैं जो team members के बीच reproducible हो।
- आपका project इतना बड़ा है कि एक Claude call विश्लेषण समाप्त करने से पहले context window से टकरा जाता है।

ClaudeOS-Core उन मामलों के लिए बनाया गया है जहाँ `/init` संघर्ष करता है। यदि `/init` आपके लिए काम करता है, तो आपको शायद ClaudeOS-Core की आवश्यकता नहीं।

---

## "बस rules को मैन्युअल रूप से क्यों न लिखें?"

यह भी उचित है। Hand-writing `.claude/rules/` सबसे सटीक विकल्प है — आप अपने project को सबसे अच्छी तरह जानते हैं।

**यह तब अच्छा काम करता है जब:**

- आपके पास एक project है, आप एकमात्र developer हैं, scratch से rules लिखने में महत्वपूर्ण समय लगाने में आप ठीक हैं।
- आपकी परिपाटियाँ stable और well-documented हैं।

**यह तब संघर्ष करता है जब:**

- आप अक्सर नए projects शुरू करते हैं (हर एक को rule-writing समय की आवश्यकता होती है)।
- आपकी टीम बढ़ती है और लोग भूल जाते हैं कि rules में क्या है।
- आपकी परिपाटियाँ विकसित होती हैं, और rules उनके पीछे drift हो जाते हैं।

ClaudeOS-Core आपको एक एकल run में एक उपयोगी rule set की ओर अधिकांश रास्ता देता है। बाक़ी hand-tuning है — और कई users इसे एक खाली फ़ाइल से शुरू करने की तुलना में अपने समय का बेहतर उपयोग पाते हैं।

---

## "एक preset bundle का उपयोग करने की तुलना में क्या अंतर है?"

Everything Claude Code जैसे bundles आपको rules / skills / agents का एक curated set देते हैं जो "अधिकांश projects" के लिए काम करता है। जब आपका project bundle की assumptions के साथ फिट होता है तो वे तेज़ adoption के लिए बहुत अच्छे हैं।

**Bundles तब अच्छा काम करते हैं जब:**

- आपके project की परिपाटियाँ bundle के defaults से मेल खाती हैं (उदा., standard Spring Boot या standard Next.js)।
- आपके पास असामान्य stack विकल्प नहीं हैं (उदा., JPA के बजाय MyBatis)।
- आप एक starting point चाहते हैं और वहाँ से customize करने में खुश हैं।

**Bundles तब संघर्ष करते हैं जब:**

- आपका stack non-default tooling का उपयोग करता है (bundle के "Spring Boot" rules JPA मानते हैं)।
- आपके पास एक मज़बूत project-विशिष्ट convention है जिसे bundle नहीं जानता।
- आप चाहते हैं कि rules आपके कोड के विकसित होते ही update हों।

ClaudeOS-Core bundles को complement कर सकता है: project-विशिष्ट rules के लिए ClaudeOS-Core का उपयोग करें; सामान्य workflow rules के लिए एक bundle layer करें।

---

## समान tools के बीच चयन करना

यदि आप ClaudeOS-Core और किसी अन्य project-aware Claude Code tool के बीच चुन रहे हैं, तो खुद से पूछें:

1. **क्या मैं चाहता हूँ कि टूल मेरा कोड पढ़े, या क्या मैं अपने project का वर्णन करना चाहता हूँ?**
   Code-reading → ClaudeOS-Core। Description → अधिकांश अन्य।

2. **क्या मुझे हर बार एक ही आउटपुट चाहिए?**
   हाँ → ClaudeOS-Core (deterministic)। नहीं → उनमें से कोई भी।

3. **क्या मुझे पूर्ण standards/rules/skills/guides चाहिए, या केवल एक CLAUDE.md?**
   पूर्ण set → ClaudeOS-Core। केवल CLAUDE.md → Claude `/init`।

4. **क्या मेरी आउटपुट language English है, या कोई अन्य language?**
   English-only → कई tools फ़िट होते हैं। अन्य languages → ClaudeOS-Core (10 भाषाएँ built-in)।

5. **क्या मुझे agent orchestration, planning workflows, या hooks चाहिए?**
   हाँ → उपयुक्त समर्पित टूल का उपयोग करें। ClaudeOS-Core उन्हें नहीं करता।

यदि आपने ClaudeOS-Core और एक अन्य टूल का साथ-साथ उपयोग किया है, तो [अपने अनुभव के साथ issue खोलें](https://github.com/claudeos-core/claudeos-core/issues) — यह इस तुलना को अधिक सटीक बनाने में मदद करता है।

---

## यह भी देखें

- [architecture.md](architecture.md) — ClaudeOS-Core को क्या deterministic बनाता है
- [stacks.md](stacks.md) — ClaudeOS-Core जो 12 stacks समर्थित करता है
- [verification.md](verification.md) — post-generation safety net जो अन्य tools के पास नहीं है
