/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CARD_REPOSITORY_BASE_URL?: string;
  readonly VITE_PROGRESS_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
