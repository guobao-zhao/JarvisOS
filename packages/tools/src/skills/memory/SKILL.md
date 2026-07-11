---
name: memory
description: JarvisOS 记忆工具 skill，让 LLM 在对话中主动搜索历史记忆。
triggers:
  - memory_search
  - 回忆
  - 记得
---

# Memory Skill

提供 `memory_search` 工具，用于在用户提问时从 LLM-wiki 召回相关记忆。

## 工具

### `memory_search`

- **用途**：当用户问题可能依赖历史事实、偏好、决策或任务时调用。
- **参数**：
  - `query` (string, required): 搜索关键词或用户问题原文。
  - `topK` (number, optional): 返回条数，默认 5。
  - `source` (string, optional): 按来源过滤，可选 `conversation|intelligence|user_manual|task|insight`。
- **返回**：`{ hits: MemoryHit[] }`，包含 id、title、content、score、source。
