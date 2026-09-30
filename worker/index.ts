import { handle, type Env } from './handler'

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, {
      cache: caches.default,
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
      waitUntil: (promise) => ctx.waitUntil(promise),
    })
  },
} satisfies ExportedHandler<Env>
