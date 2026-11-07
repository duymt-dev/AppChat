"""Thứ tự thi công các TIP chưa DONE: gộp dòng "Depends on" + khai "integrate A before B" (manifests.py), sắp topo.

python -X utf8 tools/obligations/order.py [--verbose]  → in thứ tự (+ cạnh văn bản bị bỏ)
python -X utf8 tools/obligations/order.py --table    → bảng markdown cho goals/GOAL-RELEASE.md

Cạnh "integrate before" (máy kiểm hai phía) thắng cạnh suy từ văn bản Depends khi mâu thuẫn. Phần Depends sau chữ
"trước" / "before" là TIP đứng SAU, không tính là phụ thuộc. Tie-break: wave trong 02-TASK-GRAPH rồi mã TIP.
"""
import glob, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CP = os.path.join(ROOT, 'coding-packs')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib
manifests = importlib.import_module('manifests')

ID = r'0\d{2}[a-z]?'


def tips():
    out = {}
    for f in glob.glob(os.path.join(CP, 'tips', 'TIP-*.md')):
        m = re.match(r'TIP-(' + ID + r')-', os.path.basename(f))
        if m:
            out[m.group(1)] = f
    return out


def done_set():
    s = open(os.path.join(CP, 'goals', 'GOAL-BACKEND.md'), encoding='utf8').read()
    return {m.group(1) for m in re.finditer(r'^\| (' + ID + r') \| W\d \| DONE', s, re.M)}


def waves():
    s = open(os.path.join(CP, '02-TASK-GRAPH.md'), encoding='utf8').read()
    w = {}
    for l in s.splitlines():
        m = re.match(r'^\| (' + ID + r') \|', l)
        if m:
            mw = re.search(r'\|\s*W(\d)', l)
            w[m.group(1)] = int(mw.group(1)) if mw else 8
    return w


def expand(text):
    ids = set(re.findall(r'(?<![\d.])(' + ID + r')(?![\da-z])', text))
    for a, b in re.findall(r'(?<!\d)(0\d{2})\s*[–-]\s*(0\d{2})(?!\d)', text):
        ids |= {f'{i:03d}' for i in range(int(a), int(b) + 1)}
    return ids


def depends(path):
    """(trước, sau): mã TIP nêu trước chữ "trước/before" là phụ thuộc; ngay sau chữ đó là TIP phải đứng sau."""
    head = open(path, encoding='utf8').read().split('## CONTEXT')[0]
    line = next((l for l in head.splitlines() if re.search(r'Depends on|Phụ thuộc', l)), '')
    parts = re.split(r'(?i)\btrước\b|\bbefore\b', line, maxsplit=1)
    stop = r'(?i)consumes|not prerequisite|no reverse'
    pre = re.split(stop, parts[0])[0]
    post = re.split(stop + r'|\.\s', parts[1])[0] if len(parts) > 1 else ''
    return expand(pre), expand(post)


def build():
    T, done, W = tips(), done_set(), waves()
    pend = sorted(t for t in T if t not in done)
    hard = set()
    for t, peers in manifests.headers().items():
        for _, (a, b) in peers.items():
            if a in pend and b in pend and a != b and '?' not in (a, b):
                hard.add((a, b))
    soft = set()
    for t in pend:
        pre, post = depends(T[t])
        soft |= {(d, t) for d in pre if d in pend and d != t}
        soft |= {(t, d) for d in post if d in pend and d != t}
    return pend, W, hard, soft


def topo(pend, W, edges):
    succ, indeg = collections.defaultdict(set), {t: 0 for t in pend}
    for a, b in edges:
        if b not in succ[a]:
            succ[a].add(b)
            indeg[b] += 1
    key = lambda t: (W.get(t, 8), t)
    ready, out = sorted([t for t in pend if indeg[t] == 0], key=key), []
    while ready:
        t = ready.pop(0)
        out.append(t)
        for b in succ[t]:
            indeg[b] -= 1
            if indeg[b] == 0:
                ready.append(b)
        ready.sort(key=key)
    return out, [t for t in pend if t not in out]


def solve():
    pend, W, hard, soft = build()
    order, stuck = topo(pend, W, hard)
    if stuck:
        raise SystemExit(f'vòng trong cạnh integrate-before: {stuck}')
    edges, dropped = set(hard), []
    for e in sorted(soft):
        trial, st = topo(pend, W, edges | {e})
        if st:
            dropped.append(e)
        else:
            edges.add(e)
    order, _ = topo(pend, W, edges)
    return order, W, dropped, edges


def main():
    order, W, dropped, edges = solve()
    T = tips()
    if '--table' in sys.argv:
        print('| # | TIP | Wave | Trạng thái | Nhánh | SHA | PR |')
        print('|---|-----|------|-----------|-------|-----|----|')
        for i, t in enumerate(order, 1):
            slug = re.match(r'TIP-' + ID + r'-(.*)\.md', os.path.basename(T[t])).group(1)
            print(f'| {i} | [{t}](../tips/{os.path.basename(T[t])}) | W{W.get(t, 8)} | chờ | `tip/{t}-{slug}` | | |')
        return
    print(len(order), 'TIP chưa DONE;', len(edges), 'cạnh thứ tự')
    print(' → '.join(order))
    print(f'bỏ {len(dropped)} cạnh suy từ văn bản Depends vì ngược khai integrate-before (máy kiểm hai phía thắng)')
    if '--verbose' in sys.argv:
        for a, b in dropped:
            print(f'  {a}→{b}')


if __name__ == '__main__':
    main()
