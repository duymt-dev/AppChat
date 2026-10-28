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
├── 00-PROJECT-CONTEXT.md             # Scan Report + Vision
├── 01-REQUIREMENTS-MATRIX.md         # Requirements traceability (/vibecode:rri)
├── 02-TASK-GRAPH.md                  # Task dependency graph (/vibecode:blueprint)
├── BUILDER-HANDOFF.md                # Builder instructions (/vibecode:blueprint)
├── docs/                             # Tài liệu kỹ thuật đã phân loại (xem docs/README.md)
├── product/                          # mission · roadmap · tech-stack
├── plans/                            # Implementation plans
├── reports/                          # Completion + verify reports
└── tips/                             # TIP files (/vibecode:tip)
```

## Tech Stack (target — confirm in RRI)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + React + TypeScript strict |
| Backend | NestJS (TypeScript), modular monolith + worker processes |
| Database | PostgreSQL 16 + RLS (`workspace_id`) + pgvector |
| Cache / Queue | Redis (+ BullMQ) |
| Realtime | WebSocket (+ SSE fallback) |
| Storage | S3-compatible |
| LLM | Đa nhà cung cấp (Claude / GPT / Gemini / DeepSeek) qua LLM Router; Agent Gateway + Vercel AI SDK v7 (Vision V3) |

## Source Documents

- Scan Report: `00-PROJECT-CONTEXT.md`
- Requirements: `01-REQUIREMENTS-MATRIX.md`
- Technical specs: `docs/` (xem `docs/README.md`) · Brand/marketing: `../specs/` — see "Nguồn tài liệu & thứ tự ưu tiên" in `00-PROJECT-CONTEXT.md`

---

*Generated: 2026-10-27 | Framework: Vibecode Kit v5.0 | Project: AppChat*
