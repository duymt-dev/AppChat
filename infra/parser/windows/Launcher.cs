// Khởi chạy parser trong AppContainer + Job Object (TIP-023f §2.1, DC-425): tiến trình con tạo SUSPENDED với thuộc tính bảo mật
// AppContainer (không capability) → gán vào job (128 MiB, ≤ 8 tiến trình, đóng handle = giết cây) → resume. stdin / stdout / stderr kế
// thừa từ launcher (cha — worker — giữ trần byte + 30s). Không cửa sổ (CREATE_NO_WINDOW). Đối số do server dựng; launcher chỉ ghép với
// quy tắc trích dẫn Win32, không qua shell. Mã thoát của parser trả nguyên. Biên dịch bởi build.ps1 (Add-Type). Chưa nghiệm thu (DC-304).
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace AppChat.Parser
{
    public static class Launcher
    {
        const uint EXTENDED_STARTUPINFO_PRESENT = 0x80000;
        const uint CREATE_SUSPENDED = 0x4;
        const uint CREATE_NO_WINDOW = 0x08000000;
        const uint CREATE_UNICODE_ENVIRONMENT = 0x400;
        const int STARTF_USESTDHANDLES = 0x100;
        static readonly IntPtr PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES = (IntPtr)0x20009;

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct STARTUPINFO { public int cb; public string r; public string d; public string t; public int x, y, w, h, cx, cy, fill, flags; public short show, r2; public IntPtr r3, stdin, stdout, stderr; }
        [StructLayout(LayoutKind.Sequential)]
        struct STARTUPINFOEX { public STARTUPINFO s; public IntPtr attrs; }
        [StructLayout(LayoutKind.Sequential)]
        struct PROCESS_INFORMATION { public IntPtr process, thread; public int pid, tid; }
        [StructLayout(LayoutKind.Sequential)]
        struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }

        [DllImport("kernel32.dll", SetLastError = true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attr, IntPtr value, IntPtr size, IntPtr prev, IntPtr ret);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string dir, ref STARTUPINFOEX si, out PROCESS_INFORMATION pi);
        [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
        [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h, uint ms);
        [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h, out uint code);
        [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
        [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int n);
        [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr h, uint code);

        static string Quote(string a)
        {
            if (a.Length > 0 && a.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return a;
            var sb = new StringBuilder("\"");
            int bs = 0;
            foreach (var ch in a)
            {
                if (ch == '\\') { bs++; continue; }
                if (ch == '"') { sb.Append('\\', bs * 2 + 1); bs = 0; sb.Append('"'); continue; }
                sb.Append('\\', bs); bs = 0; sb.Append(ch);
            }
            sb.Append('\\', bs * 2).Append('"');
            return sb.ToString();
        }

        /// <summary>Chạy `exe args…` trong AppContainer + job; trả mã thoát của tiến trình con.</summary>
        public static int Run(string exe, string[] args, ulong memoryBytes)
        {
            var job = JobLimits.Create(memoryBytes, 8);
            var caps = new SECURITY_CAPABILITIES { AppContainerSid = AppContainer.Sid(), Capabilities = IntPtr.Zero, CapabilityCount = 0 };
            IntPtr capsPtr = Marshal.AllocHGlobal(Marshal.SizeOf(caps));
            Marshal.StructureToPtr(caps, capsPtr, false);
            IntPtr size = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
            IntPtr list = Marshal.AllocHGlobal(size);
            if (!InitializeProcThreadAttributeList(list, 1, 0, ref size)) throw new Win32Exception();
            if (!UpdateProcThreadAttribute(list, 0, PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES, capsPtr, (IntPtr)Marshal.SizeOf(caps), IntPtr.Zero, IntPtr.Zero)) throw new Win32Exception();
            var si = new STARTUPINFOEX();
            si.s.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
            si.s.flags = STARTF_USESTDHANDLES;
            si.s.stdin = GetStdHandle(-10);
            si.s.stdout = GetStdHandle(-11);
            si.s.stderr = GetStdHandle(-12);
            si.attrs = list;
            var cmd = new StringBuilder(Quote(exe));
            foreach (var a in args) cmd.Append(' ').Append(Quote(a));
            PROCESS_INFORMATION pi;
            if (!CreateProcess(exe, cmd, IntPtr.Zero, IntPtr.Zero, true, EXTENDED_STARTUPINFO_PRESENT | CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT, IntPtr.Zero, null, ref si, out pi)) throw new Win32Exception();
            if (!JobLimits.AssignProcessToJobObject(job, pi.process)) { TerminateProcess(pi.process, 70); throw new Win32Exception(); }
            ResumeThread(pi.thread);
            WaitForSingleObject(pi.process, 0xFFFFFFFF);
            uint code;
            GetExitCodeProcess(pi.process, out code);
            CloseHandle(pi.thread);
            CloseHandle(pi.process);
            CloseHandle(job);
            return (int)code;
        }
    }
}
