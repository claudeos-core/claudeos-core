# Documentation

Welcome. This folder is for when you need depth that the [main README](../README.md) doesn't cover.

If you're just trying things out, the main README is enough — come back here when you want to know *how* something works, not just *that* it works.

---

## I'm new — where do I start?

Read these in order. Each one assumes you've read the previous.

1. **[Architecture](architecture.md)** — How `init` actually works under the hood. The 4-pass pipeline, why it's split into passes, what the scanner does before any LLM gets involved. Start here for the conceptual model.

2. **[Diagrams](diagrams.md)** — The same architecture explained with Mermaid pictures. Skim alongside the architecture doc.

3. **[Stacks](stacks.md)** — The 12 supported stacks (8 backend + 4 frontend), how each is detected, what facts the per-stack scanner extracts.

4. **[Verification](verification.md)** — The 5 validators that run after Claude generates docs. What they check, why they exist, and how to read their output.

5. **[Commands](commands.md)** — Every CLI command and what it does. Use as a reference once you know the basics.

After step 5 you'll have the mental model. Everything else in this folder is for specific situations.

---

## I have a specific question

| Question | Read |
|---|---|
| "How do I install without `npx`?" | [Manual Installation](manual-installation.md) |
| "Is my project structure supported?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "Will re-running blow away my edits?" | [Safety](safety.md) |
| "Something broke — how do I recover?" | [Troubleshooting](troubleshooting.md) |
| "Why use this instead of tool X?" | [Comparison](comparison.md) |
| "What's the memory layer for?" | [Memory Layer](memory-layer.md) |
| "How do I customize the scanner?" | [Advanced Config](advanced-config.md) |

---

## All documents

| File | Topic |
|---|---|
| [architecture.md](architecture.md) | The 4-pass pipeline + scanner + validators end-to-end |
| [diagrams.md](diagrams.md) | Mermaid diagrams of the same flow |
| [stacks.md](stacks.md) | The 12 supported stacks in detail |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | The 5 post-generation validators |
| [commands.md](commands.md) | Every CLI command, every flag, exit codes |
| [manual-installation.md](manual-installation.md) | Install without `npx` (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` overrides |
| [safety.md](safety.md) | What gets preserved on re-init |
| [comparison.md](comparison.md) | Scope comparison with similar tools |
| [troubleshooting.md](troubleshooting.md) | Errors and recovery |

---

## How to read this folder

Each doc is written to be **readable on its own** — you don't need to read them in order unless you're doing the new-user path above. Cross-links exist where one concept depends on another.

Conventions used in these docs:

- **Code blocks** show what you'd actually type or what files actually contain. They're not abbreviated unless explicitly noted.
- **`✅` / `❌`** mean "yes" / "no" in tables, never anything more nuanced.
- **File paths** like `claudeos-core/standard/00.core/01.project-overview.md` are absolute from the project root.
- **Version markers** like *(v2.4.0)* on a feature mean "added in this version" — earlier versions don't have it.

If a doc says something is true and you find evidence it isn't, that's a documentation bug — please [open an issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Found something unclear?

PRs welcome on any doc. The docs follow these conventions:

- **Plain English over jargon.** Most readers are using ClaudeOS-Core for the first time.
- **Examples over abstractions.** Show actual code, file paths, command output.
- **Honest about limits.** If something doesn't work or has caveats, say so.
- **Verified against source.** No documenting features that don't exist.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the contribution flow.
