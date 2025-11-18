# Privacy Policy for CapSummarize

**Last Updated:** November 17, 2025  
**Effective Date:** November 17, 2025

> CapSummarize is a Chrome extension that summarizes captioned videos. We designed it to keep user data on-device and only send the information that is strictly required for the requested feature.

---

## 1. Information We Collect

### 1.1 Data Stored Locally (On Your Device Only)
- **Video subtitle content (VTT files)** – cached in IndexedDB to generate summaries faster. Removed when you clear history or uninstall the extension.
- **Generated summaries + Q&A history** – stored locally so you can revisit past results. You may clear them at any time from Settings.
- **User preferences** – summary style, voice settings, custom prompts, and UI choices are saved in `chrome.storage.local`.
- **License keys & usage counters** – premium-license token and free-tier remaining quota. Both stay on your device.

### 1.2 Data Sent to Our Servers
- **License validation requests** – when you enter a premium license key we send `licenseKey` (and optional email) to `https://api.capsummarize.app` to verify entitlement.
- **Error telemetry (optional)** – only aggregate error codes and anonymized diagnostics if you toggle "Share anonymous errors" in Settings (off by default).

We do **not** send video subtitles, page URLs, or summaries to our servers.

### 1.3 Data Sent to Third Parties
- **AI Provider Tabs (ChatGPT, Gemini, Claude)** – if you click "Open in …" we inject your summary text directly into that provider's site. We do not read responses or intercept their traffic.

---

## 2. How We Use Data
| Data | Purpose | Sharing |
| --- | --- | --- |
| Subtitles (local) | Generate summaries | Never leaves device |
| Summaries & history | Let you revisit prior work | Never leaves device |
| Preferences | Persist UI choices | Never leaves device |
| License key | Validate premium access | Sent to CapSummarize API via HTTPS |
| Error telemetry (optional) | Improve stability | Aggregated, no personal info |

---

## 3. Data Retention & Deletion
- **Automatic expiration:** Cached subtitles expire after 30 days of inactivity.
- **Manual deletion:** Use "Clear History" or remove the extension to delete all stored data immediately.
- **Server logs:** License validation logs kept for 7 days then purged.

---

## 4. Permissions & Justification
CapSummarize uses the minimum Chrome permissions necessary: `storage`, `scripting`, `tabs`, `sidePanel`, and host access for YouTube, Google Drive/Sites, Udemy, and Zoom web apps.
- Detailed reasoning lives in `PERMISSIONS_JUSTIFICATION.md`.
- AI chat providers (ChatGPT, Gemini, Claude, etc.) are requested at runtime the first time you open them via the extension; Chrome shows a prompt so you stay in control of cross-site access.

---

## 5. Security Practices
- All network requests use HTTPS with TLS 1.2+.
- Subtitle content is sanitized before processing to avoid XSS.
- CSP restricts script execution to bundled assets only.
- No remote code execution, eval, or obfuscation.

Details are documented in `SECURITY_PRACTICES.md`.

---

## 6. Your Rights
- **Deletion:** Clear history or uninstall to remove all data; email privacy@capsummarize.app for license deletion.

---

## 7. Contact
- **Privacy inquiries:** privacy@capsummarize.app  
- **Support:** support@capsummarize.app  
- **Website:** https://capsummarize.app/privacy

We will update this policy if our practices change and notify users via an in-extension banner plus a Chrome Web Store listing update.
