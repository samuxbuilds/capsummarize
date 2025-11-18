# Security Practices and Implementation

**Extension Name:** CapSummarize  
**Version:** 1.0.0  
**Last Updated:** November 17, 2025

---

## 1. Architecture Overview
- **Background Service Worker** – message routing, side panel orchestration, cache cleanup
- **Content Script** – injects fetch interceptor + UI hooks on supported sites in an isolated environment
- **Injected Script (`interceptor.js`)** – overrides `fetch`/XHR in page context to detect `.vtt` requests; read-only, sanitized output
- **Side Panel UI** – communicates via `chrome.runtime` messaging, never directly touches page DOM

```
Video Page ── content.ts ──> background.ts ──> sidepanel.ts
                  │                        ↘
              interceptor.js              storage utils / cache
```

---

## 2. Data Protection
| Mechanism | Implementation |
| --- | --- |
| HTTPS only | All API calls hit `https://api.capsummarize.app` with TLS ≥1.2. CSP forbids non-HTTPS connect-src. |
| Local storage only | Subtitles, summaries, prompts, and usage counters live in IndexedDB/Chrome storage. |
| Sanitization | `sanitizeVTTContent`, `sanitizeInput`, and `isValidPrompt` scrub all external input before rendering/injection. |
| Access control | `chrome.scripting.executeScript` only runs after explicit user action. No background injection. |
| Logging | Production builds disable debug logging; only `logger` utility with leveled output remains. |

---

## 3. Permissions & Least Privilege
- **`storage`** – user settings + cache
- **`tabs`** – detect active video tab, coordinate side panel state
- **`scripting`** – inject prompt into user-chosen AI provider tabs
- **`sidePanel`** – display main UI
- **Host permissions** – limited to YouTube + Google Drive/Sites for subtitles, and ChatGPT/Gemini/Claude for AI integration. Optional sites (Udemy, etc.) use runtime requests.

See `PERMISSIONS_JUSTIFICATION.md` for detailed rationale.

---

## 4. Content Security Policy
```
default-src 'self';
script-src 'self';
connect-src https://api.capsummarize.app;
style-src 'self' 'unsafe-inline';
img-src 'self' data: chrome-extension:;
font-src 'self' data:
```
No remote scripts or eval usage.

---

## 5. Network Interception Controls
- Interceptor inspects only `.vtt` requests; rejects thumbnails/sprites.
- Sanitizes and deduplicates payloads before posting to content script.
- Uses custom skip-header to avoid recursion. Logging disabled by default.
- Documented in reviewer notes and privacy policy.

---

## 6. Dependency & Build Hygiene
- Single runtime dependency (`marked`).
- TypeScript + ESLint + Prettier enforce code quality.
- Build script replaces env variables and ensures production API defaults.
- No obfuscation; only minification via Bun.

---

## 7. Incident Response
- Crash / bug reports optionally sent (opt-in).  
- Security issues: email security@capsummarize.app.  
- GDPR/CCPA requests handled within 30 days via privacy@capsummarize.app.

---

## 8. Future Enhancements
- Optional encryption for local summary cache.  
- User-facing toggle to disable network interception per site.  
- Granular runtime permission prompts for additional domains.
