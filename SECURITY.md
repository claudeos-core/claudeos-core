# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 2.4.x   | :white_check_mark: |
| < 2.4   | :x:                |

Only the latest minor release line receives security fixes. Users on older versions are encouraged to upgrade.

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Two private channels are available:

1. **Email** — `claudeoscore@gmail.com`
2. **GitHub Security Advisories** — [Open a private report](https://github.com/claudeos-core/claudeos-core/security/advisories/new) (preferred; provides a private workspace + CVE coordination)

### What to include

- Affected version (`npx claudeos-core --version`)
- Reproduction steps or proof-of-concept
- Impact assessment (data exposure / code execution / DoS / etc.)
- Suggested fix (if any)

### Response timeline

| Stage              | Target  |
|--------------------|---------|
| Initial reply      | 48 hours |
| Triage + severity  | 7 days   |
| Fix or mitigation  | 30 days for high/critical, 90 days for medium/low |

We will keep you informed throughout the process and credit you in the release notes (unless you prefer to remain anonymous).

## Scope

In scope:

- The `claudeos-core` npm package and its CLI (`bin/cli.js`)
- The 4-Pass pipeline orchestrator (`bin/commands/init.js`)
- All validators (`claude-md-validator/`, `content-validator/`, `pass-json-validator/`)
- Generated artifacts (CLAUDE.md, rules, skills, guides) when produced by an unmodified release

Out of scope:

- Vulnerabilities in third-party dependencies (please report upstream; we will track and update)
- The `claude` CLI itself (report to Anthropic)
- User-modified template forks
