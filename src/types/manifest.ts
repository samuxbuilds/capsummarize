/**
 * Type definitions for Chrome Extension Manifest
 */
export namespace Manifest {
  /**
   * Web extension manifest interface
   */
  export interface WebExtensionManifest {
    manifest_version: 3;
    name: string;
    version: string;
    description?: string;
    permissions: string[];
    host_permissions: string[];
    optional_host_permissions?: string[];
    background: {
      service_worker: string;
    };
    content_scripts: ContentScript[];
    action: {
      default_popup?: string;
      default_title: string;
    };
    side_panel?: {
      default_path: string;
    };
    icons: {
      16: string;
      48: string;
      128: string;
    };
    web_accessible_resources: WebAccessibleResource[];
  }

  /**
   * Content script configuration
   */
  export interface ContentScript {
    matches: string[];
    js: string[];
    run_at: 'document_start' | 'document_end' | 'document_idle';
  }

  /**
   * Web accessible resource configuration
   */
  export interface WebAccessibleResource {
    resources: string[];
    matches: string[];
  }
}
