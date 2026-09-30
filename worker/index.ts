import { handle, type Env } from './handler'
import { d1Lookups } from './lookups'

interface WorkerEnv extends Env {
  DB?: D1Database
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
    })
  },
} satisfies ExportedHandler<WorkerEnv>
