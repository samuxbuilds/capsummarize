# Security Practices and Implementation

**Extension Name:** CapSummarize  
**Version:** 1.0.2  
**Last Updated:** November 28, 2025

---

## 1. Architecture Overview

CapSummarize is a fully client-side browser extension. No data is sent to external servers — all processing happens locally in your browser.

```
Video Page ── content.ts ──> background.ts ──> sidepanel.ts
                  │                              │
              interceptor.js                  AI Provider Tab
              (caption capture)               (user-initiated)
```

### Components
- **Background Service Worker** – message routing, side panel orchestration, cache management
- **Content Script** – injects fetch interceptor on supported sites in an isolated environment
- **Injected Script (`interceptor.js`)** – overrides `fetch`/XHR in page context to detect `.vtt` requests; read-only, sanitized output
- **Side Panel UI** – communicates via `chrome.runtime` messaging, never directly touches page DOM
- **AI Provider Integration** – opens provider tabs and injects prompts only on explicit user action

---

## 2. Data Protection

| Mechanism | Implementation |
| --- | --- |
| **No external servers** | Extension operates entirely offline. No data is sent to CapSummarize servers. |
| **Local storage only** | Subtitles, preferences, and usage data stored in IndexedDB/Chrome storage. |
| **Sanitization** | `sanitizeVTTContent`, `sanitizeInput`, and `isValidPrompt` scrub all external input before rendering/injection. |
| **User-initiated actions** | AI provider injection only occurs when user explicitly clicks a provider button. |
| **Logging control** | Production builds disable debug logging; only error/warning output remains. |

---

## 3. Permissions & Least Privilege

| Permission | Purpose |
| --- | --- |
| `storage` | Store user preferences and transcript history locally |
| `tabs` | Detect active video tab, coordinate side panel state, open AI provider tabs |
| `scripting` | Inject prompts into user-chosen AI provider tabs |
| `sidePanel` | Display the main extension UI |

### Host Permissions
- **Required:** YouTube, Google Drive/Sites, Udemy, Zoom, X — for caption capture
- **Optional (runtime):** ChatGPT, Claude, Gemini, Grok, Perplexity, Mistral, Meta AI, etc. — requested only when you first use each provider

---

## 4. Content Security Policy

The extension's HTML pages use strict CSP headers:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: chrome-extension:;
font-src 'self' data: https://fonts.gstatic.com;
```

- No remote script execution
- No `eval()` or `new Function()`
- No inline scripts (only bundled modules)

---

## 5. Network Interception Controls

The caption interceptor (`interceptor.js`) has strict controls:

- **Scope limited** – Only inspects requests containing `.vtt` or known caption patterns
- **Read-only** – Never modifies network requests, only observes responses
- **Sanitization** – All captured content is sanitized before storage
- **Deduplication** – Prevents duplicate caption storage
- **Skip header** – Uses custom header to avoid recursion
- **No logging in production** – Debug output disabled in release builds

---

## 6. AI Provider Integration Security

When you click an AI provider button:

1. **Permission check** – Chrome prompts for permission if not already granted
2. **URL validation** – Only approved provider domains are allowed
3. **Prompt validation** – Content is sanitized via `isValidPrompt()` before injection
4. **Isolated execution** – Script runs in `MAIN` world but only manipulates input fields
5. **No response reading** – Extension does not intercept or read AI provider responses

---

## 7. Dependency & Build Hygiene

- **Minimal dependencies** – Single runtime dependency (`marked` for Markdown parsing)
- **Type safety** – Full TypeScript with strict mode
- **Code quality** – ESLint + Prettier enforce consistent code style
- **No obfuscation** – Only standard minification via Bun bundler
- **Open source** – Full source code available for audit

---

## 8. Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security@capsummarize.app with details
3. Include steps to reproduce if possible
4. We aim to respond within 48 hours

---

## 9. Open Source Transparency

CapSummarize is fully open source under the MIT License. You can:

- Audit the complete source code
- Build from source to verify the published extension
- Fork and modify for your own use
- Contribute improvements via pull requests

Repository: https://github.com/samuxbuilds/capsummarize
