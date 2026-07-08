import { jarvisStore } from "./Store"

export function SidePanel() {
  return (
    <aside class="w-64 border-l border-border-subtle bg-background-base/50 backdrop-blur p-4 hidden lg:flex flex-col gap-4">
      <section class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-text-tertiary">系统状态</h3>
        <div class="text-sm text-text-secondary">
          <p>模型：kimi-k2-0711-preview</p>
          <p>状态：{jarvisStore.status}</p>
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-text-tertiary">工具结果</h3>
        <div class="text-sm text-text-tertiary">暂无工具调用</div>
      </section>

      <section class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-text-tertiary">说明</h3>
        <div class="text-xs text-text-tertiary leading-relaxed">
          语音输入/输出依赖浏览器 Web Speech API。若麦克风或扬声器不可用，将自动降级为纯文本交互。
        </div>
      </section>
    </aside>
  )
}
