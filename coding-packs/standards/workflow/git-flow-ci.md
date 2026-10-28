# Workflow — Git flow, Pull Request & CI

> Chốt D40 (2026-10-28). Áp dụng cho mọi TIP / goal, cho cả người và agent.

## 1. Nhánh

```
main   ◀── PR (dev → main) do Chủ nhà tự tạo và merge: phát hành
 ▲
dev    ◀── PR từ nhánh việc (agent / thợ chỉ PR vào đây)
 ▲
tip/<xxx>-<slug> · goal/<slug> · fix/<slug> · chore/<slug> · docs/<slug>   (tách từ dev mới nhất)
```

1. **`main`**: chỉ nhận PR `dev → main`. **Chỉ Chủ nhà** tạo và merge. Agent / thợ **không bao giờ** tạo PR vào `main`, không push thẳng `main`.
2. **`dev`**: nhánh tích hợp. Chỉ nhận PR từ nhánh việc. Không push thẳng.
3. **Nhánh việc**: tách từ `origin/dev` mới nhất, mỗi TIP / goal / bản sửa một nhánh.
   - Tên: `tip/001-scaffold`, `goal/fe-prototype`, `fix/inbox-dedupe`, `chore/ci-cache`, `docs/standards-ci`.
   - Goal dài (ví dụ `goal/fe-prototype`) mở **một PR mỗi pha** (F0, F1, …): pha sau tách lại từ `dev` sau khi PR pha trước đã merge, hoặc tách từ nhánh pha trước nếu Chủ nhà chưa kịp merge (ghi rõ trong PR là xếp chồng).
4. Trước khi mở PR: `git fetch && git rebase origin/dev` (giữ lịch sử thẳng). Không `push --force` lên `dev` / `main`; force-push chỉ cho nhánh việc của chính mình, dùng `--force-with-lease`.

## 2. Commit

- Commit ngay khi một đơn vị việc xong và test phần bị ảnh hưởng đã pass (D39). `git status --short` sạch trước khi báo DONE.
- Message: `<type>(<scope>): <mô tả>` với type ∈ `feat | fix | refactor | test | docs | chore | perf | ci`; scope = domain / module (`inbox`, `web-shell`, `quotes`). Ví dụ `feat(web-inbox): 3 cột + folder rail theo prototype`.
- Dòng cuối là dòng attribution của phiên.
- Không commit: secret, `.env`, file build (`.next/`, `dist/`), kết quả parity (`tests/parity/out/`), `node_modules/`.

## 3. Pull Request (nhánh việc → `dev`)

- Tạo bằng `gh pr create --base dev`. Chưa đăng nhập `gh` thì push nhánh và báo link tạo PR (`https://github.com/<repo>/compare/dev...<branch>`) cho Chủ nhà / Chủ thầu.
- **Tiêu đề:** giống commit message chính. **Thân PR** theo mẫu:

```markdown
## Tóm tắt
- TIP / goal / pha: …
- Việc đã làm: …

## Phạm vi đụng tới
- Package / module: …
- Lớp dùng chung có đổi không: có / không (nếu có: đã chạy `pnpm parity --done`)

## Test (D39 — phần bị ảnh hưởng)
- Lệnh đã chạy + kết quả (N passed / M failed)
- Parity: id → diffRatio · Mobile 390: …
- Không chạy: … (lý do)

## Lệch spec / vấn đề
- …

## Commit
- <SHA> …
```

- Mỗi PR phải xanh CI. PR đỏ thì sửa trên cùng nhánh, không mở PR mới.
- Merge vào `dev`: **squash** cho TIP nhỏ; **merge commit** cho PR một pha của goal (giữ commit từng màn). Người merge PR vào `dev`: Chủ thầu hoặc Chủ nhà (agent không tự merge).
- Xoá nhánh việc sau khi merge.

## 4. CI (GitHub Actions)

File `.github/workflows/`:

| Workflow | Kích hoạt | Job |
|----------|-----------|-----|
| `ci.yml` | `pull_request` vào `dev` / `main`; `push` lên `dev` | **affected**: lint · typecheck · test của package bị đổi + phụ thuộc (`turbo run lint typecheck test --filter=...[origin/<base>]`) · `i18n:check` · `lint:size` |
| `parity.yml` | `pull_request` có đổi `apps/web/**`, `packages/ui/**`, `packages/shared/**`, `tools/parity/**`, `fixtures/prototype-parity/**` | `pnpm parity --changed` (màn của module đổi); đổi lớp dùng chung → `pnpm parity --done`; upload ảnh diff làm artifact |
| `e2e.yml` | như `parity.yml` | `pnpm e2e --changed` (desktop + 390) |
| `full.yml` | `pull_request` vào `main`; `workflow_dispatch`; lịch đêm trên `dev` | toàn bộ: lint · typecheck · test · `parity --all` · `e2e` · build |
| `backend-it.yml` (khi có backend) | `pull_request` có đổi `apps/api`, `apps/worker`, `packages/{core,db,actions,ai,channels,integrations}` | Postgres 16 + pgvector + Redis service; test integration + tenant / role isolation của phần bị đổi |

**Quy tắc chung:**
- Runner `ubuntu-24.04`; Node 24; `pnpm/action-setup` + cache store pnpm; cache `.turbo`.
- Playwright: cài đúng browser Chromium + font Plus Jakarta Sans / JetBrains Mono từ repo (không tải CDN) để kết quả parity ổn định giữa máy.
- `concurrency: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true`.
- Không secret thật trong CI frontend (mock transport). Backend IT dùng secret test riêng.
- CI không được tự sửa code, không tự commit.

**Branch protection** (Chủ nhà bật trên GitHub):
- `dev`: bắt buộc PR, bắt buộc `ci` (+ `parity`, `e2e` khi chạy) xanh, không push thẳng, không force-push.
- `main`: bắt buộc PR từ `dev`, bắt buộc `full` xanh, chỉ Chủ nhà merge.

## 5. Việc của agent / thợ khi xong một đơn vị việc

1. Test phần bị ảnh hưởng (D39) → commit.
2. Cập nhật report (`coding-packs/reports/*`) kèm SHA.
3. Hết pha / hết TIP: chạy full một lần → `git rebase origin/dev` → push nhánh → `gh pr create --base dev` theo mẫu §3.
4. **Không** merge PR, **không** PR vào `main`, **không** sửa branch protection.
