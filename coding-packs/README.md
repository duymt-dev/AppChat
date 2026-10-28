# AppChat Coding Packs — Vibecode Kit v5.0

> AI Quality Command Center — Coding Packs for AppChat (Giải pháp One-Person Company)
> Greenfield rebuild from `docs/` (technical specs) with Next.js + NestJS. Generated from Vibecode Kit v5.0 framework.

## How to Use

### Power Triangle

```
CON NGUOI (Chu nha)          ← You: Approve, decide, relay
      |
  ----+----
  |        |
CLAUDE CHAT               CLAUDE CODE
(Chu thau)                (Tho thi cong)
Design, interview         Implement TIPs
Orchestrate              Self-test, report
```

### Workflow

1. **Read `00-PROJECT-CONTEXT.md`** — Understand project context (scan report, source-of-truth order, risks)
2. **Read `02-TASK-GRAPH.md`** — See task dependencies + sequence
3. **Pick a TIP** from `tips/` folder (follow dependency order)
4. **Paste TIP into Claude Code** — Builder implements it
5. **Builder returns Completion Report** — Relay to Architect
6. **Repeat** until all TIPs done

## File Structure

```
coding-packs/
├── README.md                         # This file
├── 00-PROJECT-CONTEXT.md             # Scan Report + Vision (đã duyệt)
├── 01-REQUIREMENTS-MATRIX.md         # RRI: REQ A–N, Decisions D01–D36, Open Questions
├── 02-TASK-GRAPH.md                  # 46 TIP / 9 wave, song song, bản đồ sở hữu file, cổng tài nguyên
├── BUILDER-HANDOFF.md                # Paste đầu mỗi phiên build
├── plans/BLUEPRINT.md                # Khế ước kiến trúc (ĐÃ DUYỆT 2026-10-28)
├── plans/COMMERCE-DECISIONS.md       # Quy tắc nghiệp vụ commerce đã chốt
├── standards/                        # 16 chuẩn code (xem standards/README.md)
├── docs/                             # Tài liệu kỹ thuật + prototype (docs/06-prototype/AppChat.dc.html)
├── product/                          # mission · roadmap · tech-stack
├── reports/                          # Completion + verify reports
└── tips/                             # TIP files (/vibecode:tip, sinh theo từng wave)
```

## Tech Stack (đã chốt)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + TypeScript strict · Ant Design v6 + Ant Design X · TanStack Query · next-intl (vi + en) · một codebase desktop + mobile web, parity prototype < 5% |
| Backend | NestJS modular monolith (api) + worker `ROLE=channels \| ai \| jobs` · BullMQ + outbox |
| Database | PostgreSQL 16 — DB nền tảng + **database riêng mỗi workspace** · Prisma (2 client) · pgvector · PgBouncer |
| Cache / Queue | Redis (dev: Memurai) |
| Realtime | Socket.IO (`/ws`, `/widget`) |
| AI | Vercel AI SDK v7 + Agent Gateway tự viết · provider gốc + router OpenAI-compatible (OpenRouter, 9router…) |
| Tích hợp | Brevo · SePay / Casso · VietQR · zca-js · connector registry (MISA, Mắt Bão, VNPT, Viettel, sàn TMĐT… "Sắp có") |
| Hạ tầng | Native Ubuntu VPS (không Docker): nginx, systemd + PM2, Prometheus / Grafana / Loki, pgBackRest |

## TIP Execution Order

| Wave | TIP |
|------|-----|
| W1 | 001 Scaffold → 002 DB nền tảng + tenant → 003 Action kernel + API core |
| W2 | 004 Identity · 005 Authz · 006 Realtime ∥ 007 Web foundation · 008 Parity tooling |
| W3 | 009 Billing core · 010 Billing payments · 011 Auth & onboarding UI · 012 Integrations · 013 Settings |
| W4 | 014 Channels + Zalo · 015 CRM core · 016 Inbox backend · 017 Web widget · 018 Email |
| W5 | 019 AI runtime · 020 RAG · 021 Agents backend · 022 Agent trực kênh |
| W6 | 023 Trợ lý AI · 024 Agents UI + duyệt · 025 Inbox UI · 026 Khách hàng UI · 027 Catalog · 028 Mẫu chứng từ |
| W7 | 029 Báo giá · 030 Hợp đồng + ký · 031 Đơn + đồng bộ sàn · 032 Thu tiền · 033 Lịch hẹn |
| W8 | 034 Ticket/SLA · 035 Tác vụ tự chủ · 036 Loyalty · 037 Marketing · 038 Tổng quan · 039 Gói & ví UI · 040 Quản trị · 041 Lưu trữ workspace · 042 Vai trò tuỳ biến · 043 AI học từ hội thoại |
| W9 | 044 AI eval gate · 045 Hạ tầng production · 046 Release hardening |

Chi tiết phụ thuộc, ước lượng và cổng tài nguyên: `02-TASK-GRAPH.md`.

## Source Documents

- Scan + Vision: `00-PROJECT-CONTEXT.md` · Requirements: `01-REQUIREMENTS-MATRIX.md`
- Blueprint: `plans/BLUEPRINT.md` · Commerce: `plans/COMMERCE-DECISIONS.md` · Standards: `standards/README.md`
- Technical specs: `docs/` (xem `docs/README.md`) · Prototype: `docs/06-prototype/AppChat.dc.html` · Brand/marketing: `../specs/`

---

*Updated: 2026-10-28 | Framework: Vibecode Kit v5.0 | Project: AppChat*
