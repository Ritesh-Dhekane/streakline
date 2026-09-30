import { describe, expect, it, vi } from 'vitest'

import { githubAppTokens, importPrivateKey, signJwt } from './githubApp'

// A throwaway key, as PKCS#8 and as the PKCS#1 form GitHub issues App keys in (PKCS#1 is the
// OCTET STRING inside a 2048-bit PKCS#8 key, 26 bytes in).
const pair = (await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify'],
)) as CryptoKeyPair
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
const PKCS8 = pem('PRIVATE KEY', pkcs8)
const PKCS1 = pem('RSA PRIVATE KEY', pkcs8.slice(26))

function pem(label: string, der: Uint8Array) {
  const base64 = btoa(String.fromCharCode(...der))
  const lines = base64.match(/.{1,64}/g) ?? []
  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`, ''].join('\n')
}

function fromBase64url(part: string) {
  const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decode(part: string) {
  return JSON.parse(new TextDecoder().decode(fromBase64url(part))) as Record<string, unknown>
}

describe('signJwt', () => {
  it.each([
    ['PKCS#1', PKCS1],
    ['PKCS#8', PKCS8],
  ])('signs a valid RS256 JWT with a %s key', async (_, pem) => {
    const jwt = await signJwt(await importPrivateKey(pem), '5133601', 1_800_000_000)
    const [header, payload, signature] = jwt.split('.')
    expect(decode(header!)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decode(payload!)).toEqual({ iat: 1_799_999_940, exp: 1_800_000_540, iss: '5133601' })
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      pair.publicKey,
      fromBase64url(signature!),
      new TextEncoder().encode(`${header}.${payload}`),
    )
    expect(valid).toBe(true)
  })
})

describe('githubAppTokens', () => {
  function setup() {
    let now = new Date('2026-09-30T10:00:00Z')
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({
        token: `ghs_${fetch.mock.calls.length}`,
        expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      }),
    )
    const token = githubAppTokens(
      { appId: '5133601', installationId: '166456850', privateKey: PKCS1 },
      { fetch, now: () => now },
    )
    return { token, fetch, advance: (ms: number) => (now = new Date(now.getTime() + ms)) }
  }

  it('asks GitHub for an installation token with the App JWT', async () => {
    const { token, fetch } = setup()
    expect(await token()).toBe('ghs_1')
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe('https://api.github.com/app/installations/166456850/access_tokens')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Authorization')).toMatch(
      /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/,
    )
  })

  it('reuses the token until it is about to expire', async () => {
    const { token, fetch, advance } = setup()
    await token()
    advance(50 * 60 * 1000)
    expect(await token()).toBe('ghs_1')
    advance(6 * 60 * 1000)
    expect(await token()).toBe('ghs_2')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('fails loudly when GitHub refuses', async () => {
    const token = githubAppTokens(
      { appId: '1', installationId: '2', privateKey: PKCS1 },
      { fetch: async () => new Response('', { status: 401 }), now: () => new Date() },
    )
    await expect(token()).rejects.toThrow('401')
  })
})
