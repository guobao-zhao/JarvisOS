import { randomUUID } from "node:crypto"
import { NodeSqliteClient } from "@opencode-ai/effect-sqlite-node"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Scope from "effect/Scope"
import type { SqlError } from "effect/unstable/sql/SqlError"
import type { MetricEvent, MetricsService, MetricsServiceConfig } from "./types"

function parseRow(row: Record<string, unknown>): MetricEvent {
  return {
    id: String(row.id),
    category: String(row.category),
    name: String(row.name),
    value: Number(row.value),
    unit: row.unit == null ? undefined : String(row.unit),
    timestamp: Number(row.timestamp),
    metadata: row.metadata == null ? undefined : parseMetadata(row.metadata),
  }
}

function parseMetadata(value: unknown): Record<string, unknown> {
  try {
    if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>
  } catch {
    // fall through
  }
  return {}
}

function run<T>(effect: Effect.Effect<T, SqlError, never>): Promise<T> {
  return Effect.runPromise(effect.pipe(Effect.orDie))
}

export function createMetricsService(config: MetricsServiceConfig): MetricsService {
  let client: NodeSqliteClient.SqliteClient | undefined
  let scope: Scope.Scope | undefined

  async function getClient() {
    if (client) return client
    scope = await Effect.runPromise(Scope.make())
    client = await Effect.runPromise(
      NodeSqliteClient.make({ filename: config.filename }).pipe(
        Effect.provideService(Scope.Scope, scope),
        Effect.provide(Reactivity.layer),
      ),
    )
    return client
  }

  async function close() {
    if (!scope) return
    const current = scope
    scope = undefined
    client = undefined
    await Effect.runPromise(Scope.close(current, Exit.void))
  }

  process.on("beforeExit", () => void close())

  return {
    async ensureSchema() {
      const c = await getClient()
      await run(
        Effect.gen(function* () {
          yield* c.unsafe(`
            CREATE TABLE IF NOT EXISTS metrics (
              id TEXT PRIMARY KEY,
              category TEXT NOT NULL,
              name TEXT NOT NULL,
              value REAL NOT NULL,
              unit TEXT,
              timestamp INTEGER NOT NULL,
              metadata TEXT
            )
          `)
          yield* c.unsafe(`
            CREATE INDEX IF NOT EXISTS idx_metrics_category_name_timestamp
            ON metrics(category, name, timestamp)
          `)
          yield* c.unsafe(`
            CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
            ON metrics(timestamp)
          `)
        }).pipe(Effect.asVoid),
      )
    },

    async record(event) {
      const c = await getClient()
      const id = randomUUID()
      await run(
        c.unsafe(
          `INSERT INTO metrics (id, category, name, value, unit, timestamp, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            event.category,
            event.name,
            event.value,
            event.unit ?? null,
            event.timestamp,
            event.metadata ? JSON.stringify(event.metadata) : null,
          ],
        ),
      )
    },

    async query(options) {
      const c = await getClient()
      const conditions = ["category = ?"]
      const params: Array<unknown> = [options.category]

      if (options.name) {
        conditions.push("name = ?")
        params.push(options.name)
      }
      if (options.since != null) {
        conditions.push("timestamp >= ?")
        params.push(options.since)
      }

      params.push(options.limit ?? 100)

      const rows = await run(
        c.unsafe<Record<string, unknown>>(
          `SELECT * FROM metrics WHERE ${conditions.join(" AND ")} ORDER BY timestamp DESC LIMIT ?`,
          params,
        ),
      )
      return rows.map(parseRow)
    },

    async latest(category, name) {
      const c = await getClient()
      const rows = await run(
        c.unsafe<Record<string, unknown>>(
          `SELECT * FROM metrics WHERE category = ? AND name = ? ORDER BY timestamp DESC LIMIT 1`,
          [category, name],
        ),
      )
      const row = rows[0]
      return row ? parseRow(row) : null
    },

    async history(category, name, limit) {
      const c = await getClient()
      const rows = await run(
        c.unsafe<Record<string, unknown>>(
          `SELECT timestamp, value FROM metrics
           WHERE category = ? AND name = ?
           ORDER BY timestamp DESC LIMIT ?`,
          [category, name, limit],
        ),
      )
      return rows
        .map((row) => ({ timestamp: Number(row.timestamp), value: Number(row.value) }))
        .reverse()
    },
  }
}
