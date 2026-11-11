// Hồ sơ AppContainer cho parser (TIP-023f §2.1, DC-425): SID AppContainer KHÔNG có capability nào (không internetClient /
// privateNetwork → không mạng ra ngoài), chỉ được cấp đọc + thực thi thư mục bundle parser và thư mục Node (ACL do build.ps1 đặt một
// lần khi provision). Biên dịch bởi build.ps1 (Add-Type). Chưa nghiệm thu trên VPS (DC-304).
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace AppChat.Parser
{
    public static class AppContainer
    {
        public const string Name = "AppChat.Parser";

        [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int CreateAppContainerProfile(string name, string display, string desc, IntPtr caps, uint capCount, out IntPtr sid);
        [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out IntPtr str);
        [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);

        /// <summary>SID của hồ sơ (tạo nếu chưa có) — không capability.</summary>
        public static IntPtr Sid()
        {
            IntPtr sid;
            int hr = CreateAppContainerProfile(Name, Name, "AppChat parser sandbox (no network)", IntPtr.Zero, 0, out sid);
            if (hr == unchecked((int)0x800700B7)) hr = DeriveAppContainerSidFromAppContainerName(Name, out sid); // ERROR_ALREADY_EXISTS
            if (hr != 0) throw new Win32Exception(hr);
            return sid;
        }

        /// <summary>Chuỗi SID (S-1-15-2-…) để build.ps1 cấp ACL đọc / thực thi cho thư mục bundle + Node.</summary>
        public static string SidString()
        {
            IntPtr str;
            if (!ConvertSidToStringSid(Sid(), out str)) throw new Win32Exception();
            try { return Marshal.PtrToStringUni(str); } finally { LocalFree(str); }
        }
    }
}
