import type { MemoryDocument } from "./types"

export function formatMemoryDocument(doc: MemoryDocument): string {
  const tags = doc.tags.length ? `\ntags: ${doc.tags.join(", ")}` : ""
  const relations = doc.relations?.length ? `\nrelations: ${doc.relations.join(", ")}` : ""
  return `---\nsource: ${doc.source}\nid: ${doc.id}\ntitle: ${doc.title}\ncreatedAt: ${doc.createdAt}\nupdatedAt: ${doc.updatedAt}${tags}${relations}\n---\n\n${doc.content}\n`
}
