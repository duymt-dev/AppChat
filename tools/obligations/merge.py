import io, re, os, collections
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parts'))
PARTS = [
    ('part-req-ae.md', 'A. Yêu cầu REQ-A…E (01-REQUIREMENTS-MATRIX)'),
    ('part-req-fn.md', 'B. Yêu cầu REQ-F…N (01-REQUIREMENTS-MATRIX)'),
    ('part-decisions-commerce.md', 'C. Quyết định D01–D59, DC-xxx + luật COMMERCE-DECISIONS'),
    ('part-blueprint.md', 'D. BLUEPRINT (§3 action / policy / quyền, §4 API, §5 AI, §6, §8–§11)'),
    ('part-standards.md', 'E. standards/*'),
    ('part-prototype.md', 'F. Prototype in-scope — nút / màn FE giả hoặc thiếu'),
    ('part-deferred.md', 'G. Mục "để sau / hoãn / chưa" trong reports/ + QUESTIONS / DEVIATIONS còn mở'),
]
STATUSES = ['ĐẠT', 'MỘT PHẦN', 'GIẢ', 'CHỜ-TK', 'CHƯA', 'NGOÀI', 'QUY-TẮC']
sections, total, gaps, notes = [], collections.Counter(), [], []
for fn, title in PARTS:
    lines = io.open(fn, encoding='utf-8').read().split('\n')
    rows = [l for l in lines if l.startswith('| ') and not l.startswith('| ID ') and not re.match(r'^\|[-\s|]+\|$', l)]
    tail = [l for l in lines if l.strip() and not l.startswith('|')]
    c = collections.Counter()
    for r in rows:
        cols = [x.strip() for x in r.strip('|').split('|')]
        if len(cols) < 6:
            continue
        st = next((s for s in STATUSES if cols[4].startswith(s)), cols[4])
        c[st] += 1
        tip = cols[3]
        if st in ('CHƯA', 'GIẢ', 'MỘT PHẦN') and tip in ('—', '-', ''):
            gaps.append((cols[0], st, cols[1][:150], title[:1]))
    total.update(c)
    sections.append((title, rows, c, tail))
out = []
out.append('# COVERAGE — sổ phủ nghĩa vụ (bản nháp 1, 2026-11-01)\n')
out.append('> Thước đo hoàn thành của phần còn lại (DC-233): mỗi nghĩa vụ trong tài liệu một dòng — nguồn · TIP nhận · trạng thái · bằng chứng code. '
           'Dựng bằng 7 lượt rà đối chiếu code (không tin trạng thái DONE). **Bản nháp:** các lượt rà dừng sớm theo lệnh Chủ nhà (hết quota) — mục "Chưa rà hết" cuối mỗi phần liệt kê chỗ chưa đối chiếu sâu. '
           'Công cụ ở `tools/obligations/` (xem `README.md` ở đó): `actions.mjs`, `routes.mjs` sinh dữ liệu tự động; các phần rà ở `parts/part-*.md`; `merge.py` gộp thành file này — sửa phần rồi chạy lại, không sửa tay file này.\n')
out.append('## Quy ước trạng thái\n')
out.append('`ĐẠT` có code + test (bằng chứng file:dòng) · `MỘT PHẦN` có code nhưng thiếu ý · `GIẢ` chỉ chạy nhờ mock / regex / `message.info` do code · `CHỜ-TK` code xong, thiếu tài khoản provider thật (Q) · `CHƯA` chưa có code · `NGOÀI` loại khỏi phạm vi có mã quyết định · `QUY-TẮC` luật quy trình kiểm bằng lint / CI.\n')
out.append('**Lỗ hổng** = dòng `CHƯA` / `GIẢ` / `MỘT PHẦN` mà cột TIP nhận là `—`. Goal viết TIP xong khi không còn lỗ hổng.\n')
out.append('## Tổng\n')
out.append('| Phần | ' + ' | '.join(STATUSES) + ' | Lỗ hổng |')
out.append('|---|' + '---|' * (len(STATUSES) + 1))
gapc = collections.Counter(g[3] for g in gaps)
for title, rows, c, _ in sections:
    out.append(f'| {title} | ' + ' | '.join(str(c[s]) for s in STATUSES) + f' | {gapc[title[:1]]} |')
out.append('| **Tổng** | ' + ' | '.join(f'**{total[s]}**' for s in STATUSES) + f' | **{len(gaps)}** |\n')
out.append(f'## Lỗ hổng chưa có TIP nhận ({len(gaps)})\n')
out.append('Danh sách để bước 2 (viết TIP) gán chủ. Chi tiết + bằng chứng ở dòng cùng ID trong phần tương ứng.\n')
out.append('| ID | Trạng thái | Nghĩa vụ | Phần |')
out.append('|---|---|---|---|')
for g in gaps:
    out.append(f'| {g[0]} | {g[1]} | {g[2]} | {g[3]} |')
out.append('')
for title, rows, c, tail in sections:
    out.append(f'## {title}\n')
    out.append('| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |')
    out.append('|---|---|---|---|---|---|')
    out.extend(rows)
    if tail:
        out.append('\n**Ghi chú / chưa rà hết:**\n')
        out.extend('- ' + t.lstrip('-* ').strip() for t in tail if not t.startswith('#'))
    out.append('')
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'coding-packs', 'COVERAGE.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print('rows', sum(total.values()), dict(total), 'gaps', len(gaps), dict(gapc))
