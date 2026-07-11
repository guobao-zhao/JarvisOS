import { For, Show } from "solid-js"
import { jarvisActions, jarvisStore, type TaskSession } from "./Store"

function SegmentBar(props: { value: number; color?: string }) {
  const total = 10
  const active = () => Math.min(total, Math.max(0, Math.round(props.value * total)))

  return (
    <div class="jarvis-segment-bar">
      {Array.from({ length: total }, (_, i) => (
        <div
          classList={{ active: i < active() }}
          style={
            i < active() && props.color
              ? { "background-color": props.color, "box-shadow": `0 0 6px ${props.color}` }
              : undefined
          }
        />
      ))}
    </div>
  )
}

function TaskRow(props: { task: TaskSession }) {
  const progress = () => Math.min(1, props.task.messages.length / 8)
  const isActive = () => props.task.status === "active"
  const statusText = () => {
    if (props.task.status === "closing") return "结束中"
    if (props.task.status === "closed") return "已结束"
    if (props.task.messages.length <= 1) return "等待响应"
    return "进行中"
  }
  const statusColor = () => {
    if (props.task.status === "closing") return "#ef4444"
    if (props.task.status === "closed") return "#71717a"
    if (props.task.messages.length <= 1) return "#f59e0b"
    return "#00f2ff"
  }

  return (
    <button
      type="button"
      onClick={() => jarvisActions.expandTask(props.task.id)}
      class="w-full text-left transition-colors hover:bg-white/[0.04] rounded-lg px-2 py-2 -mx-2"
    >
      <div class="flex items-center justify-between text-[11px]">
        <span class="max-w-[120px] truncate font-medium uppercase tracking-wider text-cyan-200">
          {props.task.title || "新任务"}
        </span>
        <span class="text-[10px] font-bold" style={{ color: statusColor() }}>
          {statusText()}
        </span>
      </div>
      <div class="mt-1.5">
        <SegmentBar value={progress()} color={isActive() ? statusColor() : undefined} />
      </div>
      <div class="mt-1 line-clamp-1 text-[10px] text-white/40">
        {props.task.messages[props.task.messages.length - 1]?.content.slice(0, 48) || ""}
      </div>
    </button>
  )
}

export function TaskOrb() {
  const tasks = () => jarvisStore.taskSessions
  const activeTasks = () =>
    tasks()
      .filter((t) => t.status === "active")
      .sort((a, b) => b.updatedAt - a.updatedAt)
  const inactiveTasks = () =>
    tasks()
      .filter((t) => t.status !== "active")
      .sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <Show when={tasks().length > 0}>
      <div class="pointer-events-auto jarvis-task-orb-enter flex w-64 flex-col gap-3 text-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200 text-shadow-cyan">
            任务
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-cyan-200/60 font-mono">{activeTasks().length}</span>
          <div class="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
        </div>
      </div>

      <div class="max-h-[380px] overflow-y-auto pr-1 space-y-1">
        <Show when={activeTasks().length > 0}>
          <For each={activeTasks()}>{(task) => <TaskRow task={task} />}</For>
        </Show>

        <Show when={inactiveTasks().length > 0}>
          <div class="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />
          <For each={inactiveTasks()}>{(task) => <TaskRow task={task} />}</For>
        </Show>
      </div>
    </div>
    </Show>
  )
}
