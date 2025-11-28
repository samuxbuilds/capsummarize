# Privacy Policy for CapSummarize

**Last Updated:** November 28, 2025  
**Effective Date:** November 28, 2025

> CapSummarize is a free, open-source Chrome extension that helps you summarize captioned videos using AI providers of your choice. We designed it to keep all user data on-device — no data is ever sent to external servers.

---

## 1. Information We Collect

### 1.1 Data Stored Locally (On Your Device Only)
- **Video subtitle content (VTT files)** – cached in IndexedDB to enable transcript history. Removed when you clear history or uninstall the extension.
- **User preferences** – summary style, custom prompts, and UI choices are saved in `chrome.storage.local`.
- **Usage statistics** – anonymous count of summaries generated, stored locally for your reference.

### 1.2 Data Sent to Our Servers
**None.** CapSummarize does not send any data to our servers. The extension operates entirely offline after installation.

### 1.3 Data Sent to Third Parties
- **AI Provider Tabs (ChatGPT, Gemini, Claude, etc.)** – when you click a provider button, we open their website and inject your transcript with the selected prompt template. The AI provider processes your request according to their own privacy policy. We do not read responses or intercept their traffic.

---

## 2. How We Use Data
| Data | Purpose | Sharing |
| --- | --- | --- |
| Subtitles (local) | Enable transcript access for AI providers | Never leaves device |
| Preferences | Persist UI choices | Never leaves device |
| Usage count | Show your usage statistics | Never leaves device |

---

## 3. Data Retention & Deletion
- **Manual deletion:** Use "Clear History" in the extension or remove the extension to delete all stored data immediately.
- **No server data:** Since we don't collect any data on servers, there's nothing to delete on our end.

---

## 4. Permissions & Justification
CapSummarize uses the minimum Chrome permissions necessary:

| Permission | Reason |
| --- | --- |
| `storage` | Save preferences and transcript history locally |
| `scripting` | Inject prompts into AI provider pages |
| `tabs` | Open AI provider tabs and manage side panel |
| `sidePanel` | Display the extension UI |
| Host permissions (YouTube, etc.) | Capture video captions from supported sites |
| Optional host permissions (AI providers) | Inject prompts when you choose to use a provider |

AI chat providers (ChatGPT, Gemini, Claude, etc.) are requested at runtime the first time you use them; Chrome shows a permission prompt so you stay in control.

---

## 5. Security Practices
- All AI provider interactions use HTTPS.
- Subtitle content is sanitized before display to prevent XSS.
- Content Security Policy (CSP) restricts script execution to bundled assets only.
- No remote code execution, eval, or obfuscation.
- Fully open source — audit the code yourself at https://github.com/samuxbuilds/capsummarize

---

## 6. Your Rights
- **Full control:** All data stays on your device. Clear history or uninstall to remove everything.
- **Transparency:** The extension is open source, so you can verify exactly what it does.

---

## 7. Contact
- **Privacy inquiries:** privacy@capsummarize.app  
- **Support:** support@capsummarize.app  
- **GitHub:** https://github.com/samuxbuilds/capsummarize

We will update this policy if our practices change and notify users via the GitHub repository and Chrome Web Store listing.
