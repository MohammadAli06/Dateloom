import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import type { ThemePreference } from "../shared/types"

export type Settings = {
  theme: ThemePreference
  tasksDir: string | null
}

function isTheme(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark"
}

export function createSettings(filePath: string, defaultTheme: ThemePreference) {
  let current = load()

  function load(): Settings {
    if (!existsSync(filePath)) return { theme: defaultTheme, tasksDir: null }

    try {
      const data = JSON.parse(readFileSync(filePath, "utf8")) as Partial<Settings>
      return {
        theme: isTheme(data.theme) ? data.theme : defaultTheme,
        tasksDir: typeof data.tasksDir === "string" && data.tasksDir ? data.tasksDir : null
      }
    } catch {
      return { theme: defaultTheme, tasksDir: null }
    }
  }

  function update(patch: Partial<Settings>): void {
    current = { ...current, ...patch }
    mkdirSync(dirname(filePath), { recursive: true })
    const tempPath = `${filePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(current, null, 2), "utf8")
    renameSync(tempPath, filePath)
  }

  return { get: (): Settings => ({ ...current }), update }
}

export type SettingsStore = ReturnType<typeof createSettings>
