import { Show } from "solid-js"
import type { TaskSession } from "./Store"

interface TaskCapsuleProps {
  task: TaskSession
  onExpand: (el: HTMLDivElement | undefined) => void
}

function lastMessagePreview(task: TaskSession): string {
  const last = task.messages[task.messages.length - 1]
  if (!last) return ""
  return last.content.slice(0, 60)
}

export function TaskCapsule(props: TaskCapsuleProps) {
  let mainRef: HTMLDivElement | undefined

  function handleExpand() {
    props.onExpand(mainRef)
  }

  return (
    <div
      ref={mainRef}
      class={`jarvis-float-bubble group relative cursor-pointer overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.03] ${
        props.task.status === "closing" ? "task-capsule--closing" : ""
      }`}
      style={{ width: "200px", "min-height": "92px" }}
      onClick={handleExpand}
      onPointerDown={handleExpand}
      role="button"
      tabindex="0"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleExpand()
        }
      }}
    >
      <div class="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#00f2ff] via-[#00dbe7] to-transparent opacity-80" />

      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 truncate text-[10px] font-bold uppercase tracking-[0.15em] text-[#00f2ff] text-shadow-cyan">
          {props.task.title || "新任务"}
        </div>
        <Show when={props.task.status === "active"}>
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f2ff] shadow-[0_0_6px_#00f2ff]" />
        </Show>
      </div>

      <div class="mt-2 line-clamp-2 text-[12px] leading-relaxed text-white/90">
        {lastMessagePreview(props.task)}
      </div>

      <Show when={props.task.messages.length > 1}>
        <div class="mt-2 flex items-center gap-1.5 text-[9px] text-cyan-200/50">
          <span class="font-mono">{props.task.messages.length} 条对话</span>
        </div>
      </Show>
    </div>
  )
}
