import type { DesktopApi } from './types';

declare global {
  interface Window {
    macCleaner?: DesktopApi;
  }
}

export {};
