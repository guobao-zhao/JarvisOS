export type MemorySource =
  | "conversation"
  | "intelligence"
  | "user_manual"
  | "task"
  | "insight"

export interface MemoryDocument {
  id: string
  source: MemorySource
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  relations?: string[]
}

export interface MemoryHit {
  id: string
  title: string
  content: string
  score: number
  source: MemorySource
  path?: string
}

export interface MemoryHealth {
  ok: boolean
  authConfigured: boolean
  projectResolved: boolean
  writable: boolean
  reason?: string
}

export interface MemorySearchOptions {
  topK?: number
  source?: MemorySource
  includeContent?: boolean
}

export interface MemoryService {
  health(): Promise<MemoryHealth>
  search(query: string, options?: MemorySearchOptions): Promise<MemoryHit[]>
  read(id: string): Promise<MemoryDocument | null>
  write(doc: MemoryDocument): Promise<void>
}
