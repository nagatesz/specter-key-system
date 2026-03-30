// SpecterAuth.h
// Drop this into your mod menu DLL project.
// Requires: WinHTTP (link winhttp.lib) or swap with libcurl/cpp-httplib.
//
// Usage:
//   SpecterAuth auth("https://your-project.vercel.app");
//   if (!auth.Validate("ABCD-EFGH-IJKL")) { /* block menu */ }
//   // later, on each feature call:
//   if (!auth.VerifySession()) { /* kick */ }

#pragma once
#include <windows.h>
#include <winhttp.h>
#include <string>
#include <sstream>
#include <intrin.h>
#pragma comment(lib, "winhttp.lib")

namespace Specter {

// ── HWID Generation ─────────────────────────────────────────────────────────
// Combines CPU ID + volume serial for a stable hardware fingerprint.
inline std::string GetHWID() {
    int cpuInfo[4] = {};
    __cpuid(cpuInfo, 1);
    char cpuBuf[64];
    sprintf_s(cpuBuf, "%08X%08X", cpuInfo[0], cpuInfo[3]);

    DWORD serial = 0;
    GetVolumeInformationA("C:\\", nullptr, 0, &serial, nullptr, nullptr, nullptr, 0);

    char hwidBuf[128];
    sprintf_s(hwidBuf, "SPEC-%s-%08X", cpuBuf, serial);
    return std::string(hwidBuf);
}

// ── Simple WinHTTP POST helper ───────────────────────────────────────────────
inline std::string HttpPost(const std::wstring& host, const std::wstring& path,
                             const std::string& body, const std::string& hwid) {
    std::string result;

    HINTERNET hSession = WinHttpOpen(L"SpecterDLL/1.0",
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) return "";

    HINTERNET hConnect = WinHttpConnect(hSession, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, 0);
    if (!hConnect) { WinHttpCloseHandle(hSession); return ""; }

    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"POST", path.c_str(),
        nullptr, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);
    if (!hRequest) { WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession); return ""; }

    // Headers
    std::wstring headers = L"Content-Type: application/json\r\nX-HWID: ";
    headers += std::wstring(hwid.begin(), hwid.end());
    WinHttpAddRequestHeaders(hRequest, headers.c_str(), (DWORD)headers.size(), WINHTTP_ADDREQ_FLAG_ADD);

    BOOL sent = WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0,
        (LPVOID)body.c_str(), (DWORD)body.size(), (DWORD)body.size(), 0);

    if (sent && WinHttpReceiveResponse(hRequest, nullptr)) {
        DWORD size = 0;
        do {
            WinHttpQueryDataAvailable(hRequest, &size);
            if (size == 0) break;
            char* buf = new char[size + 1]();
            DWORD read = 0;
            WinHttpReadData(hRequest, buf, size, &read);
            result.append(buf, read);
            delete[] buf;
        } while (size > 0);
    }

    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    return result;
}

// ── Simple JSON value extractor ──────────────────────────────────────────────
inline std::string JsonGet(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\":";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos += search.size();
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '"')) pos++;
    size_t end = json.find_first_of("\",}", pos);
    return json.substr(pos, end - pos);
}

// ── Auth class ───────────────────────────────────────────────────────────────
class Auth {
public:
    std::string m_baseHost;   // e.g. "your-project.vercel.app"
    std::string m_token;
    std::string m_hwid;
    bool        m_authenticated = false;

    Auth(const std::string& host) : m_baseHost(host) {
        m_hwid = GetHWID();
    }

    // Call this when the user submits their key in your menu UI
    // Returns true if key is valid and session token was obtained
    bool Validate(const std::string& key) {
        std::wstring host(m_baseHost.begin(), m_baseHost.end());
        std::string body = "{\"key\":\"" + key + "\"}";

        std::string response = HttpPost(host, L"/api/validate", body, m_hwid);
        if (response.empty()) return false;

        std::string valid = JsonGet(response, "valid");
        if (valid != "true") return false;

        m_token         = JsonGet(response, "token");
        m_authenticated = true;
        return true;
    }

    // Call this periodically (e.g. every 5 minutes) or on every privileged feature
    // Returns false if session expired, HWID/IP mismatch, or key was revoked
    bool VerifySession() {
        if (!m_authenticated || m_token.empty()) return false;

        std::wstring host(m_baseHost.begin(), m_baseHost.end());
        std::string body = "{\"token\":\"" + m_token + "\"}";

        std::string response = HttpPost(host, L"/api/session", body, m_hwid);
        if (response.empty()) return false;

        return JsonGet(response, "valid") == "true";
    }

    bool IsAuthenticated() const { return m_authenticated; }
    const std::string& GetToken() const { return m_token; }
    const std::string& GetHWID()  const { return m_hwid;  }
};

} // namespace Specter

// ── Example usage in dllmain.cpp ─────────────────────────────────────────────
//
// static Specter::Auth* g_auth = nullptr;
//
// void MenuThread() {
//     g_auth = new Specter::Auth("your-project.vercel.app");
//
//     std::string key = ShowKeyInputDialog(); // your existing UI input
//     if (!g_auth->Validate(key)) {
//         MessageBoxA(0, "Invalid key.", "Specter", MB_ICONERROR);
//         return;
//     }
//
//     // Menu is now unlocked
//     while (MenuIsOpen()) {
//         RenderMenu();
//
//         // Verify session every 300 seconds
//         static DWORD lastCheck = 0;
//         if (GetTickCount() - lastCheck > 300000) {
//             if (!g_auth->VerifySession()) {
//                 MessageBoxA(0, "Session expired. Re-authenticate.", "Specter", MB_ICONWARNING);
//                 break;
//             }
//             lastCheck = GetTickCount();
//         }
//     }
// }
