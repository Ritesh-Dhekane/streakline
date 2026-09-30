import { githubAppTokens } from './githubApp'
import { handle, type Env } from './handler'
import { d1Lookups } from './lookups'

interface WorkerEnv extends Env {
  DB?: D1Database
  GITHUB_APP_ID?: string
  GITHUB_APP_INSTALLATION_ID?: string
  GITHUB_APP_PRIVATE_KEY?: string
}

// Per isolate, so the installation token is reused across requests.
let appToken: (() => Promise<string>) | undefined

function appTokens(env: WorkerEnv) {
  const { GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY } = env
  if (!GITHUB_APP_ID || !GITHUB_APP_INSTALLATION_ID || !GITHUB_APP_PRIVATE_KEY) return undefined
  appToken ??= githubAppTokens(
    {
      appId: GITHUB_APP_ID,
      installationId: GITHUB_APP_INSTALLATION_ID,
      privateKey: GITHUB_APP_PRIVATE_KEY,
    },
    { fetch: (input, init) => fetch(input, init), now: () => new Date() },
  )
  return appToken
}

export default {
  fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, {
      cache: caches.default,
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
      waitUntil: (promise) => ctx.waitUntil(promise),
      // Without a D1 binding (e.g. local dev) there's no lookup limit.
      lookups: env.DB ? d1Lookups(env.DB) : undefined,
      appToken: appTokens(env),
    })
  },
} satisfies ExportedHandler<WorkerEnv>
