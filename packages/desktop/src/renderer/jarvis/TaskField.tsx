import { createEffect, createSignal, For, onCleanup, onMount } from "solid-js"
import { jarvisActions, jarvisStore, type TaskSession } from "./Store"
import { TaskCapsule } from "./TaskCapsule"
import { writeMemory } from "./Memory"
import { extractTaskMemoryDocument } from "./task-memory"
import { setTaskPanelSourceRect } from "./task-animation"

interface CapsuleState {
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  amplitude: number
  speed: number
}

const CAPSULE_WIDTH = 180
const CAPSULE_HEIGHT = 90
const MAX_VISIBLE = 5

export function TaskField() {
  let containerRef: HTMLDivElement | undefined
  const [containerSize, setContainerSize] = createSignal({ width: 0, height: 0 })
  const capsuleStates = new Map<string, CapsuleState>()
  const capsuleElements = new Map<string, HTMLDivElement>()
  let rafId: number

  const activeTasks = () => jarvisStore.taskSessions.filter((t) => t.status === "active")
  const expandedTaskId = () => jarvisStore.expandedTaskId
  const visibleTasks = () => activeTasks().filter((t) => t.id !== expandedTaskId()).slice(0, MAX_VISIBLE)
  const overflowCount = () => Math.max(0, activeTasks().length - MAX_VISIBLE)

  function updateContainerSize() {
    if (!containerRef) return
    const rect = containerRef.getBoundingClientRect()
    setContainerSize({ width: rect.width, height: rect.height })
  }

  function initCapsuleState(taskId: string): CapsuleState {
    const { width, height } = containerSize()
    // Random position within a ring around the center (not too close, not too far)
    const angle = Math.random() * Math.PI * 2
    const radius = Math.min(width, height) * (0.22 + Math.random() * 0.18)
    return {
      x: width / 2 + Math.cos(angle) * radius - CAPSULE_WIDTH / 2,
      y: height / 2 + Math.sin(angle) * radius - CAPSULE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      amplitude: 8 + Math.random() * 8,
      speed: 0.0008 + Math.random() * 0.0006,
    }
  }

  function ensureCapsuleState(taskId: string): CapsuleState {
    if (!capsuleStates.has(taskId)) {
      capsuleStates.set(taskId, initCapsuleState(taskId))
    }
    return capsuleStates.get(taskId)!
  }

  function physicsLoop(time: number) {
    const { width, height } = containerSize()
    if (width === 0 || height === 0) {
      rafId = requestAnimationFrame(physicsLoop)
      return
    }

    const tasks = visibleTasks()
    const centerX = width / 2 - CAPSULE_WIDTH / 2
    const centerY = height / 2 - CAPSULE_HEIGHT / 2

    // Ensure states for visible tasks, remove states for closed tasks
    const visibleIds = new Set(tasks.map((t) => t.id))
    for (const id of capsuleStates.keys()) {
      if (!visibleIds.has(id)) {
        capsuleStates.delete(id)
      }
    }

    for (const task of tasks) {
      const state = ensureCapsuleState(task.id)

      // Float motion (gentle sine drift)
      const floatX = Math.sin(time * state.speed + state.phase) * state.amplitude
      const floatY = Math.cos(time * state.speed * 0.7 + state.phase) * state.amplitude * 0.6

      // Attraction toward center ring to keep capsules near the core
      const dx = centerX - state.x
      const dy = centerY - state.y
      const distToCenter = Math.sqrt(dx * dx + dy * dy)
      const targetRadius = Math.min(width, height) * (0.28 + Math.random() * 0.02)
      const pullStrength = 0.0003
      if (distToCenter > 0) {
        state.vx += (dx / distToCenter) * (distToCenter - targetRadius) * pullStrength
        state.vy += (dy / distToCenter) * (distToCenter - targetRadius) * pullStrength
      }

      // Collision repulsion between capsules
      for (const other of tasks) {
        if (other.id === task.id) continue
        const otherState = ensureCapsuleState(other.id)
        const rdx = state.x - otherState.x
        const rdy = state.y - otherState.y
        const dist = Math.sqrt(rdx * rdx + rdy * rdy)
        const minDist = Math.max(CAPSULE_WIDTH, CAPSULE_HEIGHT) * 0.95
        if (dist > 0 && dist < minDist) {
          const force = ((minDist - dist) / minDist) * 0.08
          state.vx += (rdx / dist) * force
          state.vy += (rdy / dist) * force
        }
      }

      // Boundary force (keep inside container with padding)
      const padding = 20
      if (state.x < padding) state.vx += 0.05
      if (state.x > width - CAPSULE_WIDTH - padding) state.vx -= 0.05
      if (state.y < padding) state.vy += 0.05
      if (state.y > height - CAPSULE_HEIGHT - padding) state.vy -= 0.05

      // Damping
      state.vx *= 0.92
      state.vy *= 0.92

      // Apply velocity + float offset
      state.x += state.vx
      state.y += state.vy

      // Apply to DOM
      const el = capsuleElements.get(task.id)
      if (el) {
        el.style.transform = `translate3d(${state.x + floatX}px, ${state.y + floatY}px, 0)`
      }
    }

    rafId = requestAnimationFrame(physicsLoop)
  }

  onMount(() => {
    updateContainerSize()
    window.addEventListener("resize", updateContainerSize)
    rafId = requestAnimationFrame(physicsLoop)
  })

  onCleanup(() => {
    window.removeEventListener("resize", updateContainerSize)
    cancelAnimationFrame(rafId)
  })

  // Re-measure when tasks change significantly
  createEffect(() => {
    visibleTasks() // subscribe
    updateContainerSize()
  })

  // Archive closing tasks after disappearance animation
  createEffect(() => {
    const closingTasks = jarvisStore.taskSessions.filter((t) => t.status === "closing")
    for (const task of closingTasks) {
      setTimeout(() => {
        const stillClosing = jarvisStore.taskSessions.find((t) => t.id === task.id)?.status === "closing"
        if (!stillClosing) return

        // Write memory and remove
        void (async () => {
          try {
            const doc = extractTaskMemoryDocument(task)
            await writeMemory(doc)
          } catch (err) {
            console.warn("Task memory archive failed:", err)
          } finally {
            jarvisActions.removeTask(task.id)
          }
        })()
      }, 600)
    }
  })

  return (
    <div
      ref={containerRef}
      class="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      style={{ top: "56px" }}
    >
      <For each={visibleTasks()}>
        {(task) => (
          <div
            ref={(el) => {
              capsuleElements.set(task.id, el)
            }}
            class="pointer-events-auto will-change-transform"
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <TaskCapsule
              task={task}
              onExpand={(el) => {
                if (el) setTaskPanelSourceRect(el.getBoundingClientRect())
                jarvisActions.expandTask(task.id)
              }}
            />
          </div>
        )}
      </For>
    </div>
  )
}
