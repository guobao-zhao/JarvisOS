import { createSignal, For, type Component } from "solid-js"
import { JarvisCore } from "@/components/hud/core"
import "./hud.css"

/**
 * JarvisOS HUD 主页面
 *
 * 以 jarvis_hud.html 中的核心圆环组件为中心，扩展出完整 HUD 界面：
 * - 顶部状态栏：问候语 + 系统状态
 * - 左侧能力 dock：Chat / Memory / Tools / Projects / Intelligence / Settings
 * - 中央核心：JarvisCore 组件
 * - 右侧卫星面板：Memory Recall / Active Tasks / System Telemetry
 * - 底部输入控制台：语音按钮 + 输入框 + 快捷 chips
 */
const CAPABILITIES = [
  { id: "chat", icon: "◉", label: "CHAT" },
  { id: "memory", icon: "◎", label: "MEMORY" },
  { id: "tools", icon: "⚙", label: "TOOLS" },
  { id: "projects", icon: "▣", label: "PROJECTS" },
  { id: "intelligence", icon: "◈", label: "INTEL" },
  { id: "settings", icon: "✦", label: "SETTINGS" },
]

const QUICK_ACTIONS = ["总结今日", "查代码", "写文档", "看指标", "启动任务"]

const MEMORIES = [
  { tag: "偏好", text: "宝哥习惯早上 9 点看晨报" },
  { tag: "任务", text: "JarvisOS Phase 3 Memory 接入待开始" },
  { tag: "项目", text: "jproduct-service benefit 模块多个 OpenSpec 在编码中" },
]

const TASKS = [
  { name: "提交 Phase 2 代码", status: "done" },
  { name: "Phase E 校准", status: "done" },
  { name: "Memory 模块设计", status: "pending" },
]

const METRICS = [
  { label: "CPU", value: 42, color: "#00ffff" },
  { label: "MEM", value: 38, color: "#00ffff" },
  { label: "NET", value: 91, color: "#ffb43c" },
]

const formatTime = () => {
  const now = new Date()
  return now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

export const HudPage: Component = () => {
  const [activeCap, setActiveCap] = createSignal("chat")
  const [time, setTime] = createSignal(formatTime())

  // Update time every minute
  setInterval(() => setTime(formatTime()), 60_000)

  return (
    <div class="jarvis-page-hud">
      {/* Background effects */}
      <div class="jarvis-page-hud__bg-grid" />
      <div class="jarvis-page-hud__scanline" />

      {/* Top status bar */}
      <header class="jarvis-page-hud__topbar">
        <div class="jarvis-page-hud__greeting">
          <span class="jarvis-page-hud__greeting-label">JARVIS_OS_v4.2</span>
          <span class="jarvis-page-hud__greeting-text">早安，宝哥</span>
        </div>
        <div class="jarvis-page-hud__system">
          <span class="jarvis-page-hud__time">{time()}</span>
          <span class="jarvis-page-hud__status-badge">
            <span class="jarvis-page-hud__status-dot" />
            SYSTEM ONLINE
          </span>
        </div>
      </header>

      {/* Left capability dock */}
      <nav class="jarvis-page-hud__dock">
        <For each={CAPABILITIES}>
          {(cap) => (
            <button
              type="button"
              class="jarvis-page-hud__dock-item"
              classList={{ "jarvis-page-hud__dock-item--active": activeCap() === cap.id }}
              onClick={() => setActiveCap(cap.id)}
              title={cap.label}
            >
              <span
                class="jarvis-page-hud__dock-icon"
                classList={{ "jarvis-page-hud__dock-icon--active": activeCap() === cap.id }}
              >
                {cap.icon}
              </span>
              <span class="jarvis-page-hud__dock-label">{cap.label}</span>
            </button>
          )}
        </For>
      </nav>

      {/* Center stage */}
      <main class="jarvis-page-hud__stage">
        <JarvisCore showControl={false} />
      </main>

      {/* Right satellite panel */}
      <aside class="jarvis-page-hud__satellite">
        {/* Memory Recall */}
        <section class="jarvis-page-hud__card">
          <div class="jarvis-page-hud__card-header">
            <span>MEMORY RECALL</span>
            <span class="jarvis-page-hud__card-meta">03</span>
          </div>
          <div class="jarvis-page-hud__card-body">
            <For each={MEMORIES}>
              {(item) => (
                <div class="jarvis-page-hud__memory-item">
                  <span class="jarvis-page-hud__memory-tag">{item.tag}</span>
                  <span class="jarvis-page-hud__memory-text">{item.text}</span>
                </div>
              )}
            </For>
          </div>
        </section>

        {/* Active Tasks */}
        <section class="jarvis-page-hud__card">
          <div class="jarvis-page-hud__card-header">
            <span>ACTIVE TASKS</span>
            <span class="jarvis-page-hud__card-meta">{TASKS.length}</span>
          </div>
          <div class="jarvis-page-hud__card-body">
            <For each={TASKS}>
              {(task) => (
                <div class="jarvis-page-hud__task-item">
                  <span
                    class="jarvis-page-hud__task-status"
                    classList={{ "jarvis-page-hud__task-status--done": task.status === "done" }}
                  />
                  <span class="jarvis-page-hud__task-name">{task.name}</span>
                </div>
              )}
            </For>
          </div>
        </section>

        {/* System Telemetry */}
        <section class="jarvis-page-hud__card">
          <div class="jarvis-page-hud__card-header">
            <span>SYSTEM TELEMETRY</span>
            <span class="jarvis-page-hud__card-meta">LIVE</span>
          </div>
          <div class="jarvis-page-hud__card-body">
            <div class="jarvis-page-hud__telemetry">
              <For each={METRICS}>
                {(metric) => (
                  <div class="jarvis-page-hud__metric">
                    <span class="jarvis-page-hud__metric-label">{metric.label}</span>
                    <div class="jarvis-page-hud__metric-bar">
                      <div
                        class="jarvis-page-hud__metric-fill"
                        style={{
                          width: `${metric.value}%`,
                          "background-color": metric.color,
                          "box-shadow": `0 0 10px ${metric.color}`,
                        }}
                      />
                    </div>
                    <span class="jarvis-page-hud__metric-value">{metric.value}%</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>
      </aside>

      {/* Bottom input console */}
      <footer class="jarvis-page-hud__console">
        <div class="jarvis-page-hud__quick-actions">
          <For each={QUICK_ACTIONS}>
            {(action) => (
              <button type="button" class="jarvis-page-hud__chip">
                {action}
              </button>
            )}
          </For>
        </div>
        <div class="jarvis-page-hud__input-bar">
          <button type="button" class="jarvis-page-hud__mic-btn">
            ◉
          </button>
          <input
            type="text"
            class="jarvis-page-hud__input"
            placeholder="输入指令或按住麦克风说话..."
          />
          <button type="button" class="jarvis-page-hud__send-btn">
            →
          </button>
        </div>
      </footer>
    </div>
  )
}

export default HudPage
