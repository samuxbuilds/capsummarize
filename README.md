# CapSummarize — AI-powered Video Caption Summaries

CapSummarize is a browser extension that extracts video captions (VTT), generates AI summaries, and enables follow-up Q&A via an interactive side panel and floating UI.

---

## ✅ Overview

CapSummarize (package name: `capsummarize-extension`) is a Manifest V3 browser extension that provides lightweight, privacy-conscious AI summaries for videos by processing or caching captions (VTT) and surfacing summarizations in a side panel with optional follow-up questions.

Key features:
- Capture and cache VTT captions for videos
- Generate short summaries and Q&A via LLM providers
- Toggleable side panel UI and floating 'Summarize' icon
- Works on sites like YouTube, Google Drive, Udemy, Zoom, and many others (see `src/manifest.ts` host rules)
- Build-time environment replacement to safely provide `API_BASE_URL` and runtime detection

---

## 🔧 Prerequisites

- Node.js (v18+) or Bun installed (recommended for this project — see https://bun.sh)
- A Chromium-compatible browser (Chrome, Edge) that supports Manifest V3 and side panels
- Optional: An `.env` that points `API_BASE_URL` to your backend

---

## ⚙️ Installation

Clone the repository and install dependencies. The repo uses Bun by default for fast installs and builds, but you can use `npm` as a fallback.

With Bun (recommended):

```bash
git clone <repo-url>
cd capsummarize
bun install
```

Or with npm / node:

```bash
git clone <repo-url>
cd capsummarize
npm ci
```

---

## ⚙️ Configuration

1. Copy `.env.example` to `.env` if you need a local override.

```bash
cp .env.example .env
```

2. Edit `.env` if you want to run against a local backend (e.g., `API_BASE_URL=http://localhost:8000`). The build step (`scripts/build-with-env.js`) will replace placeholders in the source with the configured values.

Note: If no `.env` is provided, the project defaults to a production base URL (see `src/config/env.ts` -> `https://api.capsummarize.app`).

---

## 🧪 Development

Start the developer watch mode, which compiles files and watches for changes:

```bash
bun run dev
# or if you prefer npm, which calls bun internally
npm run dev
```

This will:
- Replace environment placeholders (`scripts/build-with-env.js`)
- Build the extension assets and watch for changes (TypeScript, UI, and CSS build)

---

## 📦 Build

Build a production-ready distribution into `dist/`:

```bash
bun run build
# or
npm run build
```

The `dist/` folder will contain `manifest.json` and the compiled `background.js`, `content.js`, `ui`, `icons`, and `utils` files. This folder can be loaded as an **unpacked Chrome extension**.

### Load the extension (Chrome / Chromium)

1. Open `chrome://extensions/`.
2. Toggle on **Developer mode** (top-right).
3. Click **Load unpacked** and select the `dist/` folder.

---

## ✅ Linting, Type-Checking, and Formatting

- Type check: `npm run type-check` (runs `tsc --noEmit`)
- Lint with `npm run lint` (ESLint)
- Format with `npm run format` (Prettier)

---

## 🧩 Project Structure (Highlights)

- `src/` — TypeScript source for extension (background, content, UI, utils)
  - `src/background.ts` — Main service-worker (background script)
  - `src/content.ts` — Content script injected into pages
  - `src/ui/sidepanel.ts` & `src/ui/settings.ts` — UI components for the side panel and settings
  - `src/interceptor.ts` — Interceptor logic for capturing captions
  - `src/config` — Environment helper and configs
  - `src/styles` — Tailwind/ CSS styles
- `icons/` — Extension icons
- `dist/` — Build output (generated)
- `scripts/build-with-env.js` — Environment placeholder replacer during build
- `package.json` — Scripts & dependencies

---

## 🔁 Supported Hosts & Providers

The extension's `manifest.ts` includes `host_permissions` for content scripts and `optional_host_permissions` for LLM providers. The default supported hosts include `youtube.com`, `drive.google.com`, and others; providers for summarization are included as optional permissions.

---

## 🛡️ Security & Privacy

- CapSummarize uses build-time replacement for API URLs (`scripts/build-with-env.js`) to avoid leaking secrets in the frontend (browser extension) source.
- See `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, and `SECURITY_PRACTICES.md` for more details.

---

## 🧑‍💻 Contributing

We welcome contributions! To contribute:

1. Fork the repo and create a feature branch.
2. Run lint / type-check / format locally.
3. Open a pull request with a clear description.

Please run the following locally before submitting a PR:

```bash
npm run lint
npm run format
npm run type-check
```

If you add tests, include them and run them in your PR.

---

## ❗ Known Differences

- `.env.example` references `recapit.ai` in a comment — the main configuration and defaults use `capsummarize.app`. If you are reusing `.env.example`, update `API_BASE_URL` accordingly.

---

## 📫 Contact / Author

If you need help or want to report an issue, please create an issue in this repository.

---

## 📝 License

This repository does not contain a `LICENSE` file. If you plan to reuse or distribute the code, add a `LICENSE` appropriate for your intent (e.g., MIT, Apache 2.0) or check with the repository owner.

---

Thanks for checking out CapSummarize! 🚀
