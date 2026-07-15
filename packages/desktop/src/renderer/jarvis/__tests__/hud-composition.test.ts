import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("JarvisOS HUD composition", () => {
  it("does not render legacy sidebars together with the holographic hub", () => {
    const source = readFileSync(join(import.meta.dir, "../HUD.tsx"), "utf8")

    expect(source).toContain("<HolographicHub />")
    expect(source).not.toContain("<LeftSidebar />")
    expect(source).not.toContain("<RightSidebar />")
  })
})
