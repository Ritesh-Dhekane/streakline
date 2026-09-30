/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the Streakline API (the Cloudflare Worker), set at build time.
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
