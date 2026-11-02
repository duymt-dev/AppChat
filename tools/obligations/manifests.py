"""Gom manifest file (M/C) của mọi TIP chờ: tips/manifests/TIP-*-files.md + bảng M/C nằm trong tips/TIP-*.md.

Dùng: python -X utf8 tools/obligations/manifests.py [TIP ...]   → in số path, path C trùng creator, cặp TIP dùng chung file.
      python -X utf8 tools/obligations/manifests.py --check      → kiểm M path có tồn tại trong repo hoặc do TIP khác tạo (C).
      python -X utf8 tools/obligations/manifests.py --order      → kiểm cặp chung file khai hai phía, cùng thứ tự, không vòng.
"""
import glob, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CP = os.path.join(ROOT, 'coding-packs', 'tips')
ROW = re.compile(r'^\|\s*([MC])\s*\|\s*`([^`]+)`')


def tip_of(path):
    m = re.search(r'TIP-(\d{3}[a-z]?)', os.path.basename(path))
    return m.group(1) if m else None


def load():
    out = collections.defaultdict(dict)
    files = glob.glob(os.path.join(CP, 'manifests', 'TIP-*-files.md')) + glob.glob(os.path.join(CP, 'TIP-*.md'))
    for f in files:
        t = tip_of(f)
        for line in open(f, encoding='utf8'):
            m = ROW.match(line)
            if m:
                out[t].setdefault(m.group(2).strip(), m.group(1))
    return out


def main():
    man = load()
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    creators = collections.defaultdict(list)
    for t, ps in man.items():
        for p, mode in ps.items():
            if mode == 'C':
                creators[p].append(t)
    dup = {p: ts for p, ts in creators.items() if len(ts) > 1}
    if '--check' in sys.argv:
        bad = []
        for t, ps in sorted(man.items()):
            for p, mode in ps.items():
                if mode == 'M' and not os.path.exists(os.path.join(ROOT, p)) and p not in creators:
                    bad.append((t, p))
        print('M path không tồn tại và không TIP nào tạo:', len(bad))
        for t, p in bad:
            print(' ', t, p)
        print('C path trùng creator:', len(dup))
        for p, ts in sorted(dup.items()):
            print(' ', p, ts)
        return
    for t in args or sorted(man):
        ps = man.get(t, {})
        print(f'TIP-{t}: {len(ps)} paths ({sum(1 for v in ps.values() if v == "C")} C)')
        if args:
            for o, ops in sorted(man.items()):
                if o == t:
                    continue
                shared = sorted(set(ps) & set(ops))
                if shared:
                    print(f'  ∩ {o}: {", ".join(shared)}')




HDR = re.compile(r'Parallel-safe with TIP-(\d{3}[a-z]?)\b.*?integrate\s*(?:TIP-)?(\d{3}[a-z]?)\s*before\s*(?:TIP-)?(\d{3}[a-z]?)')
HDR_NO_ORDER = re.compile(r'Parallel-safe with TIP-(\d{3}[a-z]?)\b')


def headers():
    """{tip: {other: (first, second) | ('?', '?')}} từ phần đầu TIP (trước ## CONTEXT).

    Khai có thứ tự: 'Parallel-safe with TIP-X …; integrate A before B'. Khai không chuẩn hoá (TIP 036–043 cũ:
    'integrate sau015b/020b…, trước038…'): TIP được nhắc trong header coi là đã khai, thứ tự kiểm bằng tay.
    """
    out = collections.defaultdict(dict)
    for f in glob.glob(os.path.join(CP, 'TIP-*.md')):
        t = tip_of(f)
        head = open(f, encoding='utf8').read().split('## CONTEXT')[0]
        for line in head.splitlines():
            m = HDR.search(line)
            if m:
                out[t][m.group(1)] = (m.group(2), m.group(3))
        for o in set(re.findall(r'(?<![\d.])(0\d{2}[a-z]?)(?![\da-z])', head)):
            if o != t:
                out[t].setdefault(o, ('?', '?'))
    return out


def order_check(man):
    """Mọi cặp TIP chung file phải khai hai phía, cùng thứ tự; đồ thị thứ tự không có vòng."""
    hdr = headers()
    problems, edges = [], set()
    tips = sorted(man)
    for i, a in enumerate(tips):
        for b in tips[i + 1:]:
            if not set(man[a]) & set(man[b]):
                continue
            oa, ob = hdr.get(a, {}).get(b), hdr.get(b, {}).get(a)
            if not oa or not ob:
                problems.append(f'thiếu khai: {a}↔{b} ({"có" if oa else "không"} ở {a}, {"có" if ob else "không"} ở {b})')
            elif '?' in oa or '?' in ob:
                pass
            elif oa != ob:
                problems.append(f'lệch thứ tự: {a}={oa} {b}={ob}')
            for o in (oa, ob):
                if o and '?' not in o:
                    edges.add(o)
    graph = collections.defaultdict(set)
    for x, y in edges:
        graph[x].add(y)
    state, cycle = {}, []

    def dfs(n, path):
        state[n] = 1
        for m in graph[n]:
            if state.get(m) == 1:
                cycle.append(path + [n, m])
            elif not state.get(m):
                dfs(m, path + [n])
        state[n] = 2

    for n in list(graph):
        if not state.get(n):
            dfs(n, [])
    return problems, edges, cycle


if __name__ == '__main__' and '--order' in sys.argv:
    p, e, c = order_check(load())
    print(f'cạnh thứ tự: {len(e)}; vấn đề: {len(p)}; vòng: {len(c)}')
    for x in p[:80]:
        print(' ', x)
    for x in c[:5]:
        print('  vòng:', ' → '.join(x))


if __name__ == '__main__' and '--order' not in sys.argv and '--sync' not in sys.argv:
    main()


LATE = ('044', '045', '046')


def sync(new_tips):
    """Ghi dòng 'Parallel-safe with' hai phía cho cặp chung file còn thiếu, với TIP mới (new_tips).

    Thứ tự: TIP mới tích hợp SAU mọi TIP chờ cũ (trừ 044/045/046 luôn sau cùng); giữa hai TIP mới theo thứ tự số.
    Thay placeholder @@PEERS@@ trong TIP mới; với TIP cũ chèn ngay sau dòng '## HEADER'.
    """
    man, hdr = load(), headers()
    files = {tip_of(f): f for f in glob.glob(os.path.join(CP, 'TIP-*.md'))}
    add = collections.defaultdict(list)
    for a in sorted(new_tips):
        for b in sorted(man):
            if a == b:
                continue
            shared = sorted(set(man[a]) & set(man[b]))
            if not shared:
                continue
            if b in LATE:
                first, second = a, b
            elif b in new_tips:
                first, second = sorted((a, b))
            else:
                first, second = b, a
            for x, y in ((a, b), (b, a)):
                if y not in hdr.get(x, {}) and (x, y) not in [(p, q) for p, q, _ in add[x]]:
                    sh = ', '.join(f'`{p}`' for p in shared)
                    add[x].append((x, y, f'- **Parallel-safe with TIP-{y} (coverage-closure manifest):** sequential, shares {sh}; integrate {first} before{second}.'))
    for t, items in add.items():
        f = files[t]
        s = open(f, encoding='utf8').read()
        block = '\n'.join(l for _, _, l in items)
        if '@@PEERS@@' in s:
            s = s.replace('@@PEERS@@', block)
        else:
            s = s.replace('## HEADER\n', '## HEADER\n' + block + '\n', 1)
        open(f, 'w', encoding='utf8').write(s)
    for t in new_tips:
        f = files[t]
        s = open(f, encoding='utf8').read()
        if '@@PEERS@@' in s:
            open(f, 'w', encoding='utf8').write(s.replace('@@PEERS@@\n', ''))
    print('dòng header thêm:', sum(len(v) for v in add.values()))


if __name__ == '__main__' and '--sync' in sys.argv:
    sync([a for a in sys.argv[1:] if not a.startswith('--')])
