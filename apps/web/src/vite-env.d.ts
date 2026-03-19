/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ODDS_TEMA_DIRECT?: string;
  readonly VITE_ODDS_PING_TE?: string;
  readonly VITE_ODDS_PING_TE_TAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
