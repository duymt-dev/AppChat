#!/usr/bin/env bash
# Launcher parser tệp đầu vào Trợ lý trên Linux (TIP-023f §2.1, DC-425) — gọi bởi worker ROLE=ai qua PARSER_LAUNCHER:
#   run.sh <node> --permission --allow-fs-read=<bundle dir> <bundle>/parser.cjs ...
# Trần OS cứng: systemd-run service tạm (--pipe --wait: stdin/stdout nối thẳng, mã thoát giữ nguyên; cgroup v2) MemoryMax=128M + MemorySwapMax=0 + TasksMax=8 + CPUQuota=100%, không mạng
# (PrivateNetwork=yes — namespace mạng rỗng), hệ thống tệp chỉ đọc + /tmp riêng, không quyền mới, user dynamic (bundle parser phải
# nằm ngoài /home, vd /opt/appchat — ProtectHome=yes). Đối số do server
# dựng (không ghép từ tên tệp); stdin / stdout đi thẳng (cha giữ trần byte + 30s + giết cả cây). Thiếu systemd-run → thoát 70 để
# worker báo parser_isolation_unavailable, KHÔNG chạy trần.
# Chưa nghiệm thu trên VPS (DC-304) — xem README.md "Kiểm âm".
set -euo pipefail
if ! command -v systemd-run >/dev/null 2>&1; then
  echo "parser launcher: systemd-run not found" >&2
  exit 70
fi
[ "$#" -ge 2 ] || { echo "usage: run.sh <node> <args...>" >&2; exit 64; }
exec systemd-run --quiet --pipe --wait --collect \
  --property=MemoryMax=128M \
  --property=MemorySwapMax=0 \
  --property=TasksMax=8 \
  --property=CPUQuota=100% \
  --property=PrivateNetwork=yes \
  --property=PrivateTmp=yes \
  --property=ProtectSystem=strict \
  --property=ProtectHome=yes \
  --property=NoNewPrivileges=yes \
  --property=DynamicUser=yes \
  --property=RestrictAddressFamilies=AF_UNIX \
  --setenv=NODE_OPTIONS= \
  -- "$@"
