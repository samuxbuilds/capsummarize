import type { WebExtensionManifest } from './types/manifest.js';

const manifest: WebExtensionManifest = {
  manifest_version: 3,
  name: 'CapSummarize',
  version: '1.0.2',
  description: 'AI-powered video caption summaries',
  permissions: ['scripting', 'tabs', 'sidePanel', 'clipboardWrite'],
  host_permissions: [
    'https://*.youtube.com/*',
    'https://drive.google.com/*',
    'https://sites.google.com/*',
    'https://*.udemy.com/*',
    'https://*.zoom.us/*',
    'https://x.com/*',
  ],
  optional_host_permissions: [
    'https://chatgpt.com/*',
    'https://gemini.google.com/*',
    'https://claude.ai/*',
    'https://www.perplexity.ai/*',
    'https://grok.com/*',
    'https://chat.mistral.ai/*',
    'https://www.meta.ai/*',
    'https://chat.z.ai/*',
    'https://t3.chat/*',
    'https://quillbot.com/*',
  ],
  background: {
    service_worker: 'background.js',
  },
  content_scripts: [
    {
      matches: [
        'https://*.youtube.com/*',
        'https://drive.google.com/*',
        'https://sites.google.com/*',
        'https://*.udemy.com/*',
        'https://*.zoom.us/*',
        'https://x.com/*',
      ],
      js: ['content.js'],
      run_at: 'document_start',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['interceptor.js'],
      matches: [
        'https://*.youtube.com/*',
        'https://drive.google.com/*',
        'https://sites.google.com/*',
        'https://*.udemy.com/*',
        'https://*.zoom.us/*',
        'https://x.com/*',
        'https://*.linkedin.com/*',
        'https://*.coursera.org/*',
        'https://*.skillshare.com/*',
      ],
    },
  ],
  action: {
    default_title: 'CapSummarize',
  },
  side_panel: {
    default_path: 'ui/sidepanel.html',
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
};

console.log(JSON.stringify(manifest, null, 2));
