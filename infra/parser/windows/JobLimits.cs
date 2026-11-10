// Job Object cho parser tệp đầu vào Trợ lý (TIP-023f §2.1, DC-425): trần bộ nhớ tiến trình + job 128 MiB, tối đa 8 tiến trình, đóng
// handle → giết cả cây (KILL_ON_JOB_CLOSE). Biên dịch bởi build.ps1 (Add-Type, không gói mới). Chưa nghiệm thu trên VPS (DC-304).
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace AppChat.Parser
{
    public static class JobLimits
    {
        const int JobObjectExtendedLimitInformation = 9;
        const uint JOB_OBJECT_LIMIT_PROCESS_MEMORY = 0x100;
        const uint JOB_OBJECT_LIMIT_JOB_MEMORY = 0x200;
        const uint JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 0x8;
        const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
        const uint JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION = 0x400;

        [StructLayout(LayoutKind.Sequential)]
        struct BASIC { public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass; }
        [StructLayout(LayoutKind.Sequential)]
        struct IO { public ulong a, b, c, d, e, f; }
        [StructLayout(LayoutKind.Sequential)]
        struct EXTENDED { public BASIC Basic; public IO Io; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed; }

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attrs, string name);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr job, int cls, ref EXTENDED info, int len);
        [DllImport("kernel32.dll", SetLastError = true)] public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

        /// <summary>Job mới với trần bộ nhớ (byte) và số tiến trình; giữ handle tới khi tiến trình con kết thúc.</summary>
        public static IntPtr Create(ulong memoryBytes, uint maxProcesses)
        {
            var job = CreateJobObject(IntPtr.Zero, null);
            if (job == IntPtr.Zero) throw new Win32Exception();
            var info = new EXTENDED();
            info.Basic.LimitFlags = JOB_OBJECT_LIMIT_PROCESS_MEMORY | JOB_OBJECT_LIMIT_JOB_MEMORY | JOB_OBJECT_LIMIT_ACTIVE_PROCESS | JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;
            info.Basic.ActiveProcessLimit = maxProcesses;
            info.ProcessMemoryLimit = new UIntPtr(memoryBytes);
            info.JobMemoryLimit = new UIntPtr(memoryBytes);
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, ref info, Marshal.SizeOf(typeof(EXTENDED)))) throw new Win32Exception();
            return job;
        }
    }
}
