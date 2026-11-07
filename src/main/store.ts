import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { isValidDateKey, isValidTime } from "../shared/dates"
import { snoozedUntil } from "../shared/scheduler"
import type { NewTaskInput, RepeatRule, Task, TaskPatch } from "../shared/types"

type StoreFile = {
  version: number
  tasks: Task[]
}

const MAX_EXCEPTIONS = 400
const REPEAT_RULES: RepeatRule[] = ["none", "daily", "weekly", "monthly"]

function isRepeatRule(value: unknown): value is RepeatRule {
  return typeof value === "string" && (REPEAT_RULES as string[]).includes(value)
}

function prune(dates: string[]): string[] {
  return dates.length > MAX_EXCEPTIONS ? dates.slice(-MAX_EXCEPTIONS) : dates
}

export function createStore(filePath: string) {
  let tasks: Task[] = load()

  function load(): Task[] {
    if (!existsSync(filePath)) return []

    try {
      const data = JSON.parse(readFileSync(filePath, "utf8")) as StoreFile
      return Array.isArray(data.tasks) ? data.tasks : []
    } catch {
      try {
        renameSync(filePath, `${filePath}.corrupt-${Date.now()}`)
      } catch {
        // Keep starting empty even when the backup cannot be written.
      }
      return []
    }
  }

  function persist(): void {
    mkdirSync(dirname(filePath), { recursive: true })
    const tempPath = `${filePath}.tmp`
    writeFileSync(tempPath, JSON.stringify({ version: 1, tasks }, null, 2), "utf8")
    renameSync(tempPath, filePath)
  }

  function getTasks(): Task[] {
    return structuredClone(tasks)
  }

  function addTask(input: NewTaskInput): Task {
    const title = input.title.trim()
    if (!title) throw new Error("A title is required")
    if (!isValidDateKey(input.date)) throw new Error("Invalid date")
    if (!isValidTime(input.time)) throw new Error("Invalid time")

    const task: Task = {
      id: randomUUID(),
      title,
      date: input.date,
      time: input.time,
      repeat: isRepeatRule(input.repeat) ? input.repeat : "none",
      done: false
    }

    tasks = [...tasks, task]
    persist()
    return task
  }

  function updateTask(id: string, patch: TaskPatch): void {
    tasks = tasks.map((task) => {
      if (task.id !== id) return task
      const next: Task = { ...task }
      if (patch.title !== undefined) next.title = patch.title.trim()
      if (patch.date !== undefined && isValidDateKey(patch.date)) next.date = patch.date
      if (patch.time !== undefined && isValidTime(patch.time)) next.time = patch.time
      if (patch.repeat !== undefined && isRepeatRule(patch.repeat)) next.repeat = patch.repeat
      if (!next.title) next.title = task.title
      return next
    })
    persist()
  }

  function deleteTask(id: string): void {
    tasks = tasks.filter((task) => task.id !== id)
    persist()
  }

  function toggleDone(id: string, dateKey: string): void {
    tasks = tasks.map((task) => {
      if (task.id !== id) return task
      if (task.repeat === "none") return { ...task, done: !task.done }

      const doneDates = new Set(task.doneDates ?? [])
      if (doneDates.has(dateKey)) doneDates.delete(dateKey)
      else doneDates.add(dateKey)
      return { ...task, doneDates: prune([...doneDates]) }
    })
    persist()
  }

  function dismiss(id: string, dateKey: string): void {
    tasks = tasks.map((task) => {
      if (task.id !== id) return task
      const dismissedDates = new Set(task.dismissedDates ?? [])
      dismissedDates.add(dateKey)
      return { ...task, dismissedDates: prune([...dismissedDates]) }
    })
    persist()
  }

  function snooze(id: string, dateKey: string, minutes: number, now = new Date()): void {
    tasks = tasks.map((task) => {
      if (task.id !== id) return task
      return { ...task, snoozedUntil: snoozedUntil(now, minutes), snoozedFor: dateKey }
    })
    persist()
  }

  function markFired(id: string, when: Date): void {
    tasks = tasks.map((task) => (task.id === id ? { ...task, lastFiredAt: when.toISOString() } : task))
    persist()
  }

  return { getTasks, addTask, updateTask, deleteTask, toggleDone, dismiss, snooze, markFired }
}

export type Store = ReturnType<typeof createStore>
