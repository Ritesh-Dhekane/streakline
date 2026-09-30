// D1-backed record of who looked up whom, for the per-visitor daily allowance.
// Schema: migrations/0001_create_lookups.sql.

import { LOOKUP_WINDOW_SECONDS, type Lookup } from '../shared/limits'
import type { LookupStore } from './handler'

export function d1Lookups(db: D1Database): LookupStore {
  return {
    async recent(visitor, since) {
      const { results } = await db
        .prepare('SELECT login, at FROM lookups WHERE visitor = ?1 AND at > ?2')
        .bind(visitor, since)
        .all<Lookup>()
      return results
    },
    async record(visitor, login, at) {
      // Also drop everyone's expired rows, so the table only ever holds the last day.
      await db.batch([
        db
          .prepare('INSERT INTO lookups (visitor, login, at) VALUES (?1, ?2, ?3)')
          .bind(visitor, login, at),
        db.prepare('DELETE FROM lookups WHERE at <= ?1').bind(at - LOOKUP_WINDOW_SECONDS),
      ])
    },
  }
}
