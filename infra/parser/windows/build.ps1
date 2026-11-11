# Provision launcher parser Windows (TIP-023f §2.1, DC-425) — chạy MỘT lần với quyền quản trị trên máy worker ROLE=ai:
#   powershell -ExecutionPolicy Bypass -File build.ps1 -Bundle C:\appchat\worker\dist -Node "C:\Program Files\nodejs"            (plan)
#   powershell -ExecutionPolicy Bypass -File build.ps1 -Bundle C:\appchat\worker\dist -Node "C:\Program Files\nodejs" -Apply     (apply)
# 1) biên dịch JobLimits.cs + AppContainer.cs + Launcher.cs bằng Add-Type (csc có sẵn trong .NET Framework — không gói mới) ra
#    AppChat.Parser.dll cạnh script; 2) tạo hồ sơ AppContainer "AppChat.Parser" (không capability); 3) cấp ACL ĐỌC + THỰC THI cho SID
#    AppContainer trên thư mục bundle parser và thư mục Node (không cấp ghi, không cấp thư mục nào khác). Mặc định chỉ in kế hoạch (DC-304).
param(
  [Parameter(Mandatory = $true)][string]$Bundle,
  [Parameter(Mandatory = $true)][string]$Node,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dll = Join-Path $here 'AppChat.Parser.dll'
$src = @('JobLimits.cs', 'AppContainer.cs', 'Launcher.cs') | ForEach-Object { Join-Path $here $_ }

foreach ($p in @($Bundle, $Node)) { if (-not (Test-Path $p -PathType Container)) { throw "không thấy thư mục $p" } }
if (-not (Test-Path (Join-Path $Bundle 'parser.cjs'))) { throw "thiếu $Bundle\parser.cjs — build worker trước (pnpm --filter @appchat/worker build)" }

Write-Output "plan: biên dịch $($src -join ', ') → $dll"
Write-Output "plan: hồ sơ AppContainer 'AppChat.Parser' (không capability — không mạng)"
Write-Output "plan: ACL (RX) cho SID AppContainer trên $Bundle và $Node"
if (-not $Apply) { Write-Output 'chế độ plan — thêm -Apply để thực hiện'; exit 0 }

Add-Type -Path $src -OutputAssembly $dll -OutputType Library
Add-Type -Path $dll
$sid = [AppChat.Parser.AppContainer]::SidString()
foreach ($p in @($Bundle, $Node)) { & icacls.exe $p /grant "*${sid}:(OI)(CI)(RX)" /T /C | Out-Null; if ($LASTEXITCODE -ne 0) { throw "icacls $p thất bại" } }
Write-Output "đã xong: $dll · AppContainer SID $sid · đặt PARSER_LAUNCHER=$(Join-Path $here 'run.ps1') cho worker ROLE=ai"
