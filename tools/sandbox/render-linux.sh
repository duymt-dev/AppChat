#!/usr/bin/env bash
# Launcher cô lập đổi DOCX → PDF trên VPS Linux (TIP-030b spec 6, DC-321). Gọi: render-linux.sh <soffice> <thư-mục-tạm> <giây>.
# Chạy soffice trong unit systemd tạm (systemd-run) dưới user hạn chế `appchat-render` (tạo bằng infra/provision — README):
#   PrivateNetwork=yes (không mạng) · NoNewPrivileges=yes · ProtectSystem=strict · ProtectHome=yes · PrivateTmp=yes
#   ReadWritePaths chỉ thư mục tạm của lần đổi · MemoryMax=1G · TasksMax=64 · RuntimeMaxSec=<giây>.
# Không tự leo quyền, không đổi tường lửa / dịch vụ. Hết giờ → systemd giết cả unit; mã 124 = timeout.
set -euo pipefail
SOFFICE="$1"
ROOT="$2"
SECS="${3:-60}"
case "$ROOT" in /tmp/appchat-isolated-*|"${TMPDIR:-/tmp}"/appchat-isolated-*) ;; *) echo "thư mục tạm không hợp lệ" >&2; exit 2 ;; esac
[ -f "$ROOT/in.docx" ] || { echo "thiếu in.docx" >&2; exit 2; }
RENDER_USER="${RENDER_USER:-appchat-render}"
id "$RENDER_USER" >/dev/null 2>&1 || { echo "chưa provision user $RENDER_USER" >&2; exit 3; }
chown -R "$RENDER_USER" "$ROOT"
set +e
systemd-run --quiet --wait --collect --pipe \
  --uid="$RENDER_USER" \
  -p PrivateNetwork=yes -p NoNewPrivileges=yes -p ProtectSystem=strict -p ProtectHome=yes -p PrivateTmp=yes \
  -p ReadWritePaths="$ROOT" -p MemoryMax=1G -p TasksMax=64 -p RuntimeMaxSec="$SECS" \
  -p RestrictAddressFamilies=AF_UNIX -p LockPersonality=yes -p CapabilityBoundingSet= \
  -E HOME="$ROOT" \
  "$SOFFICE" --headless --norestore --nolockcheck "-env:UserInstallation=file://$ROOT/profile" \
  --convert-to pdf:writer_pdf_Export --outdir "$ROOT/out" "$ROOT/in.docx"
CODE=$?
set -e
# systemd-run trả 1 khi unit bị giết do RuntimeMaxSec — phân biệt bằng việc không có tệp ra.
if [ $CODE -ne 0 ] && [ ! -f "$ROOT/out/in.pdf" ]; then exit 124; fi
exit $CODE
