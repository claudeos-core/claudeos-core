# Changelog

## Releases

Quick navigation to recent releases:

- [`2.5.4`](#254--2026-09-13) — Honesty patch: `sync-checker` is documented as dormant since v2.1.0 instead of as a working check; a multi-dialect project no longer presents a fabricated primary database to Pass 3; the Pass 3a size budget stops contradicting the verbatim data the same file demands; `.env`-only scope of credential masking stated in `docs/safety.md` × 10 languages
- [`2.5.3`](#253--2026-09-12) — Oracle JDBC DSN credential masking, unmaskable shapes dropped whole; Pattern F (package-by-feature Java layout, previously zero domains); controller files counted exactly once; a package named `constructor` no longer aborts `init`; "no domains" warning keyed on what Phase 1 detected and never silent on a zero total; `.env` secrets section in `docs/safety.md` × 10 languages
- [`2.5.2`](#252--2026-09-09) — Safety patch: URL passwords the masking rule cannot reach are dropped whole (raw `/` `?` `#` space, digit-leading, `@` in a query string), `host`/`apiTarget` never carry the sentinel, `init` names the dropped keys. Scanner byte-identical to 2.5.1.
- [`2.5.1`](#251--2026-09-08) — Legacy JVM detection (non-Boot Spring 1.x–6.x, Ant / Ivy, Eclipse / IntelliJ / NetBeans metadata, `WEB-INF/lib` jars, `web.xml`, Maven multi-module and sibling projects, eGovFrame), `.env` key-name redaction gaps closed, `.env.example` DB detection, LF line endings
- [`2.5.0`](#250--2026-09-07) — Correctness release: append-only `decision-log.md`, read-only `health`, user-owned rules survive `--force`, flat-layout Java detection, Java multi-module + Next.js route groups, orchestrator-written path allowlist, `.env` credential masking
- [`2.4.4`](#244--2026-05-04) — Translation polish for `docs/{lang}/` × 8 non-Korean languages + broken `#quick-start` anchor fix
- [`2.4.3`](#243--2026-04-27) — Skills catalog reconciliation (MANIFEST ↔ §6 sync) + `STALE_PATH` naming-convention placeholder exemption
- [`2.4.2`](#242--2026-04-26) — README structural tightening + 9-language re-sync (same-day after v2.4.1 docs overhaul)
- [`2.4.1`](#241--2026-04-26) — Documentation overhaul, 10-language localization, fixture sanitization (post-release docs)
- [`2.4.0`](#240--2026-04-25) — Session Continuity Protocol (v2.4 series feature 1 of 3)
- [`2.3.3`](#233--2026-04-24) — Template emoji consistency + optional `totalLines` splitter axis
- [`2.3.2`](#232--2026-04-23) — `cmdInit` decomposition + UX polish + validator co-evolution
- [`2.3.1`](#231--2026-04-23) — Patch: Windows CI breakage in `npm test`
- [`2.3.0`](#230--2026-04-23) — Language-invariant structural validation; path-hallucination defense; single-SPA detection
- [`2.2.0`](#220--2026-04-21) — Deterministic 8-section CLAUDE.md scaffold
- [`2.1.2`](#212--2026-04-21) — Patch: master plan removal cleanup regression
- [`2.1.1`](#211--2026-04-20) — Docs-only maintenance
- [`2.1.0`](#210--2026-04-20) — Pass 3 split mode (3a/3b/3c/3d-aux); `Prompt is too long` mitigation
- [`2.0.x`](#202--2026-04-20) — Pass 4 architecture refactor; gap-fill no-op invariant
- [`1.7.x`](#171--2026-04-11) — Initial monorepo detection; multi-stack expansion
- [`1.6.x`](#162--2026-04-09) — 6 → 10+ stack templates (NestJS, Vue-Nuxt, Fastify, Angular)
- [`1.5.x`](#151--2026-04-06) — Initial public preview

For older entries scroll past v1.5.0 or use the GitHub blame view.

---

## [2.5.4] — 2026-09-13

Honesty patch. Nothing here fixes a crash or a wrong file — every item is a place where the tool told the user something that was not true, or told the model something that was not true. Three came out of running the full `init` pipeline end to end on a real backend for the first time; the fourth is the documentation half of the masking work in v2.5.0–2.5.3. One file carries a behavior change (`plan-installer/pass3-context-builder.js`), one carries a prompt-spec change (`pass-prompts/templates/common/pass3a-facts.md`), and the rest is documentation across ten languages.

### Fixed — honesty

- **`sync-checker` is documented as dormant, not as a working check.** Master-plan aggregation was removed in v2.1.0, so `manifest-generator` writes `sync-map.json` with an empty mapping list and `sync-checker` returns `pass` from an early exit — before either of its two steps runs. The README nevertheless listed it among five validators as *"disk ↔ `sync-map.json` registration consistency across 7 tracked dirs"*, with a table row promising orphaned/unregistered detection at `fail-on-error`, and `docs/verification.md` gave it a full section describing a bidirectional walk. A green `sync-checker` line in `health` output therefore read as evidence when it means *"nothing to validate"*. Every place that describes it now says so plainly, in all ten languages — the two README statements, the `verification.md` section, the `architecture.md` validator table, the `commands.md` severity table (which promised `Exit 1` at the `fail` tier), and the `comparison.md` feature bullet — including the one case where it is **not** dormant: a project upgraded from before v2.1.0 that still carries a `claudeos-core/plan/` directory, which `init` deliberately leaves untouched, so the map is populated from it and the check really runs. **No code change** — the checker keeps its backward-compatible behavior; only the claims about it changed.

- **A multi-dialect project no longer presents a fabricated primary database to Pass 3.** `stack.database` is the first engine matched in source-file order (build file → app config → pom) — deterministic, but arbitrary when a project declares several, and `pass3-context.json` passed it alone. Later passes read it as *the* database, found the tree disagreed, and reported the mismatch back as a discrepancy in their own analysis. The context now also carries `databases` (the full list, only when it holds more than one) and `databasePrimary`, which states in words that the singular field is first-match order and not a primary. `stack.database` keeps its value and legacy meaning, so `project-analysis.json` and every existing consumer are unchanged; single-engine and no-engine projects emit exactly what they did before (both new fields are `null`). Phase 1's console line for such a project now reads `(first match, not a primary)` instead of `(primary)`; the single-engine line is unchanged.

- **The Pass 3a size budget no longer contradicts the file's own content rules.** `pass3a-facts.md` asked for the non-allowlist portion to stay under 10 KB while separately requiring verbatim signatures, per-domain method names and layer-naming facts — data that does not fit in 10 KB for a project of any size, and whose whole purpose is to stop 3b/3c/3d from re-opening `pass2-merged.json`. The budget is now 32 KB, stated as a target that the verbatim rule outranks, with an explicit cut order (sub-HIGH anti-patterns → recap sections → class inventories the allowlist already carries as paths) and an explicit never-cut list.

### Docs

- **`docs/safety.md` states that credential masking covers `.env*` only**, in all ten languages. Key-name redaction, in-string masking and the whole-value drop apply to the one `.env*` file `init` reads. A credential committed to a framework config file — `application.yml`, `application.properties`, `appsettings.json`, a Spring profile, a Django `settings.py` — is not masked, because the scanner takes only facts such as the server port from those files and never copies their values into `project-analysis.json`. Pass 1–3 read the source tree directly, though, so such a password is visible to the model and can be quoted into a generated document. The page now says this — and says explicitly that its own **How to check** step will not catch them, because they never reach `project-analysis.json` at all. It points the reader at the generated *documents* instead (`CLAUDE.md`, `claudeos-core/**/*.md`, `.claude/rules/**/*.md`), which is where such a value could actually surface. Verified against a fixture: an `application.yml` carrying a username and password produces a `project-analysis.json` containing neither — only the port and the DB type.

### Not changed

- `sync-checker` itself. Reviving it means repopulating `sync-map.json` from the Pass 3 outputs, which is a feature, not a correctness patch.
- `stack.database`'s value or semantics — only what Pass 3 is told about it. The `pass3a-facts.md` Stack section now asks 3a to carry the full engine list and the `databasePrimary` sentence into the fact sheet, since 3b/3c/3d read that file rather than `pass3-context.json`.
- `docs/diagrams.md`: its `sync-checker` node depicts orchestration order, which is accurate — health-checker does call it — so the flow chart is left alone.
- The `~10 KB` figure in `plan-installer/source-paths.js` was a stale reference to the old budget; its two comments now state that the allowlist is exempt from the document target and that `MAX_PATHS` is what bounds the injected section.

### Migration

None. `pass3-context.json` gains two optional fields that are `null` for every single-engine project. No scanner behavior, domain detection, file count, or masking result changes; the v2.5.3 test suite passes unchanged, and three tests are added (1028 → 1031) pinning `databases` / `databasePrimary` for the multi-engine, single-engine and no-engine cases.

## [2.5.3] — 2026-09-12

Correctness patch from a full audit of the v2.5.2 package — every item below was reproduced by running `init` on real trees and then diffed against the v2.5.1 npm tarball to confirm none of it was a v2.5.2 regression; all four pre-date it. Two files carry the behavior changes (`lib/env-parser.js`, `plan-installer/scanners/scan-java.js`), one new helper (`lib/stack-shape.js`) removes a duplicated predicate, and `plan-installer/index.js` gains a per-side warning. The `detectStack()` decomposition is again **not** in this release: it is a pure refactor with no user-visible change, and mixing it into a correctness patch would dilute the verification of the fixes below.

Everything here was then re-verified by loading the v2.5.2 scanner and the v2.5.3 scanner side by side and running both over the same fixtures — 24 real layouts (A, B, C, D, E, supplementary, inverted deep-sweep, legacy `src` / `JavaSource`, eGovFrame `web/`, `controller/impl`, multi-module, 12-domain, no-controller, zero-Java, non-standard root, deep `kr/co` packages, mixed A+B, `v1` directories, skip-list-only, flat+domain Boot) and a 35-value `.env` corpus. Result: **no crash, no domain lost, no domain-count reduction, no domain renamed, and no value masked that v2.5.2 left alone.** Every difference is one of the fixes below. That pass also found five defects in the first cut of this release and three pre-existing ones the release had left in place, all listed inline. Test suite: 981 → **1028 / 1028** pass (47 added, 0 changed).

### Fixed — safety

- **Oracle JDBC DSN credentials are masked.** `jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL` carries its credentials *before* the connect descriptor, not as URL userinfo. The `://` gate never matched it, the scheme-less branch only knows the Go/MySQL `@tcp(` shape, and neither `SPRING_DATASOURCE_URL` nor `JDBC_URL` trips a key-name rule — so this was the one DSN shape that reached `project-analysis.json` verbatim, confirmed by reading the file after a real `init`. It is the standard shape in the pre-Boot SI trees v2.5.1 opened up, and v2.5.2 listed it as the largest remaining hole.

  `maskOracleDsn` rewrites `user/password@` to `***/***@` and keeps the descriptor, so host, port and service name stay in the generated docs. All four forms are covered: EZConnect (`@//host:port/svc`), SID (`@host:port:SID`), TNS descriptor (`@(DESCRIPTION=…)`) and OCI alias (`jdbc:oracle:oci:user/pw@ALIAS`, also `oci8`, `kprb`); matching is case-insensitive. The `@` that ends the credentials is found by anchor strength — `@//` first, then `@(`, then the first `@` followed by a host character — so a password containing `@` or `/` is masked whole in the EZConnect and TNS forms. A credential-free `jdbc:oracle:thin:@//…` is untouched, and the `?user=…&password=…` parameter form is still handled by the parameter rule.

  Two holes in the first cut of that rule are closed. **The parameter rule now also runs on a masked Oracle DSN** — returning straight from the Oracle branch skipped it, so `…scott/tiger@//h:1521/X?password=tiger` had its userinfo masked while the parameter kept the password in clear. And **a shape whose credential boundary cannot be located is dropped WHOLE** (`***REDACTED***`, key named in `envInfo.credentialWarnings`) rather than falling through: the `://` gate cannot see an Oracle DSN either, so `jdbc:oracle:thin:usr@tenancy/tiger@//h/X` (an `@` inside the user, the Oracle Cloud / IAM name shape), `…:/tiger@//h/X` (no user segment) and `…scott/tiger@` (no descriptor) travelled to `project-analysis.json` verbatim — the exact hole v2.5.2 spent a release closing for URL userinfo, reopened for this one shape. An alias carrying neither `/` nor `@` holds no credentials and still passes through. Over a 35-value corpus the Oracle rule now leaks nothing and changes no non-Oracle value. Pinned by 9 masked, 11 must-not-touch and 3 must-drop shapes, the parameter combination, and end-to-end `readStackEnvInfo` assertions that the password survives nowhere and the dropped key is reported.

- **Three more residues the masking rules left behind are closed.** A 6,000-value differential fuzz against v2.5.2 — random passwords over every punctuation class, across 14 DSN shapes — put the remaining leak rate at 321 values. All three causes pre-date this release and none is Oracle-specific.

  **A password containing a parameter separator was half-masked.** `PARAM_RE` stops its capture at `&`, `;` or whitespace because those separate one connection parameter from the next, so `?password=a&b` became `?password=***&b`. The tail cannot be masked blindly — `&sslmode=require` really is the next parameter — so every `&`/`;`/space-separated chunk after the password is now inspected and must itself read as `key=`; the first that does not is password residue and the whole value goes. A genuine following parameter is kept (pinned both ways).

  **The userinfo rule could match the wrong `@`.** Its userinfo group may not cross a `/`, so when the username holds an `@` and the password holds a `/` (`postgres://usr@tenancy:ab/cd@db:5432/app`) the match ended at the username's `@` and `tenancy:ab` became the "host" — with `cd` still in clear. `userinfoMasked` was then true, which is exactly the gate that skips the v2.5.2 backstop, so the value sailed through. The captured host is now validated as a host, **including a numeric port**: that is what separates `tenancy:ab` (wrong) from `host` in `postgres://u:p@host/path/@x`, a legitimate URL whose `@` merely sits in the path and which must still mask normally. IPv6 (`[::1]:6379`) and `%2f`-style paths are unaffected.

  **A scheme-less Go/MySQL DSN the rule cannot parse is dropped.** That rule needs a username free of `@`, `:`, `/` and whitespace; `usr@tenancy:pw@tcp(host)/db` matched nothing and passed through verbatim.

  Leak rate over the corpus: **3,398 (v2.5.2) → 31**, with **zero** leaks that v2.5.2 did not already have and **zero** values masked that v2.5.2 left alone. The 31 are the documented Oracle SID `@`-in-password limit and shapes whose authority is irreducibly ambiguous. Every newly dropped value was checked against v2.5.2's output: each one had a fragment of the password, or a corrupted host, in it.

### Fixed — scanner

- **Package-by-feature Java layouts are detected (Pattern F).** Until now a domain was *registered* only by a layer directory in its path (`controller/`, `service/`, `adapter/in/web/`). The v2.4.0 deep-sweep catch-all counts layer-less files, but only for a domain something else already registered — it cannot register one. So the layout Spring's own *Structuring Your Code* guide recommends —

  ```
  com/acme/order/OrderController.java
  com/acme/order/OrderService.java
  com/acme/order/OrderRepository.java
  ```

  — produced **zero backend domains**, regardless of `@RestController`, `*Application.java`, or file count; and in a mixed tree the one domain that did have a `controller/` directory survived while the layer-less ones silently vanished (their files were dropped, not misattributed). Reproduced on a five-layout matrix: A, B, C and E detected; this shape did not.

  Pattern F runs as a supplementary pass for **every** tree, after A–E. Across the 24-layout matrix above, **no A–E tree changes its domain names, patterns or counts** — the only differences anywhere are the controller-ledger corrections below. What F does change in a layered tree is a controller that has no layer directory at all: such a file used to be dropped silently, and is now attached to the domain that already owns its directory (`order/OrderApiController.java` next to `order/controller/` raises `order`'s controller count by one instead of vanishing). A `*Controller.java` registers its parent directory as the domain when that parent is not a layer, adapter, or skip-list directory and not a flat base package; the domain's files are then classified by class-name suffix (`*Controller`, `*Service`, `*Repository`/`*Mapper`/`*Dao`, `*Dto`/`*Entity`/`*Vo`/`*Request`/`*Response`, everything else as a service) anchored at the exact directory the controller was found in, so a same-named package under another parent is not swept in. A controller sitting directly in the base package next to `*Application.java` is the Initializr single-package demo and keeps the Pattern C rule (domain from the class name), with the main-class location naming the base package. `rootPackage` is derived from the feature directories with the same 80% algorithm when the layer-marker pass finds nothing. Verified against Gradle/Maven module roots, legacy bare `src/` roots **that carry a package** (a package-less `src/order/OrderController.java` is not an F signal — see Known limits), numbered eGovFrame controllers (`EgovSample2Controller`), hexagonal `adapter/in/rest/` (stays E; `rest` is never a domain), `controller/impl/` (not an F signal), a class named `Constructor`, and a same-named package elsewhere in the tree.

  Two defects in the first cut of Pattern F are fixed. **A nested feature package is counted by itself only.** The per-feature glob is recursive on purpose — `order/dto/` is `order`'s own sub-package — but `order/item/`, which holds a controller of its own, is a separate domain, and counting its files in both reported 7 files for 5, inflating the parent's `services` while its `controllers` stayed right (the ledger already covered those). Every file under a deeper F feature directory is now excluded from the parent; nothing is lost, that domain counts them itself. Pinned at two and three levels of nesting by asserting the per-domain totals sum to the real file count. **And the base-package rule keys on where `*Application.java` actually lives.** Accepting `relDir === rootPkgPath` as a second signal misfired on every *single-domain* project, because `rootPackage` is derived from layer markers and with one domain those markers **are** that domain's directory: a layer-less `order/OrderFacadeController.java` beside `order/adapter/in/web/` was read as an Initializr demo and became a second domain literally named `orderfacade`, splitting one logical domain in two, while an `order/{dto,internal}` feature lost the files no Pattern C glob reaches. A directory an earlier pattern already owns now wins outright.

- **A Java package named after an `Object.prototype` member no longer aborts `init`.** `domainPaths["constructor"]` resolved to the inherited `Object.prototype.constructor`, so `if (!map[d]) map[d] = []` read truthy, the entry was never created, and the next line threw `domainPaths[d].push is not a function` — a hard `init` abort on any tree holding a package legally named `constructor`. Through the Pattern F path the same lookup silently dropped the domain and incremented a property on the global `Object` instead. The three directory-keyed maps are `Object.create(null)` now, which removes the class; `Object.keys` / `values` / `entries` and spread are unaffected. Present since v2.4.0 and identical in v2.5.2 — found by this release's review, not introduced by it.

- **A controller-only domain is counted once.** Pattern B counted `{d}/controller/X.java`; when the domain had nothing else (`standardCount === 0`) the deep-sweep re-globbed `**/{d}/**/*.java`, walked up the same file's path, met `controller`, and counted it again — `controllers: 2, totalFiles: 2` for one file. Any service or DTO file hid it by skipping the sweep, which is why it only surfaced on scaffold-stage domains. Every primary pattern now records the files it counted in a ledger the sweep consults; the sweep still finds inverted `{layer}/{domain}/` files it alone can reach (pinned: `front/settle/controller/` + `core/inventory/handler/settle/` → `controllers: 1, services: 1`, where v2.5.2 reported `2, 1`).

- **A mixed layer-first + domain-first tree keeps both kinds of domain.** Pattern B/D was gated on `if (!detectedPattern)`, so a single `controller/{domain}/` directory anywhere claimed the project for Pattern A and the domain-first pass never ran — every `{domain}/controller/` domain beside it was **dropped**, not misattributed. `controller/cart/` + `billing/controller/` reported only `cart`. The pass now runs for every tree and, when something already claimed it, behaves exactly like the Pattern F pass: it registers only domains no earlier pattern claimed, attaches controllers through the ledger so nothing is counted twice, and skips the B-vs-D majority vote — re-voting would flip an A tree's `detectedPattern` and switch every A domain onto the wrong counting globs (pinned: three domain-first domains beside one layer-first domain, which a vote would have flipped 3:1).

  One consequence is worth stating plainly, because it changes the domain SET of a layer-first project. This pass is also what collects the controllers it skips as "flat" — a `*Controller.java` sitting directly in the base package — and the existing re-attach loop turns each of those into a Pattern C domain named after the class. Those controllers used to be dropped in an A tree, since the layer-first glob needs a directory under `controller/` and never matched them. So `com/acme/{DemoApplication,HomeController}.java` beside `com/acme/controller/order/` now reports `home` alongside `order`, where v2.5.2 reported `order` alone. The file is recovered rather than invented — but a re-run of `init` on such a project will show one more domain than before, and a Standards/Rules set for it.

- **A supplementary-scan domain is registered as `B`, never as the tree's detected pattern.** Every glob in that scan is `**/{domain}/{layer}/*.java` — the layer directory is the file's parent and the domain its grandparent — so a match there *proves* the layout is domain-first; a layer-first path cannot match it. Inheriting `detectedPattern` mislabelled such a domain inside a Pattern A tree, the counting loop ran layer-first globs against a domain-first layout, matched nothing, and emitted the domain with **`totalFiles: 0`** — a domain in the generated docs with no files behind it. Over 1,500 random layouts this affected 43–50 per 300; it is now **0 per 300**.

- **The domain order is now a function of the tree, not of `glob()`.** `glob()` makes no promise about enumeration order — measured at five to eight different orderings for the same pattern over twenty calls — and `structure-scanner` sorted domains on `totalFiles` alone. That is not a total order, and `Array#sort` is stable, so domains with an **equal** file count kept whatever order the filesystem walk happened to produce. Since that array feeds `splitDomainGroups`, two `init` runs on an unchanged codebase could place different domains in different Pass 1 batches: over forty runs of a six-domain tree, two distinct batch *memberships* appeared (`[notice, order, pay, stat]` vs `[member, order, pay, stat]`), which means different prompts and different generated documents. Breaking the tie on the domain name — a plain comparison, so it does not depend on locale — makes the result reproducible; a domain with more files still sorts ahead, so trees whose domains differ in size are unaffected (they were already deterministic). Pre-existing and worse in v2.5.2 (four orderings on a pure Pattern A tree). **Resume was never affected**: it reads the persisted `domain-groups.json` rather than re-deriving the grouping. Pinned by a twenty-run ordering assertion plus a file-count-wins case.

### Changed — `init` output

- **The "no domains" warning is keyed on what Phase 1 detected, per side.** The former gate was `backend === 0 && frontend === 0`. That was correct for what it protected — a Next.js-only project legitimately has zero backend domains, a Spring-only one zero frontend domains — but it was silent in the case that matters: a Spring Boot + Next.js repo whose Java scanner returned nothing produced a frontend-only document set with no warning, because the frontend count kept the total above zero. A plain `||` is not the fix; in the audit it fired on all eight fixtures, five of them healthy.

  `hasBackendStack(stack)` / `hasFrontendStack(stack)` (new `lib/stack-shape.js`) decide it. `hasBackendStack` is the predicate `detectStack()` already used inline to split ports — `framework` set and not `vite`, or a JVM / Python language — now shared so the two call sites cannot drift (pinned by a source-level test). `init` prints `Backend detected (java / spring-boot) but no backend domains were found`, or the frontend counterpart; Next-only, Vite-only and Spring-only trees stay silent.

  A zero **total** is reported first and unconditionally, which the first cut of this change got wrong in two ways. Keying the whole block on the per-side predicates dropped the original `No domains detected` message for a project Phase 1 recognized *neither* side of — a bare repository, a plain Node script, a TypeScript library — which then produced zero domains, skipped Pass 1, and said nothing at all; that is the case the warning existed for. It also let the per-side message lie: a Spring-only repo with zero backend domains was told `Pass 1 will analyze the frontend only` when there was no frontend to analyze. The zero-total message now fires first and names whichever side Phase 1 did detect, and `stack.language` renders as `unknown` rather than `null` when a framework was identified without one. Pinned by an 11-case matrix plus source-level assertions.

### Docs

- **`docs/safety.md` gains a `.env` secrets section**, in all ten languages. The three rules — key-name redaction, in-string credential masking with every supported DSN shape including Oracle, and the v2.5.2 whole-value drop — were documented only in `stacks.md`; the question they answer is a safety question, and that is the page people open for it. The title now says so.
- `docs/stacks.md`, all ten languages: pattern table lists six patterns; Pattern F described; Oracle masking added to the `.env` section; Known limits revised (below).
- **Localized cross-doc anchors fixed.** The new section's two links to `stacks.md#env-extraction-v220` were copied verbatim into every translation, but that slug only exists in the English file — `ja`, `zh-CN`, `es`, `vi`, `ru`, `fr` and `de` each translate the heading, so 14 links resolved to nothing. Each now points at its own file's heading (`#env-抽出-v220`, `#extracción-de-env-v220`, …); `ko` was already correct and `hi` keeps the English heading. All ten verified against the GitHub slug rules.
- README test badge 981 → 1028 across all ten languages. `.gitignore`: duplicate `.claude/` line removed, trailing newline restored.

### Known limits

- A controller whose class name does not end in `Controller` (`OrderResource`, `OrderEndpoint`) is not a Pattern F signal. Since this release `init` says so in Phase 2 when a detected backend yields no domains, instead of proceeding silently.
- `controller/impl/` is registered by Pattern A as a domain named `impl` (pre-existing; unchanged here).
- In a mixed B + F tree, `rootPackage` still comes from the layer-marker pass, so a single B domain can name it (`com.acme.legacy` for `com/acme/legacy/controller/`) — the v2.4.0 behavior for any single-domain Pattern B tree.
- An Oracle SID / alias form (`jdbc:oracle:thin:u/p@HOST:1521:SID`) whose password itself contains `@` is masked only up to that `@`; the EZConnect and TNS forms have an unambiguous anchor and are masked whole. This is the bulk of the 31 values still leaking in the fuzz corpus above.
- A legacy bare `src/` root whose feature directories carry no package (`src/order/OrderController.java`) yields no Pattern F domain: one path segment is not enough to tell a feature package from a base package. `src/com/acme/order/…` works.
- Pattern F has no module awareness — the same package path in two Gradle/Maven modules is one domain, and its files are counted together. Pattern D exists for the layer-directory equivalent; the package-by-feature counterpart is not built.
- A layer-less controller is attached to an existing domain by directory NAME, so `batch/order/OrderBatchController.java` joins an `order` domain registered from `controller/order/`. Before this release the file was dropped entirely; merging is the better of the two, but it is a merge.
- A package-by-feature repository produces one domain per feature package and there is no cap on the total, so a 20-feature backend now yields 20 domains where v2.5.2 yielded none — Pass 1 batching and `init` runtime scale with it.
- A Pattern D tree registers its domain twice and counts the shared files twice with it. `api/…/order/controller/` + `admin/…/order/controller/` correctly upgrade to `api/order` and `admin/order`, but the supplementary scan then finds `api/…/order/service/` and registers a bare `order` on top, so `OrderService.java` is counted under both `api/order` and `order` — three files reported as five. Byte-for-byte identical in v2.5.2 (this release only relabels that third domain from `D` to `B`, with the same counts); fixing it means reworking the D upgrade, which this patch deliberately does not touch.
- `detectStack()` remains a single ~1,360-line function. Deferred deliberately (see the release note above); it needs its own release.

### Migration

None. `project-analysis.json` is additive: Pattern F domains carry `"pattern": "F"` and no new fields. Projects with a package-by-feature backend will see backend domains — and backend Standards/Rules/Skills — for the first time; re-run `init` to generate them. Oracle DSN values change from plaintext to `***/***@…` in `envInfo.vars`, or to `***REDACTED***` with the key named in `envInfo.credentialWarnings` for the shapes listed above.

Two count corrections will show on re-run for trees that had them wrong: a controller-only domain drops from `2` files to `1` (it was the same file twice), and a layered domain that also holds a layer-less `*Controller.java` gains that file. Both move the count toward the number of files actually on disk.

## [2.5.2] — 2026-09-09

Safety patch. v2.5.0 introduced URL credential masking and v2.5.1 closed its key-name gaps; this release closes the shapes the masking rule itself cannot reach. **Scope is deliberately narrow.** `plan-installer/scanners/scan-java.js` and `plan-installer/stack-detector.js` are **byte-identical to v2.5.1**, so no detection, domain or counting behavior changes at all. The Java layout work that was originally staged for this version (eGovFrame `web/` HTTP layers, `*/impl/` sub-layers, directory-fallback corrections) is withdrawn and deferred: independent review reproduced hard failures in it, including a scanner crash and a zero-domain `init` abort on trees v2.5.1 handled correctly. Shipping the credential fixes on their own is worth more than shipping them attached to a scanner regression.

`project-analysis.json` gains one optional array (`stack.envInfo.credentialWarnings`); two existing fields (`stack.envInfo.host`, `stack.envInfo.apiTarget`) can now be `null` where they previously carried a sentinel string. Test suite: 974 → **981 / 981** pass (7 added).

### Fixed — safety

- **A URL password the userinfo rule cannot rewrite is no longer written verbatim.** v2.5.0 masks userinfo between `://` and the last `@` of the authority, and deliberately does not rewrite an `@` that appears after the first `/`, because such an `@` normally belongs to the path (`https://cdn.example.com/npm/@scope/pkg`) and rewriting it would replace the real host. `postgres://app:pa/ss@db:5432/app` therefore passed through unchanged, and because its key is `DATABASE_URL` the key-name rule did not backstop it either. That was the remaining combination able to put a plaintext password into `project-analysis.json`, which the Pass 3/4 prompts instruct the model to read. v2.5.1 recorded it as an accepted limit on the grounding that such a value is not a valid URL; the base64 alphabet contains `/`, so generated passwords hit the shape routinely.

  `hasUnmaskedUrlCredentials` locates the `@` that actually terminates an authority: the last one followed by something that can be a host, optionally `:port`, then a delimiter or end of value. If the text before it holds no `/`, the userinfo rule already handled the value. If it does, the real authority ran past the point where that rule was forced to stop, and the **whole value** is dropped (`***REDACTED***`) rather than partially rewritten. Once the authority is ambiguous the host cannot be located reliably, and a lost host is a far cheaper failure than a leaked credential.

  Three shapes beyond the original `/` case are caught. A password **beginning with digits** (`postgres://user:12345/6@db/app`) defeats any check that reasons from the truncated authority, since `user:12345` reads as a valid `host:port`. A password holding a **space** is invisible to the userinfo rule, whose character class excludes whitespace. And a DSN that also carries an `@` **inside a query parameter** — an email address, a redirect URL — must not end the search early; the scan continues past that `@` to the earlier one that terminates the real authority.

  `user:12345` and `a.com:8080` are syntactically indistinguishable, so where the ambiguity is irreducible the scheme breaks the tie: for a DSN the value is treated as credentials, for `http`/`https`/`ws`/`wss` — where an `@` inside a path is routine — a head that is already a complete `host[:port]` means the authority ended there. Three further guards keep credential-free values intact: a bracketed IPv6 literal can only be a host, an `@` that sits in a query string after a path has begun is query content, and an unexpanded `${VAR}` template holds no live secret. Both corpora are pinned as tests: thirteen flagged shapes and twenty-six that must not flag.

- **`envInfo.host` and `envInfo.apiTarget` never carry the sentinel.** Both are rendered straight into CLAUDE.md §3, and the scaffold's only sentinel instruction covers `envInfo.vars`, so a dropped value reached the generated document as a literal `| API Proxy Target | ***REDACTED*** |` row. They are `null` instead, which the scaffold already handles by omitting the row.

- **`init` says which key it dropped.** Losing a `DATABASE_URL` silently looks like a detection bug. Phase 1 now names the affected keys — key names only, never any part of the value — for the root `.env` **and** for a sub-directory SPA's own `.env`, which the first cut of this warning did not read.

### Withdrawn

- The Java layout work staged for v2.5.2 is not in this release. Independent review of it reproduced, against v2.5.1 as the baseline: a `TypeError` crash out of `scanJavaDomains` on a class name containing `Constructor`; a zero-domain result that aborts `init` on a single-domain legacy tree v2.5.1 scanned correctly; and five shapes that silently dropped real domains or their files, including numbered eGovFrame controllers (`EgovSample2Controller`) and any domain whose package name appears in an internal skip list. The 1,016-test suite in that revision passed while every one of those defects was live. The feature is worth having and will return once it is verified against those shapes rather than against the layouts it was designed for.

### Behavior changes

Three observable changes, all in `.env` handling:

- A URL value whose userinfo the masking rule cannot rewrite is dropped whole instead of passing through. This covers a password holding a raw `/`, `?`, `#` or space, or one beginning with digits. The v2.5.0 assertion pinning the old pass-through result for `postgres://app:pa/ss@db:5432/app` is superseded, not relaxed. Percent-encode the password (`/` as `%2F`) to keep scheme, host and path visible in the generated docs.
- `envInfo.host` and `envInfo.apiTarget` are `null` rather than `"***REDACTED***"` when their value was dropped, so the corresponding CLAUDE.md §3 row is omitted instead of showing the sentinel.
- `init` prints a Phase 1 warning naming the keys it dropped. No value material is printed.

### Known limits

- Where a URL's authority is genuinely ambiguous the scheme decides, so an `https://` value whose password both begins with digits and contains a `/` (`https://user:12345/6@host/x`) is read as a path and left masked-through. Ordinary HTTP basic-auth credentials, and every DSN scheme, are caught.
- Oracle-style JDBC DSNs (`jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL`) are still not masked by any rule: the `://` gate cannot match them, the scheme-less branch fires only on the Go/MySQL `@tcp(`/`@unix(` shape, and neither `SPRING_DATASOURCE_URL` nor `JDBC_URL` trips a key-name rule. This shape is common in the legacy-Java trees v2.5.1 opened up and is the largest remaining hole; it is called out here rather than left implicit.
- Gradle build files are still not comment-stripped (Maven poms are), so a `//`-commented Spring coordinate still counts, as it always has for Boot.
- Cross-file inheritance (a corporate parent pom that itself extends `spring-boot-starter-parent`; a version held only in a parent pom outside the repository) remains out of scope; the resulting `null` falls through to LLM-side analysis.

### Migration

None required, and no scanner output changes: domains, counts and patterns are exactly what v2.5.1 produced. If a project's `.env` holds a URL password containing a raw `/`, `?`, `#` or space, or one beginning with digits, that value is now dropped from `project-analysis.json` and `init` says so in Phase 1. Percent-encode the password and re-run to restore the host.

## [2.5.1] — 2026-09-08

Patch release. Two things: the v2.5.0 credential-masking headline had a hole in it, and `init` on pre-Boot Java projects — the shape of most enterprise/SI codebases — reported "No language detected" and stopped. One new file (`plan-installer/jvm-detect.js`, pure text functions). `project-analysis.json` gains optional, additive fields only (`stack.packaging`, `stack.springFrameworkVersion`, `stack.sourceLayout`); no existing field changes type or meaning, and the `detected` array of every Spring Boot project is byte-identical to v2.5.0 output. Test suite: 825 → **974 / 974** pass (149 added, 0 changed).

### Fixed — safety

- **`.env` key-name redaction had gaps.** v2.5.0 masked URL userinfo and connection parameters (`?password=`), and its `PARAM_RE` accepted `pass` as a parameter name — but the key-name rule beside it did not, so `DB_PASS=hunter2` was written verbatim into `project-analysis.json`. Closed, together with the other abbreviated and less-common names found by a 71-name sweep: `PASS` / `PW` (segment-anchored: `DB_PASS`, `ADMIN_PW`, `MYSQL_PASS` are redacted; `BYPASS_AUTH`, `PASSENGER_APP_ENV`, `COMPASS_URL`, `PWD` are not), `PASSPHRASE`, `PEPPER` (trailing segment only — `PEPPER_ROUNDS` is a cost parameter), `SSH_KEY` (anchored — `SSH_KEYSCAN_HOSTS` is a host list), `SIGNING_KEY`, `MASTER_KEY`, `DEPLOY_KEY`, `LICENSE_KEY`, `SERVER_KEY` (each anchored — `MASTER_KEYSPACE`, `SERVER_KEYSTORE_PATH` survive), and `SERVICE_ACCOUNT` / `SERVICE_ACCOUNT_{KEY,JSON,FILE,SECRET,TOKEN,CREDENTIALS}` (but not `SERVICE_ACCOUNT_EMAIL` / `_NAME` / `_ID`, which identify the account rather than authenticate as it). Deliberately **not** a blanket `*_KEY` rule: `ROUTING_KEY`, `PARTITION_KEY`, `SORT_KEY`, `IDEMPOTENCY_KEY`, `FOREIGN_KEY_CHECKS` are architecture facts the generated docs depend on. Known accepted over-match: a leading `PASS_` segment (`PASS_RATE`) — narrowing it to a trailing segment would drop `DB_PASS_2` / `PASS_FILE`, and the two failure modes are not symmetric. Both corpora (71 secret names, 53 benign names) are pinned as tests. End-to-end: seven canary secrets planted in `.env.example` appear in **none** of the six generated files; in v2.5.0 five of them did.
- **`.env.example`-only repositories never had their database detected.** `lib/env-parser.js` has always treated `.env.example` as canonical (it heads `ENV_FILE_ORDER`), but the DB-type scan in `stack-detector` read only `.env` / `.env.local` / `.env.development` — files that are gitignored in most repos — so a fresh clone with a committed `DATABASE_URL=postgres://…` template reported `database: null`. Templates (`.env.example`, `.env.sample`, `.env.template`) are now consulted, under two guards that keep the change strictly additive: only when no runtime env file *declared* a `DATABASE_URL` (a `jdbc:oracle:thin:@…` the keyword list does not cover still counts as declared), and only when no other source — build file, `application.yml`, **`schema.prisma`** — has already identified a database. The fallback runs *after* the Prisma block for that reason: a placeholder can never win the `if (!stack.database)` race against a declaration.

### Added — legacy JVM detection

`init` previously set `language: "java"` from a Gradle file only when the string `spring-boot` appeared, and never set a framework or its version from Maven unless Boot was present. A 32-case matrix of real enterprise build-file shapes passed 1 case; the release passes a 103-case matrix — 66 detection shapes plus 37 false-positive / regression guards — every case pinned as a test. Nothing is inferred from a framework default: **every version string returned is a substring of a build file, a jar name, or a property/variable defined in the same project**, and an unresolvable `${var}` yields `null`, never the literal.

- **Gradle.** `apply plugin: 'java' | 'java-library' | 'war' | 'ear' | 'application'`, the `plugins { id '…' }` DSL, Kotlin-DSL bare identifiers (`java`, `war`, `` `java-library` ``) and `apply(plugin = "…")` are all Java evidence on their own. A dependency whose group is **exactly** `org.springframework` (`spring-webmvc`, `spring-context`, the 2.x single `spring` jar, `spring-framework-bom`) — in coordinate form, `group:/name:/version:` notation, `platform()` / `mavenBom`, or a version catalog `module = "org.springframework:spring-…"` with `version.ref` — yields `framework: "spring-framework"` with the version; `org.springframework.{boot,security,data,cloud}` are other projects and are never mistaken for it. `${springVersion}` resolves against `ext { }`, `def` / `val`, and **`gradle.properties`** (in-file wins). Spring Boot 1.x/2.x `buildscript { classpath("org.springframework.boot:spring-boot-gradle-plugin:1.5.22.RELEASE") }` + `apply plugin: 'spring-boot'` now yields the Boot version (the old regexes anchored on a `version` keyword that form does not have). Root `subprojects { }` blocks and sub-module build files are swept with the same rules; a `war` / `ear` plugin sets `packaging`.
- **Maven.** `<packaging>` is reported (only when declared — the implicit `jar` default is not written back). A `<dependency>` whose `<groupId>` is exactly `org.springframework` (comment-stripped, so a `<!-- … -->`-disabled dependency is ignored) yields `spring-framework`; the version comes from `spring-framework-bom` in `<dependencyManagement>`, the first versioned Framework dependency, or a `<spring.version>` / `<spring-framework.version>` / **`<spring.maven.version>`** property, with `${prop}` resolved in-file. Spring Boot's version is now also read from `spring-boot-starter-parent`'s `<version>` (bounded to the `<parent>` block) and from a `spring-boot-dependencies` BOM import — previously only a `<spring-boot.version>` property was recognized, so `frameworkVersion` was `null` for every Initializr-generated pom. Java level: `<maven.compiler.release>` and the Maven-2-era `maven-compiler-plugin` `<configuration><source>1.5</source>` (bounded to the compiler plugin's own `<plugin>` block). **Multi-module:** a root `<packaging>pom</packaging>` with `<modules>` has its listed child poms (≤30) swept for framework, versions, ORM, DB and Java level, filling only what the root left null; `${prop}` in a child resolves against the child first, then the root `<properties>`.
- **Ant / Ivy / Eclipse WTP / no build tool.** `build.xml` → `buildTool: "ant"`, Java level from `<javac source="1.6">`; `ivy.xml` `<dependency org="org.springframework" name="spring-webmvc" rev="…"/>` (org exact-match, name whitelist) → framework + version, plus ORM / DB keywords. `.classpath` / `.project` → Java level from the JRE container (`JavaSE-1.7`, `J2SE-1.5`), `javanature`. **`**/{WEB-INF/lib,lib,libs}/*.jar`** (≤500 names) → `packaging: "war"` when under `WEB-INF`, Spring Framework / Boot presence and version parsed from the jar **name** (`spring-webmvc-3.0.5.RELEASE.jar`; an unversioned Spring-2.0-era `spring.jar` reports the framework with version `null`), JDBC drivers (`ojdbc*`, `postgresql-`, `mysql-connector`, `mariadb-java-client`, `h2-`, `sqlite-jdbc`, `mssql-jdbc` / `sqljdbc`, `db2jcc`, and the Korean-market **Tibero / Altibase / Cubrid**) and ORM jars (`ibatis-*` → `ibatis`, `mybatis-*`, `hibernate-*` / `eclipselink` / `openjpa` → `jpa`, `jooq-`). The jar scan also runs for Gradle/Maven projects whose build file still resolves from `fileTree(dir: 'lib')` instead of coordinates — common in codebases that adopted a build tool without migrating the jars — and fills nulls only. `**/*.java` is the last-resort language signal.
- **Spring 1.x.** Spring 1.0–1.2 published under the bare group `springframework` (no `org.`); Maven `<groupId>springframework</groupId>`, Gradle `'springframework:spring:1.2.9'` and Ivy `org="springframework"` are recognized alongside `org.springframework`. Still exact-match: `myspringframework` / `springframework.fake` are not it.
- **Gradle declaration long tail.** `group:` / `name:` / `version:` map notation in **any key order**, single- or multi-line; `${project.springVersion}` / `${rootProject.ext.springVersion}` / `${ext.x}` prefixes; Groovy version maps (`ext { versions = [spring: '…'] }` → `${versions.spring}`); buildSrc Kotlin constants (`object Versions { const val spring = "…" }` → `${Versions.spring}`); definitions pulled in through `apply from: 'gradle/dependencies.gradle'` (≤10 scripts, appended to the resolution text only); `options.release = 17` / `.set(17)`; a root holding only `settings.gradle{,.kts}`; `struts` / `struts2` / `jsf` coordinates add a tag in `detected` without setting a framework.
- **Repository shapes.** No root build file but sibling projects one directory down (`erp-web/pom.xml`, `erp-batch/pom.xml`) are absorbed with the Maven `<modules>` rules (`buildTool: "maven"`, depth-1 only, ≤30). JDBC coordinates for **MSSQL** (`mssql-jdbc`, `sqljdbc`, `jtds`, `sqlserver`), **DB2** (`com.ibm.db2`, `db2jcc`) and the Korean-market **Tibero / Altibase / Cubrid** are on the shared DB keyword list (additive to `stack.databases`; the primary-DB race is unchanged).
- **IDE metadata as evidence.** `.settings/org.eclipse.jdt.core.prefs` `compiler.compliance` (outranks the JRE container name), custom JRE names in `.classpath` (`jdk1.6.0_45`, `jdk-17.0.2`), `.classpath` `kind="lib"` / `kind="var"` jar paths (jars that are *not committed* — `M2_REPO/…/spring-webmvc-3.0.5.RELEASE.jar` still names the version), IntelliJ `.idea/misc.xml` `languageLevel="JDK_1_7"`, NetBeans `nbproject/project.properties` (`javac.source`, `file.reference.*.jar`). Jars under `lib/spring/`, `lib/db/` sub-folders are found (recursive under the lib roots).
- **Deployment descriptor and Spring XML.** `WEB-INF/web.xml` naming `org.springframework.web.servlet.DispatcherServlet` / `ContextLoaderListener` is Spring MVC evidence and a `war` signal; `ActionServlet` / `StrutsPrepareAndExecuteFilter` add a `struts` / `struts2` tag; `<web-app version="2.5">` adds `servlet 2.5`. `src/test/**` is excluded (a test-resources `web.xml` is not deployment evidence), and the whole block is skipped for Spring Boot projects — Boot's WAR packaging comes from the build file, and a Boot project's `detected` array stays byte-identical to v2.5.0; Struts / JSF coordinate tags are likewise not added to Boot projects. Spring XML configs' schema locations (`spring-beans-3.0.xsd`) yield a **major.minor** version — the lowest-fidelity source, consulted only when nothing else pinned a version, never overriding one (`spring-xsd 3.0` in `detected`).
- **Precedence against Node / Python.** All of the above runs *after* the Node and Python blocks and may only fill a language nobody claimed — or reclaim a *provisional* one: a root `package.json` that exists for gulp / jQuery / Tailwind tooling (no Node framework, no frontend framework detected) beside `build.xml`, a `.project` with `javanature`, a sibling pom/gradle, or a `WEB-INF/web.xml`. A Next.js / Express / Django project with a stray `.idea/misc.xml` or a vendored `tools/lib/*.jar` is never flipped to Java; a jar directory with no `*.java` sources claims nothing (no language, no framework, no DB). The reclaim is *parked*, not committed: if no JVM block then actually claims the project — a `build.xml` that is Phing or an empty stub, no `*.java` anywhere — the Node language is restored unchanged, and a `<project>` root element alone is not Ant (a `<javac>` task or `*.java` sources is required). A reclaimed Java project takes the JVM package manager (`ant` / `maven`), not the asset tooling's `npm`. EUC-KR-encoded poms with Korean comments detect normally (coordinates are ASCII).
- **eGovFrame (Korea's e-Government Standard Framework).** `egovframework.rte[.*]` coordinates (Maven or Gradle, `${egovframework.rte.version}` resolved) are reported as `spring-framework` — the templates and prompts understand Spring, and eGovFrame is Spring MVC underneath — plus an `egovframe <version>` tag in `detected`. Its `<spring.maven.version>` property is on the Framework-version property list.
- **`scan-java` reads legacy source roots.** Every pattern in the scanner is written against `src/main/java` / `src/main/resources`; those two leading segments are now rewritten per discovered root instead of being literal. Roots, in order: every `[<module>/]src/main/java` (unchanged, and if any exists the legacy fallbacks are **not** consulted — a modern tree with a stray top-level `src/` cannot be mis-rooted); otherwise `.classpath` `<classpathentry kind="src" path="…"/>` entries (test folders excluded — including a plain `test/` that `src/test/**` ignore rules would not catch), `build.xml` `<javac srcdir="${src}">` with `<property>` resolution, then `src/java`, `src`, `JavaSource`, `java`, `WebContent/WEB-INF/src` when they hold `*.java` (nested pairs keep the deeper one). For a legacy root the resources root is the java root itself — iBatis-era projects keep sqlmap XML beside the classes. `stack.sourceLayout: "legacy"` is set when a legacy root is in use. An Ant + `WEB-INF/lib` project with `src/com/acme/erp/{controller,service,dao}/` now yields `java 6 · spring-framework 3.0.5.RELEASE · oracle · ibatis · ant · war` and its three Pattern C domains; before, `init` reported "No language detected".

### Changed

- **Line endings are LF, enforced.** A `.gitattributes` (`* text=auto eol=lf`, `*.sh eol=lf`, image types `binary`) is added. Every committed blob was already LF (`git ls-files --eol` at v2.5.0: 281 text files, all `i/lf`); the CRLF that showed up on Windows checkouts of the non-Korean `docs/{lang}/` sets, `package.json`, `.gitignore` and the CI workflow came from `core.autocrlf=true` smudging on checkout, not from the repository. The attribute file makes the working tree LF on every platform regardless of that setting and stops a CRLF blob from ever being committed. No file content changes; run `git add --renormalize .` once after pulling if `git status` lists unchanged files as modified. The suite was run on Windows with the attribute file in place (974 / 974).
- **Templates.** `java-spring/pass1.md` and `pass3.md` no longer assume Spring Boot: when `project-analysis.json` says `framework: "spring-framework"` the Pass 1 prompt reads `WEB-INF/web.xml` and the Spring XML configs instead of a non-existent `application.yml`, and is told not to describe Boot features (auto-configuration, starters, actuator) for a project that does not declare Boot. `pass-json-validator` treats `spring-framework` as a backend framework alongside `spring-boot`.
- **Docs.** `docs/stacks.md` (10 languages) lists the redaction key-name families that now apply, so the documented rule matches the code again. Supported Stacks in `README.md` names the non-Boot Java shapes, and `docs/stacks.md` gains a legacy-JVM section with a per-build-form evidence table, the version policy, the precedence chain, the false-positive guards and the source-root order. **Both are translated into all 10 languages** — identifiers, coordinates and the 11-row evidence table are byte-identical across them; only prose is localized.

### Known limits (documented, unchanged)

- A password containing a raw `/`, `?` or `#` inside a URL's userinfo is not masked (`postgres://u:p/w@host/db`). These are RFC 3986 delimiters — an `@` after the first `/` belongs to the path (`https://cdn.example.com/npm/@scope/pkg`), and rewriting it would replace the real host — so the v2.5.0 rule stands; such a value must be percent-encoded (`%2F`). It is the one combination the key-name rule does not backstop, because the key is `DATABASE_URL`.
- Gradle build files are not comment-stripped (Maven poms are), so a `//`-commented Spring coordinate still counts — as it always has for Boot.
- Cross-file inheritance (a corporate parent pom that itself extends `spring-boot-starter-parent`; a version held only in a parent pom outside the repository) is out of scope; the resulting `null` falls through to LLM-side analysis.
- eGovFrame's default layout names its controller layer `web/` rather than `controller/`; the scanner's Pattern A/B do not yet recognize `web/` as a layer, so an `example/{web,service}/{user,board}/` tree yields a spurious `example` Pattern B domain beside the real ones. Detection output on that layout is identical to v2.5.0; a pattern change is a separate release.
- The stack-detector still passes the **redacted** `envInfo.vars` to `extractPort()` (`stack-detector.js`, `const vars = envInfo.vars || {}`). No current key-name rule intersects a port/host/api-target key (asserted across nine port-key variants), but a future blanket rule would break port detection silently; passing raw vars there is a structural follow-up.

### Migration

None required. New `project-analysis.json` fields are additive and `null` for projects that do not declare them. Projects that previously aborted `init` with "No language detected" on a pre-Boot Java layout will now proceed through the Java pipeline; review the detected `framework` / `frameworkVersion` / `packaging` in the Phase 1 summary the first time.

## [2.5.0] — 2026-09-07

Correctness release driven by a full-source audit of v2.4.4. No new dependencies, no new files. `project-analysis.json` gains optional, additive fields only (`stack.frontendRoot`, `stack.frontendBundler`, `stack.frontendPort`, `stack.frontendEnvInfo`, domain `pattern: "layer-first"`); pass-marker schemas are unchanged. Minor version bump because five behaviors that users could observe changed on purpose (see **Behavior changes** and **Migration**). Test suite: 736 → **825 / 825** pass (89 added, 2 legacy assertions replaced).

### Fixed — data loss / safety

- **`memory compact` no longer touches `decision-log.md`.** Stage 1 ("summarize aged entries") dropped the Context / Options / Decision / Consequences body of every entry older than 30 days — i.e. the "why" the file exists to preserve — while the generated `60.memory/01.decision-log.md` rule and CLAUDE.md §8 promised "permanent, append-only". Pass 4 seeds 3–5 entries dated today, so every project hit this on its first compaction after a month. Compaction now applies to `failure-patterns.md` only; `decision-log.md` is logged as "append-only, never compacted". Scaffold text (`compaction.md`, `60.memory/03.compaction.md`, `pass4.md`) and `docs/commands.md` updated to match.
- **`npx claudeos-core health` is read-only again.** Since v2.4.3, `health` → `manifest-generator` → `skills-sync` silently patched `CLAUDE.md` §6 and `MANIFEST.md`. A gate documented for CI / pre-commit must not dirty the working tree. Skills reconciliation now runs only when `manifest-generator` is invoked with the `--sync-skills` flag; `init` passes it after Pass 3/4, `health` does not. There is deliberately no environment-variable switch — `health` spawns `manifest-generator` with the inherited environment, so an exported variable would have re-enabled writes from a shell that set it for `init`.
- **`--force` / "fresh" preserve user-owned files under `.claude/rules/`.** Previously the whole directory was `rmSync`'d, including rule files the user had written before ever running claudeos-core. Only the claudeos-core-managed `NN.` category *directories* (`00.core/` … `90.optional/`) are wiped now (`wipeManagedRuleCategories()`, exported and unit-tested); a `NN.`-prefixed *file* at the rules root (`.claude/rules/01.team-style.md`) is user-authored — the tool never writes one there — and survives. Guard 2 (zero-rules detection) counts only those categories so a preserved user file cannot mask a silent Pass 3 failure.
- **`.env` credential masking is complete.** The `DATABASE_URL` redaction exemption is gone — its stated justification ("stack-detector reads it") was stale (stack-detector scans raw `.env` text and never reads `envInfo.vars`), while `postgres://user:password@host/db` was written verbatim into `project-analysis.json`, which Pass 3/4 prompts instruct the model to read. Every URL-shaped value (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `jdbc:postgresql://…`, …) now has its userinfo masked to `***:***` with scheme / host / path intact; `envInfo.host` and `envInfo.apiTarget` are masked the same way. Userinfo is everything between `://` and the last `@` of the authority, so a password containing `@` (`p@ss`) is masked whole; it may not contain `/`, `?` or `#`, so an `@` in a path or query (`https://cdn.example.com/npm/@scope/pkg`, `/users/@me`, `?redirect=user@host`) is never rewritten and the real host is never replaced. Scheme-less credentials are recognized only in the Go/MySQL DSN shape (`user:pw@tcp(db:3306)/db`, `@unix(…)`) — a generic `a:b@c` rule would corrupt `mailto:ops@example.com` or `0:30@daily`. A raw `/` inside a password is not a valid URL and is deliberately left alone. Credentials carried as connection *parameters* are masked as well — `?password=` / `;password=` / `pwd` / `secret` / `token` / `access_key` / `api_key` values become `***` with the parameter name kept (`jdbc:postgresql://db/app?user=app&password=***`, `sqlserver://host;user=sa;password=***`), and a Go DSN password containing `@` (`user:p@ss@tcp(h:3306)/db`) is masked whole.
- **CI time bomb.** `tests/memory-command.test.js` carried five hard-coded `2026-04-xx` dates; from 2026-05-17 one assertion aged past the 30-day compaction window and CI went red. All five use a relative `daysAgo(n)` helper now.
- **Stale translations in the static-fallback cache.** `claudeos-core/generated/fallback-cache-<lang>.json` was keyed by content *name* (`MEMORY_FILES.compaction.md`), so once a project had a cache, every later change to a static-fallback text (this release changes three: `compaction.md`, `60.memory/03.compaction.md`, `52.ai-work-rules.md`) kept serving the translation of the old English text. Keys now include a hash of the English source (`<name>@<sha1[0:12]>`); a text change is a cache miss automatically and pre-v2.5.0 entries are never read again (they stay in the file, unused).

### Fixed — detection accuracy

- **Flat Spring Initializr layout (`com/example/demo/controller/*.java`) is Pattern C, not "Pattern B with one domain named `demo`".** The Pattern B glob `**/*/controller/*.java` always matched the root package's last segment, making Pattern C unreachable for every real Java project. A path counts as flat only when its layer dir is a direct child of the base package **and** no layer-class stem under it starts with that package segment — so single-domain domain-first projects (`payment/controller/PaymentController.java`) stay Pattern B. The Pattern C test now asserts exact domain names instead of `>= 1`. The stem test looks at *every* layer class under the base package (controller, service, mapper, repository, dao, dto), so a single-domain project such as `account/{controller/LoginController, service/AccountService, dto/LoginDto}` stays Pattern B `account` because `AccountService` is named after the package; a `*Application.java` sitting directly in the base package is a positive flat signal on its own (Initializr places it there). Inside a Gradle/Maven module the module's own sub-package (`api/src/main/java/com/example/api/controller/`) is treated like the Initializr base package, so `com.example.api` / `com.example.core` modules yield `user` / `order` rather than a pseudo-domain named after the module. The directory holding the Spring Boot main class (`*Application.java`) is always a base package regardless of the 4-segment `rootPackage` cap, so a 5-segment Initializr base package (`kr/co/<org>/<proj>/<app>`) is classified flat as well. *Known limit:* a single-domain project in which *no* layer class shares the package name (`auth/{controller/LoginController, service/TokenService}`) is read as flat and yields `login` / `token`. Controllers the flat test skips in a tree that another pattern claims are re-attached by class name (Pattern C entries alongside the Pattern B/D/E ones).
- **Java multi-module Gradle.** Root `build.gradle` with `id 'org.springframework.boot' … apply false` (plugin id, no `spring-boot` coordinate) is now recognized; when the root declares nothing, sub-module `build.gradle{,.kts}` files (≤30) are swept for the Java plugin / Spring Boot coordinates, framework version and Java version. `scan-java` discovers every `[<module>/]src/main/{java,resources}` root once and anchors all patterns there, so `api/src/main/java/...` + `core/src/main/java/...` are scanned by the primary A–E patterns instead of the coarse fallback. Single-module scan time is unchanged (slightly faster); multi-module pays a per-module multiple for full-fidelity results. Source-root discovery ignores `src/test/**` (test-fixture projects such as `src/test/resources/projects/demo/src/main/java/…`) and `buildSrc/`, so neither becomes a module.
- **Legacy Java version literals.** `sourceCompatibility = '1.8'` produced `languageVersion: "1"`; `<java.version>1.8</java.version>` produced `null`. Both now yield `"8"` (`normalizeJavaVersion`), across Gradle literal / ext-variable / Maven property paths.
- **Next.js App Router route groups.** `app/(marketing)/about/`, `app/(shop)/(nested)/checkout/` were skipped outright (`name.startsWith("(")`), so route-group-organized apps came back with zero route domains. Groups are expanded (up to 3 levels) and their children evaluated like top-level route folders; Fallback A steps over group segments the same way. The same leaf under different groups (`(shop)/settings` and `(admin)/settings`) are distinct features: colliding leaves are qualified with their group path (`shop-settings`, `admin-settings`) so domain names stay unique; non-colliding leaves keep the bare name. If names still collide after group qualification (leaves that differ only before `pages`: `src/mobile/pages/home` vs `src/desktop/pages/home`), every non-structural path segment is used (`mobile-home`, `desktop-home`). A colliding leaf with no `app`/`pages` anchor (`src/views/home` beside `src/pages/home`) is qualified with its immediate parent (`views-home`, `pages-home`), never with the whole path.
- **Kotlin version catalog** with a `kotlin = "x.y.z"` version entry or a Kotlin *plugin* coordinate (`org.jetbrains.kotlin.jvm` / `.plugin.*` / `.multiplatform` / `.android` / `.kapt`, `kotlin-gradle-plugin`) now overrides the Java default set by the root plugin id. Library coordinates such as `org.jetbrains.kotlin:kotlin-stdlib` are deliberately *not* a signal — Java projects pin them to settle transitive version conflicts. Independently of the catalog, a "kotlin" keyword anywhere in a build file (`buildSrc/build.gradle.kts` with `kotlin-dsl`, a `kotlin = …` version pin) never flips a project whose source tree contains `.java` files and no `.kt` files — the Kotlin scanner would find zero domains and `init` would abort; `buildSrc/` is also excluded from the sub-module build-file sweep. `build-logic/` and `gradle/plugins/` (Gradle's documented `buildSrc` replacements for Kotlin-DSL convention plugins) are excluded from the source-language evidence as well.
- **Python framework / ORM keywords are matched case-insensitively.** `pip freeze` and PyPI canonical names are capitalized (`Django==5.0`, `Flask==3.0`, `SQLAlchemy==2.0`); the case-sensitive `includes()` never recognized Django or Flask from `requirements.txt`, and a standard `django-admin startproject` layout then aborted `init` with `domain-groups.json has invalid totalGroups: 0`. Present since v1.x.
- **Kotlin package-by-feature layout without layer folders** (`com/acme/user/UserController.kt`, `UserService.kt` — the idiomatic Kotlin/Spring layout) produced zero domains and aborted `init`. The single-module fallback now derives the domain from the feature package that holds layer-suffixed classes, or from the class-name stem when the directory is a flat root/app package. Pre-existing since the Kotlin scanner was added. The fallback also runs for files the layer-folder scan did not cover, so a mixed tree (`user/controller/UserController.kt` + `order/OrderController.kt`) keeps both domains; in that mixed case only feature packages named after their classes are accepted (a stray `SomeHandler.kt` in the root package is not promoted). A `dto/` / `vo/` / `entity/` folder sitting directly under the root package no longer manufactures a domain named after the root package (`com/acme/dto/UserDto.kt` → `acme`) that would both survive and force the strict mode; the artifact is dropped when real domains exist.
- **Layer-first Express / Fastify / Koa** (`src/controllers/`, `src/routes/`, `src/services/`) no longer reports the layer folders themselves as domains. When every candidate folder under `src/` is a layer name, domains are derived from file stems (`user.controller.js`, `users.routes.ts`, `orderService.js` → `user`, `order`; `pattern: "layer-first"`). A plural stem is folded into its singular twin only when *both* exist (`users.routes.ts` + `user.controller.js` → `user`; `-ies`→`-y`, `-es`, `-s`); a lone plural is kept verbatim, never guessed. Feature-first layouts (`src/<domain>/`) and NestJS modules are unchanged. The layer-first path is taken as soon as two layer folders exist; other non-infrastructure siblings (`src/jobs/`, `src/billing/`) become whole-folder feature domains instead of disabling the path (which previously resurrected `controllers` / `routes` as domains). `db/`, `migrations/`, `scripts/`, `public/`, `tests/` and similar are treated as infrastructure. The layer-first path additionally requires a routing layer folder (`controllers/`, `routes/`, `handlers/`, `api/`) at the top: module-first NestJS trees that keep shared `entities/` + `dtos/` next to `src/users/`, `src/orders/` stay module-first (no `users` → `user` rename, no one-file stem domains), and layer-named folders are never emitted as domains by the directory fallback either. Layer/role suffixes are stripped repeatedly and only after a separator or as a PascalCase word (`email.service.impl.ts` → `email`, `prototype.ts` stays `prototype`), and a file's role comes from its layer folder rather than from substrings of its path.
- **Layer-first FastAPI / Flask** (`app/routers/users.py`, `app/models/user.py`, `app/schemas/`) — same treatment and the same plural folding on the Python side when `app/` holds only layer folders. Feature packages that sit next to the layer folders (`src/routers/users.py` + `src/tasks/billing.py`) become domains as well instead of being dropped, and the layer/feature folders are collected from the same parent so a `src/` frontend tree is never mistaken for Python features. Virtualenvs and `node_modules` under `src/` or `app/` (`env/`, `venv/`, `.venv/`, `virtualenv/`, `site-packages/`) are ignored so they are never scanned as feature packages.
- **Frontend in a sub-directory.** A backend repo with the SPA in `frontend/`, `client/`, `web/`, `ui/`, `webapp/` or `front/` (own `package.json`, no root `package.json`) now detects the frontend from there (`stack.frontendRoot`) and the frontend scanner is rooted at that directory. Detection uses the same dependency precedence as the root (`next` → `@angular/core` → `nuxt` → `react` → `vue`) plus a config-file fallback (`next.config.*`, `vite.config.*`, `nuxt.config.*`, `angular.json`). Previously such repos were scanned as backend-only. `.claudeos-scan.json` is still read from the *project* root (where it is documented to live), not from the sub-directory, so `frontendScan` overrides keep working for sub-directory SPAs. A repo whose *only* application is the sub-directory SPA is no longer reported as "no language detected": `language` (TypeScript when `typescript` / `tsconfig.json` is present), `languageVersion` and `packageManager` (pnpm / yarn / bun / npm lockfile) are filled from the sub-directory, with backend values taking precedence when a backend exists. The sub-directory's own `.env*` is read as `stack.frontendEnvInfo` (same redaction and masking) and both it and `stack.frontendPort` are projected into `pass3-context.json`. The SPA's language / package manager are filled only after every backend block has run, so a Django / FastAPI / Flask backend with `frontend/package.json` stays `language: python` and keeps its package manager; the structure scanner also dispatches Python frameworks to the Python scanner regardless of `language`, so a Django repo whose root `package.json` exists only for Tailwind/PostCSS tooling is never handed to the Node scanner. A root `package.json` that exists only for tooling (Tailwind/PostCSS/ESLint) no longer makes a Django / FastAPI / Flask repo report `language: typescript` in `project-analysis.json` and CLAUDE.md §2: when a Python manifest is present and no Node backend framework is, `language` is reclaimed as `python` (a NestJS/Express/Fastify framework keeps Node).
- **Backend port and frontend dev-server port are resolved separately.** The single default chain (`stack.frontend === "angular" ? 4200 …`) handed a Spring/Django backend the Angular/Next dev-server port whenever a SPA lived beside it. `stack.port` is now the backend's port when a backend exists (`.env*` → framework default) and `stack.frontendPort` is the SPA's dev-server port whenever a frontend exists (sub-directory `.env*` → root `.env*` `PORT` for a root SPA → Vite 5173 / Angular 4200 / 3000). For a frontend-only project the two agree. When a single root `.env*` carries both (`SERVER_PORT=8080` + `VITE_PORT=3000`), the frontend-prefixed key (`VITE_*` / `NEXT_*` / `NUXT_*` / `NG_*`) feeds `frontendPort` and only the backend key feeds `stack.port` — previously `VITE_PORT` won the shared `extractPort()` precedence and was documented as the backend's port. `stack.envInfo.port` (what Pass 3 reads for the Server Port row) is set to the backend value under the same rule, with the frontend value exposed as `envInfo.frontendPort`; `plan-installer` uses the same backend definition as the detector (a JVM/Python project is a backend even without a recognized framework), so a plain Maven project beside a Vite SPA keeps 8080.
- **React + Vite next to a backend picks the Vite template.** Template selection used `stack.framework === "vite"`, which is impossible when Spring/Django owns `framework`, so a Spring + `frontend/` (React + Vite) repo was handed the Next.js frontend template. The bundler is now recorded separately (`stack.frontendBundler = "vite"` — root `package.json`, monorepo workspace packages whose deps are merged into the root view, or the sub-directory; from the `vite` dependency or the `vite.config.*` fallback) and `selectTemplates()` honors it. This also changes monorepos such as `apps/api` (NestJS) + `apps/web` (React + Vite), which previously received the Next.js frontend template.
- **`stack.frontendRoot` reaches every prompt.** `prompt-generator` prepends a `Frontend source root: {{PROJECT_ROOT}}/<dir>/` note to the shared header when the SPA lives in a sub-directory, so Pass 1/2/3 read the stack templates' `app/…` / `src/…` examples relative to that directory instead of the repo root; `pass3-context.json` carries `frontendRoot` / `frontendBundler` in its slim `stack` block.
- **Zero-domain abort is explained.** `init` still stops when the scanner finds no domains (there is nothing for Pass 1-3 to analyze and writing an empty CLAUDE.md would be worse), but the message now states the detected stack, lists the layouts the scanner recognizes, points at `project-analysis.json`, and confirms nothing was written — instead of `domain-groups.json has invalid totalGroups: 0`. Under `--force` / "fresh" the message no longer claims nothing was touched: it states that the managed `.claude/rules/NN.*` categories and `generated/` pass files had already been removed and points at version control.

### Fixed — validator coverage

- **`STALE_PATH` covers JVM / Python / SFC / MyBatis paths.** `content-validator [10/10]` matched only `src/….{ts,tsx,js,jsx}`, so Java, Kotlin and Python projects had zero path-claim coverage despite "no invented paths" being the headline guarantee. Extensions added: `mjs cjs vue svelte java kt kts py xml sql` (config extensions deliberately excluded — `application-{profile}.yml` is illustrative far more often than a claim). `resolvePathClaim` resolves `src/…` claims against any module directory up to three levels deep that contains `src/` (memoized), not only `apps/*` / `packages/*`, so multi-module citations like `api/src/main/java/…` and the nested Kotlin CQRS layout the scanner itself supports (`servers/query/<x>/src/main/kotlin/…`) are not false positives. A module-qualified citation (`core/src/main/java/…`, `apps/web/src/…`) is captured whole and checked at that exact location only, so citing the wrong module is flagged instead of being rescued by the bare-`src/` module search; virtualenvs (`venv/`, `.venv/`, `env/`, `site-packages/`), `vendor/`, `docs/`, `tools/`, `scripts/`, `test(s)/` and `fixtures/` are never treated as module roots, so a hallucinated `src/…` path that happens to exist under `<venv>/src` is still reported. A module prefix is captured only when it starts a path token, so a package import such as `@acme/ui/src/Button.tsx` is not read as module `acme/ui` (its `src/Button.tsx` tail still resolves through the workspace search), `libsrc/x.ts` never yields a `src/x.ts` claim, and `node_modules/<pkg>/src/…` mentions are skipped as dependency references. `docs/`, `tools/`, `scripts/`, `test(s)/` and `fixtures/` are skipped as module roots only at the project root — inside a workspace container (`apps/docs`, `packages/tools`) they are legitimate packages, so the default Turborepo layout resolves as before; a dev-server URL (`localhost:5173/src/main.tsx`) never yields a `5173` module claim.

### Changed — Pass 3 allowlist is written by the orchestrator

- `## Allowed Source Paths` in `pass3a-facts.md` is now injected by `init.js` directly from `project-analysis.json` after Pass 3a (`injectAllowedPathsSection()` in `plan-installer/source-paths.js`): replaces any LLM-written section wholesale (fence-aware, heading-suffix-tolerant, duplicate sections collapsed to one, an unterminated fence at EOF is closed first), appends if absent, emits the documented fallback line when the allowlist is empty, normalizes CRLF → LF, and runs on resumed runs where 3a is skipped. Until now the list reached 3b/3c/3d only if the model hand-copied up to 500 paths out of `pass3-context.json`, and `renderAllowedPathsSection()` was never called at runtime. `pass3a-facts.md` template tells the model not to write the section. If Pass 3a is marked complete but the facts file is missing/empty, `init` now stops with a clear error instead of fabricating a facts file.

### Changed — templates & generated content

- `52.ai-work-rules.md` (static fallback): removed the `plan/` master-document rule (master plans were removed in v2.1.0); `00.standard-reference.md` guidance rewritten to agree with `pass3-footer.md` and the doc-writing guide; `build.gradle.kts` added to the manifest lists.
- Six stack templates no longer tell the model that `50.sync` rules should recommend `npx claudeos-core refresh` (a no-op since v2.1.0).
- Six stack templates (`angular`, `node-fastify`, `node-nestjs`, `node-vite`, `python-flask`, `vue-nuxt`) gained the `00.core/04.doc-writing-guide.md` forward reference in `00.standard-reference.md`.
- `angular/pass3.md`: orchestrator renamed `01.scaffold-page-feature.md` so its stem matches the `scaffold-page-feature/` sub-folder that `content-validator` and `ensureDirectories()` expect.
- `java-spring` / `kotlin-spring`: `40.infra/01.environment-config-rules.md` `paths` now include `**/*.gradle`, `**/*.gradle.kts`, `**/gradle/libs.versions.toml`, `**/pom.xml`; the linked `40.infra/01.environment-config.md` standard description in `java-spring` mentions build scripts and the version catalog accordingly.
- `claude-md-scaffold.md` §8 usage rule 5: periodic compaction is scoped to `failure-patterns.md` (`decision-log.md` is never compacted).
- `pass4.md`: "13 hallucination prevention patterns" → 17 (matches the static table); `claudeMdAppended` marker field is `false` (Pass 4 has not touched CLAUDE.md since v2.3.0) in both the template and `init.js`.
- `init.js` static-fallback log no longer claims "Plans scaffolded + CLAUDE.md appended".

### Docs

- README: "byte-identical output" / "Nothing is guessed" / "Same project = same output" reworded to what is actually guaranteed (fixed 8-section structure, scanner facts + Pass 1 reads, validated identically across languages); excerpt headings noted as demoted for rendering; `build.gradle.kts` listed; test badge 825.
- `docs/safety.md` and `docs/commands.md`: `--force` sections describe the managed-category wipe and the preserved user-owned files under `.claude/rules/`; `docs/commands.md` also scopes `memory compact` to `failure-patterns.md`.
- `docs/stacks.md`: `.env` section no longer claims a `DATABASE_URL` whitelist; describes credential masking. `docs/verification.md`: `STALE_PATH` row lists the widened extension set and module-directory resolution. `docs/memory-layer.md`: compaction section scoped to `failure-patterns.md`.
- `lint --help` lists the T1 canonical-heading and S2 content checks.

### Behavior changes (intentional)

1. `memory compact` skips `decision-log.md` (also loses the 400-line cap for that file).
2. `health` no longer reconciles MANIFEST ↔ §6; drift is reported as `MANIFEST_DRIFT` advisories. Run `node <tools>/manifest-generator/index.js --sync-skills` to reconcile on demand.
3. Flat-layout Java projects now yield one domain per `*Controller` class instead of a single package-named domain; a flat controller next to domain-first packages (`demo/controller/HomeController.java` beside `demo/user/controller/…`) no longer produces a bogus package-named domain — it becomes its own class-name domain (`home`, Pattern C) so it is never silently left out of every domain.
4. Kotlin `build.gradle.kts` projects declaring `id("org.springframework.boot")` are now `framework: spring-boot`, which activates `10.backend` output (previously `framework: null`).
5. React + Vite frontends that share a repo with a backend (root `package.json`, monorepo workspace, or `frontend/`-style sub-directory) are now generated from the `node-vite` template instead of `node-nextjs`. Re-run `npx claudeos-core init --force` once to regenerate the frontend standards/rules under the Vite template.

### Migration

- Existing projects: nothing to do for the memory / health / `.env` fixes — they take effect on the next command.
- Flat-layout Java projects and route-group Next.js projects: re-run `npx claudeos-core init --force` to regenerate per-domain files under the corrected domain set; a plain resume keeps the old files (Rule B) and adds the new ones alongside.
- Java / Python projects may see new `STALE_PATH` advisories for `.java` / `.py` / `.xml` paths the model invented; they are advisory-tier and do not fail `init` or `health`.
- All 10 `README.{lang}.md` files and all 9 localized `docs/{lang}/{commands,safety,stacks,verification,memory-layer}.md` sets carry the v2.5.0 wording (`memory compact` scope, managed-category `--force` wipe, credential masking, widened `STALE_PATH` coverage).

### Tests

- 89 new: flat-layout / Initializr detection, multi-module source roots, Java 8 (`1.8`) Gradle + Maven, multi-module Gradle detection ×2, route groups, allowlist injection ×8 (append / replace / empty fallback / fenced heading / heading suffix / CRLF / unclosed fence / duplicate sections), multi-module `STALE_PATH` resolution ×2, `wipeManagedRuleCategories` ×2, case-insensitive Python framework detection ×2, Kotlin package-by-feature fallback ×2, `kotlin-stdlib`-only catalog stays Java, layer-first Express / FastAPI ×2, frontend sub-directory ×6 (dependency, `vite.config` fallback, Nuxt, root React + Vite bundler, scanner rooting, `pass3-context` projection), Vite template selection with a backend present, `Frontend source root` prompt note, `memory compact` leaves `decision-log.md` byte-identical, content-hashed translation cache ×4 (incl. a mocked real translation proving the cache is written), credential masking with `@` / `/` passwords and scheme-less DSNs, Java-only source tree vs kotlin keywords ×3, single-domain Pattern B preservation, `*Application.java` flat signal, per-module packages, `src/test` / `buildSrc` exclusion, Kotlin mixed layout, Python mixed layer/feature layout, sub-directory SPA overrides from the project root, route-group leaf collision, 3-level module `STALE_PATH` resolution, `manifest-generator` skills-sync gating ×3 (plain run read-only / `--sync-skills` / an exported `CLAUDEOS_SKILLS_SYNC` does nothing), `@` in URL path / query / `mailto` never rewritten, flat controller re-attached beside Pattern B, Kotlin flat-root `dto/` artifact ×2, Express mixed layer + feature folders, Python virtualenv under `src/`, leaf collision before `pages`, root-level `NN.` file survives `--force`, SPA-only sub-directory repo ×2 (language / package manager / env facts, backend precedence), module-qualified `STALE_PATH` claims ×3, `frontendPort` / `frontendEnvInfo` projection, backend vs frontend port resolution ×3, Django + `frontend/` stays Python ×2, module-first NestJS with shared `entities/` + `dtos/`, root `.env` `VITE_PORT` beside `SERVER_PORT`, package-import / `libsrc` / `node_modules` non-claims ×2, `--force` zero-domain message, `build-logic/` Kotlin convention plugins, tooling-only root `package.json` in a Django repo, NestJS + stray `requirements.txt`, `SERVER_PORT` + `VITE_PORT` in one `.env` (envInfo.port), framework-less Maven + Vite SPA ports, `*.service.impl.ts` / `prototype.ts` stems, 5-segment base package via `*Application.java`, `views/` vs `pages/` leaf collision, Turborepo `apps/docs` + `packages/tools` resolution, dev-server URL non-claim, connection-parameter credential masking.
- Replaced: `redactSensitiveVars preserves DATABASE_URL` → masking assertions; inline `--force` wipe reproduction → managed-category assertion. Pass 4 marker fixtures now use `claudeMdAppended: false` to match the template.

- **Files changed** — `bin/commands/{init,memory,lint}.js`, `lib/{env-parser,memory-scaffold}.js`, `plan-installer/{stack-detector,structure-scanner,domain-grouper,prompt-generator,pass3-context-builder,source-paths,index}.js`, `plan-installer/scanners/{scan-java,scan-kotlin,scan-node,scan-python,scan-frontend}.js`, `content-validator/index.js`, `manifest-generator/index.js`, 15 templates under `pass-prompts/templates/` (3 common + 12 stack), `README.md` + 9 localized `README.{lang}.md`, `docs/{safety,commands,stacks,verification,memory-layer,manual-installation}.md` (+ the same 5 docs in 9 localized `docs/{lang}/` sets, + 9 localized `manual-installation.md` version strings), 15 test files, `package.json` / `package-lock.json` (`2.4.4` → `2.5.0`).

---

## [2.4.4] — 2026-05-04

Documentation-only release. Translation polish across 8 non-Korean language `docs/{lang}/` directories. Test suite remains 736 / 736 pass.

- **`docs/{zh-CN,ja,es,vi,hi,ru,fr,de}/` × 12 files each polished** — translation naturalness polish (calque elimination, em-dash reduction, passive → active, pronoun-overuse reduction, noun-verb redundancy, native dev-blog tone). Four rounds applied per language: initial polish → deep audit → final polish → file-by-file verification. Line counts within ±2 per file; code blocks, CLI commands, anchor links, version strings all byte-identical.
- **Broken `#quick-start` anchor fixed in 5 languages** — `docs/{ja,zh-CN,vi,hi,ru}/{architecture,commands}.md` linked to `README.{lang}.md#quick-start`, but those READMEs use localized headings (`クイックスタート` / `快速开始` / `Bắt đầu nhanh` / `त्वरित शुरुआत` / `Быстрый старт`). 15 anchor instances corrected to native GitHub slugs.
- **English source minor fixes** — `docs/verification.md` malformed `content-validator` table (header had 2 columns, data rows merged Check ID into description) and Section 5 heading (`Disk ↔ Master Plan` → `Disk ↔ sync-map.json`, reflecting the v2.1.0 master-plan removal).
- **Version** — `package.json`, `package-lock.json` (top-level + `packages.""`), `CLAUDE.md`, and 10 `docs/{lang,en}/manual-installation.md` files bumped to `2.4.4`.

---

## [2.4.3] — 2026-04-27

Skills catalog reconciliation. Closes a structural gap where Pass 3c-core registers per-domain orchestrators (`{category}/02.domains.md`) and their sub-skills (`{category}/domains/{name}.md`) inconsistently — leading to `MANIFEST_DRIFT` advisories. No template, scanner, prompt, or pass-pipeline behavior change. Test suite remains 736 / 736 pass.

- **NEW `manifest-generator/skills-sync.js`** — deterministic post-Pass-3 sync step (~270 lines, pure CommonJS, no new deps). Three pure functions wired into `manifest-generator/index.js` `main()` between `sync-map.json` write and `stale-report.json` initialization:
  - `discoverPerDomainCatalogs` — walks `claudeos-core/skills/{category}/domains/`, sorts alphabetically.
  - `patchManifestPerDomainSections` — ensures `MANIFEST.md` contains a canonical `### Per-domain notes` section per category. Idempotent: section current → no write; line stale → replace only the domain-list paragraph (sibling content preserved); section missing → append fresh.
  - `patchClaudeMdSkillsSection` — ensures each MANIFEST-registered category-root orchestrator is mentioned in §6 Skills sub-section. Sub-skills excluded by design (the v2.3.0 `MANIFEST_DRIFT` exemption handles transitive coverage). §6 detection is multilingual via heading-number matching (`## 6.` plus first `### *Skills*` sub-heading).
- **Design invariants** — deterministic (no LLM); idempotent (3 consecutive runs produce MD5-identical files); append-only with respect to user edits; failure-isolated (errors logged; `manifest-generator`'s primary outputs unaffected); domain ordering alphabetical (OS-independent reproducibility).
- **`STALE_PATH` naming-convention placeholder exemption** — `content-validator`'s `hasPlaceholder` predicate (introduced v2.3.0, extended v2.4.0 with `/.../` ellipsis) gains a fourth placeholder family: naming-convention tokens (`camelCase`, `PascalCase`, `kebab-case`, `snake_case`). LLMs writing naming-convention docs routinely cite `src/.../camelCase.tsx` as a template — the convention name IS the lesson, not a path claim. Word-boundary anchored (`\b...\b`), so embedded substrings like `myCamelCaseUtil.ts` are NOT skipped.
- **Migration** — purely additive. First run after upgrade: existing projects with an LLM-ordered domain list see ONE alphabetic-reordering write; subsequent runs no-op. Projects without `domains/` are unaffected. Projects emitting the naming-convention false positive will see those `STALE_PATH` entries disappear on the next `health` run.
- **Files changed** — `manifest-generator/skills-sync.js` (NEW), `manifest-generator/index.js` (+2 lines: import + try/catch wrapper), `content-validator/index.js` (one regex line in `hasPlaceholder`), `package.json` / `package-lock.json` (`2.4.2` → `2.4.3`).

---

## [2.4.2] — 2026-04-26

Same-day documentation patch on top of v2.4.1. **No source code, scanner, template, or validator change.** Test suite remains 736 / 736 pass.

- **English README tightening** — tagline back to one bold line, "What is this?" condensed to two paragraphs (every named example preserved), demo-block headings demoted (`##` → `####` / `#####`) so they don't pollute the outer H2 ladder, decorative emojis stripped (📺/📄/🛡️/🧠 from `<details>` summaries; 🚀/🎉/📦/📋 from terminal-output ASCII art) to match the actual `--lang en` runner output. `fabricated` → `invented` in the `content-validator` description.
- **NEW `## Tested on`** — single-row reference benchmark for `spring-boot-realworld-example-app` (187 → 75 files, 5 / 5 validators pass), inserted before `## Quick Start`.
- **NEW `## If this saved you time`** — short ⭐ / issues / PRs call-to-action between `## FAQ` and `## Documentation`.
- **Memory Layer command relocation** — `memory compact` / `memory propose-rules` moved out of `## Daily Workflow` into `## Memory Layer`. Daily Workflow is now strictly the three-command core (`init` / `lint` / `health`).
- **Footer + License rewrite** — explicit `© 2025–2026 ClaudeOS-Core contributors`; maintainer line replaces the old "built with care" hook.
- **9-language README re-sync** — all 9 localized READMEs (`ko`, `zh-CN`, `ja`, `es`, `vi`, `hi`, `ru`, `fr`, `de`) rewritten to mirror the new English structure. All 10 READMEs share identical metrics: **512 lines, 16 H2 sections, 4 `<details>` blocks, 26 code fences** (was 514 / 14 / 4 / 28). Demo blocks (terminal output / `CLAUDE.md` excerpt / `01.controller-rules.md` / `decision-log.md` seed) byte-identical across all 10 (MD5-verified). Every `docs/X.md` → `docs/{lang}/X.md` (19 per file); 3 inline anchor refs localized to translated slugs; `## Supported Stacks` heading kept English in all translations for a stable cross-language anchor.
- **README naturalness polish (3 rounds)** — all 10 READMEs polished from too-literal translations to native dev-blog prose: calque elimination, em-dash reduction, passive → active voice, pronoun-overuse reduction. Korean served as quality benchmark; final round used native-speaker editor agents per language. Structural metrics preserved (512 / 16 / 4 / 26).
- **`docs/ko/` × 12 files polished** — all Korean sub-docs polished to `README.ko.md` benchmark. Same watchlist applied. Line counts preserved within ±1 per file; code blocks/anchors/links untouched. Other 8 language `docs/{lang}/` directories unchanged in this release.
- **Version** — `package.json` and `package-lock.json` (top-level + `packages.""`) bumped to `2.4.2`.

---

## [2.4.1] — 2026-04-26

Post-release documentation, full 10-language localization, and test-fixture sanitization. **No source code, no template, and no scanner behavior change** — Pass 1/2/3/4 outputs and validator verdicts are byte-identical to v2.4.0. Test suite remains 736 / 736 pass.

### Documentation overhaul

- **Main `README.md` rewrite** — 455 → 514 lines (+59) without losing brevity. Strengthened sections:
  - **Tagline** (1 line → 3 paragraphs): WHAT (value proposition) + HOW (deterministic scanner + 4-pass + 5 validators + path allowlist) + WHERE (12 stacks, monorepos, one `npx` command, resume-safe, idempotent).
  - **"What is this?"** — 3-bullet problem statement → 4-bullet (added centralized-middleware vs scattered `try/catch`), explicit WHY (Claude Code stateless, every session starts fresh), 5-bullet output list (`CLAUDE.md` / `.claude/rules/` / `standard/` / `skills/` / `memory/`), differentiator (`path allowlist` + 5 named validators + language-invariant).
  - **Demo block** (4 collapsible `<details>`) — every excerpt swapped for stronger content from the actual `spring-boot-realworld-example-app` run: `CLAUDE.md` excerpt = Section 1 + 2 (Role Definition + 11-row Project Overview table) instead of Section 4; rule excerpt = `01.controller-rules.md` (REST + GraphQL + ✅/❌ Java examples) instead of `03.data-access-rules.md`; decision-log seed = "Hexagonal ports & adapters with MyBatis-only persistence" (the FIRST decision, with JPA/Hibernate/Spring Data/MyBatis-Plus considered-and-rejected list) instead of CQRS-lite.
  - **"Who is this for?"** — 3-row table → 7-row table covering Solo dev / Team lead / Existing Claude Code user / Onboarding to a new repo / Working in 10 languages / Monorepo user / OSS contributor; "Not a fit if" expanded from 1 to 3 cases.
  - **"How does it work?"** — 1-paragraph summary → **3-stage breakdown**: Step A (scanner — concrete file types read, sensitive-variable redaction list, architecture-pattern classification), Step B (4-pass with each pass's input/output/split rules, including Pass 4 CLAUDE.md immutability), Step C (5 validators each named with their distinct check classes + 3-tier severity).
- **`CLAUDE.md` slim** — 367 → 162 lines (−65 % size, −58 % bytes). Replaced the 4 000-character single-paragraph v2.3.0 changelog wall with a one-line v2.4.1 summary that points to `CHANGELOG.md`. The 33-row exhaustive Tests table compressed into 7 thematic categories with "read the test file directly for details" pointer (DRY: avoid duplicating per-file fixture details that live in the test source). Architecture data-flow diagram, file-by-file reference, and Code Conventions retained at full fidelity. Added Documentation section listing localized READMEs + `docs/{lang}/` mirrors.
- **`docs/comparison.md` and 3 other docs corrections** — `docs/architecture.md` `sync-checker` description ("Cross-references between standards and rules" → "Disk files match the `sync-map.json` registrations"); `docs/stacks.md` Vite/Angular port-extraction fabrication removed (scanner does NOT read `vite.config.server.port` nor `angular.json` for port — both are framework-default fallbacks); `docs/verification.md` "sibling project" wording neutralized to "a CLAUDE.md generated with `--lang ja`".
- **`README.md` fabricated URL removed** — the `https://github.com/affaan-m/everything-claude-code` link in the "Not a fit" section was a guessed URL not present in the v2.3.2 HEAD; removed in favor of an internal pointer to `docs/comparison.md`.

### 10-language localization

- **9 localized READMEs (`README.{ko,ja,zh-CN,es,vi,hi,ru,fr,de}.md`)** — full rewrite to match the new 514-line English structure. All 10 READMEs now share identical structural metrics: **514 lines, 14 H2 sections (fence-aware), 28 code fences, 4 `<details>` blocks, 28 inline-code spans matching ±2**. Code blocks (terminal output, CLAUDE.md excerpt, rule excerpt, decision-log seed, mermaid labels) are byte-identical to English across all 10 languages. Only surrounding prose is translated.
- **9 new `docs/{lang}/` folders** — every non-English README now has a parallel `docs/{lang}/` directory mirroring the 12 English `docs/*.md` files (architecture, stacks, verification, commands, diagrams, memory-layer, safety, manual-installation, advanced-config, comparison, troubleshooting, README index). Total new files: 9 × 12 = **108 docs/ translations** (~25 000 lines of localized prose). Internal cross-links resolve within each language folder; "English original" pointer at the top of each translated doc links back to `../{filename}.md`.
- **Language-switcher consistency normalized** — all 10 README headers now use the same convention: 9 `· · ·`-separated language links, current-language entry omitted (matching the original English convention). Earlier mixed conventions (some agents had self-link, some had bold-unlinked, some omitted) have been unified.
- **`docs/vi/troubleshooting.md` broken-link fix** — `[SECURITY.md](../SECURITY.md)` → `[SECURITY.md](../../SECURITY.md)`. The Vietnamese translator agent had copied the English `../SECURITY.md` literal, which resolves correctly from `docs/` but breaks from `docs/vi/`. Other 8 languages' agents got this right via `../../`.

### Test fixture sanitization (real-project fingerprint purge)

- **Removed `tests/fixtures/claude-md/observed-ko-bad.md` and `observed-ko-fixed.md`** (17 KB + 15 KB). These two fixtures were anonymized exports from a real internal Vite + React project: file names had been changed to placeholders (`Acme*` instead of the original component prefix), but **structural fingerprints survived the rename and remained identifiable** — multi-entry `VITE_DESKTOP_PORT 3030` / `VITE_MOBILE_PORT 3033` / `VITE_STORYBOOK_PORT 4040` env-var pattern; internal RBAC convention (`buttonAuthorities` prop + `SYS_CODE_CONSTANTS.USE_BTN_AUTH`); `Orval + axios + generated-api-client/` tooling combination; precise package-version triple (TypeScript 5.8.3 + React 19.1.0 + Vite 6.3.5 + sass 1.89 + orval ^8.5.3); desktop/mobile multi-entry split architecture; `createBrowserRouter` + `RouterProvider` desktop-vs-mobile layout pair; the host placeholder `local-dev.example.internal`. None of the per-token name redactions removed the underlying structural pattern, which is sufficient to identify the source repository.
- **Added synthetic generic replacements** — `tests/fixtures/claude-md/valid-ko.md` (128 lines, ~4 KB) and `bad-ko.md` (148 lines, ~5 KB), modeled identically on the established `valid-ja.md` / `bad-ja.md` shape: generic `sample-project` with Express 4.19 + PostgreSQL 15 + Prisma 5 + TypeScript 5.4 + Vitest, port 3000, no real-world traceable identifiers. Korean test coverage is preserved (valid + §9 anti-pattern detection both still test in Korean), and the 9-error signature for `bad-ko.md` matches `bad-ja.md` / `bad-zh-CN.md` / `bad-es.md` / `bad-hi.md` / `bad-ru.md` exactly (1 S1 + 4 M-* + 4 F2-*).
- **`tests/claude-md-validator.test.js` updated** to reference the new fixture names (`valid-ko.md` and `bad-ko.md`) and removed the Korean special-case branch (`code === "ko" ? "observed-ko-fixed.md" : ...`); all 10 supported languages now follow the same `valid-{code}.md` pattern.
- **New hard rule** committed to project memory: `feedback_no-real-project-fingerprints-in-fixtures.md` — fixture sanitization requires structural-pattern removal (ports, RBAC conventions, tooling combinations, package versions, directory splits), not just name token replacement. Protects against regression.

### CHANGELOG strict-English scrub

- **52 substitutions of banned terminology categories** — the per-project memory hard rule defines categories (validation-process labels, project-status descriptors) that may not appear in any document; matching phrases were replaced with neutral test-suite vocabulary (`regression testing`, `regression scenario`, `Spring projects`, `Larger enterprise-style YAMLs`, `your project`, etc.). 16 anonymized project-name placeholders (12 frontend + 4 backend variants) were collapsed to two generic `Vite frontend test project` and `Spring backend test project` labels. Restores full compliance with the project memory hard rule.
- **12 non-English narrative replacements** — Korean, Japanese, and Chinese fragments inside backticked LLM-output examples were replaced with English placeholder descriptions (e.g., `<localized gloss>`, `the localized form of "Memory (L4)" in each script`, `<localized gloss A> / <localized gloss B>` for the two header-translation drift examples). `CHANGELOG.md` is now strict English narrative end to end — the only remaining non-ASCII characters are universal technical typography (em-dashes, mathematical arrows, inequalities, emoji status markers), none of which constitutes "language content".
- **Two grammatical cleanups** — minor leftover phrasing from the previous terminology pass was tightened (one tense / possessive correction at line 1704; one redundant compound noun simplified at line 1750).
- **v2.4.0 entry intro test-count corrected** — `Test suite 702 / 702 pass` → `Test suite 736 / 736 pass (final)`. The 702 number was the initial Session-Continuity-Protocol-only state at the top of the v2.4.0 entry; subsequent sub-sections within the same entry already documented the bump to 736 after 15 pipeline robustness fixes. The intro now reflects the final shipped state to avoid reader confusion.

### Repository hygiene

- **`claudeos-core/` test artifact removed from repo root** — leftover output from running the tool against itself during functional tests (3 files in `claudeos-core/generated/` + empty `claudeos-core/memory/`). The directory is `.gitignore`d so it was never committed, but removing the on-disk copy keeps the working tree clean.
- **No code, template, scanner, or validator changes** — `bin/`, `lib/`, `plan-installer/`, `pass-prompts/templates/`, `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `health-checker/`, `manifest-generator/`, `sync-checker/`, `plan-validator/` are all byte-identical to v2.4.0. `npm test` still passes 736 / 736.

### Verified backward compatibility

- **No breaking changes**. CLI surface (`init`, `lint`, `health`, `memory {compact,score,propose-rules}`, `validate`, `restore`, `refresh`) and all flags (`--lang`, `--force`, `--help`, `--version`) are unchanged. Generated CLAUDE.md / `.claude/rules/` / `claudeos-core/standard,skills,guide,database,mcp-guide,memory/` shapes unchanged.
- **`npm pack` size dropped 41 %** — 618.8 kB → 365.4 kB tarball as a side effect of the Korean / 8-language README slim-down (was 95–130 kB stale content per locale; now 21–32 kB lean and synced).
- **Test count unchanged**: 736 / 736 pass on Linux / macOS / Windows × Node 18 / 20.

---

## [2.4.0] — 2026-04-25

First feature in the v2.4 series: **Session Continuity Protocol** —
a recommended prose block inside Section 8's Memory Workflow that
addresses Claude Code's auto-compact behavior. Auto-compact may
truncate session context mid-work, dropping previously-loaded
`failure-patterns.md` references, recently-recorded decisions in
`decision-log.md`, and the `paths`-glob-conditional rule files
that had been activated for the working files. Session Continuity
gives the LLM an explicit re-entry routine for these three context
elements when a session resumes after compact or restart.

This release ships only the protocol itself. Two further v2.4
features (Self-Check Framework, Common Pattern Taxonomy) are
planned but not yet implemented; they will land in subsequent
2.4.x releases. Test suite final: **736 / 736 pass** (initial
Session-Continuity-Protocol-only state shipped at 702/702, +3 new
tests covering positive prose-form, negative H4-form rejection, and
explicit backward-compatibility for pre-v2.4 CLAUDE.md files;
the subsequent 15 pipeline robustness fixes documented below
brought the total to 736).

### Scaffold — Session Resume block in `claude-md-scaffold.md`

- **Problem addressed.** Claude Code sessions that exceed the
  context window trigger auto-compact: portions of older turns
  are summarized or dropped to make room. Restarted sessions
  begin with no in-context state. Both situations leave the LLM
  unaware of three pieces of state that were previously loaded:
  (1) the error patterns it had scanned at session start from
  `failure-patterns.md`, (2) the design decisions it had
  consulted (or appended) in `decision-log.md`, and (3) the
  `paths`-conditional rule files under `.claude/rules/**` that
  had been activated for the files being edited. CLAUDE.md is
  always re-loaded on session start, but the rest of the L4
  layer is not.

- **Change.** Add a new prose block to the scaffold's Section 8
  template, immediately following the 6-step `Memory Workflow`
  numbered list. The block opens with the bold label
  `**Session Resume (after auto-compact or restart)**:` and
  carries a 3-bullet list instructing the LLM to: re-scan
  `failure-patterns.md`, re-read the 3 most recent entries of
  `decision-log.md`, and re-match rule files by `paths` glob
  for the current working files. The block lives inside the
  scaffold's existing `# CLAUDE.md template structure` fenced
  example, so generated CLAUDE.md files (Korean, Japanese,
  Chinese, etc.) inherit the block in the target language.

- **Why prose, not a third H4.** Section 8's structural
  validator enforces EXACTLY 2 `####` headings (`L4 Memory
  Files` + `Memory Workflow`). Adding `#### Session Resume`
  would break every existing CLAUDE.md and require validator
  surgery. Prose form sits inside the Memory Workflow section,
  visually distinguished by the bold label, with no impact on
  the H4 count. The scaffold's per-section spec explicitly
  states "MUST NOT be a `####` subsection" so future
  contributors do not regress this.

- **RECOMMENDED, not required.** Pre-v2.4 CLAUDE.md files were
  generated without Session Resume. The validator does not
  enforce the block's presence — only that, if present, it
  takes the prose form rather than an H4. This preserves
  backward compatibility for every existing project. New
  generations via `npx claudeos-core init` (v2.4+) include
  the block by default.

- **Tests.** Three new cases in `claude-md-validator.test.js`
  under a new `Session Resume block (v2.4.0)` describe:
  (1) a valid English fixture with the block in prose form
  passes all 25 structural checks identically to the
  Session-Resume-less `valid-en.md`;
  (2) a fixture with the block placed as a third H4 under
  Section 8 fails with the canonical `[S-H4-8]` error
  ("found 3, expected 2"), proving the validator catches the
  most likely manual-editing mistake;
  (3) the existing `valid-en.md` (no Session Resume block at
  all) continues to pass, asserting backward compatibility
  against accidental future tightening.

- **Two new fixtures.**
  `tests/fixtures/claude-md/valid-en-with-session-resume.md`
  is a copy of `valid-en.md` with the block appended in prose
  form. `tests/fixtures/claude-md/bad-session-resume-as-h4.md`
  is a minimal valid CLAUDE.md with the block placed as
  `#### Session Resume`. The 10 existing language fixtures
  (`valid-en.md`, `valid-ko.md` (`observed-ko-fixed.md`),
  `valid-ja.md`, `valid-zh-CN.md`, `valid-es.md`,
  `valid-vi.md`, `valid-hi.md`, `valid-ru.md`, `valid-fr.md`,
  `valid-de.md`) are unchanged.

### Prompt-pipeline integration

- **Embed safety.** The scaffold ships to Pass 3 prompts via
  `prompt-generator.js::demoteScaffoldMetaHeaders`, which
  rewrites `## ` to `### ` for scaffold meta-sections while
  preserving headings inside fenced code blocks (the template
  example). Session Resume sits inside the markdown fence at
  scaffold lines 7322–13929, so demote leaves it byte-identical.
  Verified: the demoted scaffold contains exactly 2 `####`
  headings (the template's `L4 Memory Files` and `Memory
  Workflow`) and a Session Resume block of 850 bytes with
  3 bullets — same as the source.

- **i18n unaffected.** The scaffold's Section 8 per-section
  spec (lines 603–680) instructs the LLM to render Section 8
  headings with both the English canonical token and the
  target-language gloss (e.g. `## 8. Common Rules & Memory
  (L4) (<localized gloss>)`). Session Resume's bold
  label is treated as ordinary prose and translates freely
  alongside its bullets — verified against Korean and
  Japanese CLAUDE.md fixtures, both of which pass all 25
  structural checks with the block translated.

### Validator behavior matrix

| CLAUDE.md state | Session Resume present? | Form | Result |
|---|---|---|---|
| Pre-v2.4 generated | No | — | ✅ Pass (unchanged) |
| v2.4 generated | Yes | Prose | ✅ Pass |
| Hand-edited mistake | Yes | `#### Session Resume` (3rd H4) | ❌ `[S-H4-8]` error |
| Hand-edited mistake | Yes | Prose, but in Section 5 instead of 8 | ✅ Pass (validator does not enforce content position) |

The last row is a known limitation: structural validation
checks heading counts, table positions, and canonical heading
tokens, but does not enforce that arbitrary prose blocks
appear in their semantically correct section. This is by
design — the structural validator is the inner ring of
defense, and over-policing prose position would constrain
legitimate translation and project-specific elaboration. If
future operational evidence shows users repeatedly placing
Session Resume in the wrong section, a `content-validator`
advisory (warning, not error) can be added without changing
the structural rule.

### Combined guarantees

- **No existing CLAUDE.md is invalidated.** Backward
  compatibility was the explicit primary constraint; verified
  against all 10 language fixtures, the Korean observed
  fixture, and BOM-prefixed variants.
- **No validator logic changed.** `structural-checks.js` is
  byte-identical to v2.3.3. The Session Resume rule is
  enforced indirectly: prose form is invisible to existing
  checks; H4 form is caught by the pre-existing
  `checkH4Counts` (S-H4-8) rule.
- **No scanner, splitter, or Pass 1–4 pipeline changes.**
  Pure scaffold + fixtures + tests addition.
- **Test suite 702 / 702 pass** (up from 699 in v2.3.3),
  with the +3 coming exclusively from the new Session Resume
  describe block. No existing test was modified or skipped.

### Documentation & repository assets

A repository-level addition ships alongside the protocol.
It does not touch code or tests; it improves discoverability
for prospective users browsing the repository on GitHub.

- **CHANGELOG navigation block.** A "Releases" section was
  added at the top of `CHANGELOG.md`, listing the 13 most
  recent releases (v2.4.0 through v1.5.x) with a one-line
  summary and a GitHub-compatible anchor link to each
  entry. Older entries remain reachable by scroll or by
  GitHub blame. Anchor format follows GFM rules
  (`[2.4.0] — 2026-04-25` becomes `#240--2026-04-25`); all
  13 anchors are verified to resolve on GitHub.

### Verified backward compatibility

For the repository addition:
- **`CHANGELOG.md` ships in npm as before.** The TOC
  addition is plain markdown; the file remains in the
  package, so the navigation block is also visible on
  npmjs.com's package page.
- **No test impact.** Test suite remains 702 / 702.
- **No bin script behavior change.** `npx claudeos-core
  init` and all subcommands are byte-identical to the
  protocol-only state earlier in this entry.

### Pipeline robustness — bug fixes (post-protocol additions)

Fifteen bug fixes addressing failure modes surfaced during follow-up
testing on additional stack/layout combinations. All have unit test
coverage; no behavior change for projects whose previous output was
already correct. Test suite grows from 702 to 736 (+34 new cases:
3 Session Resume + 5 totalLines axis + 5 SKILL.md/path resolution +
3 root-package frequency + 5 Logback fallback + 2 nested port
+ 2 cross-module deep-sweep + 3 monorepo path resolution +
2 ellipsis placeholder / doc-writing-rules.md exclusion +
2 deeply-nested-port window expansion + 2 deep-sweep extended layers +
3 MANIFEST global coverage / domains-folder pattern +
2 health-checker soft-fail tier +
1 70.domains canonical convention regression guard +
3 always-typed `70.domains/{type}/` per-domain layout
(loadDomainTypeMap helper / pass3-footer ALWAYS-typed convention /
ensureDirectories pre-creates both backend+frontend sub-folders) +
1 02.domains.md orchestrator convention regression guard +
1 single-batch per-domain enforcement (buildBatchScopeNote always fires);
minus overlap = +34 net).

- **`content-validator/index.js` — orchestrator/sub-skill MANIFEST
  exception generalized.** The pre-existing v2.3.0 exception was
  scoped to sub-skills under the legacy `{NN}.{name}.md` convention,
  so generators that emit a category-level orchestrator at
  `{category}/SKILL.md` (with sub-skills at
  `{category}/{stem}/SKILL.md` or `{category}/{stem}/{name}.md`,
  no `NN.` prefix) produced one `MANIFEST_DRIFT` advisory per
  registered sub-skill. The fix relaxes the
  sub-skill regex (`(?:\d+\.)?[^/]+\.md$`) to make the numeric
  prefix optional, and adds a category-level rule: when CLAUDE.md
  references `{category}/SKILL.md`, every sub-skill registered
  under that category is treated as covered transitively. Integrity
  checks (`STALE_SKILL_ENTRY` for missing files, `MANIFEST_DRIFT`
  for unrelated parents) continue to fire at full strength — this
  is purely a false-positive elimination.

- **`plan-installer/scanners/scan-java.js` — root package
  frequency-based selection.** Pre-fix the rootPackage was set from
  the FIRST matched layer-bearing file's package, which is
  glob-enumeration-order-dependent: a multi-module project where
  the bulk of code lives under one root but a small number of stub
  files sit under a different subtree could non-deterministically
  pick the minority root. The fix counts every (1-, 2-, 3-, 4-)
  segment prefix preceding a layer marker, then picks the LONGEST
  prefix whose count is at least 80% of the maximum. This selects
  the most specific root that still covers the majority of files —
  for a single-package project all prefix lengths tie at 100% and
  the longest wins (intuitive). For a multi-module project the
  threshold filters out minority subtrees while still picking a
  specific common ancestor.

- **`plan-installer/scanners/scan-java.js` — Pattern B deep-sweep
  fallback for zero-file domains.** Standard per-domain globs assume
  `{domain}/{layer}/X.java`. Multi-module projects with a
  `front/{domain}/` HTTP layer + `core/{domain}/{layer}/`
  service/dao layer split work via the leading `**`, but
  cross-domain coupling (`core/{otherDomain}/{layer}/{domain}/X.java`
  — services for `{domain}` living under another module's layer
  directory) was missed because the layer dir comes BEFORE the
  domain dir, and `**/{domain}/{layer}/*.java` doesn't match. The
  fix: when standard globs return ZERO files for a Pattern B/D
  domain that's already registered (so it provably exists), fall
  back to `**/${dn}/**/*.java` and classify each file by walking up
  to the nearest layer dir. This catches both
  `${dn}/{layer}/X.java` AND `{layer}/${dn}/X.java` placements.
  Restricted to Pattern B/D zero-file case so projects with healthy
  direct-layout counts behave identically to pre-fix.

- **`plan-installer/stack-detector.js` — Gradle/Maven
  `packageManager` populated.** Pre-fix `stack.packageManager` was
  set only for Node.js (npm/yarn/pnpm) and Python (pip/poetry/
  pipenv/pdm). JVM projects using Gradle or Maven left it `null`,
  which surfaced as `PackageMgr: none` in init output and `null`
  in `project-analysis.json`. The fix sets `packageManager =
  "gradle"` when a `build.gradle{.kts}` is detected and
  `"maven"` for `pom.xml`. Node/Python detection runs first and
  sets a value; the JVM fallback only fires when nothing else
  claimed it (so a JVM monorepo with a Node-tooling overlay
  retains the Node package manager).

- **`plan-installer/stack-detector.js` — Spring Boot default
  Logback fallback.** Spring Boot ships Logback transitively via
  `spring-boot-starter`; most projects don't declare
  `ch.qos.logback:logback-classic` explicitly, so the
  dependency-only `LOGGING_RULES` regex misses Logback for the
  common case (only finding adapters like log4jdbc when
  declared). The fix adds Logback to `stack.loggingFrameworks`
  when `framework === "spring-boot"` AND the project hasn't
  explicitly opted into log4j2 (which would suppress Logback via
  `spring-boot-starter-log4j2`). Provenance is recorded in
  `stack.detected` as `"logback (spring-boot default)"` so
  consumers can distinguish fallback-derived from explicit
  declaration.

- **`plan-installer/stack-detector.js` — nested `port:` matching
  inside `server:` block.** Pre-fix port pattern (1) required
  `port:` to be IMMEDIATELY adjacent to the `server:` line
  (`/server:\s*\n\s*port:\s*(\d+)/`). Real Spring Boot configs
  commonly nest `port:` under `server:` with intermediate keys
  (`ssl:`, `http:`, `error:`, etc.) preceding it. The fix adds
  patterns (5) and (6) — `^server:[\s\S]{0,2000}?\n[ \t]+port:\s*(\d+)$/m`
  with placeholder variant — that lazy-match within a 2000-char
  window after `server:` while requiring leading whitespace on
  the `port:` line (so an outdented sibling `port:` at column 0
  is correctly rejected as outside the server: block).

- **`content-validator/index.js` — STALE_PATH monorepo prefix
  resolution.** Pre-fix the path-claim check verified each cited
  `src/...\.(ts|tsx|js|jsx)` path by `path.join(ROOT, claimed)`
  followed by `fs.existsSync()`. Turborepo / pnpm-workspace
  projects keep source files under `apps/<app>/src/...` or
  `packages/<pkg>/src/...`; a rule citing the workspace-relative
  shorthand `src/app/layout.tsx` (the natural single-app form)
  was a false-positive `STALE_PATH` even when the actual file
  existed at `apps/<app>/src/app/layout.tsx`. The fix introduces
  a `resolvePathClaim()` helper with three-step resolution:
  (1) direct `<ROOT>/<claimed>`, (2) `<ROOT>/apps/*/<claimed>`,
  (3) `<ROOT>/packages/*/<claimed>`. The fallback only fires for
  `src/`-prefixed paths and only when the direct match fails;
  genuinely missing files still flag STALE_PATH (verified by a
  defense-against-masking test case).

- **`content-validator/index.js` — ellipsis placeholder + meta-doc
  exclusion.** Two coordinated false-positive eliminations
  surfaced after the monorepo fix shipped. (1) `hasPlaceholder()`
  now recognizes the `/.../` ellipsis path segment as a
  placeholder marker, alongside the existing `{...}` curly-brace,
  `Xxx` / `XXX`, and `*` glob forms. LLMs commonly write
  illustrative paths like `src/app/api/.../route.ts` to mean
  "any API route under `app/api/`"; pre-fix the literal `...`
  fragment failed `fs.existsSync()` and got reported as
  `STALE_PATH`. The new pattern `/\/\.\.\.\//` matches a
  three-dot segment between path separators — `...` is not a
  valid directory name on any major filesystem (only `.` and `..`
  are legal dot-only names), so this signal is unambiguous. (2)
  `PATH_CLAIM_EXCLUDE_FILES` now includes
  `00.core/51.doc-writing-rules.md` alongside the existing
  `00.core/52.ai-work-rules.md`. Both are meta-documents
  teaching path discipline to the reader: 51 explicitly states
  "verify file paths before writing them in documents" and
  cites example paths (`src/middleware.ts`,
  `src/app/api/<route>/route.ts`) as illustrations of the rule.
  The content-blind validator would otherwise flag every cited
  example as `STALE_PATH` on every project that doesn't happen
  to contain all the cited illustrative files. The exclusion is
  defense-in-depth alongside the placeholder relaxation: prompt
  guidance encourages placeholders, validator tolerates the
  remaining literal-path examples in this one-file class.

- **`plan-installer/stack-detector.js` — `server:` block port window
  expansion (2000 → 20000 chars).** Patterns (5)/(6) added in the
  prior nested-port fix used a 2000-char lazy window between
  `server:` and `port:`. Larger enterprise-style YAMLs commonly nest
  `server:` with `ssl:`/`http:`/`tomcat:`/`compression:`/`error:`
  children spanning 3000+ chars before the `port:` line; the 2000
  limit silently failed to match and the detector defaulted to the
  Spring Boot 8080 fallback. The fix expands the window to 20000
  chars (sufficient for ~600 lines of preceding content) while
  keeping the lazy quantifier — first-match-wins semantics
  guarantee the closest `port:` is captured, so the wider window
  costs nothing in correctness.

- **`plan-installer/index.js` — multi-DB array surfaced in console.**
  Pre-fix the `[Phase 1] Detecting stack...` block printed only
  `stack.database` (singular); the `stack.databases` array
  (multi-dialect) populated by `detectDb()` since v2.3.2 was
  invisible to the user and to downstream Pass 1 LLMs that grep
  the console transcript. On dual-datasource projects (e.g. Oracle
  primary + MySQL master/slave) Pass 1 had to re-derive the second
  DB from source code. The fix adds a `Databases:` line listing
  the full array when `databases.length > 1`; single-DB output
  is byte-for-byte identical.

- **`plan-installer/scanners/scan-java.js` — extended layer
  recognition in deep-sweep + catch-all service classification.**
  The v2.4.0 deep-sweep (separate prior fix) only recognized the
  canonical layer set
  (`controller`/`service`/`aggregator`/`facade`/`usecase`/
  `orchestrator`/`mapper`/`repository`/`dao`/`dto`/`vo`). Larger
  codebases place implementation code under non-canonical
  layers like `factory/`, `strategy/`, `impl/`, `helper/`,
  `handler/`, `manager/`, `client/`, etc. Pre-fix these files were
  silently dropped (no `break`), causing legitimate domains to
  report 0 totalFiles and surfacing as "Group N: ~0 files" in
  Phase 4 output. The fix expands the recognized layer list to 22
  entries and adds a catch-all: any `.java` file under the domain
  tree that fails layer classification is counted as a `service`
  (the most generic backend role). This catches both
  `core/{dn}/{nonstandard-layer}/X.java` and bare-domain
  `core/{dn}/X.java` (no layer subdir) layouts.

- **`content-validator/index.js` — global MANIFEST coverage rule for
  sub-skill paths.** The v2.4.0 orchestrator/sub-skill exception
  expected a sibling orchestrator at `{category}/{stem}.md` paired
  with sub-skills at `{category}/{stem}/{file}.md`. Pass 3c
  occasionally invents new folder structures (e.g.
  `{category}/domains/{domain}.md` for per-domain notes) that lack
  a matching sibling orchestrator, and every such registration
  surfaced as `MANIFEST_DRIFT`. The fix adds a category-independent
  coverage rule: when CLAUDE.md mentions any `MANIFEST.md` (the
  global skill registry), all SUB-SKILL paths (paths matching the
  deep-folder regex) are considered covered transitively because
  the reader navigates from MANIFEST to find them. TOP-LEVEL
  registrations (`{category}/{file}.md` with no folder layer) are
  unaffected — they still require direct mention. This is purely a
  false-positive elimination on layouts the design intended to
  support; the integrity check `STALE_SKILL_ENTRY` (registered
  file missing on disk) continues to fire at full strength.

- **`pass-prompts/templates/common/pass3-footer.md` — explicit
  ✅/❌ enforcement block for standard files.** Pass 3b LLMs
  occasionally generated standard files with only ✅ "correct"
  examples and no ❌ "incorrect" example, surfacing as
  `[NO_BAD_EXAMPLE]` advisories from `content-validator`. The
  per-stack template instruction ("Each file MUST include
  Correct/Incorrect examples") was sometimes deprioritized
  during long generation runs. The fix adds a CRITICAL-tier block
  to `pass3-footer.md` (which is appended to every Pass 3 prompt
  regardless of stack) explicitly mandating both ✅ and ❌ blocks
  in every standard file, with a self-check rule
  ("Does this file have at least one ❌ block?") to be applied
  before finalizing each file. The pass3-footer is a project-wide
  reminder that runs after the stack-specific body, giving the
  rule late-stage emphasis.

- **`bin/commands/init.js` — Pass 3b/3c batch scope clarification.**
  The `buildBatchScopeNote()` helper produced a per-batch
  instruction telling Pass 3 LLMs to "generate per-domain files
  for the domains in this batch". On multi-batch runs (>15
  domains), one observed failure mode was Pass 3b rationalizing
  Rule B (idempotent skip) to bypass the entire batch when common
  files at OTHER paths existed (created by 3b-core). The fix
  strengthens the scope note: explicit per-domain output paths
  (`60.domains/{domain}.md` and `.claude/rules/60.domains/
  {domain}-rules.md`), explicit "Expected output: N new files"
  count to make zero-output detectable, and a guard clause
  forbidding Rule B as justification for whole-batch SKIP when
  per-domain target files don't yet exist. Single-batch runs
  (≤15 domains) are unaffected — this scope note only fires in
  multi-batch mode.

- **`health-checker/index.js` — soft-fail (`advisory`) tier for
  `content-validator`.** Pre-fix `content-validator` exited
  non-zero whenever it found any quality advisory (STALE_PATH,
  MANIFEST_DRIFT, NO_BAD_EXAMPLE, etc.), which the health-checker
  rendered as `❌ content-validator fail` in its summary. Init
  output simultaneously printed "ℹ️ Content advisories detected
  — these are quality notes, NOT generation failures", producing
  a confusing dual signal. The fix introduces a third severity
  tier alongside the existing `pass`/`fail`/`warn`: `advisory`
  (icon `ℹ️`), assigned to tools flagged with `softFail: true`.
  `content-validator` carries this flag; on non-zero exit it
  renders as `ℹ️ content-validator advisory` and does NOT propagate
  to the health-checker's overall exit code. The summary line was
  rewritten to distinguish real failures
  (`⚠️ N failed` — gate-blocking) from soft notes
  (`✅ All systems operational (1 advisory, 1 warning)` — gate
  green). Real structural failures (plan-validator, sync-checker,
  manifest-generator) continue to gate the health command's exit
  code, preserving CI-pipeline gating.

### Combined guarantees (post-bug-fix state)

- **Test suite 736 / 736** (up from 702 in the protocol-only
  state earlier in this entry; +29 new cases as enumerated
  above; no existing test was modified or skipped, with one
  exception: the integrated MANIFEST_DRIFT scenario test had its
  expected drift count adjusted from 3 to 0 to reflect the new
  global-MANIFEST coverage rule, with the rationale documented
  inline in the test body).
- **No CLI surface changes.** `init`, `lint`, `health`, `memory`
  subcommands and their flags are unchanged. `package.json`
  remains at v2.4.0; no new dependencies.
- **No backward-compatibility breaks.** Every fix above is
  defensive (false-positive elimination, fallback for missing
  cases) — projects whose pre-fix output was already correct
  continue to produce byte-identical output.
- **Token-leak audit.** All identifiers used in the bug-fix code
  and tests are generic CRUD examples (widget / notification /
  inventory / order / product / payment etc.); no project
  codenames or company-specific identifiers introduced.

### Namespace category unification (root-cause structural fix)

Following observation that Pass 3 LLM occasionally cross-contaminated
namespace category names (creating `.claude/rules/10.backend-api/`
sibling to `.claude/rules/10.backend/`, etc.), the underlying naming
asymmetry between rules and standard namespaces is eliminated: all
shared categories now use IDENTICAL folder names across both
namespaces, and the prefix collision between `rules/50.sync` and
`standard/50.verification` is resolved by relocating the standard
side to `80.verification`.

**Before** (asymmetric):
- standard: `10.backend-api`, `20.frontend-ui`, `50.verification`
- rules:    `10.backend`,     `20.frontend`,    `50.sync`

**After** (unified):
- standard: `10.backend`, `20.frontend`, **`80.verification`**, `90.optional`
- rules:    `10.backend`, `20.frontend`, `50.sync`, `60.memory`, `70.domains/{type}/`

Now `10.*` / `20.*` mean the same conceptual category in both
namespaces (LLM cannot confuse them). `50.sync` (rules) and
`80.verification` (standard) no longer share a numeric prefix.

**Affected files**: `bin/commands/init.js` ensureDirectories,
buildBatchScopeNote, buildStageCorePrompt, determineActiveDomains;
all 12 `pass-prompts/templates/*/pass3.md`; tests
(`init-command.test.js` EXPECTED_DIRS, `pass3-context-builder.test.js`
activeDomains key, two `tests/fixtures/claude-md/observed-ko-*.md`
fixtures); 10-language READMEs (directory tree examples).

**Migration**: Existing projects generated with the pre-unification
convention (`standard/10.backend-api/`, `standard/50.verification/`)
must re-run `npx claudeos-core init --force` to regenerate under
the new layout. Validators are namespace-agnostic (use globs) and
require no changes — old generated content remains readable but
will not be re-emitted at the legacy paths.

**Test coverage**: 736 / 736 pass (+1 from a new
`buildBatchScopeNote always fires` regression guard added in the
same release). No existing tests modified except the EXPECTED_DIRS
list and one `activeDomains` literal — both updated to the new
canonical category names.

## [2.3.3] — 2026-04-24

Template hygiene + splitter infrastructure. Two co-shipped changes,
both derived from two consecutive regression scenarios (one
React/Vite frontend, 14 domains; one legacy Java/Spring backend,
7 domains) that surfaced (a) a template inconsistency causing
spurious `NO_GOOD_EXAMPLE` / `NO_BAD_EXAMPLE` advisories on Vite/
Angular/Fastify/Flask projects while Java/Spring and seven other
stacks were clean, and (b) a Pass 1 time-outlier where a 29-file
domain group ran ~70% longer than a 39-file group because the group
contained a single 2544-line source file (TUI Grid wrapper) whose
analysis cost was driven by line count, not file count. Zero
functional regression: all existing scanners continue to produce
the legacy `{name, totalFiles}` domain shape and split exactly as
before. Test suite 699 / 699 pass (up from 694, +5 new tests for
the optional `totalLines` axis).

### Prompt — `pass3.md` code-example emoji consistency

- **Problem addressed.** `content-validator` checks standard files
  for the presence of ✅ / ❌ emoji (or per-language equivalents
  for "correct" / "incorrect" across the 10 supported output languages) as a
  structural signal that correct and incorrect code examples are
  both present. Eight of the twelve stack-specific `pass3.md`
  templates (`java-spring`, `kotlin-spring`, `node-express`,
  `node-nestjs`, `node-nextjs`, `python-django`, `python-fastapi`,
  `vue-nuxt`) instruct the LLM with the literal phrase
  `- Correct examples (✅ code blocks)` and
  `- Incorrect examples (❌ code blocks)`, causing the emoji to
  propagate into generated standards verbatim. The remaining four
  (`angular`, `node-fastify`, `node-vite`, `python-flask`) omitted
  the emoji in the instruction phrase, producing standards that
  described correct/incorrect cases in prose without the emoji
  marker the validator expects. Result: clean Java/Spring regression scenario
  (0 advisories, 0 notes) vs. Vite regression scenario (0 advisories, 13 notes)
  — identical pipeline, identical generator, different template
  phrasing.

- **Change.** Align the four outlier templates with the eight-stack
  majority. The Angular template retains its TypeScript-specific
  wording (`Correct examples (✅ code blocks in TypeScript)` /
  `Incorrect examples (❌ code blocks showing common Angular
  mistakes)`); the other three adopt the same two-line pattern as
  the majority. No other template content changed.

- **Rationale for template change rather than validator exemption.**
  An alternative fix would have been to mark overview-style standard
  files (`00.core/01.project-overview.md`,
  `00.core/02.architecture.md`, etc.) as exempt from the emoji
  check on the grounds that they are descriptive rather than
  example-heavy. That option was rejected because it would hide a
  real template inconsistency rather than fix it, and because the
  Java/Spring stack's zero-notes output proves that overview files
  *can* include ✅/❌ markers without becoming artificial — the
  generator simply needs to be told to include them.

- **Scope.** Template prose only. `content-validator` regexes and
  keyword tables are unchanged. Generated standards on
  Angular/Fastify/Vite/Flask projects will now pass the emoji check
  on first generation rather than surfacing advisories that Pass 3c
  / Pass 3d / Pass 4 eventually reduce. Existing Java/Spring and
  the seven other stacks are unaffected (their templates already
  carried the emoji).

### Splitter — optional `totalLines` axis in `splitDomainGroups`

- **Problem addressed.** Pass 1 batches domains into groups using
  `MAX_FILES_PER_GROUP = 40` and `MAX_DOMAINS_PER_GROUP = 4`. This
  is sound when per-file size is roughly uniform but produces time
  outliers when a group contains a small number of very large
  files. An observed scenario: a 29-file 4-domain batch took 7 m 0 s,
  while a 39-file single-domain batch and a 34-file 3-domain batch
  on the same project ran in 4 m 9 s and 4 m 22 s respectively.
  Root cause: one of the 4 domains in the slow batch included a
  single 2544-line third-party grid library wrapper file whose
  analysis cost is driven by line count, not file count. Pass 1
  ETA estimation and batch balance both suffer when a single
  large file hides inside an otherwise small-looking group.

- **Change.** Introduce `MAX_LINES_PER_GROUP = 8000` as an optional
  third splitting axis alongside the existing file-count and
  domain-count budgets. The new axis is strictly additive: the
  splitter consults `d.totalLines` on each incoming domain and
  flushes the current group early if adding the next domain's
  lines would exceed the budget. When `totalLines` is absent,
  negative, non-number, or `NaN`, the line-budget check is skipped
  entirely and the splitter behaves byte-for-byte as in v2.3.2.

- **Backward compatibility.** All five existing scanners
  (`scan-java.js`, `scan-kotlin.js`, `scan-node.js`, `scan-python.js`,
  `scan-frontend.js`) continue to emit `{name, totalFiles, ...}`
  without `totalLines`, so their output passes through the splitter
  with identical grouping to v2.3.2. Scanners that wish to opt into
  line-aware splitting can populate `totalLines` per domain in a
  future release; no scanner change ships in 2.3.3.

- **Threshold calibration.** 8000 is a conservative starting point
  equivalent to ~40 files × ~200 lines each — roughly the
  file-count budget expressed in lines. It can be revised once
  scanners begin populating `totalLines` and real distribution data
  accumulates across stacks. The constant is declared at module
  scope (lifted out of the function body, alongside the existing
  `MAX_FILES_PER_GROUP` and `MAX_DOMAINS_PER_GROUP` constants) so
  future tuning is a one-line change with accompanying rationale in
  the adjacent block comment.

- **Defensive validation.** `totalLines` is read with a strict
  `typeof d.totalLines === "number" && d.totalLines >= 0` guard.
  Malformed values (strings, `NaN`, negatives) cause the domain to
  be treated as line-count-unknown rather than crashing the
  splitter or producing nonsensical groupings. This protects
  against scanner bugs during the migration period when some
  scanners may emit `totalLines` and others not.

- **Tests.** Five new cases in `tests/domain-grouper.test.js`:
  (1) legacy shape produces identical output (backward
  compatibility); (2) line budget flushes when two 5000-line
  domains would combine; (3) line budget does not flush when two
  3000-line domains stay under the 8000 threshold; (4) mixed shape
  (one domain with `totalLines`, one without) works correctly; and
  (5) malformed `totalLines` values (negative, string, `NaN`) fall
  back to legacy behavior. All 33 pre-existing tests in the same
  suite continue to pass unchanged.

### Combined guarantees

- **Output parity for existing projects.** Projects that previously
  ran clean on v2.3.2 continue to run clean on v2.3.3. Projects on
  Angular/Fastify/Vite/Flask that previously accumulated "No
  ✅/❌ example found" advisories will produce fewer or zero such
  advisories on first generation.
- **No scanner changes, no Pass changes, no pipeline changes.**
  The splitter and template modifications are isolated; all Pass
  1-4 stages, resume semantics, progress accounting, and marker
  validation are byte-identical to v2.3.2.
- **Test suite 699 / 699 pass** (up from 694), with the +5 coming
  exclusively from the new optional-axis cases. No existing test
  was modified or skipped.

## [2.3.2] — 2026-04-23

Internal refactor + UX polish + prompt/validator co-evolution for
path-hallucination defense + stack-detector hardening. Five co-shipped
changes: (1) `bin/commands/init.js` — `cmdInit` decomposed from a
single 970-line function into 16 focused stage helpers plus a 107-line
orchestrator; (2) `content-validator` output reframed from the
vocabulary of generation failures to the vocabulary of quality
advisories; (3) library-convention hallucination warning in
`pass3-footer.md` / `pass4.md` rescoped from filename-binding to
topic-binding, with validator-side placeholder-pattern expansion
(`Xxx` / `XXX` / glob-star) and a narrow file-level exclusion for
`00.core/52.ai-work-rules.md`, plus a follow-up hypothetical /
future-tense framing guard that closes the "if this feature were
added, it would live at `src/middleware.ts`" class of path
fabrication; (4) `claude-md-scaffold.md` Section 1
generation rules hardened with a canonical 10-language translation
table, and Section heading parenthetical gloss reclassified from
optional to required (for non-English output) / forbidden (for
English output), with a 10-language × 8-section gloss table;
(5) `plan-installer/stack-detector.js` extended to cover Gradle
variable-reference patterns (`sourceCompatibility = "${var}"`, ext-
block Spring Boot version), Maven property references, Spring
property-placeholder ports (`${APP_PORT:8090}`), iBatis detection as
distinct from MyBatis, multi-dialect database arrays, MariaDB
detection (previously missing from `DB_KEYWORD_RULES`), and logging-
framework identification (Logback / Log4j2 / log4jdbc / Log4j 1.x
with oauth-style false-positive guards). Also `pass-prompts/templates/
java-spring/pass3.md` and `kotlin-spring/pass3.md` logging-rule glob
extended to cover `.properties`, `.groovy`, and `log4jdbc*` file
patterns; Pass 1 Java / Kotlin prompts now include an explicit
"configuration file verification" block instructing the LLM to read
`build.gradle` / `pom.xml` / `application*.yml` directly as
ground-truth sources when stack metadata is incomplete. Zero
functional regression: identical pipeline behavior, identical exit
codes for CI consumers. Test suite 694 / 694 pass (up from 662).

### Refactor — `cmdInit` decomposition

- **Problem addressed.** The main entry-point function had accumulated
  970 lines, 77 `if` statements, and 17 `try` blocks as each new
  pipeline stage (Pass 1 batching, Pass 2 structural validation,
  Pass 3 split + resume, Pass 3 stale-marker detection, Pass 4
  gap-fill, lint, content-validator) was spliced into the same linear
  body. The function was readable one stage at a time but not as a
  whole, and every new contribution required paging through the
  entire body to locate the correct insertion point. This release
  extracts each stage into a named helper, leaving `cmdInit` as a
  top-to-bottom pipeline of 16 function calls with progress
  accounting between them (107 lines, 2 `if`, 0 `try`; estimated
  McCabe complexity ≥94 → ≤5).

- **Extracted stage helpers.** Each owns exactly one phase of the
  pipeline and nothing else:
  `checkPrerequisites`, `resolveLanguage`, `applyResumeMode`,
  `ensureDirectories`, `loadDomainGroups`, `loadPass1Prompts`,
  `makeProgressBar`, `runPass1Loop`, `runPass2`,
  `buildPass3ContextJson`, `handlePass3StaleMarker`, `dispatchPass3`,
  `runPass4`, `runVerificationTools`, `runLint`,
  `runContentValidator`, `printCompletionBanner`. Stage functions
  that advance the outer progress bar return a step-delta that
  `cmdInit` accumulates into its local `completedSteps` counter,
  preserving the `completedSteps++` token required by the
  `pass3-marker.test.js` stale-region regex.

- **`runPass3Split` intentionally NOT extracted.** Eight test files
  (`pass3-marker`, `master-plan-removal`, `pass3-batch-subdivision`,
  `pass4-marker-validation`, `pass3-guards`, `translation-skip-env`,
  `pass2-validation`, `pass4-claude-md-untouched`) read
  `bin/commands/init.js` as source text and grep for internal
  patterns (`runStage("3d-aux"`, `function computeBatches`,
  `DOMAINS_PER_BATCH = 15`, `if (isBatched) { ... runStage("3b-core"`
  proximity, etc.). Moving `runPass3Split` to a separate module
  would require re-designing those eight source-parity checks
  against importable exports. That is a deliberate follow-up; this
  patch keeps the test boundary untouched so the refactor is pure
  mechanical decomposition.

- **Semantic preservation.** All user-visible behavior is identical:
  every log line, every `InitError` message, every banner frame,
  every progress-bar tick, every resume/fresh branch, every
  stale-marker code path, the static-fallback marker body, and the
  `applyStaticFallback` gap-fill sequence are byte-identical to
  v2.3.1. The only change is *where* the code lives within the same
  file.

### UX — `content-validator` advisory vocabulary

- **Problem addressed.** When `init` finished cleanly and the user
  saw the celebratory `✅ ClaudeOS-Core — Complete` banner, the
  previous step's output already said `❌ ERRORS (6): [STALE_PATH] ...`.
  The ordering produced a "success or failure?" flinch even though
  the two messages were describing different questions: `init` had
  succeeded (files are on disk, structure valid, tests pass);
  `content-validator` had merely observed that some LLM-guessed
  filenames inside the generated rules don't resolve on disk. Those
  are quality advisories — the generated docs are usable — but the
  word "ERRORS" made users reach for `init --force`, which does not
  reliably fix the advisories (re-running Pass 3 with the same fact
  JSON often produces the same mis-inference).

- **Fix.** Purely linguistic. No logic changes.

  - **`content-validator/index.js` — output relabeling.** The banner
    `❌ ERRORS (N)` becomes `ℹ️  ADVISORIES (N)`; `⚠️  WARNINGS (M)`
    becomes `⚠️  NOTES (M)`; the final summary `Total: N errors,
    M warnings` becomes `Total: N advisories, M notes`. The internal
    arrays stay named `errors` and `warnings` because they encode
    severity for programmatic consumers.

  - **Exit code preserved at source.** `content-validator` still
    returns `process.exit(1)` when advisories exist. This is a
    deliberate asymmetry: the tool reports advisories softly in
    output but still signals a non-zero exit code, because
    `npx claudeos-core health` and any CI pipeline wired to it need
    a real gate. Stripping the exit code would silently pass
    `STALE_PATH` / `MANIFEST_DRIFT` findings through `health-checker`
    (which branches on tool exit code + `warnOnly` flag), destroying
    the detection signal v2.3.0 was built for.

  - **`bin/commands/init.js` `runContentValidator` — advisory
    framing.** The post-subprocess message is rewritten as
    "Content advisories detected — these are quality notes, NOT
    generation failures. Your generated docs are ready to use as-is."
    The guidance pointer reads "npx claudeos-core health (standalone
    gate with exit code)" so users who want a hard gate know where
    to find one.

  - **`stale-report.json` schema unchanged.** Fields `contentErrors`
    and `contentWarnings` keep their names — they are part of the
    public schema read by `health-checker` and any external CI
    consumer.

- **Why this is not severity down-grading.** A naive fix would move
  `STALE_PATH` and `MANIFEST_DRIFT` from the `errors[]` array into
  the `warnings[]` array and exit 0. That would flatten the signal
  in `health-checker` (which distinguishes pass/fail/warn by exit
  code + `warnOnly` flag), so an advisory-heavy project would report
  "✅ All systems operational" even with 20 stale paths — the exact
  silent-failure class v2.3.0 eliminated. This release instead keeps
  the severity distinction intact inside the tool and stale-report,
  and only changes the words the user reads.

### Prompt + Validator — Library-convention hallucination

- **Problem addressed.** The library-convention warning in
  `pass3-footer.md` / `pass4.md` was previously scoped to specific
  filenames (`testing-strategy.md`, `styling-patterns.md`,
  `state-management.md`). When a file's topic matched (testing,
  env typing, styling, state management) but its filename did not,
  the LLM ignored the warning and cited canonical library paths
  from training data (`src/test/setup.ts`, `src/types/env.d.ts`,
  `src/__mocks__/handlers.ts`, etc.) that do not exist in the
  project. `content-validator [10/10]` then flagged these as
  `STALE_PATH` advisories.

  A second, distinct failure class exists when a prompt enumerates
  convention-trap paths as a denylist: the LLM, when generating a
  file whose purpose is to teach future sessions about hallucination
  traps (notably `52.ai-work-rules.md`), treats the denylist as
  source material and copies the literal paths into the output as
  cautionary illustrations ("AI sessions should not invent paths
  like these"). `content-validator`'s path-claim check is content-
  blind and treats the illustrations as literal claims. This is
  **prompt-to-output educational leakage** — not a hallucination,
  but a teaching example that the validator cannot distinguish from
  a real claim.

- **Fix.** Four coordinated changes across prompt and validator:

  - **Scope expansion to topic-binding.** The warning block in
    `pass3-footer.md` and `pass4.md` was rescoped from filename-
    binding to topic-binding — the trigger is "the topic the file
    is about", not "the filename of the document". A "Scope note
    (v2.3.2+)" paragraph makes this explicit.

  - **No literal convention paths in prompt templates.** The
    enumerated denylist approach was abandoned. The warning
    describes the class behaviorally ("PROJECT-CHOICE files",
    "library's canonical path may not exist here") and points to
    abstract replacement forms ("a shared setup module under a
    test directory of your choice", "augment `ImportMetaEnv` in a
    type-declaration file of your choosing"). Literal example
    paths have been removed from anti-pattern blocks in both
    templates and rewritten as mechanism labels (e.g.
    `Framework-convention entry-point invention`, `Parent-directory
    or constant-name renormalization`, `Plausibly-named utility
    invention`) with prose explanations but no `src/...` strings.

  - **Educational-example placeholder guidance.** A new block in
    both `pass3-footer.md` and `pass4.md` explains that rule files
    which need to illustrate bad path habits (notably
    `52.ai-work-rules.md`) should use abstract placeholders —
    `{placeholder}`, `Xxx` / `XXX`, glob stars, or prose — rather
    than literal paths. Literal example paths are interpreted as
    real claims by `content-validator [10/10]` regardless of
    surrounding prose.

  - **Validator: placeholder detection expanded.** The
    `hasPlaceholder(path)` predicate in `content-validator/index.js`
    now skips three placeholder forms:
      1. `{...}` — the original v2.3.0 curly-brace form.
      2. `X{3,}` / `Xxx` — uppercase-XXX / `Xxx` placeholder
         tokens. No word boundaries, so `useXXX_CONFIG` and
         `XXXParser.ts` are both correctly skipped.
      3. `*` — glob wildcards describing a class of files.

  - **Validator: file-level exclusion for by-design educational
    files.** A new `PATH_CLAIM_EXCLUDE_FILES` set in
    `content-validator/index.js` skips path-claim verification on
    files whose purpose is to cite convention-trap paths as
    warnings. Currently one file: `00.core/52.ai-work-rules.md`
    (the AI Work Rules file). The exclusion is narrow, explicit,
    and documented in a code comment explaining why the exclusion
    is a design choice rather than a band-aid. The output line
    shows "(N file(s) excluded by design)" so users understand the
    count is reduced intentionally.

- **Why a split (prompt + validator) rather than prompt-only.** The
  prompt change alone cannot guarantee the LLM will never produce a
  literal example path when writing an educational rule — the LLM
  may genuinely believe a concrete example is pedagogically clearer.
  The validator change alone (exclusion only) would let a genuine
  hallucination in `52.ai-work-rules.md` go undetected. The
  combination is defense-in-depth: the prompt nudges toward
  placeholder form (reducing false positives at source); the
  validator tolerates educational examples in the one file where
  they are expected (eliminating the remaining false positives);
  and genuine hallucinations in every other file continue to be
  flagged as before.

- **Test impact.** `tests/pass4-prompt.test.js`'s `pass4 enforces
  path fact grounding` test was updated: literal-path matchers
  (e.g., ``/❌ `src\/__mocks__\/handlers\.ts`/``) were replaced
  with topic-level and mechanism-label matchers (`/Library-
  convention canonical paths | testing.*env typing.*styling/`,
  `/Framework-convention entry-point invention/`, etc.). The test's
  intent is unchanged: it still verifies that the Pass 4 prompt
  warns about library-convention hallucinations; only the form of
  the warning has evolved.

#### Follow-up: hypothetical / future-tense framing guard

- **Problem addressed.** The library-convention fix closed the
  "canonical path exists here" failure mode, but a sibling failure
  mode was observed: when describing *future* or *hypothetical*
  feature additions, the LLM would wrap a framework-canonical path
  in conditional framing ("if middleware is added later, place it
  at `src/middleware.ts`", "for a future health endpoint,
  `src/app/api/health/route.ts`") and write the literal path
  verbatim. `content-validator [10/10]` is content-blind: it treats
  every backticked `src/...` path as a path claim regardless of the
  conditional prose around it, so these hypothetical examples are
  flagged as `STALE_PATH` advisories even though the author
  understood they were speculative.

  The topic-binding library-convention warning did not cover this
  case because the framing shifts the register from "this project
  HAS X" to "this project WOULD HAVE X if …" — a different surface
  form the original warning did not name.

- **Fix (prompt-only, two files).** Added a dedicated "Hypothetical
  / future-tense framing is NOT a loophole" block to both
  `pass-prompts/templates/common/pass3-footer.md` and
  `pass-prompts/templates/common/pass4.md`. Key rules:

  - **Conditional framing does not change the validator's
    decision.** `if we adopted X`, `were this feature introduced,
    it would live at …`, `for a future Y`, `when Z is added later`
    (and translated equivalents in any output language) do NOT
    make a literal `src/...` path safe. The block states this
    invariance explicitly so the LLM does not interpret conditional
    prose as a validator-bypass.

  - **Role / directory form, not filename.** The correct
    hypothetical is expressed as a ROLE + DIRECTORY description
    without committing to a filename (e.g., "If middleware is
    added later, place it at the path the routing convention
    expects — do not cite a specific filename until the file
    actually exists"). Three worked `✅ RIGHT` examples cover the
    middleware, health-endpoint, and env-typing cases.

  - **OMIT as last resort.** If the LLM cannot name the role +
    directory without committing to a `src/...` path that does NOT
    appear in `pass3a-facts.md`, the guidance is to omit the
    example entirely. An omitted example is better than a
    fabricated path downstream readers may treat as authoritative.
    The OMIT condition is double-gated: (a) role + directory
    description is not possible, AND (b) the path is not in
    `pass3a-facts.md` — paths that DO appear in the allowlist
    continue to be written verbatim per the existing
    "directory-scoped rule is correct" guidance.

  - **Language-invariant.** The rule explicitly states that
    translated conditional phrases in any output language (Korean,
    Japanese, Chinese, etc.) are subject to the same constraint,
    because the validator matches on the literal path string, not
    on the surrounding prose.

- **Placement in `pass4.md`.** The new block is added as a fifth
  ❌ mechanism (after `Framework-convention entry-point invention`,
  `Parent-directory or constant-name renormalization`,
  `Plausibly-named utility invention`, and the topic-binding
  `Library-convention canonical paths` block), immediately before
  the ✅ guidance that says "If pass3a-facts.md shows a specific
  filename and path for a role, write that exact path verbatim".
  The adjacency makes the interaction between the prohibition
  (hypothetical fabrication) and the permission (existing
  allowlist) visible to the LLM at a glance.

- **Why prompt-only, not validator-side.** Distinguishing
  "assertive claim about an existing file" from "conditional
  description of a future file" would require NLP-level prose
  understanding, which is out of scope for the structural
  `content-validator`. The existing placeholder forms
  (`{placeholder}`, `Xxx`/`XXX`, glob `*`) remain as the
  validator-side defense-in-depth: an LLM that cannot phrase the
  hypothetical in role/directory form can still fall back to a
  placeholder.

- **Test impact.** Five independent verification surfaces now
  cover this block: (1) template-content checks (header,
  ✅/❌ examples, OMIT fallback, language-invariant clause, CJK
  absence); (2) related unit tests unchanged — `pass4-prompt.test.js`
  (12/12) and `prompt-generator.test.js` (33/33) continue to pass
  because existing mechanism-label matchers are unaffected by the
  new fifth block; (3) end-to-end prompt-generation smoke confirms
  the block survives assembly into `pass3-prompt.md` and
  `pass4-prompt.md`; (4) full suite 694/694 unchanged; (5) the
  4-mechanism ordering invariant
  (`Framework-convention → Parent-directory → Plausibly-named →
  Hypothetical`) is asserted via regex proximity match in the
  smoke test.

### Prompt — CLAUDE.md Section 1 language localization

- **Problem addressed.** For non-English `--lang` targets,
  `claude-md-scaffold.md` Section 1 generation rules previously
  instructed "emit in the target output language" but immediately
  followed with a fixed English template containing `{OUTPUT_LANG}`
  as the only substitution slot:

  ```
  As the senior developer for this repository, you are responsible
  for writing, modifying, and reviewing code. Responses must be
  written in {OUTPUT_LANG}.
  ```

  The specific English sentence acted as a stronger signal than the
  abstract instruction to translate — LLMs copy concrete templates
  verbatim when the template's only visible variable is a
  substitution slot. The generated output therefore carried a
  Section 1 Line 1 in English for non-English targets, producing
  the ironic effect of "Responses must be written in {LANG}" where
  {LANG} is correctly substituted yet the containing sentence
  itself is in English. Other sections escaped this trap because
  their templates were table-shaped or keyword-shaped (`Language |
  {value}`, etc.); Section 1 was unique in carrying a complete
  English sentence as "template".

- **Fix.** Added canonical translations for all 10 supported
  languages (`en`, `ko`, `zh-CN`, `ja`, `es`, `vi`, `hi`, `ru`,
  `fr`, `de`) directly inside `claude-md-scaffold.md` Section 1
  generation rules. Each translation is paired with its language
  code; the LLM picks the one matching `{OUTPUT_LANG}` and emits it
  verbatim. Languages outside the canonical 10 fall back to the
  semantic structure described by the English reference.

  Supporting changes:

  - **Scaffold body warning comment.** The body template's Line 1
    (still English, since it serves as the generic slot) now
    carries an inline `{!-- ... --}` comment instructing the LLM
    to replace with the canonical translation when
    `{OUTPUT_LANG} != en`. This defends against LLMs that scan the
    body template first and overlook the generation rules lower in
    the same file.

  - **Checklist augmentation.** The scaffold's verification
    checklist gained a new item: "Section 1 Line 1 is in
    `{OUTPUT_LANG}` — matches the canonical translation (if
    `{OUTPUT_LANG}` is one of the 10 canonical codes). If Line 1
    contains 'As the senior developer' while `{OUTPUT_LANG}` is
    NOT `en`, the translation was skipped — fix it." This gives
    the LLM an explicit self-check predicate before finalizing
    output.

  - **Example block framing.** The "Example: Section 1 for
    different stacks" block's framing comment was upgraded from
    "Emit the final output in the target output language; the
    semantic content should match" (weak) to an explicit
    `⚠️ Language note:` block stating that the English examples
    show SEMANTIC structure only and pointing back to the
    canonical translations for Line 1.

- **Why scaffold-level and not code-level.** This is not a
  post-processing concern. The translation must happen at
  generation time inside the LLM context, not as a sed/replace
  step afterward — sed would catch only the English reference
  sentence but would miss subsequent rephrased variants the LLM
  might produce. Making the scaffold explicit about the canonical
  text eliminates ambiguity at source.

- **Test impact — none.** Scaffold files are runtime resources;
  no test asserts on the text of `claude-md-scaffold.md`.

#### Follow-up: Section heading gloss now required (not optional)

- **Problem addressed.** A second localization inconsistency existed
  in `##` section headings: run-to-run variation in whether headings
  carried their native-language gloss. Some runs emitted
  `## 1. Role Definition ({gloss})` (English canonical + target-
  language gloss); others emitted only `## 1. Role Definition`,
  omitting the gloss entirely. Both outputs were technically
  compliant with the v2.3.1 scaffold rules, which stated the gloss
  was "optional" and "a courtesy, not a requirement". The
  inconsistency broke the operator's expectation that two runs of
  the same project would produce the same heading format, and
  removed a useful intelligibility cue for non-English readers.

- **Fix.** Reclassified the parenthetical gloss from "optional" to
  "REQUIRED when `{OUTPUT_LANG}` != `en`" / "OMITTED when
  `{OUTPUT_LANG}` == `en`". This is now a deterministic rule with
  no LLM-side discretion.

  - **`claude-md-scaffold.md` "Section heading format" rewrite.**
    The format rule now reads: primary English canonical REQUIRED;
    parenthetical native-language gloss REQUIRED when non-English,
    OMITTED when English. A canonical gloss table covering all 10
    supported languages × all 8 sections (80 entries) was added
    below the rule so the LLM picks the exact gloss verbatim. The
    example blocks (ko, ja, en) were expanded to show both the
    correct form and two failure modes each: missing gloss on
    non-English output, and gloss present on English output.

  - **Scaffold body template annotation.** A `{!-- SECTION HEADING
    RULE --}` comment was added at the top of the scaffold body
    template pointing to the gloss table above. This defends
    against LLMs that scan the body template first and copy its
    English-only headings verbatim without consulting the format
    rule.

  - **Pass 3-footer STEP 4b rewrite.** The title determinism check
    (executed as a post-generation self-audit by the LLM) was
    upgraded from "a native-language translation may follow in
    parentheses" to explicit `(a)` + `(b)` clauses: (a) English
    canonical as primary (language-invariant); (b) parenthetical
    native-language gloss required when non-English, omitted when
    English. Worked examples for `en`, `ko`, `ja` output
    illustrate each case.

  - **Checklist augmentation (two new items).** The scaffold's
    verification checklist gained a "Section heading gloss rule"
    item requiring all 8 headings to carry the parenthetical gloss
    when `{OUTPUT_LANG}` != `en`, and a paired "English gloss-
    absence rule" item requiring gloss to be OMITTED when
    `{OUTPUT_LANG}` == `en`. Both items name-check the canonical
    table so the LLM knows where to resolve the exact gloss text.

- **Why strictly a follow-up, not a separate change.** The
  underlying problem is the same class as the Section 1 Line 1
  bug: the scaffold left room for LLM discretion on language-
  localization decisions, and two runs of the same project
  produced divergent results. The Line 1 fix addressed one
  specific slot with a canonical translation; this follow-up
  applies the same "canonical translations, no discretion"
  pattern to the heading gloss slot.

- **Test impact — none.** No test asserts on scaffold text;
  `claude-md-validator`'s heading check (which predates this
  release) already tolerates the gloss via a regex that matches
  "English canonical, optionally followed by parenthetical text",
  so the stricter scaffold rule does not require validator
  changes to enforce.

### Stack detector — variable-reference patterns, iBatis, multi-dialect DBs, logging frameworks

- **Problem addressed.** `plan-installer/stack-detector.js` is the
  static analyzer that produces `project-analysis.json`, the input
  to every Pass 1 run. A class of hallucinations in generated
  CLAUDE.md (incorrect Java version, server port, or logging-
  framework labels) traces to the same root cause: the stack-
  detector regex returns `null` for a field, and the Pass 1 LLM
  fills the gap by assuming framework defaults (e.g. "Java 17+"
  for any Spring Boot 3.x project, "port 8080" for any Spring
  Boot project). Tracing the regexes surfaced a broader gap:
  multiple modern Gradle/Maven patterns, legacy iBatis projects,
  multi-dialect backends, and logging-framework identification
  were all outside the detector's coverage.

- **Fix — Gradle Java version (4 patterns, not 1).** The v2.3.1
  regex `sourceCompatibility\s*=\s*['"]?(\d+)['"]?` only matched
  the direct-literal form. Extended to four patterns, tried in
  order:
  1. Direct literal: `sourceCompatibility = 21` / `'21'` / `"21"`
     (also matches `targetCompatibility`).
  2. `JavaVersion` enum: `sourceCompatibility = JavaVersion.VERSION_21`
     (with `VERSION_1_8` → Java 8 legacy form).
  3. Toolchain block: `JavaLanguageVersion.of(21)` inside
     `java { toolchain { ... } }`.
  4. Variable-reference fallback: when `sourceCompatibility =
     "${javaVersion}"`, resolve the variable name inside the same
     file's `ext` block. The RegExp for the resolution
     dynamically escapes the variable name with the standard
     regex-meta-character escape pattern.

- **Fix — Gradle Spring Boot version variable reference.** Parallel
  fallback for `ext { springBootVersion = '3.5.5' }` combined with
  `id 'org.springframework.boot' version "${springBootVersion}"`.
  The three existing patterns are tried first; only when none
  captures a numeric value (captures starting with `${` are
  rejected as variable references) does the fallback resolve the
  variable inside the same file.

- **Fix — Maven Java version (3 patterns).** Extended from
  `<java.version>\d+` literal-only to:
  1. Direct `<java.version>` value.
  2. `<maven.compiler.source>` / `<maven.compiler.target>`
     values.
  3. Property reference like
     `<java.version>${project.javaVersion}</java.version>` where
     the referenced property is defined earlier in `<properties>`.
     Cross-file resolution (parent POM, BOM) is intentionally out
     of scope — those cases fall through to LLM-side analysis.

- **Fix — Yml server port Spring placeholder (4 patterns).** The
  v2.3.1 regexes `server:\n  port: (\d+)` and
  `server\.port[=:](\d+)` only matched literal port numbers.
  Spring Boot accepts property-placeholder defaults like
  `port: ${APP_PORT:8090}` — extended to capture the post-colon
  default value in both yml-nested and flat-key forms. The default
  is the correct value because it represents what the application
  falls back to when the environment variable is unset.

- **Feature — iBatis detection as a first-class ORM.** Apache
  iBatis (EOL 2010) and Spring iBatis are distinct from MyBatis;
  MyBatis evolved out of iBatis but uses a different XML namespace
  and runtime architecture. Conflating them in Pass 3 output would
  produce incorrect guidance. `IBATIS_REGEX` matches specific
  coord patterns (`org.apache.ibatis`, `spring-ibatis`,
  `ibatis-sqlmap`, `ibatis-core`, `ibatis-common`) and runs BEFORE
  the generic ORM_RULES table in both Gradle and Maven branches.
  MyBatis projects (`org.mybatis:mybatis`,
  `mybatis-spring-boot-starter`) continue to resolve to
  `orm: "mybatis"` — the detection boundary between the two is
  precise.

- **Feature — multi-dialect database arrays (`stack.databases`).**
  v2.x consumers expected a single primary DB (`stack.database`);
  backends declaring multiple dialect drivers simultaneously lost
  all but the first indicator. Added a second field
  `stack.databases` (plural) that collects every DB keyword
  across all config sources (Gradle `build.gradle`, Maven
  `pom.xml`, Gradle version catalogs, yml, `.env`, Node
  `package.json`, Python `requirements.txt`). Order-preserving and
  deduped. `stack.database` keeps its v2.x semantics as "the
  first-match primary" for backward compatibility; Pass 1 prompts
  and Pass 3 standard generation should prefer `stack.databases`
  when present and non-empty. Empty array (not null) when no DB
  is detected, to simplify array comprehensions in prompts.

- **Fix — MariaDB detection.** The `DB_KEYWORD_RULES` table
  previously had entries for PostgreSQL, MySQL, Oracle, MongoDB,
  SQLite, and H2 — but NOT for MariaDB. Projects using
  `org.mariadb.jdbc:mariadb-java-client` were classified as `null`
  (or as MySQL, when the MySQL driver was also present). MariaDB
  is now a distinct entry in the keyword table and in the Maven
  / yml inline DB scans.

- **Feature — logging framework detection (`stack.loggingFrameworks`).**
  New array field enumerating JVM logging frameworks detected
  from Gradle/Maven dependencies and yml `logging.config:`
  references. Recognizes four frameworks:
    (a) Log4j2 via `org.apache.logging.log4j:log4j-core` coord or
        `log4j2-*.xml` config file;
    (b) Logback via `ch.qos.logback:logback-classic` coord or
        `logback-*.xml` / `logback*.groovy` config file;
    (c) log4jdbc (JDBC logging adapter, reported alongside the
        primary framework);
    (d) Log4j 1.x (EOL 2015) via precise coord regex `log4j:log4j`
        with quote/whitespace boundaries to avoid matching
        `log4j-to-slf4j` or `log4j-api` (Log4j2 ecosystem
        libraries that contain `log4j:log4j` as a substring). The
        Log4j 1.x boundary required a specific regex form
        (quote/colon/whitespace character class before the coord)
        because word boundaries alone were insufficient.

- **Fix — Pass 3 logging rule glob extended.** The Pass 3 prompt
  for Java and Kotlin Spring stacks specified auto-load paths as
  `["**/*.java", "**/logback*.xml", "**/log4j*.xml"]`. This
  missed three file types commonly present in Spring
  projects: Logback's Groovy DSL configuration (`logback*.groovy`),
  Log4j / Log4j2 properties files (`log4j*.properties`), and
  log4jdbc adapter configuration (`log4jdbc*.properties`).
  Extended the glob to cover all five file patterns.

- **Fix — Pass 1 prompts include configuration-file verification
  block.** Both `java-spring/pass1.md` and `kotlin-spring/pass1.md`
  now begin with a "MANDATORY: Configuration file verification"
  section instructing the LLM to read `build.gradle` (or
  `build.gradle.kts` / `pom.xml`), `application*.yml` (and profile
  variants), and referenced logging configuration files BEFORE
  analyzing domain source code. The LLM is told that
  `project-analysis.json`'s stack metadata may be incomplete and
  that the configuration files are ground-truth sources. Explicit
  examples show variable-reference resolution (`sourceCompatibility
  = "${javaVersion}"` → resolve via `ext { ... }`) and Spring
  placeholder port extraction (`port: ${APP_PORT:8090}` → extract
  `8090`). When the analyzer output and the configuration files
  disagree, the LLM is instructed to trust the configuration file
  and record the discrepancy. This adds a second defensive layer:
  even if future Gradle/Maven syntax evolves past the detector's
  regex coverage, the LLM's direct file read catches the
  discrepancy.

- **Fix — Config file glob expanded to cover Spring's full naming
  space.** The yml scan in v2.3.1 globbed only
  `**/application*.yml`, missing three file classes that Spring
  Boot loads identically: `application.yaml` (spec-official
  extension), `application.properties` (Spring Initializr default
  when no format is specified), and
  `bootstrap.{yml,yaml,properties}` (Spring Cloud Config /
  Consul / Eureka — loaded BEFORE `application.*` and commonly
  declaring service ports and config-server URIs). The new glob
  `**/{application,bootstrap}*.{yml,yaml,properties}` covers all
  combinations including profile variants (`application-local.yml`,
  `application-dev.properties`). The inner regex set was already
  format-agnostic — yml `server:\n  port: N` syntax and
  `.properties`-style `server.port=N` flat-key syntax were both
  covered by the same pattern list, so no additional regex work
  was needed.

- **Fix — Comment stripping (`stripComments()` shared helper).**
  Commented-out dependency lines must not match `LOGGING_RULES`
  or the Maven DB / ORM / framework scans. A shared helper strips
  three comment styles in a single pass:
    1. Line-level `//` (Gradle Kotlin/Groovy DSL).
    2. Line-level `#` (yml, properties, shell).
    3. Block-level `<!-- ... -->` (Maven `pom.xml`, XML config;
       non-greedy multi-line, so a commented-out `<dependency>`
       block spanning many lines is handled in a single regex
       pass).

  `detectLogging` runs on `stripComments(content)`. The Maven
  branch of `detectStack` derives `pomClean = stripComments(pom)`
  after `<properties>` parsing is complete, and uses `pomClean`
  for ALL dependency-layer scans (framework check, ORM, iBatis,
  DB keyword array, H2, logging). The raw `pom` is retained for
  `<properties>` reads because commented-out property definitions
  are rare in practice and the property-reference resolution
  already scopes itself to the declared property name.

- **Feature — Maven XML form for Log4j2 / Logback detection.** The
  Gradle coord regex `org\.apache\.logging\.log4j[.:]log4j-core`
  expects a `:` or `.` separator between groupId and artifactId.
  In Maven XML, the two are in separate tags, so the separator
  is `</groupId>...<artifactId>`, not a single character. Paired
  regexes now match the XML form within a 300-character window
  (large enough to span typical whitespace and `<version>` /
  `<scope>` siblings, small enough that unrelated `<dependency>`
  blocks further down the file do not falsely pair):
    - Log4j2: `<groupId>\s*org\.apache\.logging\.log4j\s*<\/groupId>[\s\S]{0,300}?<artifactId>\s*log4j-core\s*<\/artifactId>`.
      The `log4j-core` artifactId is required — `log4j-to-slf4j`
      and `log4j-api` (bridges) must NOT trigger "Log4j2 is the
      primary framework".
    - Logback: `<groupId>\s*ch\.qos\.logback\s*<\/groupId>[\s\S]{0,300}?<artifactId>\s*logback-(?:classic|core)\s*<\/artifactId>`.
      Both `logback-classic` (runtime shipped with Spring Boot)
      and `logback-core` are recognized.

- **Fix — Placeholder regex boundary relaxation (`X{3,}` without
  word boundary).** The v2.3.0 `hasPlaceholder` predicate in
  `content-validator/index.js` used `/\bX{3,}\b|Xxx/` to
  recognize uppercase-XXX placeholder tokens. The `\b` boundaries
  caused two false negatives:
    - `XXXParser.ts`: the right `\b` expects a non-word character
      after the X run, but `Parser` is alphanumeric.
    - `useXXX_CONFIG`: the left `\b` requires a non-word
      character before the X run, but `useXXX` has `e` directly
      before.
  Removed both word boundaries. The predicate is now `/X{3,}/`
  (with the separate `/Xxx/` branch preserved for the
  capital-lower-lower convention). Audited against a curated set
  of typical identifier patterns (`matrix`, `XMLParser`,
  `indexXY`, `taxi`, `examineX`, `textX`, `XX1`): none contain
  three or more consecutive uppercase X's, so the relaxation
  introduces no new false positives.

- **Tests added.** 32 new unit tests in `stack-detector.test.js`:
    - 8 for Java-version patterns and port patterns (literal,
      JavaVersion enum, toolchain, ext-variable reference; yml
      literal, flat-key, yml placeholder, flat-key placeholder).
    - 18 for iBatis vs MyBatis distinction (4), Maven Java
      version patterns (3), Gradle ext Spring Boot version
      reference (1), multi-dialect databases incl. MariaDB (4),
      logging framework detection incl. false-positive prevention
      from `log4j-to-slf4j` and comment-stripping (6).
    - 6 for config-file glob expansion (`.properties`, `.yaml`,
      `bootstrap.yml`, profile variants) and comment-stripping.

### Combined guarantees

- **Test suite.** 694 / 694 pass (up from 662 in v2.3.1 — 32 new
  tests for the stack-detector extensions), with one existing
  test updated (`pass4-prompt.test.js` assertions migrated from
  literal-path matchers to topic-level and mechanism-label
  matchers as part of the library-convention warning rewrite).
  `tests/content-validator.test.js` line 103
  (`notStrictEqual(result.code, 0, "should exit non-zero")`)
  still passes because the exit code is preserved. No stdout
  assertions reference the strings `ERRORS` or `WARNINGS` — they
  match on advisory types (`STALE_PATH`, `MANIFEST_DRIFT`,
  `STALE_SKILL_ENTRY`) which are untouched.

- **No new dependencies. No CLI surface changes.** Template
  changes are limited to prompt-layer guidance: the library-
  convention warning block in `pass3-footer.md` and `pass4.md`
  gained topic-binding scope; `claude-md-scaffold.md` Section 1
  gained a 10-language canonical translation table plus
  verification checklist items — all targeted expansions of
  existing anti-hallucination / language-localization guidance,
  not structural changes to Pass 3, Pass 4, or CLAUDE.md format.
  Same two runtime deps (`glob`, `gray-matter`). Same commands,
  same flags, same outputs (just different labels for
  `content-validator`).

## [2.3.1] — 2026-04-23

Patch release. Fixes Windows CI breakage in `npm test`.

- **CI — cross-platform `npm test`**. Windows cmd.exe does not expand `*`
  glob patterns, so `node --test tests/*.test.js` received the literal
  string and exited 1 on every Windows runner. Replaced with a thin
  `scripts/run-tests.js` wrapper that uses the existing `glob` dep to
  enumerate test files before forwarding to `node --test`. Also replaced
  the `pretest` `2>/dev/null` stderr redirect (which spuriously triggered
  "The system cannot find the path specified" on Windows) with a Node
  `try/catch` so the probe is silent on all platforms. No new dependencies.

No source, template, or test changes. Test count unchanged at 662.

## [2.3.0] — 2026-04-23

Adds language-invariant structural validation for generated `CLAUDE.md`.
Regression testing v2.2.0 on a Korean-output Vite + React project (`a Vite frontend test project`)
surfaced the §9 L4-memory re-declaration anti-pattern *despite* the scaffold,
expanded blocklist, and post-generation self-check all being present in the
embedded Pass 3 prompt. Root cause: forbidden-section enforcement depended
on the LLM matching English canonical labels (`"Memory Layer (L4)"`) against
its own translated output (the localized form of `"Memory (L4)"` in Korean, Japanese, etc.) — a
natural-language equivalence judgment the LLM does not perform reliably
across 10 supported languages.

Regression testing v2.3.0's initial build on a second test project (`a Vite frontend test project`,
same language, same stack family) then surfaced a second
multi-repo invariant failure: the §9 problem was fixed, but the *wording*
of section headings drifted freely. One project's §7 read
`"DO NOT Read (<localized gloss A>)"` while the sibling's read
`"<localized gloss B> (Files Not to Be Read Directly)"`. Both were "equivalent in
meaning" per the scaffold, but `grep "## 7. DO NOT Read"` matched the
first and missed the second — multi-repo discoverability broken.

v2.3.0 addresses both failures by shifting structural enforcement from
LLM self-check to deterministic code-level validation that does not depend
on natural-language matching, and adds a cross-repo title-determinism
invariant (English canonical primary + optional translation parenthetical).

Continued regression testing on `a Vite frontend test project` then surfaced two more failure
classes unrelated to CLAUDE.md structure:

1. **Path hallucination in rules/standard**. Pass 3 generated rule files
   referencing `src/feature/routers/<feature>RoutePath.ts` when the actual
   file was `src/feature/routers/routePath.ts`. Root cause: the LLM saw
   the parent directory `src/feature/` and a TypeScript constant
   `<FEATURE>_ROUTE_PATH` and "renormalized" the filename to match. Pre-v2.3.0
   validation did not check whether path claims resolved to real files.

2. **MANIFEST ↔ CLAUDE.md §6 Skills drift**. Four skills registered in
   `claudeos-core/skills/00.shared/MANIFEST.md`, only one of them
   mentioned in CLAUDE.md §6. No existing tool detected the mismatch.

Both are now detected by a new `content-validator [10/10] path-claim
verification` check. The check uses only structural signals (backticked
paths, file-system existence, MANIFEST vs CLAUDE.md cross-reference) —
no natural-language matching, so it works identically for all 10 output
languages.

Running the initial v2.3.0 build against `a Vite frontend test project` surfaced a
third, upstream issue in the frontend domain scanner. The project has
a single-SPA layout (`src/admin/{api,context,dto,routers,pages/*}/`,
plus a separate `src/guide/` for documentation). The subapp scanner,
designed for dual-platform layouts (`src/pc/admin/` + `src/mobile/admin/`),
interpreted `admin` as a platform keyword and emitted the architectural
layers beneath it as pseudo-domains: `admin-api`, `admin-context`,
`admin-dto`, `admin-routers`. That fragmented one SPA into 5+ spurious
domains and, critically, primed Pass 3 to fabricate filenames with the
`admin` prefix — the root cause of the `<feature>RoutePath.ts` hallucination
pattern. v2.3.0 adds a single-SPA detection rule: when only ONE distinct
platform keyword matches across the project tree, subapp emission is
suppressed by default, and feature domains are left to the downstream
page/FSD/components scanners to discover correctly.

Running the v2.3.0 build against `a Spring backend test project` then surfaced a
long-standing resume bug in the init pipeline. When a prior `init` run
is interrupted mid-Pass-3 — most commonly a stream idle timeout during
the 3d-aux (database + mcp-guide) stage — `pass3-complete.json` is
persisted in partial form (`mode: "split"`, `groupsCompleted: [...]`,
no `completedAt`). On the next run, the init orchestrator branched
solely on `fileExists(pass3Marker)` and fell into the "skip" branch
for any existing marker, even partial ones. The result: remaining
Pass 3 stages never ran, `database/` and `mcp-guide/` directories
were left empty, and the final `pass3-complete.json` retained the
partial shape — which `pass-json-validator` later caught as a
`MISSING_KEY: completedAt` error after the fact. v2.3.0 fixes the
orchestrator to inspect marker contents: when the marker is partial,
`runPass3Split` is re-invoked and its internal `groupsCompleted`
logic resumes from the next unstarted stage; only fully-completed
markers are skipped.

Finally, the full v2.3.0 pipeline run against `a Vite frontend test project` (14
domains, Korean output) surfaced a structural regression the validator
itself caught and flagged: a `## 9. ` heading translating to "Memory Operations (L4)" appeared in
`CLAUDE.md` as a re-declaration of the memory file table already
present in Section 8. This was the exact anti-pattern v2.3.0 was
designed to prevent, now reappearing despite the scaffold's explicit
constraints. Root-cause analysis traced it to a legacy Pass 4
behavior preserved from pre-v2.3.0: `pass4.md` instructed the LLM to
**append** a new `## N. ... (L4)` section to `CLAUDE.md`, and
`init.js` also called `appendClaudeMdL4Memory()` from
`lib/memory-scaffold.js` as a static fallback doing the same. Both
predated the current Pass 3 scaffold design where Section 8 "Common
Rules & Memory (L4)" is authored directly by Pass 3 and is the single
canonical home for both the Common Rules table and the L4 Memory
file table + workflow. With Pass 3 already writing that content,
every additional Pass 4 append produced the [S1]/[M-*]/[F2-*]
duplications the validator was built to catch. The validator was
working correctly; the generator was self-contradicting. v2.3.0 fix:
retire the Pass 4 CLAUDE.md append path completely. Pass 4 continues
to generate memory files, memory rules, and the doc-writing guide,
but never touches `CLAUDE.md`. The `appendClaudeMdL4Memory()` export
is preserved as a no-op for any external caller depending on its
signature.

Post-retirement regression testing on `a Vite frontend test project` surfaced a final class
of issue: four `STALE_PATH` errors in Pass 4-generated rule and
standard files (`src/feature/main.tsx` assumed from Vite convention;
`src/feature/routers/<feature>RoutePath.ts` invented by prepending the
parent directory name to the filename; `src/components/utils/classNameMaker.ts`
fabricated as a plausible-sounding utility). The root cause was
parallel to the §9 issue: Pass 3's path grounding rules live in
`pass3-footer.md`, which Pass 4 never reads. Pass 4 was invoking
prior training knowledge to fabricate concrete paths instead of
grounding them in `pass3a-facts.md`. v2.3.0 adds `pass3a-facts.md`
as a mandatory read for Pass 4, plus a dedicated "Path fact
grounding" CRITICAL section in the prompt with all three flagship
hallucination anti-patterns documented as explicit ❌ examples.
The guidance also teaches the positive pattern: when in doubt,
scope a rule to a directory (`src/admin/api/`) rather than
inventing a specific filename.

Re-running `init` on `a Spring backend test project` with the Fix A build proved
path-grounding works in practice — STALE_PATH dropped from the
expected 4 to 0 across all Pass 4-generated rule and standard
files — but left 8 MANIFEST_DRIFT errors in place. Analysis
traced these to a structural ordering problem, not an LLM
compliance problem: Pass 3b writes CLAUDE.md Section 6 BEFORE
Pass 3c generates the skills directory + `MANIFEST.md`. When a
skill ships as an orchestrator + sub-skills pair — e.g.
`10.backend-crud/01.scaffold-crud-feature.md` plus eight
sub-skills under `scaffold-crud-feature/` — Pass 3b cannot
enumerate the sub-skills because they don't exist yet, and
forcing it to predict filenames would just move the problem
into a new form of hallucination (it would write
`01.entity.md` while Pass 3c emits `01.dto.md`, etc.).

The correct design is role-separated: `CLAUDE.md` Section 6 is an
**entry point** that names categories and orchestrators; `MANIFEST.md`
is the **authoritative registry** for the full sub-skill list. v2.3.0
implements both halves of this split:

1. `content-validator [10/10]` gains an orchestrator-aware
   exception: a registered sub-skill is suppressed from
   `MANIFEST_DRIFT` when its orchestrator (matching
   `{category}/{*}.{parent-stem}.md`) is referenced anywhere in
   CLAUDE.md. Integrity checks (`STALE_SKILL_ENTRY` for missing
   files, unrelated-parent drift) are preserved.

2. `pass3b-core-header.md` gains a "CLAUDE.md Section 6 — Skills
   sub-section (entry point only)" guidance block that tells the
   LLM to list only MANIFEST + orchestrators, never to predict
   sub-skill filenames, and that cites the v2.3.0 validator's
   exception so the instruction and the detection layer remain
   in lockstep.

Together, Fix A (Pass 4 path grounding) and Fix B
(orchestrator/sub-skill exception + §6 guidance) close the last
two classes of regression-observed content-validator errors. The
remaining validator surface continues to enforce the strict
invariants — fabricated paths, missing skill files, unrelated-
parent drift, §9 re-declaration, T1 heading drift, etc. — without
relaxation.

Re-running `init` on `a Vite frontend test project` with the Fix A + Fix B
build produced `0 MANIFEST_DRIFT` (Fix B suppressed all 8
sub-skill drift rows) but left 1 residual `STALE_PATH` in
`claudeos-core/standard/80.verification/02.testing-strategy.md`
referencing `src/__mocks__/handlers.ts`. Analysis showed a
library-convention hallucination class that the original three
anti-patterns did not cover: testing documents reach for MSW /
Vitest / Jest / React Testing Library conventional paths even
when the project has zero test coverage and no such files exist.
Analogous traps exist for `styling-patterns.md` (global
stylesheet/theme files) and `state-management.md` (store
bootstrap files). v2.3.0 adds a "Library-convention hallucination
class" block to both `pass3-footer.md` and `pass4.md` documenting
the four concrete MSW/testing anti-patterns plus the three
trigger document types, and the positive pattern: when
`pass3a-facts.md` has no concrete test/style/store files listed,
describe testing/styling/state guidance in abstract terms
(directory scope or role-based) without naming a specific path.

Final validation pass on both regression fixture projects with the complete
v2.3.0 build:

- `a Vite frontend test project` (Korean output, 14 frontend domains,
  dual-entry Vite + React 19, single-SPA admin layout,
  scaffold-page-feature orchestrator with 8 sub-skills):
  **12 errors → 0 errors** (100% improvement), full health
  check green, 25/25 CLAUDE.md lint checks passed.
- `a Spring backend test project` (Korean output, 8 backend domains,
  Java 17 + Spring Boot + MyBatis, scaffold-crud-feature
  orchestrator with 8 sub-skills, multi-dialect DB migration
  in progress): **8 errors → 0 errors** (100% improvement),
  full health check green, complete first-try run in 45m 29s
  including the resume-from-partial-marker code path exercised
  for the first time against a captured partial Pass 3 fixture.

Both projects exercise distinct v2.3.0 code paths (Fix A + Fix B,
single-SPA rule, Pass 3 resume, library-convention anti-pattern,
orchestrator/sub-skill exception), and both settled at 0 errors
without any manual file edits to the generated output. This is
the first release where the full end-to-end pipeline produces a
clean `content-validator [10/10]` report against the regression
fixture set — the core criterion for v2.3.0 being publish-ready.

### Added

- **`claude-md-validator/`** (new package, ~430 lines across 3 files).
  Post-generation structural validator for `CLAUDE.md`. Every check uses
  only signals that survive translation:
  - **Markdown syntax**: `^## `, `^### `, `^#### `, `^```` — not localized.
  - **Literal file names**: `decision-log.md`, `failure-patterns.md`,
    `compaction.md`, `auto-rule-update.md` — never translated.
  - **Counts and table-row positions**: section count, sub-section count
    per section, memory-file table-row count inside vs outside Section 8.
  The same validator, byte-for-byte, produces identical verdicts on a
  `CLAUDE.md` generated in English, Korean, Japanese, Vietnamese, Hindi,
  Russian, etc. — proven by cross-language bad-case fixtures in the test
  suite.
  - `structural-checks.js` — individual check functions (`checkH2Count`,
    `checkH3Counts`, `checkH4Counts`, `checkMemoryFileUniqueness`,
    `checkMemoryScopedToSection8`, `checkSectionsHaveContent`,
    `checkCanonicalHeadings`) plus a fence-aware section splitter
    (`splitByH2`) that correctly ignores `##` lines inside ``` and
    `~~~` code blocks.
  - `index.js` — high-level `validate(path)` API and standalone CLI entry.
    Transparently strips a leading UTF-8 BOM (U+FEFF) from the input
    before running checks, so CLAUDE.md files written by Windows editors
    or cross-platform generators validate identically to those without
    a BOM (otherwise the first `## ` reads as `\ufeff## ` and silently
    under-counts by one).
  - `reporter.js` — human-readable report formatter with remediation
    guidance for every failure class.

- **`npx claudeos-core lint`** command. Runs the structural validator
  against `CLAUDE.md` at the project root. Exit code 0 on pass, 1 on fail
  — suitable for CI pipelines. The command renders per-failure remediation
  guidance so users can fix issues directly without re-running the full
  4-Pass pipeline.

- **`bin/commands/lint.js`** (new). Wraps the validator for CLI use;
  delegates to `claude-md-validator/` so the validator remains usable
  as a library from other contexts (future `init` auto-lint, CI action,
  etc.).

- **T1 — Canonical heading invariant (cross-repo title determinism).**
  Each of the 8 `## N.` section headings in every generated `CLAUDE.md`
  must contain the English canonical token for that section, regardless
  of the `--lang` output language. A native-language translation may be
  appended in parentheses but MUST NOT replace the English canonical as
  primary text. Required tokens:
  `§1=Role Definition, §2=Project Overview, §3=Build, §4=Core Architecture,
  §5=Directory Structure, §6=Standard, §7=DO NOT Read, §8=Memory`.
  The validator enforces this via `checkCanonicalHeadings` (IDs `T1-1`
  through `T1-8`), and the scaffold documents it as a mandatory format
  rule reinforced by Pass 3 POST-GEN CHECK step 4b. This closes a
  multi-repo discoverability gap discovered during `a Vite frontend test project`
  regression testing: two test projects generated §7 as `"DO NOT Read (<localized gloss A>)"` and `"<localized gloss B> (Files Not to Be Read Directly)"`
  respectively — both "equivalent in meaning" but breaking
  `grep "## 7. DO NOT Read"` across multiple repos.

- **`content-validator [10/10]` — path-claim + MANIFEST drift.**
  A new check appended to the existing 9-stage validator in
  `content-validator/index.js`. Single check, two failure classes:
  - **`STALE_PATH`** — any `src/...\.(ts|tsx|js|jsx)` reference
    appearing in `.claude/rules/**/*.md` or
    `claudeos-core/standard/**/*.md` must resolve to a real file on
    disk. Fenced code blocks (``` and ~~~) and placeholder paths
    (`src/{domain}/feature.ts`) are excluded, matching the scaffold
    convention that placeholders stand for scaffold examples, not
    actual project paths.
  - **`STALE_SKILL_ENTRY`** — every skill path registered in
    `claudeos-core/skills/00.shared/MANIFEST.md` (extracted from
    backticked `claudeos-core/skills/...` references) must exist on
    disk. `MANIFEST.md` itself is excluded from the set to avoid
    self-reference false positives.
  - **`MANIFEST_DRIFT`** — every skill registered in MANIFEST must be
    mentioned somewhere in CLAUDE.md. The check looks at the whole
    body (not just §6 Skills) to avoid depending on sub-section
    heading wording, which varies by output language.
  The check is intentionally language-invariant: it uses literal
  file-path patterns and file-system existence, never parsing section
  headings or reasoning about Korean/Japanese/etc. text.

- **`bin/commands/init.js` — Guard 4 (non-blocking).** After Pass 4 and
  structural lint, init runs `content-validator` in a child process
  and surfaces the summary inline. If drift is detected, init prints a
  pointer to `stale-report.json` and the standalone command to re-run
  — but does NOT throw, unset `pass3-complete.json`, or abort the run.
  This is a deliberate choice: LLM hallucinations may not be
  deterministically fixable by re-running Pass 3, so a blocking guard
  would deadlock users in an `init --force` loop. The detection signal
  (non-zero `content-validator` exit code + stale-report entry) is
  sufficient for CI pipelines and human triage.

- **`pass-prompts/templates/common/pass3-footer.md` — Path fact
  grounding (MANDATORY).** Two new CRITICAL blocks added:
  - The parent-directory prefix anti-pattern (the exact
    `<feature>RoutePath.ts` case from the Vite frontend test project's regression run) is
    documented with ✅/❌ examples and explanation of *why* the LLM
    mis-infers (TypeScript identifier name vs filename are
    independent — the constant `<FEATURE>_ROUTE_PATH` does not imply
    filename `<feature>RoutePath.ts`).
  - The MANIFEST ↔ CLAUDE.md §6 symmetry rule is stated explicitly,
    with post-generation enforcement noted (`content-validator [10/10]
    → MANIFEST_DRIFT`).

- **`plan-installer/scanners/scan-frontend.js` — Single-SPA detection
  rule.** The subapp scanner was designed for dual-platform layouts
  (same subapp implemented for two platforms, e.g., `src/pc/admin/`
  + `src/mobile/admin/` → `pc-admin`, `mobile-admin`). When applied
  to a single-SPA project (only one platform keyword matches, as in
  `a Vite frontend test project`'s `src/admin/...`), the scanner misinterpreted the
  SPA's architectural layers (`api`, `context`, `dto`, `routers`) as
  subapps and emitted them as pseudo-domains — both cluttering the
  domain plan and priming Pass 3 toward filename hallucinations with
  the platform-name prefix.
  - **New behavior**: before the subapp-emission loop, count the
    number of distinct platform keywords present in the project.
    When the count is ≤ 1, skip subapp emission entirely and let
    downstream scanners (pages, FSD, components, fallback) identify
    real feature domains within the single SPA.
  - **Opt-out**: `.claudeos-scan.json` accepts a new override
    `frontendScan.forceSubappSplit: true` to restore the legacy
    single-platform emission for projects that genuinely treat the
    lone platform's children as feature domains.
  - **No change to multi-platform behavior**: two or more distinct
    platform keywords (e.g., `pc` + `mobile`) trigger subapp
    emission exactly as before.

- **`bin/commands/init.js` — Pass 3 split-partial resume fix.** The
  orchestrator previously decided whether to invoke `runPass3Split`
  by checking only `fileExists(pass3-complete.json)`. Any existing
  marker — including partial markers from a prior run's timeout —
  fell into the "skip" branch, causing the remaining Pass 3 stages
  to never execute on re-run. The detection block at the top of
  that function already identified partial markers and logged
  "runPass3Split will resume" but the actual call was gated by the
  broken check, so the log was misleading.
  - Now the orchestrator inspects the marker body: if
    `mode === "split"` and `completedAt` is absent, `runPass3Split`
    is invoked and its existing `groupsCompleted` tracking resumes
    from the next unstarted stage. Only markers with `completedAt`
    set are skipped.
  - This repairs the regression case where Pass 3d-aux timed out
    mid-stream on `a Spring backend test project`: on the next `init`, stages 3a-3c
    were correctly preserved but 3d-aux was silently skipped,
    leaving `claudeos-core/database/` and `claudeos-core/mcp-guide/`
    empty and the marker stuck in partial shape.

- **`tests/pass3-marker.test.js` — 6 new regression tests** covering
  the resume-decision classification function: absent marker → fresh
  run; split-partial (no `completedAt`) → resume; fully completed →
  skip; empty `groupsCompleted` still counts as partial; malformed
  JSON → safe skip; non-split mode → skip.

- **Pass 4 CLAUDE.md append retirement.** Changes span three files:
  - `pass-prompts/templates/common/pass4.md` — the "Append a new
    section to existing `CLAUDE.md`" instruction block is removed
    wholesale and replaced with a mandatory prohibition block
    ("CLAUDE.md MUST NOT BE MODIFIED") that names the exact
    validator errors ([S1], [M-*], [F2-*]) that this prohibition
    prevents, and explains that Section 8 in Pass 3's output is the
    single canonical home for the Common Rules table and the L4
    Memory table/workflow. The remaining output sections are
    renumbered (section 12 → 11). The Output Discipline section
    loses its "Do NOT overwrite CLAUDE.md content — **append only**"
    bullet, which is replaced with "Do NOT touch CLAUDE.md."
  - `bin/commands/init.js` — the two call sites of
    `appendClaudeMdL4Memory()` (inside `applyStaticFallback()` and
    inside the Pass 4 gap-fill path) are removed. The
    `gapResults` reporting no longer includes a `CLAUDE.md#(L4)`
    entry. The `require` destructure drops the function.
  - `lib/memory-scaffold.js` — `appendClaudeMdL4Memory()` is
    converted to a 3-line no-op that returns `true`
    unconditionally. The function's public signature, name, and
    module export are preserved so any external caller continues
    to work; an extensive deprecation comment documents why the
    behavior was retired and points at the validator errors it
    was causing. The `CLAUDE_MD_APPEND` template constant is left
    exported for test compatibility but is now unreferenced by
    production code.
  This fix closes the final regression surfaced by end-to-end
  regression testing on `a Vite frontend test project`: the validator was correctly
  reporting an `S1` (9 sections) and four `M-*`/`F2-*` errors
  against a `CLAUDE.md` whose second memory table had been
  appended by Pass 4, not written by Pass 3. The fix keeps the
  validator strict and removes the duplication at its source.

- **`tests/pass4-claude-md-untouched.test.js`** (new, 5 tests). A
  dedicated suite guarding the retirement against regression. Tests
  cover: the `pass4.md` prompt no longer contains the "Append a new
  section" instruction and DOES contain the "MUST NOT BE MODIFIED"
  prohibition; `init.js` neither imports nor calls
  `appendClaudeMdL4Memory`; the retired function's contract (always
  returns `true`, never mutates `CLAUDE.md`) holds under happy path,
  missing-file, and empty/structured-input variants.
  Complementary updates: 8 legacy `appendClaudeMdL4Memory` tests in
  `tests/memory-scaffold.test.js` are consolidated into a single
  retirement contract test; 3 lang-aware tests in
  `tests/lang-aware-fallback.test.js` are rewritten to verify the
  lang-invariant no-op semantics; one `generatePrompts` test in
  `tests/pass4-prompt.test.js` is flipped from "prompt contains
  CLAUDE.md append instructions" to "prompt contains the
  prohibition and does NOT contain the legacy append header".

- **Pass 4 path fact grounding (MANDATORY).** `pass4.md` now includes
  `pass3a-facts.md` in its required-reads list at the top of the
  prompt (previously only `project-analysis.json` and
  `pass2-merged.json` were listed), and adds a full `## CRITICAL —
  Path fact grounding (MANDATORY)` section below the header. The
  section states the rule first — every `src/...` path written in a
  rule or standard file must appear verbatim in `pass3a-facts.md` or
  `pass2-merged.json` — then documents the three flagship
  hallucination anti-patterns observed in `a Vite frontend test project`
  regression testing: Vite-convention assumption (`src/feature/main.tsx`),
  parent-directory prefix (`src/feature/routers/<feature>RoutePath.ts`),
  and plausible-but-unverified utility (`src/components/utils/classNameMaker.ts`).
  Each anti-pattern is accompanied by the concrete mechanism that
  caused it ("invented based on Vite's stock convention";
  "prepending the parent directory name to the filename"; etc.) so
  the LLM sees both the output to avoid and the reasoning to avoid.
  The positive pattern — "when in doubt, scope a rule to a
  directory (`src/admin/api/`) rather than inventing a filename" —
  is documented explicitly, and the section cross-references the
  downstream enforcement (`content-validator [10/10]` →
  `STALE_PATH`) so the LLM understands the validator will reject
  fabricated paths. Guarded in tests by a new `generatePrompts`
  assertion that all three anti-patterns, the MANDATORY tag, the
  positive pattern, and the validator cross-reference are present
  in the rendered pass4 prompt.

- **Orchestrator/sub-skill MANIFEST-drift exception.** Changes
  span two files:
  - `content-validator/index.js` — Stage 2 of the MANIFEST drift
    check (MANIFEST ↔ CLAUDE.md cross-reference) now recognizes
    the orchestrator/sub-skill layout pattern. A registered skill
    whose path matches
    `claudeos-core/skills/{category}/{parent-stem}/{NN}.{name}.md`
    is considered covered when CLAUDE.md mentions an orchestrator
    file anywhere under the same `{category}/` whose basename
    (minus any leading `NN.`) equals `{parent-stem}`. The
    exception is scoped narrowly: it applies ONLY to
    `MANIFEST_DRIFT`, and ONLY to sub-skills under a confirmed
    orchestrator match. Integrity checks continue to fire at full
    strength — `STALE_SKILL_ENTRY` for registered sub-skills
    whose files are missing from disk, and `MANIFEST_DRIFT` for
    standalone skills (sub-skill paths whose parent stem does not
    match any referenced orchestrator).
  - `pass-prompts/templates/common/pass3b-core-header.md` — a new
    "CLAUDE.md Section 6 — Skills sub-section (entry point only)"
    block tells Pass 3b to list only `MANIFEST.md` plus
    orchestrator files in Section 6, never to predict sub-skill
    filenames (which don't exist yet at Pass 3b time because
    Pass 3c hasn't run). The guidance explains both failure modes
    — hallucinated filenames and silent staleness — and cites the
    `content-validator` exception so the prompt-side and detector-
    side are consistent.
  This fix closes the final class of field-test-observed errors on
  `a Spring backend test project` (8 MANIFEST_DRIFT rows, all for
  `scaffold-crud-feature/0N.*.md` sub-skills) and the equivalent
  shape on `a Vite frontend test project` (8 rows under
  `scaffold-page-feature/0N.*.md`). The structural
  `CLAUDE.md §6 = entry, MANIFEST = registry` split also
  eliminates the recurring regeneration churn where adding or
  renaming a sub-skill in Pass 3c would otherwise have required
  CLAUDE.md to be rewritten.

- **`tests/content-validator.test.js` — 5 new orchestrator/sub-skill
  exception tests.** Coverage: (1) orchestrator mentioned +
  sub-skills registered → 0 drift (a Spring backend test project replica);
  (2) orchestrator mentioned + one sub-skill file deleted → still
  emits 1 `STALE_SKILL_ENTRY` (integrity not suppressed);
  (3) orchestrator NOT mentioned → all 5 registered skills drift
  (control case — exception requires orchestrator reference);
  (4) sub-skill under a parent stem that does NOT match any
  referenced orchestrator → still drifts (guard against
  over-exception); (5) sibling layout — a standalone "playground"
  skill, not a sub-skill of the referenced orchestrator — still
  drifts (guard against conflating one-level-deep standalone
  skills with sub-skills).

- **Library-convention hallucination class (MSW / Vitest / Jest /
  RTL hotfix).** Extends the Fix A anti-pattern block in
  `pass4.md` and mirrors the same guidance into `pass3-footer.md`
  so Pass 3b and Pass 4 both observe the same rule when they
  generate `testing-strategy.md`, `styling-patterns.md`, or
  `state-management.md`. The block documents four concrete
  library-convention traps — `src/__mocks__/handlers.ts`,
  `src/test/setup.ts`, `src/test-utils.tsx`, `src/setupTests.ts` —
  and explicitly names the three trigger document types that
  most often produce this class of hallucination. The positive
  rule: if `pass3a-facts.md` has no concrete test/style/store
  file listed, describe guidance by role (a shared setup module
  under a test directory of your choice) rather than by name,
  and defer concrete paths until the files actually exist.
  Regression-guarded by expanded assertions in
  `tests/pass4-prompt.test.js` that verify all four MSW/testing
  anti-patterns, the library-ecosystem naming, the
  testing-specific positive pattern, and the
  pass3a-facts.md-based negation ("these paths do not exist")
  are all present in the rendered prompt.

- **`tests/content-validator.test.js`** (new, ~270 lines). 10
  regression tests across 3 describe blocks:
  - Path-claim positive and negative cases (hallucination detected;
    fenced examples, placeholders, and existing paths do not trigger).
  - MANIFEST drift scenarios (stale entry, drift, referenced skill,
    self-reference exclusion, absent MANIFEST).
  - Full a Vite frontend test project simulation: 2 STALE_PATH + 2 STALE_SKILL_ENTRY
    + 3 MANIFEST_DRIFT, asserted with exact counts to prevent silent
    regression as the validator evolves.

- **`tests/claude-md-validator.test.js`** — structural invariant tests
  parameterized across all 10 supported output languages. Coverage includes:
  valid fixtures for each `--lang` code; bad fixtures in 6 languages
  demonstrating identical error signatures (§9 anti-pattern detected
  byte-for-byte the same regardless of script); fence-aware section
  splitting against both ``` and ~~~ fences; table-row vs prose-mention
  disambiguation; file-not-found handling; and T1 title-determinism
  coverage (scaffold/validator token alignment, English-only acceptance,
  anti-pattern rejection, case-insensitivity, graceful skip when section
  count is wrong).

- **Language-independence proof fixtures** under `tests/fixtures/claude-md/`
  covering all 10 supported output languages:
  - Valid fixtures (same 8-section structure, different languages, all
    following the T1 canonical-heading format `## N. <English canonical>
    (<translation>)`): `valid-en.md`, `valid-ja.md`, `valid-zh-CN.md`,
    `valid-es.md`, `valid-vi.md`, `valid-hi.md`, `valid-ru.md`,
    `valid-fr.md`, `valid-de.md`, plus `observed-ko-fixed.md`
    (Korean, captured regression fixture with §9 removed and headings
    retrofitted to T1 format). Each passes the same 25 structural
    checks — empirical proof of language invariance across CJK,
    Cyrillic, Devanagari, Latin, and Vietnamese scripts.
  - Bad fixtures (same valid structure + §9 memory re-declaration
    appended): `observed-ko-bad.md`, `bad-ja.md`,
    `bad-zh-CN.md`, `bad-ru.md`, `bad-hi.md`, `bad-es.md`. All six
    produce a **byte-for-byte identical 9-error signature**
    (1 S1 + 4 M-* + 4 F2-*), confirming the validator detects the
    same anti-pattern independently of output language and script.

### Changed

- **`bin/cli.js`** — registers the `lint` command, help text updated,
  examples include the new command.

- **`bin/commands/init.js`** — automatically invokes the structural
  validator after Pass 4 completes. Failures are reported inline but
  do NOT abort the run; the generated content is preserved and the
  user is pointed at `npx claudeos-core lint` for full remediation
  guidance or `init --force` for regeneration. This design choice
  follows Rule B (idempotency): lint is informational at install time,
  advisory at lint time, blocking only in CI contexts.

- **`package.json`**:
  - `version` → 2.3.0.
  - `files` includes `claude-md-validator/` so the module ships with
    the npm package.
  - `scripts.lint` convenience alias for `node bin/cli.js lint`.
  - `scripts.test` pattern updated to `node --test tests/*.test.js`
    (was the bare directory form, which fails on Node 22+).

### Prevention layer (prompt-time improvements)

Detection alone (the validator above) catches §9 after it is already
written. v2.3.0 also reduces the probability that LLMs write §9 in the
first place, by reshaping the Pass 3 prompt so the structural signal is
less ambiguous. These changes are complementary to the validator: the
validator is the guaranteed safety net, the prompt improvements lower
how often that net is needed.

- **`plan-installer/prompt-generator.js`** — `demoteScaffoldMetaHeaders()`
  utility added. When embedding `claude-md-scaffold.md` into the Pass 3
  prompt, scaffold meta-section headings (`## Why this scaffold exists`,
  `## Hard constraints`, `## Per-section generation rules`,
  `## Validation checks`, `## Examples`, `## Usage from pass3 prompts`,
  etc.) are demoted from `##` to `###`. The demotion is code-block-aware:
  `##` lines inside ``` or ~~~ fences are preserved so the scaffold's
  Template structure example (`## 1. Role Definition` ... `## 8. Common
  Rules & Memory (L4)`) remains intact.

  Rationale: a pre-v2.3.0 Pass 3 prompt contained **40+ `##` headings**
  (scaffold meta + footer sections + phase instructions + 8 canonical
  example headings). The LLM, tasked with writing a CLAUDE.md whose
  target structure has exactly 8 `##` sections, was pattern-matching
  against a prompt that modeled `##` as a very common structural unit —
  an implicit signal that extra `##` sections were natural. After
  demotion the Pass 3 prompt contains approximately 12 `##` headings,
  of which **exactly 8 are the scaffold's canonical target inside the
  fenced Template example**. The LLM now sees "the ## level is used for
  exactly 8 things in this prompt, and those 8 things are the sections
  I must write" — a far cleaner mapping between prompt structure and
  desired output structure.

- **`pass-prompts/templates/common/pass3-footer.md`** —
  `POST-GENERATION CHECK` block rewritten as an imperative 5-STEP
  procedure (count → assert → repair → verify → external validation),
  with `LANGUAGE-INVARIANT and TITLE-INVARIANT` explicitly named as
  a core property. The repair step supplies a concrete action matrix
  keyed to the surplus section's content type (memory-file references →
  DELETE; rule-summary content → MERGE into Section 8 sub-section 1;
  procedural/enforcement content → MOVE to `.claude/rules/*`). STEP 5
  announces the v2.3.0+ external validator as a safety net while
  clarifying the LLM should not rely on it — structure must be correct
  at write time.

- **`pass-prompts/templates/common/pass3-footer.md`** — FORBIDDEN
  `##`-level section list rewritten to stop depending on an English-
  label blocklist. The new framing states the RULE first (no `##` may
  have a title whose semantic category is "rules", "memory", "L4",
  "guardrails", or any rephrasing), then gives concrete **translated
  examples in Korean, Japanese, and Chinese** (the localized form of
  `Memory (L4)` in each script, plus analogues for Common Rules). The
  goal is to make the LLM's translation decision explicit: it must
  apply the forbidden rule to its translated heading, not just the
  English original. A DECISION RULE block at the end gives a 3-step
  check the LLM runs before writing any `##` heading.

- **`pass-prompts/templates/common/claude-md-scaffold.md`** — the
  "L4 Memory Files (Re-declaration)" anti-pattern reference (which,
  by naming the anti-pattern explicitly, paradoxically risked priming
  the LLM to reproduce it — a "pink elephant" failure mode) was
  replaced with a positively-phrased "Section 8 single-occurrence
  rule": the L4 Memory Files table, Memory Workflow, and Common Rules
  meta-summary table each appear EXACTLY ONCE, with their canonical
  home named explicitly. Two `no "Re-declaration" duplicate` phrases
  in the validation checklist were similarly simplified to
  `appear EXACTLY ONCE in the whole document`.

- **`tests/prompt-generator.test.js`** — 3 new tests covering the
  demotion utility:
  - Meta-section `##` headers outside fences are demoted to `###`
  - `##` headers inside ``` and ~~~ fenced blocks are preserved
  - Real scaffold embedded into real pass3-prompt produces < 25 `##`
    headings total and preserves all 8 canonical example sections.

- **`tests/claude-md-validator.test.js`** — parameterized across all
  10 supported languages. 10 valid-fixture tests (one per `--lang` code)
  plus 5 bad-fixture tests (ko/ja/zh-CN/ru/hi/es each asserting the
  identical 9-error signature).

Total tests: **662. All pass.**
(v2.2.0 baseline 602 + v2.3.0 net additions 60 = 662. The "net"
accounting reflects that 8 legacy `appendClaudeMdL4Memory` behavior
tests were consolidated into a single no-op contract test when that
function was retired; the full set of new tests added across v2.3.0
totals 68 across path-claim verification, single-SPA scanner,
Pass 3 resume classification, Pass 4 CLAUDE.md immutability,
Pass 4 path fact grounding, and the orchestrator/sub-skill
MANIFEST-drift exception.)

### Why this matters

The §9 re-declaration anti-pattern was the flagship problem v2.2.0 aimed
to solve, and the scaffold + prompt-level blocklist reduced incidence
substantially. Regression testing on a Korean-output fixture produced a
`CLAUDE.md` with a `## 9. ` heading translating to "Memory (L4)" anyway — the LLM
successfully matched the localized form of `## 8. Common Rules & Memory (L4)`
as its Section 8, then created a §9 section whose translated title was not
semantically recognized as equivalent to the blocklisted English
`"Memory Layer (L4)"`.

Extending the fix by maintaining per-language blocklists would create
unbounded maintenance surface: 10 supported languages × 6-8 forbidden
labels × every future phrasing variant. Each new language addition
would require re-auditing the entire translation table. Each miss
re-introduces the bug.

The v2.3.0 approach sidesteps this entirely. A post-generation code-level
validator that reasons about markdown syntax and literal file names does
not need a per-language dictionary. The same 22 checks run identically on
Korean, Japanese, English, or any future language added to the `--lang`
flag. Proof: the validator produces a byte-for-byte identical 9-error
signature when applied to synthesized Japanese §9 and the actual Korean
§9 that triggered this investigation. See the fixtures for reproducible
evidence.

This also aligns the final Pass of the pipeline with claudeos-core's core
principle **"LLMs guess, code confirms"**. Earlier passes already enforce
this: stack-detector confirms LLM-guessed ports via `.env.example` parsing
(v2.2.0), pass2-merged.json grounds the stack facts in real files (v2.0).
Pass 3/4 output structure was the remaining gap — LLM generates it, and
no code confirmed the result. v2.3.0 closes that gap without sacrificing
Pass 3/4's generative flexibility: LLM still writes content; code now
confirms the structural invariants hold.

v2.3.0 ships both a detection layer (the validator) and a prevention
layer (the prompt-time improvements listed under "Prevention layer"
above). The prevention layer reshapes the Pass 3 prompt so the LLM
sees a cleaner mapping between prompt structure and target output
structure — primarily by demoting scaffold meta-section `##` headers
to `###` when embedded, cutting the prompt's total `##` count from
40+ down to about 12, of which exactly 8 are the canonical section
examples the LLM must reproduce. This does not eliminate structural
drift (LLM output is probabilistic), but it reduces the rate at which
the detection layer has to fire. The two layers together form a belt-
and-suspenders design: prevention lowers baseline incidence, detection
guarantees a clear user-visible signal when incidence > 0.

### Migration

No regeneration required. v2.3.0 is purely additive — the validator
runs on existing v2.2.0-generated `CLAUDE.md` files and flags drift
where present.

- **For new projects**: `npx claudeos-core init --lang <code>` runs lint
  automatically at the end; inspect any flagged drift before committing.
- **For existing v2.2.0 projects**: `npx claudeos-core lint` runs the
  validator against the current `CLAUDE.md` and reports issues. No code
  changes to `CLAUDE.md`, `.claude/rules/`, or `claudeos-core/*` are made
  — the validator is read-only.
- **For projects with flagged drift**: regenerate via
  `npx claudeos-core init --force`, or hand-edit using the per-failure
  remediation guidance the validator emits.

CI-friendly exit codes: `lint` returns 0 on pass and 1 on fail, suitable
for a GitHub Actions step or pre-commit hook.

### Notes

- The validator is deliberately narrow in scope: it verifies *structural*
  invariants, not semantic correctness. Content quality (Section 1 Level-2
  abstraction discipline, Section 4 pattern-naming accuracy, etc.) remains
  the scaffold's and the LLM's responsibility. A future release may add
  complementary content-level checks.
- The table-row-based detector distinguishes the L4 Memory Files *table*
  declaration from prose mentions of memory filenames in Section 8's
  workflow steps. A prior iteration during implementation flagged every
  mention as a duplicate (false-positive on normal valid output); the
  final design matches only markdown table-row patterns (`| \`...memory/X\` |`),
  which produce clean true-positive signals on the real bad fixture and
  zero flags on all three good fixtures.
- Fenced code block handling in `splitByH2` was validated against the
  embedded scaffold in `pass3-prompt.md` itself, which contains an
  example CLAUDE.md structure (`## 1. Role Definition` ... `## 8. ...`)
  inside a ```markdown fence. Without fence-awareness, this would inflate
  any section count run against the prompt — a reminder that markdown
  validators must understand markdown, not just regex-match headings.

---

## [2.2.0] — 2026-04-21

Adds deterministic CLAUDE.md structure. Generated `CLAUDE.md` files now follow
an 8-section scaffold with fixed titles and order, driven by `pass-prompts/
templates/common/claude-md-scaffold.md`. Content within each section still
adapts to the project, but the structural skeleton no longer drifts between
projects or runs.

### Added

- **`pass-prompts/templates/common/claude-md-scaffold.md`** (new, ~630 lines).
  Single source of truth for CLAUDE.md structure. Defines the 8 sections
  (Role Definition / Project Overview / Build & Run Commands / Core
  Architecture / Directory Structure / Standard · Rules · Skills
  Reference / DO NOT Read / Common Rules & Memory (L4); titles are
  emitted in the project's output language), per-section generation
  rules, dynamic substitution variables (`{PROJECT_NAME}`,
  `{OUTPUT_LANG}`, `{PROJECT_CONTEXT}`), and a post-generation validation
  checklist. Section 8 has TWO required sub-sections: a Common Rules
  sub-section (meta-summary table of `paths: ["**/*"]` universal rules)
  and an L4 Memory sub-section (memory file table + workflow). All 12 stack-specific Pass 3 prompts
  now delegate CLAUDE.md structure to this scaffold and supply only
  stack-specific hints (2-4 lines each).

- **`lib/env-parser.js`** (new). Parses `.env*` files into structured
  `{port, host, apiTarget, vars, source}` used by stack-detector. Search
  order prefers `.env.example` (committed, canonical) over local `.env`
  variants. Port detection recognizes 16+ convention variable names across
  Vite, Next.js, Nuxt, Angular, Node, and Python frameworks. Exposes
  utilities (`parseEnvContent`, `extractPort`, `extractHost`,
  `extractApiTarget`, `readStackEnvInfo`) plus a sensitive-variable
  filter (`isSensitiveVarName`, `redactSensitiveVars`) that redacts
  values of PASSWORD/SECRET/TOKEN/API_KEY/CREDENTIAL/PRIVATE_KEY-style
  variables to a `***REDACTED***` sentinel before the vars map reaches
  any downstream consumer. DATABASE_URL is whitelisted for
  stack-detector back-compat. 39 unit tests in `tests/env-parser.test.js`
  (30 core + 9 redaction).

### Changed

- **All 12 Pass 3 prompts** (`angular/`, `java-spring/`, `kotlin-spring/`,
  `node-express/`, `node-fastify/`, `node-nestjs/`, `node-nextjs/`,
  `node-vite/`, `python-django/`, `python-fastapi/`, `python-flask/`,
  `vue-nuxt/`). Two separate changes per file:
  1. The previous 5-bullet CLAUDE.md generation block (`- Role definition`,
     `- Build & Run Commands`, `- Core architecture diagram`, `- {stack item}`,
     `- Standard/Skills/Guide reference table`) is replaced by a scaffold
     reference plus stack-specific hints. The `CRITICAL — CLAUDE.md Reference
     Table Completeness` warning above the block is also removed (the
     scaffold's validation checklist supersedes it).
  2. The `40.infra/*` `paths` frontmatter spec is split per-file. Previously
     all three infra rules (environment-config, logging-monitoring, cicd-
     deployment) received the same category-level `paths` value, which caused
     the logging-monitoring rule to never auto-load on source code edits
     (its `paths` only matched `.env`, `*.config.*`, `*.json`, `*.yml`,
     `Dockerfile*` — none of which are source files). Per-file paths now
     match each rule's actual guardrail target: environment-config → env/
     config files, logging-monitoring → source code extensions (`.ts`/`.tsx`/
     `.py`/`.java`/`.kt` per stack), cicd-deployment → CI YAML + source.

- **`pass-prompts/templates/common/pass3-footer.md`** — five new `CRITICAL`
  blocks added:
  - **`00.standard-reference.md` Composition**: scopes the mechanical
    standards index strictly. REQUIRES a forward reference to
    `claudeos-core/standard/00.core/04.doc-writing-guide.md` (generated
    by Pass 4 but indexed at Pass 3 time to prevent a gap between passes).
    FORBIDS a redundant "DO NOT Read / context waste" section inside
    `00.standard-reference.md` — that information belongs solely in
    CLAUDE.md Section 7, which is both more complete (includes project-
    specific build-output and external-module paths) and not reloaded
    on every edit. The 6 stacks (java-spring, kotlin-spring, node-express,
    node-nextjs, python-django, python-fastapi) whose Pass 3 prompts
    previously hardcoded a `## DO NOT Read` block in the reference file
    have been cleaned up.
  - **`.env` Is the Source of Truth for Runtime Configuration**: when
    `pass2-merged.json` contains `stack.envInfo`, ports/hosts/API targets
    declared in the project's `.env.example` MUST be used over framework
    defaults. Affects Section 2's table, Section 3's inline run-command
    comments, and any rule referencing port values (e.g., CORS origins
    in auth rules).
  - **Rule `paths` Must Match Rule Content**: enforces that each rule's
    `paths` frontmatter matches the file types its guardrails actually
    target. Explicitly prohibits copying `paths` across sibling rule files
    in the same category, and tells the LLM to re-verify "when should
    Claude Code auto-load this rule?" as the criterion for paths. Added
    because a category-level paths shortcut in earlier Pass 3 prompts
    caused the logging-monitoring rule to never match source code edits.
  - **CLAUDE.md Scaffold Compliance**: enforces the 8-section structure at
    generation time. Explicitly forbids adding sections with titles like
    "Required to Observe While Working", "Rules Summary", "Documentation
    Writing Rules", "AI Common Rules", "L4 Memory Integration Rules",
    "Common Rules", or any title whose category meaning is "rules"
    beyond the 8 fixed section names (the same blocklist is applied in
    every output language, matching on the translated equivalents).
    Adds a mandatory post-generation check (count `^## ` headings; must
    equal 8; merge surplus into the correct section or move to `rules/*`
    / `standard/*`). The expanded blocklist closes a rename loophole
    discovered during regression testing on a Vite + React frontend project
    where the LLM appended a §9 whose title combined "Documentation
    Writing + AI Common Rules + Memory Layer (L4)" to collect
    rule-related content.
  - **CLAUDE.md Does Not Duplicate Rules**: clarifies that CLAUDE.md
    describes structure, not enforcement. Lists four categories of content
    that do NOT belong in CLAUDE.md (coding rules, domain-specific rules,
    multi-file sync rules, work procedures) and points each to its proper
    home in rules/standard/skills/guide.

- **`pass-prompts/templates/common/claude-md-scaffold.md`** (in addition to
  the new-file Add above) was tightened after initial regression testing:
  - Hard constraints section now leads with **"EXACTLY 8 SECTIONS. No more,
    no less."** plus a recovery procedure for surplus sections.
  - Section 6 Rules sub-section explicitly notes that the
    `.claude/rules/00.core/*` wildcard row already COVERS
    `51.doc-writing-rules.md` and `52.ai-work-rules.md` — eliminating the
    perceived need to create a separate section enumerating those rules.
  - Validation checks section lists common surplus section patterns with
    target destinations so the LLM can act rather than just detect.

- **`plan-installer/prompt-generator.js`** — embeds the scaffold inline
  into `pass3-prompt.md` at generation time. The 12 stack-specific Pass 3
  templates and `pass3-footer.md` both reference
  `pass-prompts/templates/common/claude-md-scaffold.md` by path, but that
  path is relative to the claudeos-core package, not the user project.
  The generator now reads the scaffold and inserts it between the Phase 1
  fact-table block and the stack-specific body, wrapped in explicit
  `# === EMBEDDED: claude-md-scaffold.md ===` markers so the LLM can locate
  it. Without this embed the scaffold references would point to a file
  Claude Code cannot resolve at runtime. Load is optional (`existsSafe`)
  so a missing scaffold does not crash generation — the rest of the
  prompt is still produced, just without the deterministic structure
  enforcement.

- **`plan-installer/stack-detector.js`** — now calls `readStackEnvInfo`
  before returning and attaches the result as `stack.envInfo` on
  project-analysis.json. When the project's `.env.example` (or fallback
  `.env`) declares a port AND no earlier detector won (Spring Boot
  application.yml still takes precedence), the parsed port is promoted
  to `stack.port`. This closes a long-standing gap where Vite projects
  that customized their dev port via `.env` (e.g., `VITE_DESKTOP_PORT=3000`)
  received the framework-default 5173 in CLAUDE.md.
  Host and API target values are also captured for downstream use.

- **`plan-installer/index.js`** — port resolution precedence documented
  in code comments. The existing `defaultPort` fallback chain (Vite 5173,
  Next.js 3000, Django 8000, etc.) is now explicitly labeled "last resort"
  and runs only when neither stack-detector's direct detection (Spring
  application.yml) nor the env-parser populated `stack.port`.

- **`pass-prompts/templates/common/claude-md-scaffold.md`** Section 2
  (Project Overview) and Section 3 (Build & Run Commands) rules now
  reference `stack.envInfo` as authoritative for port/host/API-target
  values. Section 2 requires env-annotated rows in the project overview
  table when the project declares them (e.g., `| Dev Server Port | 3000
  (VITE_DESKTOP_PORT) |`), and Section 3 requires inline port comments
  next to run commands to match the env-declared value. Framework defaults
  are explicitly labeled "last resort" in both rules.

### Why this matters

When claudeos-core was exercised against three test projects (one Spring Boot backend,
two Vite + React frontends) in the regression suite, the
generated files were content-correct — standards, rules, and skills
accurately captured each project's patterns — but the `CLAUDE.md` files
had different section counts (8, 8, 9), different section names, and
different section orders. Claude Code reads CLAUDE.md first on every
session; inconsistent structure across repos would make it harder for
developers (and Claude Code) to know where to look for a given piece of
information. v2.2.0 fixes the structure while leaving content
project-specific.

The removed "Required to Observe While Working" section was a symptom
of the same problem: different projects put different rules there, most
of which duplicated
content already in `.claude/rules/*` (auto-loaded) or `claudeos-core/
standard/*` (detailed patterns). Removing it eliminates a redundant
maintenance surface and reinforces the "one rule, one home" principle.

Regression testing also uncovered a latent paths bug. The `40.infra/*` rules
shared a single category-level `paths` frontmatter that only matched
config/infra file extensions (`.env`, `*.config.*`, `*.json`, `*.yml`,
`Dockerfile*`). This meant the logging-monitoring rule — whose guardrails
cover `console.log` misuse, PII in logs, and `catch {}` swallowing —
never auto-loaded when editing `.ts`/`.tsx`/`.py`/`.java` files, i.e.,
exactly when it was needed. The rule body was correct; its activation
trigger was mis-scoped. v2.2.0 now specifies per-file `paths` in the Pass
3 prompts and adds a `Rule paths Must Match Rule Content` CRITICAL block
to the footer so future rules cannot inherit the wrong scope by default.

A third regression testing finding exposed a different layer of the same
philosophy violation. The stack detector parsed Spring Boot's
`application.yml` for `server.port`, but for Node/Vite projects it
simply used a hardcoded framework default (Vite → 5173) whenever no
Spring-style config was found — even when the project declared its
actual port in `.env.example` (e.g., `VITE_DESKTOP_PORT=3000`). This
meant CLAUDE.md's §2 table and §3 run-command
comments showed the Vite theoretical default instead of what the project
actually runs. The root cause was structural: the detector had no
`.env` parser beyond a DATABASE_URL check for DB identification. v2.2.0
introduces `lib/env-parser.js` with convention-aware port/host/API-target
extraction, and the scaffold and footer now treat `.env.example` as the
canonical source of runtime configuration — framework defaults are
last-resort only. This also captures host and API-target values that
previously never appeared in generated CLAUDE.md at all.

A fourth regression testing iteration on a Spring Boot backend project
(regenerated with the interim v2.2.0 scaffold that only allowed a single
Section 8 titled "Memory (L4)") found the LLM producing a §9 titled
"Common Rules & Memory (L4)" — even with the expanded blocklist from
the earlier frontend-project fix.
The §9 contained both (a) a meta-summary table of `paths: ["**/*"]`
rules (51.doc-writing-rules + 52.ai-work-rules) and (b) a restated L4
memory table labeled "L4 Memory Files (Re-declaration)". Close
inspection showed (a) was genuinely useful content the scaffold had no
legitimate home for — a developer-facing summary of which rules
auto-load on every edit, complementary to Section 6's directory index.
The LLM kept inventing §9 because the information it wanted to convey
was real. v2.2.0 resolves this by promoting Section 8 to "Common Rules
& Memory (L4)" with two required sub-sections: one for common rules
auto-loaded on every edit (meta-summary only, not rule bodies) and one
for L4 memory referenced on-demand. This acknowledges that "which rules
auto-load universally" is a legitimate meta-information category that
deserves a visible home, while keeping the always-8-sections contract
intact. The duplicate §9 "re-declaration" anti-pattern is now
explicitly named and forbidden in both the scaffold
and the footer.

Finally, the same backend-project inspection also surfaced two smaller
but real bugs in `00.standard-reference.md` generation. First, 6 of the
12 Pass 3 stack prompts hardcoded a `## DO NOT Read (context waste)`
section at the bottom of the reference file — a shadow of CLAUDE.md
Section 7 that was less complete (missed project-specific paths like
`build/` or external modules) and lived at the wrong layer: `00.standard-
reference.md` reloads on every edit via `paths: ["**/*"]`, while
Section 7 loads once per session. Second, `claudeos-core/standard/00.
core/04.doc-writing-guide.md` is generated by Pass 4 (Required output
#12) but never appeared in the Pass 3-generated reference index, creating
a gap the moment Pass 4 ran. v2.2.0 adds a `00.standard-reference.md
Composition` CRITICAL block to the footer that codifies: (a) always
include the Pass 4 forward reference, (b) never include a DO NOT Read
section (Section 7 is the single source of truth), (c) keep the per-
edit payload minimal (paths only, no descriptions — descriptions live
in Section 6 which is session-time budget). The 6 inline hardcoded
DO NOT Read blocks have been removed from the stack prompts and
replaced with explicit inline notes pointing to the footer rule.

Three additional risks surfaced during pre-release cross-checking
and were addressed in the same release cycle. **First**, the scaffold's
"Section 6 Rules: Always include 60.memory/*" directive, added during
Section 8 redesign, was not echoed in the 12 stack Pass 3 prompts'
rule-category listings — so the LLM received conflicting signals
(scaffold says include, stack prompt doesn't mention it). Regression testing
on the backend project confirmed the category was being omitted from
the generated CLAUDE.md §6 Rules table. v2.2.0 fixes both sides: each stack
Pass 3 prompt now explicitly lists `60.memory/*` as a forward-reference
rule category (generated by Pass 4, but indexed at Pass 3 time), and the
scaffold's Sub-section 2 guidance is strengthened with an example row
and a "mandatory — do NOT omit" note. **Second**, the existing Migration
guidance mentioned `--force` but did not explain why `npx claudeos-core
init` (without `--force`) silently fails to adopt v2.2.0 improvements on
upgrades. Under Rule B idempotency, existing generated files are skipped
as "already exists", meaning users running plain `init` on a v2.1.x
project see no visible change. v2.2.0 adds (a) a dedicated "upgrade
detected" warning in bin/commands/init.js that fires when a pre-v2.2.0
CLAUDE.md is detected before the resume/fresh prompt, and (b) an expanded
Migration section in CHANGELOG that makes the `--force` requirement and
preservation semantics (memory/ content kept, generated files replaced)
explicit. **Third**, the new `.env.example` → CLAUDE.md pipeline created
a theoretical pathway for accidentally committed secrets in `.env.example`
to be amplified into the project's public-facing documentation. Although
`.env.example` is conventionally a placeholder file, projects
occasionally check in real values by mistake. v2.2.0 adds a
sensitive-variable filter (`lib/env-parser.js`: `isSensitiveVarName`,
`redactSensitiveVars`) that replaces values of variables matching
PASSWORD/SECRET/TOKEN/API_KEY/CREDENTIAL/PRIVATE_KEY patterns with a
`***REDACTED***` sentinel before the vars map reaches any downstream
consumer. Port/host/API-target extraction uses a whitelist of
config-relevant keys and is unaffected. The scaffold also gains an
explicit SECURITY directive forbidding reference to sensitive variables
in CLAUDE.md as defense-in-depth. `DATABASE_URL` remains unredacted
because stack-detector's DB identification path has depended on it since
v1.x — changing that would be a breaking change.

### Migration

Existing projects keep working. The prompt-generator change affects only
how `pass3-prompt.md` is assembled on the next `init` or `refresh` run —
installed standards, rules, skills, memory, and CLAUDE.md in existing
projects are not touched until the user regenerates.

**⚠️ Important: `--force` is REQUIRED to adopt v2.2.0 improvements.**

claudeos-core's Pass 3 runs under Rule B (idempotency): if a target file
already exists on disk, it is skipped during regeneration. This is
designed to protect hand-edited content from being overwritten, but it
means **a plain `npx claudeos-core init` on an existing v2.1.x project
will NOT apply v2.2.0 improvements** because the old files (CLAUDE.md,
`00.standard-reference.md`, `40.infra/*-rules.md`, memory rules, etc.)
will all be skipped as "already exists".

To actually adopt v2.2.0's improvements (8-section CLAUDE.md, per-file
`40.infra/*` paths, `.env.example`-based port accuracy, Section 8
redesign, forward-referenced `04.doc-writing-guide.md`, `60.memory/*`
row), regenerate via:

```
npx claudeos-core init --force
```

`--force` overwrites existing generated files while leaving untouched:
- Your source code
- `claudeos-core/memory/` content (decision-log, failure-patterns entries
  you've accumulated) — these are append-only and preserved
- Any non-generated files under the project root

If you want to preview changes first, regenerate into a scratch copy of
the project, diff the resulting files against your current ones, and
then decide whether to `--force` on your project. Key files to
diff: `CLAUDE.md`, `.claude/rules/00.core/00.standard-reference.md`,
`.claude/rules/40.infra/02.logging-monitoring-rules.md` (paths change
is the most visible delta).

No manual edits are required after `--force`; the scaffold handles
everything. Hand-edited content in `claudeos-core/standard/**` that
you want preserved should be committed to version control before
running `--force` so you can diff/merge any overwrites.

### Notes

- 39 new tests added in `tests/env-parser.test.js` (30 core + 9 sensitive-
  variable redaction). All tests continue to pass: **563 pre-existing + 39
  new = 602 total**.
- No file-format breaking changes. Existing `claudeos-core/standard/`,
  `.claude/rules/`, and `claudeos-core/skills/` content in installed
  projects is unaffected — only the CLAUDE.md generated at the project
  root changes shape on regeneration. The `40.infra/*` rule `paths`
  values will update on next regeneration, which changes when those
  rules auto-load (more accurately scoped); the rule content itself
  does not change. `stack.envInfo` is a new additive field — older
  project-analysis.json files without it still work.
- Discovered via regression testing on multiple test projects:
  - Structural drift (3 different CLAUDE.md layouts) prompted the scaffold.
  - A Vite + React frontend project produced a §9 surplus section under
    a renamed title that bypassed the initial forbidden-sections blocklist
    — fixed by expanding the blocklist and adding the mandatory
    post-generation §-count check.
  - The `40.infra/*` paths mismatch surfaced when inspecting a generated
    `02.logging-monitoring-rules.md` and confirming via grep that its
    guardrails (source-code-level: PII logging, silent swallow, console
    use) could never auto-load given the file's own paths frontmatter
    (config-only).
  - The Vite port mismatch (5173 in CLAUDE.md when `.env.example`
    declared 3000) exposed the absence of any `.env` parsing in
    stack-detector beyond DATABASE_URL — prompted the new
    `lib/env-parser.js` utility and the `.env Is the Source of Truth`
    CRITICAL footer block.
  - A second Spring Boot backend regeneration against the interim
    scaffold produced §9 "Common Rules & Memory (L4)" despite the
    expanded blocklist, because the LLM's desired content (a
    meta-summary of `paths: ["**/*"]` universal rules, complementary to
    Section 6's directory index) had no legitimate home in the original
    8-section design. Resolved by redesigning Section 8 into two
    sub-sections — a Common Rules sub-section for the universal-rules
    meta-summary and an L4 Memory sub-section for the memory
    table/workflow. The "L4 Memory Files (Re-declaration)" anti-pattern
    (duplicate memory table inside a second section) is now explicitly
    named and forbidden.
  - Inspection of the same backend-project output showed a generated
    `00.standard-reference.md` carrying a hardcoded `## DO NOT Read
    (context waste)` section (a partial duplicate of CLAUDE.md Section 7)
    and missing `00.core/04.doc-writing-guide.md` (created later by
    Pass 4). Fixed in the 6 affected Pass 3 stack prompts and formalized
    as the `00.standard-reference.md Composition` CRITICAL block so
    future stacks cannot reintroduce either defect.
  - Pre-release cross-check found the scaffold's `60.memory/*` "Always
    include" directive was not mirrored in any of the 12 stack Pass 3
    prompts' rule-category listings, causing the backend project's
    CLAUDE.md §6 Rules table to omit `60.memory/*` entirely. Fixed by adding the
    forward-reference row to all 12 stack prompts and strengthening the
    scaffold's Sub-section 2 guidance with an example row and "mandatory"
    wording.
  - Pre-release cross-check flagged that a plain `npx claudeos-core init`
    on an existing v2.1.x project would silently skip v2.2.0 improvements
    under Rule B idempotency. Added a CLAUDE.md marker-based detection
    in `bin/commands/init.js` that warns about the `--force` requirement
    before the resume/fresh prompt, plus an expanded Migration section
    covering preservation semantics and preview workflow.
  - Pre-release cross-check identified that values in `.env.example`
    flow through to CLAUDE.md, creating a leak pathway for accidentally
    committed secrets. Added sensitive-variable redaction in
    `lib/env-parser.js` (PASSWORD/SECRET/TOKEN/API_KEY/CREDENTIAL/
    PRIVATE_KEY patterns replaced with `***REDACTED***` sentinel) plus
    a SECURITY directive in the scaffold as defense-in-depth.

---

## [2.1.2] — 2026-04-21

Post-release regression fix for v2.1.0 master plan removal cleanup.

### Fixed

- **`content-validator`: `plan/` directory no longer required.** On fresh
  v2.1.0+ projects `npx claudeos-core health` always failed because
  `content-validator/index.js` pushed a `MISSING: plan directory not found`
  error when `claudeos-core/plan/` was absent. Master plan generation was
  explicitly removed in v2.1.0 — `plan-validator` (v2.1.0 `Fixed`) and
  `manifest-generator` (v2.1.0 `Fixed`) were both updated to tolerate a
  missing `plan/` directory, but `content-validator` was missed during
  that cleanup. It now silently skips the plan/ check when the directory
  is absent (with an informational `plan/ not present (expected post-v2.1.0)`
  log line), matching the contract established by the other validators.
  The directory contents are still validated when present (legacy projects
  or user-authored plan files are unaffected).

### Notes

- All 563 existing tests continue to pass. No new tests added — the fix
  is a one-line behavior change (`errors.push(...)` → `console.log(...)`)
  with a comment documenting the v2.1.0 context, and regression risk is
  covered by routine `health` runs rather than an integration test.
- Discovered via regression testing on a Vite 6 + React 19 test project: 62
  generated files, all Pass 1–4 stages succeeded, but `health` failed
  at content-validator. No other cleanup gaps found.

---

## [2.1.1] — 2026-04-20

Docs-only maintenance release. No runtime behavior or API changes.

### Changed

- **README: dropped `What's New in v2.1.0` section** from all 10 language
  READMEs (`README.md`, `README.ko.md`, `README.ja.md`, `README.zh-CN.md`,
  `README.es.md`, `README.vi.md`, `README.hi.md`, `README.ru.md`,
  `README.fr.md`, `README.de.md`). Post-release cleanup — the section's
  job is done once the release ships, and the same content is preserved
  in `CHANGELOG.md` for anyone who wants the historical detail.

- **README: dropped the 18-domain admin-frontend subsection
  (2026-04-20 entry)** under _Auto-scaling by Project Size_ across
  all 10 language READMEs. The per-stage breakdown table (9 rows) and its
  surrounding prose are removed. The trailing empirical reference in the
  FAQ "What is Pass 3 split mode" answer (the `Empirically verified up
  to 18 domains × 101 files × 102 minutes …` sentence with its now-dead
  link) is also removed so no orphan reference remains.

### Notes

- Each README drops ~33 lines; total net change across translations is
  ~330 lines removed. No code, tests, prompts, or generated artifacts
  are touched — `npm pack` contents are identical to v2.1.0 apart from
  the README files and `package.json`/`package-lock.json` version bump.

---

## [2.1.0] — 2026-04-20

This release addresses the primary cause of `Prompt is too long` failures in
Pass 3 on large multi-module projects. The fix is structural: Pass 3 is
re-architected into multiple sequential `claude -p` calls with fresh context
each, so output-accumulation overflow is no longer possible regardless of
project size.

### Added

- **Phase 1 "Read Once, Extract Facts" prompt block** (always on). A new
  common block `pass-prompts/templates/common/pass3-phase1.md` is prepended
  to every generated `pass3-prompt.md`. It instructs Claude to read
  `pass2-merged.json` exactly once into a compact in-context fact table and
  reference that table for all subsequent file generation. The block defines
  five rules:
  - **Rule A** — Reference the fact table, don't re-read pass2-merged.json.
  - **Rule B** — Idempotent file writing (skip if target exists with real
    content), making Pass 3 safely re-runnable after interruption.
  - **Rule C** — Cross-file consistency enforced via the fact table as
    single source of truth.
  - **Rule D** — Output conciseness: one line (`[WRITE]`/`[SKIP]`) between
    file writes, no restating the fact table, no echoing file content.
    Addresses output-accumulation overflow where verbose narration between
    30-50 files adds 15-30K tokens of pure accumulation.
  - **Rule E** — Batch idempotent check: one `Glob` at PHASE 2 start
    instead of per-target `Read` calls.

- **`pass3-context.json` slim summary builder** (always on). A new file
  `claudeos-core/generated/pass3-context.json` is built after Pass 2 from
  `project-analysis.json` plus `pass2-merged.json` signals (size, top-level
  keys). Stays under 5 KB even for large projects vs. `pass2-merged.json`
  which can exceed 500 KB. Pass 3 prompts reference this as the preferred
  entry point, falling back to `pass2-merged.json` only for specific
  details (response wrapper method, util class FQN, MyBatis mapper path).
  Emits a warning when `pass2-merged.json` exceeds 300 KB.

- **Batch sub-division for large projects** (automatic, ≥16 domains).
  Stages 3b and 3c are sub-divided into batches of 15 domains each,
  preceded by dedicated `3b-core` / `3c-core` stages that handle
  project-wide common files. Ensures no single stage generates more than
  ~50 files, keeping output within the empirical safe range on projects
  up to 100+ domains. Batch count is `ceil(totalDomains / 15)`; domain
  order comes from `domain-groups.json` (size-balanced by plan-installer).

- **Split-mode partial marker protection**. `pass3-complete.json` gains
  `mode: "split"` and `groupsCompleted` array. A run that completes 3a+3b
  and crashes during 3c leaves a partial marker; on re-run, the stale-check
  detects the partial-marker shape and defers to the split runner's resume
  logic instead of deleting the marker — otherwise the run would restart
  from 3a and double the token cost.

- **7 regression tests** pinning the master plan no-op contract
  (`tests/master-plan-removal.test.js`).

- **`scaffoldSkillsManifest` gap-fill for Pass 4**. Auto-creates
  `claudeos-core/skills/00.shared/MANIFEST.md` with a minimal stub if
  Pass 3c omits it (the stack pass3.md templates list it among targets but
  without REQUIRED marking, so skill-sparse projects sometimes ended up
  with `.claude/rules/50.sync/03.skills-sync.md` pointing at a
  non-existent file). Idempotent: skips if the file already has real
  content (>20 chars).

### Changed

- **Pass 3 now always runs in split mode.** Each stage starts with a fresh
  context window; cross-stage consistency is preserved by `pass3a-facts.md`.
  No user-facing configuration — applies to every `npx claudeos-core init`
  run automatically.

  Stage structure:
  - **3a** — Read analysis files once, write `pass3a-facts.md` (5-10 KB
    distilled fact sheet).
  - **3b** — Generate `CLAUDE.md`, `standard/`, and `.claude/rules/`.
    Sub-divided into `3b-core` + `3b-1..N` on projects with ≥16 domains.
  - **3c** — Generate `skills/` and `guide/`. Sub-divided into `3c-core`
    + `3c-1..N` on projects with ≥16 domains.
  - **3d-aux** — Generate `database/` + `mcp-guide/` stubs.

  Single-batch projects keep flat `"3b"`/`"3c"` marker names
  (backward-compatible); multi-batch projects use `"3b-core"`, `"3b-1"`,
  etc. Resume works at stage granularity.

- **Stage count by project size** (1–15 domains: 4 stages; 16–30: 8; 31–45:
  10; 46–60: 12; 61–75: 14; 91–105: 18).

- `package-lock.json` synced to `2.1.0`. The v2.0.2 release had a stale
  lockfile at `2.0.0` which caused `npm ci` to fail lockfile integrity
  checks.

### Removed

- **Master plan generation** (`claudeos-core/plan/*-master.md` files).
  Master plans were an internal tool backup not consumed by Claude Code
  at runtime, and aggregating many files in a single Pass 3d session was
  a primary source of `Prompt is too long` failures on mid-sized projects.
  Claude Code runtime is unaffected — it reads `CLAUDE.md` + `rules/`
  directly. Use `git` for backup/restore instead.

- **Pass 3d sub-stages `3d-standard` / `3d-rules` / `3d-skills` /
  `3d-guide`**. Only `3d-aux` (database + mcp-guide stubs) remains as a
  fixed-size task independent of domain count.

- **`CLAUDEOS_PASS3_SPLIT` environment variable and single-call mode.**
  Single-call had failed reliably on projects with more than ~5 domains
  because output-accumulation overflow is not predictable from input size.
  Split mode is structurally immune and is now the only supported path.

- **`claudeos-core/plan/` directory creation in `init`**. Directory is no
  longer created during bootstrap (honors the master-plan-removal contract).

### Deprecated

- `scaffoldMasterPlans` in `lib/memory-scaffold.js` is kept as a
  backward-compatible no-op (returns `[]`, writes nothing). External
  callers keep working; no files are produced.

### Fixed

- `bootstrap.sh` line endings normalized from CRLF to LF. v2.0.2 shipped
  with CRLF which caused immediate `syntax error` on macOS/Linux when
  invoked via `bash claudeos-core-tools/bootstrap.sh`.

- `pass3-context-builder.js`: removed unused `p2Size` placeholder variable
  (refactoring leftover, no behavior change).

- `init.js`: Pass 4 progress ticker `totalExpected` corrected from 6 to 5
  to reflect master plan removal. The 6th slot was counting
  `plan/50.memory-master.md` which is no longer generated, making the
  progress bar appear stuck at 83% until the run completed.

- `manifest-generator`: removed stale `plan-manifest.json` generation.
  Master plans were removed in v2.1.0; a manifest with an empty `plans`
  array (62 B) was noise. Nothing reads it, nothing validates it.
  `sync-map.json` is retained (with empty `mappings`) for
  `sync-checker` backward compatibility.

- `plan-validator`: `plan-sync-status.json` is now skipped when the
  `plan/` directory is absent or empty. Previously wrote a 147 B
  all-zeros status file on every health check for master-plan-free
  projects. `stale-report.json` still records a passing no-op so
  `health-checker` reports a clean result.

- `plan-parser` placeholder filtering regression in sync-checker
  on projects with `<...>` style tokens in plan files.

- `cli.js`: `npx claudeos-core memory --help` now displays the memory
  subcommand help instead of the top-level usage. `parseArgs` previously
  promoted `--help` to a top-level command even when it appeared after a
  command name, so `memory --help` was indistinguishable from `--help`
  alone. The fix: `--help` only becomes the top-level command when no
  other command has been seen yet. `memory --help`, `memory -h` now
  route to the subcommand's own help.

- `memory score`: the first `score` run no longer leaves two `importance`
  lines in each entry. The previous implementation inserted the
  auto-scored line at the top but left the user's original
  `- importance: N` line below it, producing a file with two conflicting
  values per entry. `cmdScore` now strips every importance line
  (bold or plain) before inserting the new auto-scored line, so there is
  always exactly one importance line per entry and repeated `score` runs
  remain idempotent.

- `memory compact`: the Stage 1 summary marker is now a proper markdown
  list item (`- _Summarized on YYYY-MM-DD — original body dropped._`).
  Previously the marker was emitted as a bare italic string without the
  `- ` prefix, which broke the surrounding list in markdown renderers
  and caused `parseEntries` to misclassify it on subsequent compactions.
  The default `fixLine` fallback was also updated to `- (fix omitted)`
  for the same consistency reason.

### Test coverage

- 563 tests pass, 0 skip (3 runs confirmed no flakes). +165 tests vs v2.0.0
  across Pass 3 context builder, output accumulation, batch subdivision,
  master plan removal, scaffoldSkillsManifest, and memory score/compact
  formatting regression suites.

## [2.0.2] — 2026-04-20

### Fixed

- **Upgrade-path silent-skip regression for pre-v2.0.0 projects** — `npx claudeos-core health` permanently reported `content-validator: fail` with 9 × MISSING guide errors on projects that had been initialized on a pre-v2.0.0 release and then upgraded. Pass 3 wrote `pass3-complete.json` before the Pass 3 output-completeness guards (H1/H2) existed, so the marker was valid-looking on disk even though `claudeos-core/guide/` (and sometimes `standard/00.core/01.project-overview.md`, `skills/`, or `plan/`) had never been populated. On subsequent runs, `init.js` observed the marker + an existing CLAUDE.md, skipped Pass 3, and never regenerated the missing outputs — leaving the project in a stuck-fail state that only `--force` (which wipes `.claude/rules/` and loses manual edits) could recover. The Pass 3 stale-marker branch in `bin/commands/init.js` previously only detected externally-deleted CLAUDE.md; it now also drops the marker when any entry in `lib/expected-guides.js` is missing/BOM-aware-empty or when `findMissingOutputs()` (`lib/expected-outputs.js`) flags a missing standard sentinel / `skills/` / `plan/`. Mirrors the existing `dropStalePass4Marker` pattern (symmetric helper `dropStalePass3Marker` added) and reuses the same "unlink failure surfaces as `InitError` with Windows AV/file-lock guidance" contract so the recovery itself can't silently regress. Recovery is one-shot: next `init` re-runs Pass 3, which populates the missing outputs and writes a fresh marker gated by the v2.0.0 H1/H2 guards.

### Added

- **`tests/pass3-marker.test.js`** — Six new cases covering the stale-detection branches: (a) missing guide dir → drop, (b) single BOM-only guide file → drop, (c) guides present but `skills/` gone → drop, (d) guides present but standard sentinel missing → drop, (e) complete state preserves marker, (f) `init.js` source-parity tripwire asserting `dropStalePass3Marker` + both `EXPECTED_GUIDE_FILES` and `findMissingOutputs` references appear in the stale-check region (guards against refactors silently regressing to v2.0.1 behavior).

## [2.0.1] — 2026-04-19

### Fixed

- **CI tests failing on all OS/Node combinations** — `.gitignore` no longer excludes `package-lock.json`. The GitHub Actions workflow uses `actions/setup-node` with `cache: 'npm'` and `npm ci`, both of which require a committed lockfile; without it, all 6 matrix jobs (Ubuntu/macOS/Windows × Node 18/20) failed at the install step with `Dependencies lock file is not found`.
- **`npm test` script not cross-platform** — Changed `node --test tests/*.test.js` → `node --test` in `package.json`. The `*.test.js` glob was expanded by `sh` on Linux/macOS but left literal by `cmd.exe` on Windows runners, causing `Could not find 'D:\a\...\tests\*.test.js'` on all 3 Windows matrix jobs. The `node --test` built-in auto-discovery matches `**/*.test.{cjs,mjs,js}` from cwd (skipping `node_modules`), independent of shell globbing.

### Changed

- **GitHub Actions runner compatibility** — Bumped `actions/checkout@v4` → `@v5` and `actions/setup-node@v4` → `@v5` in `.github/workflows/test.yml`. The `@v4` tags ran on Node.js 20, which GitHub deprecated on 2025-09-19 (forced Node 24 transition on 2026-06-02, full removal on 2026-09-16). The `@v5` tags ship with Node 24 support and clear the deprecation warnings.

## [2.0.0] — 2026-04-19

### Added

- **L4 Memory Layer** — New `claudeos-core/memory/` directory with 4 persistent files:
  - `decision-log.md` — "Why" behind design decisions (append-only, seeded from pass2-merged.json)
  - `failure-patterns.md` — Recurring errors auto-scored by `npx claudeos-core memory score`
  - `compaction.md` — 4-stage compaction strategy with project-specific error categories
  - `auto-rule-update.md` — Rule improvement proposals from `npx claudeos-core memory propose-rules`
- **L4 Memory rules** — New `.claude/rules/60.memory/` directory with 4 rule files (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) instructing when/how to read and write memory files.
- **L4 Common rules** — New `.claude/rules/00.core/51.doc-writing-rules.md` and `.claude/rules/00.core/52.ai-work-rules.md` (frontmatter requirements, hallucination prevention patterns, memory vs rules distinction).
- **AI Work Rules template hardening** — `.claude/rules/00.core/52.ai-work-rules.md` substantially expanded for stack/role/scenario coverage:
  - **New `## Safety & Security` section** (CRITICAL — overrides every other rule in the file): destructive commands (`rm -rf`, `git reset --hard`, `git push --force`, `DROP TABLE`, `npm publish`, migration `down`/`revert`, etc.) require explicit per-command user confirmation (re-confirmed each time, not blanket); secret files (`.env*`, `*.pem`, `*.key`, `id_rsa*`, credentials JSON) referenced by variable name only — never echoed/logged/committed.
  - **17 Hallucination Prevention patterns** (was 13 in v1.x; net +4 after removing 3 redundant). New patterns: hallucinated import (verify package manifest), wrong-version API (verify manifest **and** lockfile — `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`/`gradle.lockfile`/`poetry.lock`/`Pipfile.lock`/`uv.lock`), cross-config drift (env/config family glob across backend `.env*`/`application-*.yml`/`*settings.py` and frontend `environment*.ts`/`next.config.*`/`vite.config.*`/`nuxt.config.*`), server/client component boundary mixing (Next.js App Router `"use client"`, Nuxt server/client composables, Remix `loader`/`action` — N/A for pure SPA/backend), component prop hallucination (read the target's `interface Props`/`defineProps<>`/function signature first), hardcoded secrets (Grep regex `(api[_-]?key|token|password|secret)\s*=\s*["']\w+["']` before commit; use `process.env.X`/`os.getenv("X")`/`@Value("${X}")` instead), historical DB migration editing (Flyway `migrations/V*.sql`, Alembic `alembic/versions/*.py`, Rails `db/migrate/*.rb`, Prisma `prisma/migrations/*/migration.sql`, TypeORM `migrations/*.ts` — append-only once applied; verify with `flyway info`/`alembic history`/`prisma migrate status`).
  - **Backend/frontend balanced examples** throughout — `§ No Unsolicited Work` memory-dedup bullet now lists both backend (port numbers, pool sizes, handler names, transaction propagation modes) and frontend (dev server port, build output dir, env var prefixes `VITE_`/`NEXT_PUBLIC_`/`REACT_APP_`, route definitions, bundle size budgets); `§ Code/Document Generation Accuracy` framework-shape bullet covers backend (DTOs, entity field naming, repository method signatures) and frontend (component prop interfaces, store/state shapes for Pinia/Redux/Zustand, API response types, route param types, CSS module class names).
  - **3 internal contradictions resolved** with Exception clauses — `§1 Accuracy First` "always read directly" narrowed to "always read **critical facts** directly" with sub-agent delegation explicitly allowed for non-critical exploration; `§ No Unsolicited Work` "do not make unsolicited suggestions" gains *Exception: factual errors in this project's own docs (wrong paths, dead references, internally contradicting rules) MUST be reported even if not asked*; "do not directly read internal document directories" gains *Exception: read directly when the user explicitly asks or when debugging requires it*.
  - **`Project Architecture — Hands Off` section** consolidates the previous `3-Layer Design` + `Memory vs Rules` sections (11 bullets → 7) without losing the architectural defenses (cross-layer/same-layer duplication intentional, multi-rule reinforcement, `**/*` paths protection, minor wording differences not "inconsistency").
  - **Empty directory rule softened with marker convention** — intent markers (`.gitkeep`, `KEEP_EMPTY.md`, dir listed in CLAUDE.md as planned, or referenced by an active plan/standard/skills doc) required to qualify as "intentional"; otherwise the AI must ask before deleting. Prevents the previous absolute "all empty dirs are intentional" rule from masking genuine neglect.
  - **Planned reference rule softened** — `§ Planned References` "do not label as missing" gains *Exception: if a referenced path appears in 3+ documents and doesn't exist on disk, flag for human review* (parallel to the factual-error Exception above). Prevents typos from masquerading as planned references.
  - **`Established codebase conventions take precedence over textbook-ideal patterns`** rule added — modernization/refactoring/"current best practices" migration proposals require explicit user request (e.g., "modernize", "migrate to v3"); otherwise follow existing pattern even if a greenfield design would differ.
  - **Neighbor file pattern requirement** — before writing new code, read 2-3 neighboring files in the same directory for existing patterns (naming, error handling, logging, import order, return type idioms, test structure) and match them. Greenfield/textbook idioms come second to in-codebase consistency.
  - **`§ Hallucination Prevention` pattern 7 audience-agnostic** — "code examples in rules are essential" rationale changed from "vibe-coding workflows" (audience-dependent) to "AI-assisted code generation — reduces hallucination risk regardless of audience experience" (universal).
  - **§1 cleanup** — removed `Cross-check agent results against source documents` bullet (now a weaker restatement of the narrowed §1 #2 after Exception additions).
  - **16 regression tests** added to `tests/memory-scaffold.test.js` (21 → 37) pinning the structure (7 sections, 17 patterns, 1..17 numbering continuity), all required tokens (frontend state libs, env prefixes, lockfiles, migration patterns), Exception clauses, and removed-pattern guards to prevent silent reversion.
- **Pass 4 pipeline stage** — Generates L4 Memory scaffolding (memory files, 60.memory rules, doc-writing guide, CLAUDE.md append, master plan `50.memory-master.md`) from pass2-merged.json; Claude-driven with static fallback on failure.
- **New CLI subcommand**:
  - `memory compact | score | propose-rules`
- **Pass 3 completion marker** (`pass3-complete.json`) — Prevents regeneration of CLAUDE.md on subsequent `init` runs.
- **Pass 4 completion marker** (`pass4-memory.json`) — Tracks memory scaffold completion; enables resume/skip behavior across init runs.
- **Stale marker recovery** — Automatically detects and removes stale Pass 3/4 markers when underlying files (CLAUDE.md or memory/) are externally deleted.
- **v1.7.x migration** — Auto-backfills Pass 3 marker when upgrading from v1.7.x with existing CLAUDE.md to prevent overwrite.
- **New verification coverage** — content-validator section [9/9] checks memory scaffold integrity (file presence, entry structure, required fields with fence-aware parsing); pass-json-validator [5a] validates pass3-complete.json and [5b] validates pass4-memory.json.
- **Master plan file** — `plan/50.memory-master.md` aggregates all 4 memory files using `<file path="...">` blocks.
- **New library module** — `lib/memory-scaffold.js` (1006 LOC) containing memory/rule/plan/CLAUDE.md scaffolding with built-in multi-language translation via Claude CLI and strict translation validation (length, headings, code fences, frontmatter, CLI-parsed keywords).
- **Translation cache** — Scaffold translations are cached per-language in `claudeos-core/generated/.i18n-cache-<lang>.json` to avoid repeated Claude CLI calls on subsequent init runs.
- **Confidence scoring rewrite** — `memory propose-rules` replaces v1 saturating formula (`min(1, freq/10 + imp/20)`) with sigmoid on weighted evidence plus anchor-match multiplier (unanchored patterns × 0.6, missing importance caps evidence at 6).
- **Staged-rules workaround for `.claude/` sensitive-path block** — Pass 3 and Pass 4 now write rule files to `claudeos-core/generated/.staged-rules/**` instead of `.claude/rules/**`, because Claude Code's sensitive-path policy refuses direct `.claude/` writes from the `claude -p` subprocess (even with `--dangerously-skip-permissions`). The Node.js orchestrator (not subject to that policy) moves the staged tree into `.claude/rules/` after each pass via `lib/staged-rules.js`, with rename + copy-fallback for Windows cross-volume/overwrite edge cases.
- **`pass-prompts/templates/common/staging-override.md`** — Prepended to Pass 3/4 prompts as an absolute write-target redirect directive (preserves subpaths, leaves prose references and frontmatter `paths:` globs untouched).
- **Pass 3 silent-failure guards** — Four post-generation guards prevent writing `pass3-complete.json` on a partial success. All guards run AFTER the staged-rules move, BEFORE the marker write:
  - **Guard 1 (partial move):** if any staged file failed to move into `.claude/rules/`, throw `InitError` with retry guidance — next `init` re-runs Pass 3 automatically.
  - **Guard 2 (zero rules):** if `.claude/rules/` is empty after the move, treat it as Claude having ignored the `staging-override.md` directive and throw, instructing the user to re-run with `--force`.
  - **Guard 3 (H2 — incomplete guide/):** reject when any of the 9 expected guide files (list in `lib/expected-guides.js`) is missing or empty. Uses BOM-aware emptiness check (`.replace(/^\uFEFF/, "").trim().length === 0`) because `String.prototype.trim` doesn't remove U+FEFF (not in Unicode White_Space) — a BOM-only file would otherwise silently pass.
  - **Guard 3 (H1 — incomplete output):** reject when (a) `claudeos-core/standard/00.core/01.project-overview.md` sentinel is missing/empty, OR (b) `claudeos-core/skills/` has zero non-empty `.md` files, OR (c) `claudeos-core/plan/` has zero non-empty `.md` files. List in `lib/expected-outputs.js`. `database/` and `mcp-guide/` intentionally excluded (content-validator treats them WARNING-level; stacks legitimately skip).
- **Pass 2 resume validation (H3)** — On resume, `pass2-merged.json` is parsed and validated to have ≥5 top-level keys (mirrors `pass-json-validator`'s `INSUFFICIENT_KEYS` threshold) before Pass 2 is skipped. Skeleton `{}` or malformed JSON triggers file deletion + Pass 2 re-run instead of silently poisoning Pass 3's analysis input.
- **Pass 4 marker content validation (M1)** — `isValidPass4Marker` helper validates JSON shape + `passNum === 4` + non-empty `memoryFiles` array in both stale-detection and post-Claude-run gate. Rejects malformed bodies like `{"error":"timeout"}` that Claude could emit on partial failure; previously existence-only check would accept garbage and silently skip Pass 4 forever.
- **`dropStalePass4Marker` helper (M1)** — Pass 4 stale-marker unlink failures now surface as `InitError` with Windows file-lock guidance instead of being swallowed by `catch (_e) { /* ignore */ }`. Previously a locked file (AV scanner / editor holding the handle) would leave the stale marker in place, and the subsequent `fileExists(pass4Marker)` check would accept it → silent Pass 4 skip.
- **Pass 3 stale-marker unlink strictness** — Symmetric with Pass 4 above: `pass3-complete.json` cleanup (when CLAUDE.md is externally deleted) now throws `InitError` on unlink failure instead of being swallowed. Closes the same silent-skip class for Pass 3.
- **`CLAUDEOS_SKIP_TRANSLATION=1` env guard (M2)** — `lib/memory-scaffold.js` `translateIfNeeded()` short-circuits to throw with a clear lang-specific message when this env var is set, before any `claude -p` invocation. Intended as a test-only escape hatch so translation-dependent tests (e.g. `tests/lang-aware-fallback.test.js`) assert the "translation must throw" contract deterministically regardless of whether the `claude` CLI is authenticated in the test env. Strict `=== "1"` check (not truthy-coerce) to avoid surprise-triggering on common env conventions.
- **Early fail-fast for env+lang incompatibility** — `init.js` detects `CLAUDEOS_SKIP_TRANSLATION=1` combined with `--lang ≠ en` at language-selection time and throws `InitError` immediately with remediation (`unset CLAUDEOS_SKIP_TRANSLATION` or `--lang en`). Previously this combination would let the pipeline proceed and crash mid-Pass-4 with a confusing "translation skipped" error deep in the scaffolding stack.
- **CI workflow (M3)** — `.github/workflows/test.yml` runs `npm test` on `ubuntu-latest × windows-latest × macos-latest × Node 18/20` matrix with `CLAUDEOS_SKIP_TRANSLATION=1` set on the test step so translation tests pass without requiring `claude` CLI in the runner. Uses `npm ci` against the committed `package-lock.json`.
- **New shared library modules** — Single sources of truth for Pass 3 output expectations, preventing drift between enforcement and validation:
  - `lib/expected-guides.js` — 9 guide file paths. Imported by `init.js` Guard 3 H2 and `content-validator/index.js` `[5/9]` (no more hardcoded duplicates).
  - `lib/expected-outputs.js` — 3 additional Pass 3 outputs (standard sentinel, `skills/`, `plan/`) with `findMissingOutputs(projectRoot)` + `hasNonEmptyMdRecursive(dir)` helpers (BOM-aware). Imported by `init.js` Guard 3 H1.
- **Async claude execution + progress ticker** — `cli-utils.js` adds `runClaudePromptAsync` (spawn-based, non-blocking; lets a `setInterval` ticker run concurrently with the Claude subprocess) and `runClaudeCapture` (execSync wrapper that captures stdout, used by the translation engine in `memory-scaffold.js`). `init.js` adds `makePassTicker` with three display modes — elapsed-only, file-delta, and fixed-target (`N/M files (P%)`) — driving the per-pass progress line in TTY (`\r`-rewritten) and CI/piped (periodic newlines) environments.
- **`--force` and "fresh" resume cleanup** — Now also wipes `claudeos-core/generated/.staged-rules/` (leftover from a prior crashed Pass 3/4 run) and `.claude/rules/` (so Guard 2's zero-rules detection can't false-negative on stale rules from a previous run); under `"fresh"` mode the `pass3-complete.json` and `pass4-memory.json` markers are also unlinked so both passes re-execute. Manual edits to `.claude/rules/` are lost — acceptable under the explicit `--force`/`fresh` choice.
- **190+ new tests** (296 → 489) — New/expanded suites: `memory-scaffold.test.js`, `memory-command.test.js`, `pass4-prompt.test.js`, `pass3-marker.test.js`, `pass3-guards.test.js` (Guards 1/2 + Guard 3 H1/H2 with BOM coverage), `pass2-validation.test.js` (H3 structural check), `pass4-marker-validation.test.js` (M1 `isValidPass4Marker` + `dropStalePass4Marker` regression guards), `translation-skip-env.test.js` (M2 env guard + M3 CI workflow presence), `staged-rules.test.js`, `lang-aware-fallback.test.js` (sets `CLAUDEOS_SKIP_TRANSLATION=1` at module top to make translation-throw assertions deterministic), `placeholder-substitution.test.js`, plus expansions to existing suites.
- **Progress bar with ETA** — Pass 1/2/3/4 execution shows a progress bar with percentage, elapsed time, and ETA based on average step duration (carried over and extended from v1.7.0; Pass 4 added).
- **Platform/tier-split frontend detection (framework-agnostic)** — `scan-frontend.js` now recognizes `src/{platform}/{subapp}/` layouts where `{platform}` is either a device/target-environment keyword (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) or an access-tier keyword (`admin`, `cms`, `backoffice`, `back-office`, `portal`) — covers English names plus common Korean corporate abbreviations. The short `adm` abbreviation is deliberately excluded as too ambiguous in isolation; projects using `src/adm/` as an admin root should rename to `admin` or wait for the override-file mechanism planned for a future release. Emits one domain per (platform, subapp) pair named `{platform}-{subapp}`, with per-domain counts for `routes`/`components`/`layouts`/`hooks`. Runs as a shared pattern across **all** detected frontends (Angular, Next.js, React, Vue/Nuxt) — the glob uses a multi-extension filter (`{tsx,jsx,ts,js,vue}`) so Angular `.component.ts` files and Vue `.vue` files are captured alongside React `.tsx`. A minimum of 2 source files per subapp is required before a domain is emitted — single-file dirs under a platform root are almost always accidental and would otherwise produce noisy 1-file "domains" in the Pass 1 group plan. Subapp name is always read from the filesystem via `path.basename` at scan time — no project/brand identifiers are hardcoded. Structural dirs (`components`, `hooks`, `layouts`), FSD layers (`widgets`, `features`, `entities`), and framework router dirs (`app`, `pages`, `routes`, `views`, `screens`, `containers`, `modules`, `domains`) are skipped at the subapp level so deeper structures still reach their dedicated scanners. Ambiguous names like `store` are deliberately allowed because e-commerce projects legitimately use them as subapp names. **Behavior note:** the change is additive for projects whose `src/{platform}/{subapp}/` dirs were previously unreachable by the primary/FSD/components scanners — those projects now gain the new domains; projects whose content was already being captured by other scanners see no change (the skip list ensures `src/admin/pages/*`, `src/admin/components/*`, etc. still fall through to their existing scanners).
- **Deep routes-file fallback (Fallback E, framework-agnostic)** — Catches React Router file-routing projects (CRA/Vite + `react-router`) that don't match Next.js `page.tsx` or FSD layouts. When all primary scanners and Fallback A–D return 0, globs `**/routes/*.{tsx,jsx,ts,js,vue}` and groups by the parent-of-`routes` directory name. Also runs across all frontends (Angular/Next/React/Vue), not gated to any single framework. Generic parent names (`src`, `app`, `pages`) are filtered so the fallback emits meaningful feature/subapp names rather than framework-convention placeholders.
- **Shared scanner ignore lists** — `BUILD_IGNORE_DIRS` (node_modules, build, dist, out, .next, .nuxt, .svelte-kit, .angular, .turbo, .cache, .parcel-cache, coverage, storybook-static, .vercel, .netlify) and `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__` dirs) extracted as module-level constants. Both the platform scan and Fallback E consume these so build outputs and test fixtures don't inflate per-domain file counts or create spurious Fallback E hits.
- **Monorepo platform split** — Platform scan now matches three layouts: `src/{platform}/{subapp}/` (standalone), `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace with `src/`), and `{apps,packages}/{platform}/{subapp}/` (workspaces without a `src/` wrapper). Platform segment is located via `parts.findIndex` on the keyword list, so paths like `src/pc/admin/` correctly split into `pc` (platform) + `admin` (subapp) without mistaking the subapp name for another platform keyword.
- **Windows path glob fix across all scanners** — `dirGlobPrefix()` helper extracted to module scope and applied to every `${dir}**/*.ext` pattern (Angular primary + deep fallback, Next/React/Vue primary, FSD, components/*, Fallback C, Fallback D, platform scan). On Windows, glob v10+ returns backslash paths without a trailing slash, so the old `${dir.replace(/\\/g,"/")}**/*.tsx` pattern became `foo**/*.tsx` and only matched one level deep — silently missing nested files like `foo/routes/X.tsx` and (in some cases) spuriously matching sibling directories sharing the same prefix. The helper normalizes to `foo/**/*.tsx`, producing correct matches at any depth. Per-domain file counts may shift slightly in existing projects where this bug was masking under- or over-counts.
- **Skip-list tightening in primary scanners** — To keep deep fallbacks (Angular deep fallback, Fallback C) effective, structural container names now short-circuit the primary scans: `modules`/`features`/`pages`/`views` added to `skipAngularDirs`; `components`/`hooks`/`widgets`/`entities`/`features`/`modules`/`lib`/`libs`/`utils`/`util`/`config`/`types`/`shared`/`common`/`assets` added to the Next/React/Vue `skipPages` list. A path like `src/desktop/app/components/order/` now correctly emits `order` via Fallback C instead of the generic `components` domain from the primary pattern.
- **Project override file `.claudeos-scan.json`** — Optional file at project root allows extending scanner defaults without editing the tool:
  ```json
  {
    "frontendScan": {
      "platformKeywords": ["kiosk"],
      "skipSubappNames": ["legacy"],
      "minSubappFiles": 3
    }
  }
  ```
  All fields additive (user entries extend defaults, never replace). `minSubappFiles` overrides the default `2`. Missing file or malformed JSON silently falls back to defaults. Resolves the `src/adm/` → `admin` rename requirement raised when the `adm` short abbreviation was excluded from the built-in keyword list.

### Changed

- **4-Pass pipeline** — `init` now runs Pass 1 → Pass 2 → Pass 3 → Pass 4 (previously 3-Pass). Init banner updated to `Bootstrap (4-Pass)` and `totalSteps` recomputed as `totalGroups + 3`.
- **Directory count** — `init` now creates 28 directories (previously 26) with `claudeos-core/memory/` and `.claude/rules/60.memory/` added.
- **Verification tools extended** — sync-checker now tracks 7 directories (added `memory/`); manifest-generator scans and indexes the memory layer with `totalMemory` in the summary.
- **content-validator section count** — `[1/8]`–`[8/8]` re-numbered to `[1/9]`–`[9/9]` with a new section `[9/9] claudeos-core/memory/` performing fence-aware structural validation (decision-log heading dates, failure-pattern required fields).
- **CLAUDE.md output** — Pass 4 appends a new `## Memory (L4)` section (the `(L4)` marker is language-independent so the CLI fallback can detect it across all 10 supported languages).
- **Pass-3/Pass-4 prompts** — `pass3-footer.md` and the new `pass4.md` template are now wrapped with the `staging-override.md` directive so Claude redirects all `.claude/rules/` writes to the staging dir without dropping or rewriting prose references.
- **`bin/cli.js`** — `cmdInit` is now `async` and `await`ed; init flow uses the new async claude executor end-to-end so the per-pass tickers actually fire.

### Fixed

- **Glob pattern false-anchoring in memory preservation** — `isPreserved()` and `propose-rules` now skip glob patterns (`**/*`, `src/**/*.java`) when matching rule anchors against pattern bodies; a literal glob inside an entry's Fix line no longer makes every matching low-importance entry permanently preserved.
- **Fence-aware entry parsing** — memory.js `parseEntries()` and content-validator's memory checks now ignore `## ...` lines inside ```` ``` ```` / `~~~` code fences; example markdown inside a decision's body text is no longer parsed as a new entry.
- **Anchored regex for metadata fields** — `parseField()` and `parseDate()` require start-of-line + hyphen prefix for `frequency:` / `last seen:` / `importance:`; verbose prose containing these words (e.g., "set the frequency: 10 in config") is no longer picked up as the entry's meta value.
- **Fix line detection** — matches only `- Fix:` / `- **fix**:` / `- solution:` field format (not arbitrary `fix`/`prefix` substrings); a verbose line containing "fixing" no longer falsely satisfies the Stage 1 fix-line preservation check.
- **Stage 2 duplicate-merge persistence** — merged `frequency` sum and `lastSeen` max are now rewritten back into body lines before serialization; previously the in-memory merge was silently discarded on disk.
- **Stage 3 drop respects anchors** — low-importance aged entries anchored by an active rule path (concrete file path match) are no longer silently dropped.
- **Compaction section preservation** — `memory compact` only replaces the `## Last Compaction` section; user-added content that follows (e.g., project notes) is preserved.
- **Pass 3 marker write validation** — `init` now throws `InitError` if `pass3-complete.json` write fails (previously silently succeeded, causing next run to regenerate CLAUDE.md).
- **Silent Pass 3 marker on incomplete output** — `pass3-complete.json` could be written even when Claude truncated mid-response and `claudeos-core/guide/` was entirely empty (9 files missing). Root cause: step [8] content-validator ran with `ignoreError:true` so the 9 MISSING errors didn't block the "✅ Complete" banner; the next `init` run saw the marker + skipped Pass 3 permanently. Fixed by Guard 3 H2 (see Added). Also covers the same truncation pattern affecting `standard/`, `skills/`, `plan/` via Guard 3 H1.
- **Silent Pass 4 skip on malformed marker** — Claude can emit a partial-failure marker body like `{"error":"timeout"}` that still satisfies `fileExists()`. Previously this gated subsequent runs into skipping Pass 4 forever. Fixed by `isValidPass4Marker` content validation (see Added M1).
- **Silent Pass 3/4 skip on Windows file-lock** — Stale-marker `fs.unlinkSync` calls were wrapped in `catch (_e) { /* ignore */ }`. If antivirus or an editor held the file handle, the unlink threw, was silently swallowed, and the subsequent `fileExists(marker)` check accepted the stale marker → silent pass-skip. Both Pass 3 and Pass 4 now surface unlink failures as `InitError` with actionable "close the editor/AV scanner" guidance (see Added `dropStalePass4Marker` + Pass 3 symmetric fix).
- **Pass 2 resume accepting skeleton `{}`** — `init.js` previously only `fileExists()`-checked `pass2-merged.json` on resume. A prior crashed run that left a skeleton `{}` or malformed JSON would be accepted, poisoning Pass 3's analysis. Fixed by H3 (see Added).
- **Translation fallback safety** — when `--lang` is non-English, translation failures in the static fallback path now throw `InitError` instead of silently writing English content (contradicting the user's `--lang` choice).
- **Translation validation** — memory-scaffold rejects translations that lose ≥40% content length, drop >40% of headings, break code-fence count, lose required CLI-parsed keywords (`frequency:`, `last seen:`, `importance:`, `(L4)`), or break YAML frontmatter markers.
- **Placeholder substitution safety** — Pass 1 prompt placeholder substitution (`{{DOMAIN_GROUP}}`, `{{PASS_NUM}}`) and `injectProjectRoot`'s `{{PROJECT_ROOT}}` substitution both now use replacement functions so `$`, `$1`, `$&`, `$$` in domain names or project paths are preserved as literal characters rather than interpreted as regex back-references (same bug class as v1.6.x's `replaceFileBlock`).
- **Stale `.staged-rules/` from prior crashed runs** — Pass 3 and Pass 4 now wipe any leftover staging directory before running Claude, so a crashed prior run can't smuggle stale rule files into the move step alongside the fresh output.
- **Windows shell-escape warning (DEP0190)** — `runClaudePromptAsync` builds the spawn command as a single string with `shell: true` on Windows (so `claude.cmd`/`.ps1` shims resolve via PATH) and as separate args on Unix (no shell), eliminating Node 18+'s deprecation warning about mixing `shell:true` with an args array. Flags are hardcoded literals — no injection surface either way.
- **Pass 3 skipped under `--force` / "fresh" resume mode** — The v1.7.x→v2.0.0 backfill guard fired whenever `CLAUDE.md + pass2-merged.json` existed and the `pass3-complete.json` marker was missing, even when the marker was missing *because* `--force` or `"fresh"` had just deleted it. The guard re-wrote the marker, Pass 3 was skipped, and the project was left with a stale `CLAUDE.md` alongside freshly-regenerated `pass1/2` artifacts and wiped `.claude/rules/` — which then failed both `sync-checker` (Master Plan orphans) and `content-validator` (missing sections). `init.js` now tracks a `wasFreshClean` flag set by the `--force` and `"fresh"` cleanup branches and gates the backfill with `!wasFreshClean`, so explicit fresh requests always run Pass 3. The existing guard still covers the intended v1.7.x upgrade path. Regression test added in `tests/pass3-marker.test.js`.

### Migration notes

Existing v1.7.x projects are automatically migrated on the first `v2.0.0` `init` run:
- If `CLAUDE.md` and `pass2-merged.json` exist, `pass3-complete.json` is backfilled to preserve the existing `CLAUDE.md`.
- `claudeos-core/memory/` and `.claude/rules/60.memory/` are scaffolded by Pass 4 (or static fallback with Claude-driven translation when `--lang` is non-English).
- A new `## Memory (L4)` section is appended to the existing `CLAUDE.md`.
- No manual steps required.
- To force full regeneration, use `npx claudeos-core init --force`. Note that under v2.0.0, `--force` and `"fresh"` resume mode now also wipe `.claude/rules/` and `claudeos-core/generated/.staged-rules/` — manual edits to existing rule files will be lost. Back them up first if needed.

### Known constraints

- **`claude` CLI is now a hard requirement for non-English languages.** v1.7.x silently fell back to English when translation failed; v2.0.0 throws `InitError` instead. If `--lang` is non-`en`, ensure `claude` is installed and authenticated before running `init`. Use `--lang en` to bypass the translation requirement.
- **`.claude/rules/` writes from Claude `-p` are blocked by Claude Code's sensitive-path policy.** v2.0.0 works around this with the staged-rules mechanism. If you author custom Pass 3/4 prompts, prepend `pass-prompts/templates/common/staging-override.md` so writes are redirected to the staging dir.
- **`CLAUDEOS_SKIP_TRANSLATION=1` is a test-only escape hatch.** It short-circuits `translateIfNeeded()` to throw before invoking `claude -p`. If set in your shell accidentally (e.g. leftover from CI/test setup), `init` will fail fast when `--lang` is non-`en`. Remedy: `unset CLAUDEOS_SKIP_TRANSLATION` or run with `--lang en`. CI workflows can set it to keep translation tests deterministic without installing `claude`.

## [1.7.1] — 2026-04-11

### Added

- **Java scanner unit tests** — New `tests/scan-java.test.js` with 18 tests covering all 5 patterns (A/B/C/D/E), supplementary scan, skip list, root package extraction, MyBatis XML detection, DDD infrastructure/ detection, and full fallback
- **Flask dedicated template** — New `pass-prompts/templates/python-flask/` with pass1/pass2/pass3 prompts tailored for Flask (Blueprint, @app.route, application factory, g/current_app, before_request, WTForms, Flask-SQLAlchemy, Flask-Login, Jinja2); Flask no longer shares python-fastapi template
- **FastAPI/Flask flat project fallback** — `scan-python.js` now detects flat projects with `main.py` or `app.py` at root (or `app/main.py`) when no router files or subdomain structure exists; covers FastAPI official tutorial structure
- **Vite SPA primary path scanning** — `scan-frontend.js` now detects `src/views/*/`, `src/screens/*/`, `src/routes/*/` in primary scan; Vite SPA projects no longer fall through to Fallback D
- **296 tests** (287 → 296) — Added 9 new tests: Flask template selection, flat project fallback (5 cases), Vite SPA primary paths (3 cases)

### Fixed

- **Java scanner Windows path normalization** — `scan-java.js` added `norm()` function and `.map(norm)` to 9 glob calls; regex matching failed on Windows backslash paths for Pattern E (DDD/Hexagonal), root package extraction, and supplementary scan
- **Pattern E missing infrastructure/ detection** — `scan-java.js` Pattern E `mprGlob` now includes `{domain}/infrastructure/*.java` in addition to `adapter/out/{persistence,repository}/`
- **Flask misusing FastAPI template** — `selectTemplates()` now routes `framework: "flask"` to dedicated `python-flask` instead of `python-fastapi`
- **Completion banner alignment** — `Total time:` label spacing fixed to align with other rows

## [1.7.0] — 2026-04-11

### Added

- **Vite SPA support** — Full Vite detection pipeline: `stack-detector.js` detects `vite` from package.json dependencies and `vite.config.ts/js` fallback; `selectTemplates()` routes to dedicated `node-vite` template; `determineActiveDomains()` correctly classifies Vite as frontend-only
- **`node-vite` template** — New `pass-prompts/templates/node-vite/` with pass1/pass2/pass3 prompts tailored for Vite SPA (client-side routing, VITE_ env prefix, Vitest, static hosting deployment — no RSC/Server Actions/next.config)
- **Non-standard nested path scanning** — `scan-frontend.js` now detects pages, components, and FSD layers under `src/*/` paths (e.g., `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **No-hallucination guardrail** — `pass3-footer.md` enforces that Pass 3 may only reference technologies explicitly present in `project-analysis.json` or `pass2-merged.json`; inference from other detected libraries is prohibited
- **Skill orchestrator completeness guardrail** — `pass3-footer.md` enforces that orchestrator execution tables must list all sub-skill files with no gaps in the sequence
- **Progress bar with ETA** — Pass 1/2/3 execution now shows a progress bar with percentage, elapsed time, and estimated remaining time based on average step duration
- **Angular/Next.js default ports** — `defaultPort` logic now assigns 4200 for Angular and 3000 for frontend-only Next.js projects
- **Enriched Node.js scanner** — `scan-node.js` now classifies entities, modules, guards, pipes, and interceptors (NestJS-aware) in addition to controllers/services/dtos
- **Enriched Python scanner** — `scan-python.js` now classifies admin, forms, urls, and tasks (Django/Celery-aware) in addition to views/models/serializers
- **Fastify handler detection** — `scan-node.js` now counts `handler` files as controllers alongside controller/router/route

### Fixed

- **Vite SPA misclassified as Next.js** — `selectTemplates()` now routes `frontend: "react"` + `framework: "vite"` to `node-vite` instead of `node-nextjs`
- **Vite incorrectly assigned backend template** — Backend template fallback (`node-express`) now excludes `framework: "vite"`
- **Vite SPA marked as backend project** — `determineActiveDomains()` now excludes `framework: "vite"` from backend activation
- **Vite default port** — Port 5173 assigned for Vite instead of falling back to 8080
- **Vite triggers unnecessary backend scan** — `structure-scanner.js` now skips Node.js backend scanning when `framework: "vite"`
- **Frontend-only security-db activation** — `determineActiveDomains()` now activates `30.security-db` for frontend-only projects (auth/token/XSS standards are relevant); previously required a backend framework
- **FSD glob deduplication** — `scan-frontend.js` FSD layer scanning now uses Set-based deduplication matching the existing components pattern
- **269 tests** (256 → 269) — Added 13 new tests for Vite detection, template selection, non-standard paths, and active domain classification

## [1.6.2] — 2026-04-09

### Fixed

- **Sync command crash bypass** — `cli.js` sync throw from `cmdHealth`/`cmdValidate`/`cmdRestore`/`cmdRefresh` now correctly caught by `.catch()` handler; previously caused unhandled exception
- **`init.js` group.domains crash** — Null guard added for `group.domains` and `group.estimatedFiles` in domain-groups iteration; prevents TypeError on malformed `domain-groups.json`
- **Kotlin shared query resolution failure** — `scan-kotlin.js` full key (`__` separator) module names now converted back to path form (`/`) before file matching; `resolveSharedQueryDomains` was silently failing to find any files
- **Python scanner Windows glob failure** — `scan-python.js` added `dir.replace(/\\/g, "/")` for Django and FastAPI/Flask glob patterns; Windows `path.dirname` returns backslashes that break glob (same fix `scan-node.js` already had)
- **`prompt-generator.js` langData.labels crash** — Added null guard for `langData.labels` access; prevents TypeError when `lang-instructions.json` has `instructions` but missing `labels` key
- **Plan parser heading description leakage** — `plan-parser.js` `parseCodeBlocks` now strips trailing ` — description` / ` – description` / ` - description` from heading; previously included in `filePath`
- **Content validator regex escape** — `content-validator/index.js` regex character class now correctly escapes `[` and `]`; previously `[` was unescaped, causing runtime error when keyword contains `[`
- **Manifest generator CODE_BLOCK_PLANS count** — `plan-manifest.json` now uses `extractCodeBlockPathsFromFile` for code-block-format plans (e.g., `21.sync-rules-master.md`); `fileBlocks` count was always 0
- **Resume pass1/pass2 inconsistency** — When "continue" is selected but no pass1 files exist while pass2 does, pass2 is now deleted to force re-run; previously new pass1 + stale pass2 caused data mismatch
- **`--force` incomplete cleanup** — Now deletes all `.json` and `.md` files in `generated/` directory (not just pass1/pass2); ensures truly fresh start including stale prompts, manifests, and reports
- **Workspace path without wildcard** — `stack-detector.js` now handles concrete workspace paths (e.g., `packages/backend`) by scanning both direct and child `package.json` files; previously only glob patterns with `*` worked
- **Framework-less Python projects skipped** — `structure-scanner.js` now triggers Python scanner for all `language === "python"` projects; previously required `framework` to be `django`/`fastapi`/`flask`
- **Root directory router.py false domain** — `scan-python.js` now skips `name === "."` when `router.py` is in project root; previously created a domain named `.`
- **Sync checker null sourcePath** — `sync-checker/index.js` now skips mappings with null/undefined `sourcePath`; previously produced `path.join(ROOT, undefined)` = `"ROOT/undefined"`
- **Java Pattern B/D detection instability** — `scan-java.js` `detectedPattern` now determined by majority vote across all domains; previously depended on first `Object.keys` insertion order
- **Duplicate pass1 prompt overwrite** — `prompt-generator.js` deduplicates `activeTemplates` via `Set`; when backend and frontend share the same template, pass1 is generated once instead of being overwritten
- **Health checker stale-report overwrite** — Removed redundant `generatedAt` write that was overwriting `manifest-generator`'s `summaryPatch`; manifest-generator (run as prerequisite) already sets this key
- **Plan validator empty file creation** — `--execute` mode now skips file creation when plan block has empty/whitespace-only content; previously created blank files

## [1.6.1] — 2026-04-09

### Fixed

- **Path traversal hardening (Windows)** — `plan-validator` and `sync-checker` now use case-insensitive path comparison on Windows, preventing UNC/case-mismatch bypass of root boundary check
- **Null pointer crash in `stack-detector.js`** — `readFileSafe()` return value for `pnpm-workspace.yaml` now guarded; prevents crash when file exists but is unreadable
- **Empty pass3 prompt generation** — `prompt-generator.js` now early-returns with warning when pass3 template is missing, instead of silently writing header+footer-only prompt
- **Domain group boundary off-by-one** — `splitDomainGroups` changed `>=` to `>` for file count threshold; groups now fill up to exactly `MAX_FILES_PER_GROUP` (40) instead of flushing one file early
- **Perl regex injection in `bootstrap.sh`** — All placeholder substitution migrated from `perl -pi -e` to Node.js `String.replace()`; eliminates regex special character risk in domain names; `perl` is no longer a prerequisite
- **Flask default port** — `plan-installer` now maps Flask to port 5000 (was falling through to 8080)
- **Health-checker dependency chain** — `sync-checker` is now automatically skipped when `manifest-generator` fails, instead of running against missing `sync-map.json`
- **`pass-json-validator` null template crash** — Added null guard before `typeof` check; `null` no longer passes `typeof === "object"` gate
- **`pass-json-validator` missing backend frameworks** — Added `"fastify"` and `"flask"` to backend framework list; these stacks previously skipped backend section validation
- **Init error messages** — Pass 1/2/3 failure messages now include actionable guidance (check output above, retry with `--force`, verify prompt file)
- **Manifest-generator error context** — `.catch()` handler now prefixes error with tool name
- **Line counting off-by-one** — `statSafe()` and `manifest-generator stat()` no longer count trailing newline as an extra line
- **Windows CRLF drift** — `plan-validator` now normalizes `\r\n` → `\n` before content comparison; prevents false drift on Windows
- **`stale-report.js` mutation** — `Object.assign(ex.summary, patch)` replaced with spread operator to avoid in-place mutation
- **Undefined in sync-checker Set** — Malformed mappings with missing `sourcePath` no longer insert `undefined` into the registered paths Set
- **BOM frontmatter detection** — `content-validator` now strips UTF-8 BOM (`\uFEFF`) before checking `---` frontmatter marker
- **Health-checker stderr loss** — Error output now combines both `stdout` and `stderr` instead of preferring one
- **`bootstrap.sh` exit code preservation** — EXIT trap now captures and restores `$?` instead of always exiting 0
- **`bootstrap.sh` NODE_MAJOR stderr** — `node -e` stderr redirected to `/dev/null` to prevent parse failure from noise

## [1.6.0] — 2026-04-08

### Added

- **JS/TS monorepo support** — Auto-detect `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, `package.json#workspaces`; scan sub-package `package.json` for framework/ORM/DB dependencies; domain scanning covers `apps/*/src/` and `packages/*/src/` patterns
- **NestJS dedicated template (`node-nestjs`)** — Separate analysis prompts for `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, DI container, CQRS, `Test.createTestingModule`; previously shared `node-express` template
- **Vue/Nuxt dedicated template (`vue-nuxt`)** — Separate analysis prompts for Composition API, `<script setup>`, Pinia, `useFetch`/`useAsyncData`, Nitro server routes, `@nuxt/test-utils`; previously shared `node-nextjs` template
- **Elapsed time tracking** — CLI shows per-pass elapsed time and total time in completion banner
- **169 new tests** (87 → 256) — Full coverage for `scan-frontend.js` (4-stage fallback), `scan-kotlin.js` (CQRS, shared query resolution), `scan-node.js`, `scan-python.js`, `prompt-generator.js` (multi-stack), `lang-selector.js`, `resume-selector.js`, `init.js`, `plan-parser.js`, monorepo detection
- **README updates (10 languages)** — Updated all README files (en, ko, zh-CN, ja, es, vi, hi, ru, fr, de) to reflect new stacks table (NestJS/Vue split), monorepo root execution, facade/usecase/orchestrator detection, template structure, 3 new FAQ entries, 256 test count

### Fixed

- **Windows backslash glob in `scan-kotlin.js`** — glob returns backslash paths on Windows, causing multi-module detection to silently fail; added `norm()` normalization (no-op on Unix)
- **Kotlin module key collision** — When same module name exists under different parents (e.g., `servers/command/api-server` + `servers/query/api-server`), both entries now upgrade to full key; `domainMap` merges counts instead of overwriting
- **Java facade/usecase/orchestrator detection** — `scan-java.js` now detects `facade/`, `usecase/`, `orchestrator/` directories as service-layer (previously only `aggregator/`)
- **Verification tools exit code** — 4 tools (`content-validator`, `plan-validator`, `sync-checker`, `pass-json-validator`) now exit(1) on unexpected errors instead of exit(0); `health-checker` wrapped in try/catch

### Changed

- **`lib/plan-parser.js`** (new) — Extracted shared `parseFileBlocks`, `parseCodeBlocks`, `replaceFileBlock`, `replaceCodeBlock`, `CODE_BLOCK_PLANS` from `manifest-generator` and `plan-validator`; eliminates duplicate code across 2 files
- **`lib/stale-report.js`** (new) — Extracted shared `updateStaleReport()` from 6 verification tools; eliminates copy-paste pattern
- **`cli-utils.js`** — `ensureDir` and `fileExists` now delegate to `lib/safe-fs.js` (single source of truth)
- **`prompt-generator.js`** — Removed dead strip regex (no template matched these patterns)
- **`init.js` process.exit refactoring** — `process.exit(1)` replaced with `throw InitError`; `lang-selector.js` and `resume-selector.js` return `null` instead of calling `process.exit()`; all errors handled centrally in `cli.js`

## [1.5.1] — 2026-04-06

### Fixed
- **Remove 13 bare catch blocks** — `catch { }` → `catch (_e) { }` across 9 files; enables error variable access during debugging
- **Windows backslash glob fix (3 locations)** — `scan-frontend.js` missing `dir.replace(/\\/g, "/")` at App/Pages Router (line 63), FSD (line 84), and components (line 98) scans; other locations already had this fix
- **Pattern C flat MyBatis XML detection** — `scan-java.js` xmlGlob now matches flat XML layout (e.g., `mapper/OrderMapper.xml`) in addition to domain subdirectory layout for Pattern C projects
- **Next.js reserved segment false positives** — Added `not-found`, `error`, `loading` to `skipPages` in `scan-frontend.js` to prevent Next.js App Router reserved directories from being detected as domains
- **cap variable shadowing** — Renamed outer-scope `cap` to `capDn` in `scan-java.js` to avoid shadowing the block-scoped `cap` in Pattern C branch

### Changed
- **Gradle DB detection comment** — Added 2-line comment explaining postgres/sqlite exclusion rationale in `stack-detector.js` line 118

## [1.5.0] — 2026-04-05
- feat: initial release claudeos-core v1.5.0