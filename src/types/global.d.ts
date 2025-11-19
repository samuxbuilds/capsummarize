export {};

declare global {
  interface Window {
    __vttInterceptorLoaded?: boolean;
  }

  interface XMLHttpRequest {
    __vttMethod?: string;
    __vttUrl?: string;
    __vttSkip?: boolean;
  }
}
