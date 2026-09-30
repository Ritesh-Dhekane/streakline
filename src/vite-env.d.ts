/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the Streakline API (the Cloudflare Worker), set at build time.
  readonly VITE_API_BASE?: string
  // Cloudflare Web Analytics token (public; cookieless). Analytics are off when unset.
  readonly VITE_CF_BEACON_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
