import { For, Show } from "solid-js"
import { jarvisStore } from "./Store"

export function MemoryOrb() {
  const hasMemories = () => jarvisStore.recalledMemories.length > 0
  const isRecalling = () => jarvisStore.isRecallingMemories

  return (
    <div class="memory-orb-container group relative z-50 flex h-28 w-28 items-center justify-center">
      {/* Hover popover */}
      <Show when={hasMemories()}>
        <div class="memory-popover absolute top-full left-1/2 -translate-x-1/2 mt-4 w-80 max-h-[55vh] flex flex-col rounded-[22px] p-[1px] opacity-0 -translate-y-2 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto shadow-[0_0_50px_rgba(0,219,231,0.18)] overflow-hidden">
          {/* Gradient border glow layer */}
          <div class="absolute inset-0 rounded-[22px] bg-gradient-to-br from-cyan-300/40 via-cyan-500/20 to-transparent opacity-80 blur-[1px]" />
          <div class="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-cyan-400/30 via-white/5 to-cyan-300/20" />

          <div class="memory-popover-inner relative max-h-[calc(55vh-2px)] w-full overflow-y-auto rounded-[21px] bg-[#070c0e]/85 p-4 backdrop-blur-md">
            {/* Top accent line */}
            <div class="absolute left-4 right-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

            <div class="mb-3 flex items-center justify-between border-b border-cyan-400/20 pb-2">
              <div class="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 text-shadow-cyan">
                记忆 // 已召回
              </div>
              <span class="text-[10px] text-cyan-300/60 font-mono">
                {jarvisStore.recalledMemories.length} 条记录
              </span>
            </div>
            <For each={jarvisStore.recalledMemories}>
              {(hit) => (
                <div class="mb-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 last:mb-0 hover:border-cyan-400/20 hover:bg-white/[0.06] transition-colors">
                  <div class="flex items-center justify-between text-[10px] text-cyan-300/70">
                    <span class="uppercase tracking-wider">{hit.source}</span>
                    <span class="font-mono">{Math.round(hit.score * 100)}%</span>
                  </div>
                  <div class="mt-1 text-sm font-medium text-cyan-50 truncate">{hit.title}</div>
                  <div class="mt-1 text-xs leading-relaxed text-cyan-100/60 line-clamp-4">{hit.content}</div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <button
        type="button"
        class="memory-orb relative flex h-full w-full items-center justify-center"
        classList={{ "memory-orb--recalling": isRecalling() }}
        aria-label="记忆"
      >
        {/* Orbital rings */}
        <svg class="memory-orb-ring memory-orb-ring--forward absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] opacity-60" viewBox="0 0 200 200">
          <path
            d="M100,10 C149.705627,10 190,50.2943725 190,100 C190,149.705627 149.705627,190 100,190 C50.2943725,190 10,149.705627 10,100 C10,50.2943725 50.2943725,10 100,10 Z"
            fill="none"
            stroke="#00dbe7"
            stroke-dasharray="2 8"
            stroke-width="1.5"
          />
        </svg>
        <svg class="memory-orb-ring memory-orb-ring--reverse absolute inset-[-8px] h-[calc(100%+16px)] w-[calc(100%+16px)] opacity-40" viewBox="0 0 200 200">
          <path
            d="M100,20 C144.18278,20 180,55.81722 180,100 C180,144.18278 144.18278,180 100,180 C55.81722,180 20,144.18278 20,100 C20,55.81722 55.81722,20 100,20 Z"
            fill="none"
            stroke="#ff8c00"
            stroke-dasharray="4 12"
            stroke-width="1"
          />
        </svg>
        <svg class="memory-orb-ring memory-orb-ring--fast absolute inset-0 h-full w-full opacity-70" viewBox="0 0 200 200">
          <circle cx="100" cy="100" fill="none" r="85" stroke="#00dbe7" stroke-dasharray="40 10 5 10" stroke-width="1.5" />
        </svg>

        {/* Glowing orb */}
        <div class="memory-orb-glow absolute h-16 w-16 rounded-full bg-gradient-to-tr from-cyan-500/40 to-cyan-300/60 blur-md" />
        <div class="memory-orb-core relative h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-400 to-cyan-100 shadow-[0_0_24px_#00f0ff]" />

      </button>
    </div>
  )
}
