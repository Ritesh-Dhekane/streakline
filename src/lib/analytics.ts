// Cloudflare Web Analytics: cookieless, no personal data. Only loaded in production builds when a
// token is configured (VITE_CF_BEACON_TOKEN in .env.production).
export function startAnalytics() {
  const token = import.meta.env.VITE_CF_BEACON_TOKEN
  if (!import.meta.env.PROD || !token) return
  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.dataset.cfBeacon = JSON.stringify({ token, spa: true })
  document.head.appendChild(script)
}
