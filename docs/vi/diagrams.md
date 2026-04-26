# Diagrams

Tham chiếu trực quan cho kiến trúc. Tất cả diagram đều dùng Mermaid — tự render trên GitHub. Nếu bạn đang đọc trong viewer không hỗ trợ Mermaid, các giải thích văn bản được viết đầy đủ một cách có chủ đích để đứng độc lập.

Bản chỉ-văn-bản xem [architecture.md](architecture.md).

> Bản gốc tiếng Anh: [docs/diagrams.md](../diagrams.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## Cách `init` hoạt động (mức tổng quan)

```mermaid
flowchart TD
    A["Your source code"] --> B["Step A: Node.js scanner"]
    B --> C[("project-analysis.json<br/>stack + domains + paths<br/>(deterministic, no LLM)")]
    C --> D["Step B: 4-pass Claude pipeline"]

    D --> P1["Pass 1<br/>per-domain analysis"]
    P1 --> P2["Pass 2<br/>cross-domain merge"]
    P2 --> P3["Pass 3 (split into stages)<br/>generate docs"]
    P3 --> P4["Pass 4<br/>memory layer scaffolding"]

    P4 --> E["Step C: 5 validators"]
    E --> F[("Output:<br/>.claude/rules/ (auto-loaded)<br/>standard/ skills/ guide/<br/>memory/ database/ mcp-guide/<br/>CLAUDE.md")]

    style B fill:#cfe,stroke:#393
    style E fill:#cfe,stroke:#393
    style D fill:#fce,stroke:#933
```

**Xanh lá** = code (deterministic). **Hồng** = Claude (LLM). Hai bên không bao giờ chồng lên cùng một công việc.

---

## Pass 3 split mode

Pass 3 luôn tách thành các stage — không bao giờ chạy như một lần gọi duy nhất, bất kể kích thước dự án. Điều này giữ prompt mỗi stage trong context window của LLM ngay cả khi `pass2-merged.json` lớn:

```mermaid
flowchart LR
    A["pass2-merged.json<br/>(large input)"] --> B["Pass 3a<br/>extract facts"]
    B --> C["pass3a-facts.md<br/>(compact summary)"]

    C --> D["Pass 3b-core<br/>CLAUDE.md + standard/"]
    C --> E["Pass 3b-N<br/>per-domain rules"]
    C --> F["Pass 3c-core<br/>skills/ orchestrator + guide/"]
    C --> G["Pass 3c-N<br/>per-domain skills"]
    C --> H["Pass 3d-aux<br/>database/ + mcp-guide/"]

    D --> I["CLAUDE.md<br/>standard/<br/>.claude/rules/<br/>(core only)"]
    E --> J[".claude/rules/70.domains/<br/>standard/70.domains/"]
    F --> K["claudeos-core/skills/<br/>claudeos-core/guide/"]
    G --> L["skills/{type}/domains/<br/>per-domain skill notes"]
    H --> M["claudeos-core/database/<br/>claudeos-core/mcp-guide/"]
```

**Insight then chốt:** Pass 3a đọc input lớn một lần và sản xuất một fact sheet nhỏ. Stage 3b/3c/3d chỉ đọc fact sheet nhỏ, không bao giờ đọc lại input lớn. Điều này tránh các lỗi "Prompt is too long" từng làm phiền các thiết kế non-split trước đây.

Với dự án có 16+ domain, 3b và 3c chia nhỏ hơn nữa thành các batch ≤15 domain mỗi batch. Mỗi batch là một lần gọi Claude riêng với context window mới.

---

## Resume từ chỗ bị gián đoạn

```mermaid
flowchart TD
    A["claudeos-core init<br/>(or rerun after Ctrl-C)"] --> B{"pass1-N.json<br/>marker present<br/>and valid?"}
    B -->|No or malformed| P1["Run Pass 1"]
    B -->|Yes| C{"pass2-merged.json<br/>marker valid?"}
    P1 --> C

    C -->|No| P2["Run Pass 2"]
    C -->|Yes| D{"pass3-complete.json<br/>marker valid?"}
    P2 --> D

    D -->|No or split-partial| P3["Run Pass 3<br/>(resumes from next<br/>unstarted stage)"]
    D -->|Yes| E{"pass4-memory.json<br/>marker valid?"}
    P3 --> E

    E -->|No| P4["Run Pass 4"]
    E -->|Yes| F["✅ Done"]
    P4 --> F

    style P1 fill:#fce
    style P2 fill:#fce
    style P3 fill:#fce
    style P4 fill:#fce
```

Khối hồng = Claude được gọi. Các quyết định hình thoi là kiểm tra hệ thống tệp thuần — chúng xảy ra trước bất kỳ lệnh gọi LLM nào.

Xác minh marker không chỉ là "tệp có tồn tại không?" — mỗi marker có kiểm tra cấu trúc (ví dụ marker của Pass 4 phải chứa `passNum === 4` và mảng `memoryFiles` không rỗng). Marker malformed từ lần chạy trước bị crash sẽ bị từ chối và pass chạy lại.

---

## Luồng verification

```mermaid
flowchart LR
    A["After init completes<br/>(or run on demand)"] --> B["claude-md-validator<br/>(auto-run by init,<br/>or via lint command)"]
    A --> C["health-checker<br/>(orchestrates 4 validators<br/>+ manifest-generator prereq)"]

    C --> D["plan-validator<br/>(legacy, mostly no-op)"]
    C --> E["sync-checker<br/>(skipped if<br/>manifest failed)"]
    C --> F["content-validator<br/>(softFail → advisory)"]
    C --> G["pass-json-validator<br/>(warnOnly → warn)"]

    D --> H{"Severity"}
    E --> H
    F --> H
    G --> H

    H -->|fail| I["❌ exit 1"]
    H -->|warn| J["⚠️ exit 0<br/>+ warnings"]
    H -->|advisory| K["ℹ️ exit 0<br/>+ advisories"]

    style B fill:#cfe,stroke:#393
    style C fill:#cfe,stroke:#393
```

Mức nghiêm trọng ba bậc nghĩa là CI không fail vì warning hay advisory — chỉ fail trên các fail cứng (mức `fail`).

`claude-md-validator` chạy riêng vì các phát hiện của nó là **cấu trúc** — nếu CLAUDE.md bị malformed, đáp án đúng là chạy lại `init`, không phải lặng lẽ warning. Các validator khác chạy như một phần của `health` vì phát hiện của chúng ở mức nội dung (đường dẫn, mục manifest, lỗ hổng schema) — có thể xem xét mà không sinh lại tất cả.

---

## Hệ thống tệp sau `init`

```mermaid
flowchart TD
    Root["your-project/"] --> A[".claude/"]
    Root --> B["claudeos-core/"]
    Root --> C["CLAUDE.md"]

    A --> A1["rules/<br/>(auto-loaded by Claude Code)"]
    A1 --> A1a["00.core/<br/>general rules"]
    A1 --> A1b["10.backend/<br/>if backend stack"]
    A1 --> A1c["20.frontend/<br/>if frontend stack"]
    A1 --> A1d["30.security-db/"]
    A1 --> A1e["40.infra/"]
    A1 --> A1f["50.sync/<br/>(rules-only)"]
    A1 --> A1g["60.memory/<br/>(rules-only, Pass 4)"]
    A1 --> A1h["70.domains/{type}/<br/>per-domain rules"]
    A1 --> A1i["80.verification/"]

    B --> B1["standard/<br/>(reference docs)"]
    B --> B2["skills/<br/>(reusable patterns)"]
    B --> B3["guide/<br/>(how-to guides)"]
    B --> B4["memory/<br/>(L4 memory: 4 files)"]
    B --> B5["database/"]
    B --> B6["mcp-guide/"]
    B --> B7["generated/<br/>(internal artifacts<br/>+ pass markers)"]

    style A1 fill:#fce,stroke:#933
    style C fill:#fce,stroke:#933
```

**Hồng** = Claude Code tự nạp mỗi phiên (bạn không cần nạp thủ công). Mọi thứ khác được nạp theo nhu cầu hoặc tham chiếu từ các tệp tự nạp.

Các tiền tố `00`/`10`/`20`/`30`/`40`/`70`/`80` xuất hiện ở **cả** `rules/` và `standard/` — cùng vùng khái niệm, vai trò khác (rules là chỉ thị được nạp, standards là tài liệu tham chiếu). Tiền tố số cho thứ tự sắp xếp ổn định và để Pass 3 orchestrator có thể đánh địa chỉ các nhóm category (ví dụ 60.memory được Pass 4 ghi, 70.domains được ghi theo batch). Cái thực sự kích hoạt Claude Code tự nạp một rule là glob `paths:` trong YAML frontmatter của nó, không phải số category.

`50.sync` và `60.memory` là **chỉ-rules** (không có thư mục `standard/` tương ứng). `90.optional` là **chỉ-standard** (mở rộng riêng stack, không cưỡng chế).

---

## Tương tác memory layer với phiên Claude Code

```mermaid
flowchart TD
    A["You start a Claude Code session"] --> B{"CLAUDE.md<br/>auto-loaded?"}
    B -->|Yes (always)| C["Section 8 lists<br/>memory/ files"]
    C --> D{"Working file matches<br/>a paths: glob in<br/>60.memory rules?"}
    D -->|Yes| E["Memory rule<br/>auto-loaded"]
    D -->|No| F["Memory not loaded<br/>(saves context)"]

    G["Long session running"] --> H{"Auto-compact<br/>at ~85% context?"}
    H -->|Yes| I["Session Resume Protocol<br/>(prose in CLAUDE.md §8)<br/>tells Claude to re-read<br/>memory/ files"]
    I --> J["Claude continues<br/>with memory restored"]

    style B fill:#fce,stroke:#933
    style D fill:#fce,stroke:#933
    style H fill:#fce,stroke:#933
```

Tệp memory được nạp **theo nhu cầu**, không phải luôn luôn. Điều này giữ context của Claude gọn trong coding bình thường. Chúng chỉ được kéo vào khi glob `paths:` của rule khớp tệp Claude đang chỉnh.

Chi tiết về nội dung mỗi tệp memory và thuật toán compaction xem [memory-layer.md](memory-layer.md).
