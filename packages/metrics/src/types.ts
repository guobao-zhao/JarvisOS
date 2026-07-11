export interface MetricEvent {
  readonly id: string
  readonly category: string
  readonly name: string
  readonly value: number
  readonly unit?: string
  readonly timestamp: number
  readonly metadata?: Record<string, unknown>
}

export interface MetricQueryOptions {
  readonly category: string
  readonly name?: string
  readonly since?: number
  readonly limit?: number
}

export interface MetricsServiceConfig {
  readonly filename: string
}

export interface MetricsService {
  readonly ensureSchema: () => Promise<void>
  readonly record: (event: Omit<MetricEvent, "id">) => Promise<void>
  readonly query: (options: MetricQueryOptions) => Promise<readonly MetricEvent[]>
  readonly latest: (category: string, name: string) => Promise<MetricEvent | null>
  readonly history: (
    category: string,
    name: string,
    limit: number,
  ) => Promise<readonly { readonly timestamp: number; readonly value: number }[]>
}
