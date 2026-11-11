# Launcher parser trên Windows (TIP-023f §2.1, DC-425) — worker ROLE=ai gọi qua PARSER_LAUNCHER (powershell -NoProfile -NonInteractive
# -WindowStyle Hidden -File run.ps1 <node> <args…>). Chạy parser trong AppContainer không capability (không mạng, chỉ đọc thư mục
# bundle + Node theo ACL của build.ps1) và Job Object 128 MiB / ≤ 8 tiến trình / đóng = giết cây. Thiếu DLL (chưa provision) → thoát 70
# để worker báo parser_isolation_unavailable, KHÔNG chạy trần. Chưa nghiệm thu trên VPS (DC-304) — README.md "Kiểm âm".
$ErrorActionPreference = 'Stop'
$dll = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'AppChat.Parser.dll'
if (-not (Test-Path $dll)) { [Console]::Error.WriteLine('parser launcher: AppChat.Parser.dll missing — run build.ps1 -Apply'); exit 70 }
if ($args.Count -lt 2) { [Console]::Error.WriteLine('usage: run.ps1 <node> <args...>'); exit 64 }
Add-Type -Path $dll
$exe = [string]$args[0]
$rest = [string[]]($args | Select-Object -Skip 1)
exit [AppChat.Parser.Launcher]::Run($exe, $rest, 128MB)
