/// <reference types="vite/client" />

interface OGSAccountConfig {
  game: string;
  version: string;
  color?: string;
  getSave: () => unknown;
  applySave: (data: Record<string, unknown>) => void;
  isEmpty?: (data: Record<string, unknown>) => boolean;
  describe?: (data: Record<string, unknown>) => string;
}
interface Window {
  OGSAccount?: { init(cfg: OGSAccountConfig): void; show(on: boolean): void; notifyChange(): void };
}
