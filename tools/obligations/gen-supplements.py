"""Sinh TIP bổ sung từ file dữ liệu (dict T trong các module Python) — dùng cho đợt đóng lỗ hổng câu A.

python -X utf8 tools/obligations/gen-supplements.py tools/obligations/supplements/supp_*.py

Mỗi mục T['0XXy'] = dict(slug, title, parent, module, pri, est, deps, rows, context, std, review, task, spec[(tiêu đề, [ý])],
ac[(given/when, then)], cmds, cons, files[(M|C, path, việc)]). Module có thể có EXTRA = {tip: dict(rows, spec, ac, files)} bổ sung
vào TIP đã khai ở module khác. Script ghi: tips/TIP-<id>-<slug>.md, tips/manifests/TIP-<id>-files.md, gán owner trong
tools/obligations/parts, thêm dòng 02-TASK-GRAPH.md và đoạn "Bổ sung" ở reports/TIP-<parent>-completion.md (idempotent).
Header "Parallel-safe" hai phía do `manifests.py --sync` ghi sau khi mọi manifest đã có.
"""
import glob, importlib.util, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CP = os.path.join(ROOT, 'coding-packs')
DATE = '2026-11-02'


def load(paths):
    tips, extra = {}, {}
    for p in paths:
        spec = importlib.util.spec_from_file_location(os.path.basename(p)[:-3], p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        tips.update(m.T)
        for k, v in getattr(m, 'EXTRA', {}).items():
            extra.setdefault(k, []).extend(v if isinstance(v, list) else [v])
    for k, vs in extra.items():
        t = tips[k]
        for v in vs:
            t['rows'] += v.get('rows', [])
            if 'spec' in v:
                t['spec'].append(v['spec'])
            t['ac'] += v.get('ac', [])
            t['files'] += v.get('files', [])
    return tips


def render(tid, t):
    n_c = sum(1 for f in t['files'] if f[0] == 'C')
    out = [f"# TIP-{tid} — {t['title']}", '', '## HEADER',
           f"- TIP-ID: TIP-{tid}; Project: AppChat V2; Module: {t['module']}; Priority: {t['pri']}; Estimated: {t['est']}. TIP bổ sung cho TIP-{t['parent']} (đã DONE, không sửa file gốc — DC-233).",
           f"- Depends on: {t['deps']}",
           f"- **Files touched:** [exact M/C manifest](manifests/TIP-{tid}-files.md) — {len(t['files'])} paths ({n_c} C). M path tương lai phải do TIP tạo trước tích hợp xong.",
           '- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).',
           '@@PEERS@@',
           f"- **Dòng COVERAGE nhận:** {'; '.join(t['rows'])}.", '', '## CONTEXT',
           f'- Hiện trạng đối chiếu mã {DATE} (file:dòng, không tin trạng thái DONE):']
    out += [f'  - {c}' for c in t['context']]
    out += ['', '## APPLICABLE STANDARDS', f"- {t['std']}", '- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.', '',
            '## Rà trước khi làm',
            '1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.',
            f"2. `python -X utf8 tools/obligations/manifests.py {tid}` tính lại giao file; thêm path thì cập nhật manifest + header hai phía."]
    out += [f'{i + 3}. {r}' for i, r in enumerate(t['review'])]
    out += ['', '## TASK', t['task'], '', '## SPECIFICATIONS']
    for i, (h, items) in enumerate(t['spec'], 1):
        out.append(f'### {i}. {h}')
        out += [f'{j}. {x}' for j, x in enumerate(items, 1)]
    out += ['', '## ACCEPTANCE CRITERIA', '|AC|Given / When|Then — bằng chứng|', '|---|---|---|']
    out += [f'|{i}|{a}|{b}|' for i, (a, b) in enumerate(t['ac'], 1)]
    out += ['', '### Commands / evidence gate'] + [f'- `{c}`' for c in t['cmds']]
    out += ['- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.', '',
            '## CONSTRAINTS'] + [f'- {c}' for c in t['cons']]
    out += ['- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.', '',
            '## Quality Gate',
            f"- Manifest {len(t['files'])} path, header khai hai phía, {len(t['ac'])} AC đo được. Viết {DATE} trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-{DATE}.md`. Chưa code / chưa runtime.", '',
            '## ⚠️ BUILDER-CHECKLIST', '- [ ] Rà trước khi làm xong; manifest khớp.', '- [ ] Mọi AC có test chạy thật, dán output.',
            '- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.', '- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.', '']
    return '\n'.join(out)


def manifest(tid, t):
    out = [f'# TIP-{tid} — exact file manifest', '', 'M modify, C create. Không wildcard; test file riêng.', '', '| Mode | Exact file | Responsibility |', '|---|---|---|']
    out += [f'| {m} | `{p}` | {r} |' for m, p, r in t['files']]
    return '\n'.join(out) + '\n'


def set_owner(rows, tid):
    hit = set()
    for f in glob.glob(os.path.join(ROOT, 'tools/obligations/parts/part-*.md')):
        lines = open(f, encoding='utf8').read().split('\n')
        changed = False
        for i, l in enumerate(lines):
            if not l.startswith('|'):
                continue
            c = l.strip().strip('|').split('|')
            if len(c) >= 6 and c[0].strip() in rows:
                own = c[3].strip()
                if own in ('—', '-', ''):
                    c[3] = f' {tid} '
                elif tid not in own:
                    c[3] = f' {own}, {tid} '
                if f'TIP-{tid}' not in c[5]:
                    c[5] = f' {c[5].strip()}; TIP-{tid} nhận ({DATE}) '
                lines[i] = '|' + '|'.join(c) + '|'
                changed = True
                hit.add(c[0].strip())
        if changed:
            open(f, 'w', encoding='utf8').write('\n'.join(lines))
    return set(rows) - hit


def graph_row(tid, t):
    p = os.path.join(CP, '02-TASK-GRAPH.md')
    s = open(p, encoding='utf8').read()
    if f'| {tid} |' in s:
        return
    row = (f"| {tid} | [{t['title']}](tips/TIP-{tid}-{t['slug']}.md): bổ sung TIP-{t['parent']} | {t['deps']} | {t['pri']} | {t['est']} | W8 bổ sung | "
           f"{', '.join(t['rows'])} | {t['std'].split(';')[0]} |")
    anchor = s.index('\n| 044 |')
    s = s[:anchor] + '\n' + row + s[anchor:]
    open(p, 'w', encoding='utf8').write(s)


def completion(tid, t):
    p = os.path.join(CP, 'reports', f"TIP-{t['parent']}-completion.md")
    if not os.path.exists(p):
        return f'thiếu report TIP-{t["parent"]}'
    s = open(p, encoding='utf8').read()
    if f'TIP-{tid}' in s:
        return None
    s = s.rstrip('\n') + (f"\n\n## Bổ sung — TIP-{tid} ({DATE})\n\nNghĩa vụ chưa đạt của TIP này chuyển sang "
                          f"[TIP-{tid}](../tips/TIP-{tid}-{t['slug']}.md): {', '.join(t['rows'])}. File TIP gốc không sửa (DC-233).\n")
    open(p, 'w', encoding='utf8').write(s)


def main():
    tips = load(sys.argv[1:])
    for tid, t in tips.items():
        path = os.path.join(CP, 'tips', f"TIP-{tid}-{t['slug']}.md")
        old = open(path, encoding='utf8').read() if os.path.exists(path) else None
        body = render(tid, t)
        if old and '@@PEERS@@' not in old:
            # giữ header hai phía đã đồng bộ
            peers = '\n'.join(l for l in old.splitlines() if l.startswith('- **Parallel-safe with TIP-'))
            body = body.replace('@@PEERS@@', peers or '@@PEERS@@')
        open(path, 'w', encoding='utf8').write(body)
        open(os.path.join(CP, 'tips', 'manifests', f'TIP-{tid}-files.md'), 'w', encoding='utf8').write(manifest(tid, t))
        miss = set_owner(t['rows'], tid)
        graph_row(tid, t)
        err = completion(tid, t)
        print(tid, len(t['files']), 'paths', ('missing rows: ' + ', '.join(sorted(miss))) if miss else '', err or '')


if __name__ == '__main__':
    main()
