# Launcher cô lập đổi DOCX → PDF trên Windows (dev / test — TIP-030b spec 6, DC-321). Gọi:
#   powershell -File render-windows.ps1 <soffice> <thư-mục-tạm> <giây>
# soffice chạy dưới token AppContainer `appchat-render` KHÔNG có capability nào (không internetClient / privateNetwork → không mạng, kể
# cả loopback), chỉ ghi được thư mục tạm của lần đổi (ACL cấp riêng cho SID AppContainer; mọi nơi khác mặc định từ chối AppContainer),
# trong Job Object: bộ nhớ 1GB, tối đa 32 tiến trình, KILL_ON_JOB_CLOSE (đóng job = giết cả cây). Tạo tiến trình ẩn (CREATE_NO_WINDOW),
# treo (SUSPENDED) cho tới khi đã gán job. Hết giờ → giết job, mã 124. Không cần quyền quản trị: profile AppContainer tạo theo user hiện
# tại, ACL chỉ đặt trên thư mục tạm do API tạo; không đổi tường lửa / dịch vụ.
# Chế độ `job-dev` (biến RENDER_ISOLATION_WINDOWS_MODE, chỉ máy dev / test, API từ chối khi NODE_ENV=production): bỏ AppContainer, chỉ còn
# Job Object — KHÔNG cô lập mạng. Tồn tại vì LibreOffice 26.8 treo khi khởi tạo trong AppContainer không capability (Q-047, DV-024).
param([Parameter(Mandatory)][string]$Soffice, [Parameter(Mandatory)][string]$Root, [int]$Seconds = 60)
$ErrorActionPreference = 'Stop'
$tmp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$full = [IO.Path]::GetFullPath($Root)
if (-not $full.StartsWith($tmp, [StringComparison]::OrdinalIgnoreCase) -or -not (Split-Path $full -Leaf).StartsWith('appchat-isolated-')) { [Console]::Error.WriteLine('invalid temp root'); exit 2 }
if (-not (Test-Path (Join-Path $full 'in.docx'))) { [Console]::Error.WriteLine('missing in.docx'); exit 2 }

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class RenderSandbox {
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int CreateAppContainerProfile(string name, string display, string desc, IntPtr caps, uint count, out IntPtr sid);
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out IntPtr str);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);

  [StructLayout(LayoutKind.Sequential)] struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct STARTUPINFO { public int cb; public string lpReserved; public string lpDesktop; public string lpTitle; public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags; public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attr, IntPtr value, IntPtr size, IntPtr prev, IntPtr retSize);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFOEX si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr h);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h, uint ms);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h, out uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);

  [StructLayout(LayoutKind.Sequential)] struct BASIC { public long a; public long b; public uint LimitFlags; public UIntPtr c; public UIntPtr d; public uint ActiveProcessLimit; public UIntPtr e; public uint f; public uint g; }
  [StructLayout(LayoutKind.Sequential)] struct IO { public ulong a, b, c, d, e, f; }
  [StructLayout(LayoutKind.Sequential)] struct EXT { public BASIC Basic; public IO Io; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr g; public UIntPtr h; }
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr CreateJobObject(IntPtr a, string n);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr j, int c, ref EXT i, uint l);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
  [DllImport("kernel32.dll")] static extern bool TerminateJobObject(IntPtr j, uint code);

  static IntPtr ContainerSid(string name) {
    IntPtr sid;
    int hr = CreateAppContainerProfile(name, name, "AppChat isolated document render", IntPtr.Zero, 0, out sid);
    if (hr == unchecked((int)0x800700B7)) hr = DeriveAppContainerSidFromAppContainerName(name, out sid); // đã tồn tại
    if (hr != 0) throw new Win32Exception(hr);
    return sid;
  }

  /// SID dạng chuỗi của AppContainer (để cấp ACL thư mục tạm).
  public static string SidString(string name) {
    IntPtr s;
    if (!ConvertSidToStringSid(ContainerSid(name), out s)) throw new Win32Exception();
    string r = Marshal.PtrToStringUni(s);
    LocalFree(s);
    return r;
  }

  /// Chạy `cmdLine` trong AppContainer không capability (container null = chỉ Job Object) + Job Object; trả mã thoát, 124 khi hết giờ.
  public static int Run(string container, string cmdLine, string cwd, uint timeoutMs, ulong memBytes, uint procs) {
    if (string.IsNullOrEmpty(container)) container = null; // PowerShell truyền $null thành chuỗi rỗng
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    var x = new EXT();
    // KILL_ON_JOB_CLOSE 0x2000 | ACTIVE_PROCESS 0x8 | PROCESS_MEMORY 0x100 | JOB_MEMORY 0x200 | DIE_ON_UNHANDLED_EXCEPTION 0x400
    x.Basic.LimitFlags = 0x2000 | 0x8 | 0x100 | 0x200 | 0x400;
    x.Basic.ActiveProcessLimit = procs;
    x.ProcessMemoryLimit = (UIntPtr)memBytes;
    x.JobMemoryLimit = (UIntPtr)memBytes;
    if (!SetInformationJobObject(job, 9, ref x, (uint)Marshal.SizeOf(typeof(EXT)))) throw new Win32Exception();

    var caps = new SECURITY_CAPABILITIES { AppContainerSid = container == null ? IntPtr.Zero : ContainerSid(container), Capabilities = IntPtr.Zero, CapabilityCount = 0 };
    IntPtr capsPtr = Marshal.AllocHGlobal(Marshal.SizeOf(caps));
    Marshal.StructureToPtr(caps, capsPtr, false);
    IntPtr size = IntPtr.Zero;
    InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
    IntPtr list = Marshal.AllocHGlobal(size);
    PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
    try {
      if (!InitializeProcThreadAttributeList(list, 1, 0, ref size)) throw new Win32Exception();
      // PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES
      if (container != null && !UpdateProcThreadAttribute(list, 0, (IntPtr)0x00020009, capsPtr, (IntPtr)Marshal.SizeOf(caps), IntPtr.Zero, IntPtr.Zero)) throw new Win32Exception();
      var si = new STARTUPINFOEX();
      si.StartupInfo.cb = Marshal.SizeOf(si);
      si.StartupInfo.dwFlags = 1; // STARTF_USESHOWWINDOW
      si.StartupInfo.wShowWindow = 0; // SW_HIDE
      si.lpAttributeList = container == null ? IntPtr.Zero : list;
      if (container == null) si.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFO));
      // EXTENDED_STARTUPINFO_PRESENT | CREATE_SUSPENDED | CREATE_NO_WINDOW
      if (!CreateProcess(null, new StringBuilder(cmdLine), IntPtr.Zero, IntPtr.Zero, false, (container == null ? 0u : 0x00080000u) | 0x4 | 0x08000000, IntPtr.Zero, cwd, ref si, out pi)) throw new Win32Exception();
      if (!AssignProcessToJobObject(job, pi.hProcess)) { TerminateJobObject(job, 1); throw new Win32Exception(); }
      ResumeThread(pi.hThread);
      if (WaitForSingleObject(pi.hProcess, timeoutMs) != 0) { TerminateJobObject(job, 124); return 124; }
      uint code;
      GetExitCodeProcess(pi.hProcess, out code);
      return (int)code;
    } finally {
      DeleteProcThreadAttributeList(list);
      Marshal.FreeHGlobal(list);
      Marshal.FreeHGlobal(capsPtr);
      if (pi.hThread != IntPtr.Zero) CloseHandle(pi.hThread);
      if (pi.hProcess != IntPtr.Zero) CloseHandle(pi.hProcess);
      // Đóng job = giết mọi tiến trình còn trong job (con cháu soffice).
      CloseHandle(job);
    }
  }
}
'@

$container = $null
if ($env:RENDER_ISOLATION_WINDOWS_MODE -ne 'job-dev') {
  $container = 'appchat-render'
  $sid = [RenderSandbox]::SidString($container)
  # Chỉ thư mục tạm của lần đổi được cấp quyền cho AppContainer (thư mục do API tạo — user hiện tại là chủ, không cần quản trị).
  & icacls.exe $full /grant "*${sid}:(OI)(CI)F" /T /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { [Console]::Error.WriteLine('acl failed'); exit 3 }
}
New-Item -ItemType Directory -Force (Join-Path $full 'out') | Out-Null
# Biến môi trường kế thừa: bỏ proxy, TEMP / TMP / HOME về thư mục tạm.
foreach ($k in 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy') { Remove-Item "Env:$k" -ErrorAction SilentlyContinue }
$env:TEMP = $full
$env:TMP = $full
$env:USERPROFILE = $full

$profileUrl = ([Uri](Join-Path $full 'profile')).AbsoluteUri
$cmd = "`"$Soffice`" --headless --norestore --nolockcheck --nofirststartwizard `"-env:UserInstallation=$profileUrl`" --convert-to pdf:writer_pdf_Export --outdir `"$(Join-Path $full 'out')`" `"$(Join-Path $full 'in.docx')`""
$code = [RenderSandbox]::Run($container, $cmd, $full, [uint32]($Seconds * 1000), 1GB, 32)
if ($code -eq 124) { exit 124 }
if (-not (Test-Path (Join-Path $full 'out\in.pdf'))) { exit 1 }
exit 0
