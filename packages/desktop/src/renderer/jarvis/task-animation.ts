import { createSignal } from "solid-js"

export const [taskPanelSourceRect, setTaskPanelSourceRect] = createSignal<DOMRect | null>(null)
