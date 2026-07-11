import { streamChat } from "./LLM"

export async function generateTaskTitle(
  firstUserMessage: string,
  assistantResponse: string,
): Promise<string> {
  const messages = [
    {
      role: "system" as const,
      content:
        "你是 Jarvis，宝哥的私人智能管家。请根据用户的第一条消息和你的回复，生成一个简洁的任务标题。要求：\n1. 不超过 10 个汉字或字符\n2. 准确概括任务主题\n3. 不要加标点符号\n4. 直接返回标题，不要解释",
    },
    {
      role: "user" as const,
      content: `用户：${firstUserMessage}\nJarvis：${assistantResponse.slice(0, 300)}`,
    },
  ]

  let title = ""
  await streamChat(
    messages,
    (delta) => {
      title += delta
    },
    () => {
      // ignore errors, fallback to first message slice
    },
  )

  title = title.trim().replace(/[\n\r，。！？、：""''（）《》]/g, "")
  if (!title) {
    title = firstUserMessage.slice(0, 10)
  }

  return title.slice(0, 10)
}
