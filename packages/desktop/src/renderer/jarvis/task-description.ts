import { streamChat } from "./LLM"

export async function generateTaskDescription(firstUserMessage: string): Promise<string> {
  const messages = [
    {
      role: "system" as const,
      content:
        "你是 Jarvis，宝哥的私人智能管家。请根据用户的第一条消息，生成一句简短的任务描述。要求：\n1. 不超过 30 个汉字\n2. 概括用户想做什么\n3. 不要加多余解释\n4. 直接返回描述",
    },
    {
      role: "user" as const,
      content: firstUserMessage,
    },
  ]

  let description = ""
  await streamChat(
    messages,
    (delta) => {
      description += delta
    },
    () => {
      // ignore errors, fallback to first message slice
    },
  )

  description = description.trim().replace(/[\n\r]/g, "")
  if (!description) {
    description = firstUserMessage.slice(0, 40)
  }

  return description.slice(0, 60)
}
