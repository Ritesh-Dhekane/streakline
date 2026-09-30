// Installation tokens for the Streakline GitHub App: sign a short-lived JWT with the App's
// private key, trade it for a one-hour installation token, and reuse that until near expiry.

export interface AppCredentials {
  appId: string
  installationId: string
  privateKey: string // PEM, PKCS#1 ("RSA PRIVATE KEY", as GitHub issues it) or PKCS#8
}

interface CachedToken {
  token: string
  expiresAt: number // ms
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000

export function githubAppTokens(
  credentials: AppCredentials,
  deps: { fetch: typeof fetch; now: () => Date },
): () => Promise<string> {
  let cached: CachedToken | null = null
  let key: Promise<CryptoKey> | null = null

  return async () => {
    const now = deps.now().getTime()
    if (cached && cached.expiresAt - REFRESH_MARGIN_MS > now) return cached.token

    key ??= importPrivateKey(credentials.privateKey)
    const jwt = await signJwt(await key, credentials.appId, Math.floor(now / 1000))
    const response = await deps.fetch(
      `https://api.github.com/app/installations/${credentials.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'streakline',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )
    if (!response.ok) throw new Error(`GitHub App token request failed (${response.status})`)
    const body = (await response.json()) as { token: string; expires_at: string }
    cached = { token: body.token, expiresAt: Date.parse(body.expires_at) }
    return body.token
  }
}

export async function signJwt(key: CryptoKey, appId: string, nowSeconds: number): Promise<string> {
  // Backdated a minute for clock drift; GitHub allows at most 10 minutes.
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 9 * 60, iss: appId }),
  )
  const data = new TextEncoder().encode(`${header}.${payload}`)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data)
  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`
}

export function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(pem)
  const der = fromBase64(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''))
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs1 ? wrapPkcs1(der) : der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

// Web Crypto only imports PKCS#8, so wrap the PKCS#1 key:
// SEQUENCE { INTEGER 0, SEQUENCE { rsaEncryption OID, NULL }, OCTET STRING { pkcs1 } }
function wrapPkcs1(pkcs1: Uint8Array): Uint8Array<ArrayBuffer> {
  const version = [0x02, 0x01, 0x00]
  const algorithm = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]
  const octets = [0x04, ...derLength(pkcs1.length), ...pkcs1]
  const body = [...version, ...algorithm, ...octets]
  return new Uint8Array([0x30, ...derLength(body.length), ...body])
}

function derLength(length: number): number[] {
  if (length < 0x80) return [length]
  const bytes: number[] = []
  for (let n = length; n > 0; n >>= 8) bytes.unshift(n & 0xff)
  return [0x80 | bytes.length, ...bytes]
}

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
