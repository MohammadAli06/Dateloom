import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { isValidDateKey, isValidTime } from "../shared/dates"
import { snoozedUntil } from "../shared/scheduler"
import { latestOccurrence } from "../shared/recurrence"
import type { NewTaskInput, RepeatRule, Task, TaskPatch } from "../shared/types"

type StoreFile = {
  version: number
  tasks: Task[]
}

const REPEAT_RULES: RepeatRule[] = ["none", "daily", "weekly", "monthly"]

function isRepeatRule(value: unknown): value is RepeatRule {
  return typeof value === "string" && (REPEAT_RULES as string[]).includes(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  )
}

function dateKeys(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isValidDateKey) : []
}

/** Keeps imported files honest: wrong dates, missing titles and junk are dropped. */
function sanitizeTask(value: unknown): Task | null {
  if (typeof value !== "object" || value === null) return null
  const input = value as Partial<Task>
  if (typeof input.title !== "string" || !input.title.trim()) return null
  if (!isValidDateKey(input.date) || !isValidTime(input.time)) return null

  const task: Task = {
    id: typeof input.id === "string" && input.id ? input.id : randomUUID(),
    title: input.title.trim(),
    date: input.date,
    time: input.time,
    repeat: isRepeatRule(input.repeat) ? input.repeat : "none",
    done: input.done === true
  }

  if (typeof input.snoozedUntil === "string") task.snoozedUntil = input.snoozedUntil
  if (typeof input.snoozedFor === "string") task.snoozedFor = input.snoozedFor
  if (typeof input.lastFiredAt === "string") task.lastFiredAt = input.lastFiredAt
  if (isStringRecord(input.firedDates)) task.firedDates = input.firedDates
  if (isStringRecord(input.snoozedDates)) task.snoozedDates = input.snoozedDates
  if (Array.isArray(input.doneDates)) task.doneDates = dateKeys(input.doneDates)
  if (Array.isArray(input.dismissedDates)) task.dismissedDates = dateKeys(input.dismissedDates)
  if (typeof input.updatedAt === "string") task.updatedAt = input.updatedAt

  return task
}

export function createStore(initialPath: string) {
  let filePath = initialPath
  let tasks: Task[] = load()
  let stamp = fileStamp()

  function fileStamp(): string {
    try {
      const info = statSync(filePath)
      return `${info.mtimeMs}:${info.size}`
    } catch {
      return ""
    }
  }

  function load(): Task[] {
    if (!existsSync(filePath)) return []

    try {
      const data = JSON.parse(readFileSync(filePath, "utf8")) as StoreFile
      if (!Array.isArray(data.tasks)) return []
      return data.tasks.map((task) => {
        // Preserve the previous format's firing record when new occurrences arrive.
        if (!task.firedDates && task.lastFiredAt) {
          const occurrence = latestOccurrence(task, new Date(task.lastFiredAt))
          if (occurrence) task.firedDates = { [occurrence.date]: task.lastFiredAt }
        }
        return task
      })
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
    stamp = fileStamp()
  }

  function newer(a: Task, b: Task): Task {
    return (a.updatedAt ?? "") >= (b.updatedAt ?? "") ? a : b
  }

  function merge(local: Task[], remote: Task[]): Task[] {
    const merged = new Map(local.map((task) => [task.id, task]))
    for (const task of remote) {
      const existing = merged.get(task.id)
      merged.set(task.id, existing ? newer(existing, task) : task)
    }
    return [...merged.values()]
  }

  /** Picks up edits written to the file by another machine (OneDrive, Dropbox). */
  function reloadIfChanged(): boolean {
    const next = fileStamp()
    if (!next || next === stamp) return false

    tasks = load()
    stamp = next
    return true
  }

  function moveTo(directory: string): void {
    filePath = join(directory, "tasks.json")
    const remote = load()
    tasks = remote.length > 0 ? merge(tasks, remote) : tasks
    persist()
  }

  /** Merges a backup file into the current tasks. Returns how many were read. */
  function importFrom(sourcePath: string): number {
    const parsed = JSON.parse(readFileSync(sourcePath, "utf8")) as unknown
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null
        ? (parsed as StoreFile).tasks
        : null

    if (!Array.isArray(list)) throw new Error("That file does not look like a Dateloom backup")

    const incoming = list.map(sanitizeTask).filter((task): task is Task => task !== null)
    if (incoming.length === 0) throw new Error("No tasks found in that file")

    tasks = merge(tasks, incoming)
    persist()
    return incoming.length
  }

  function exportTo(targetPath: string): number {
    const snapshot = { version: 1, tasks }
    mkdirSync(dirname(targetPath), { recursive: true })
    writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), "utf8")
    return tasks.length
  }

  function getTasks(): Task[] {
    return structuredClone(tasks)
  }

  function getFilePath(): string {
    return filePath
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
      done: false,
      updatedAt: new Date().toISOString()
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
      next.updatedAt = new Date().toISOString()
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
      const updatedAt = new Date().toISOString()
      if (task.repeat === "none") return { ...task, done: !task.done, updatedAt }

      const doneDates = new Set(task.doneDates ?? [])
      if (doneDates.has(dateKey)) doneDates.delete(dateKey)
      else doneDates.add(dateKey)
      return { ...task, doneDates: [...doneDates], updatedAt }
    })
    persist()
  }

  function dismiss(id: string, dateKey: string): void {
    tasks = tasks.map((task) => {
      if (task.id !== id) return task
      const dismissedDates = new Set(task.dismissedDates ?? [])
      dismissedDates.add(dateKey)
      return { ...task, dismissedDates: [...dismissedDates], updatedAt: new Date().toISOString() }
    })
    persist()
  }

  function snooze(id: string, dateKey: string, minutes: number, now = new Date()): void {
    tasks = tasks.map((task) => {
      if (task.id !== id) return task
      const until = snoozedUntil(now, minutes)
      return { ...task, snoozedUntil: until, snoozedFor: dateKey,
        snoozedDates: { ...task.snoozedDates, [dateKey]: until },
        updatedAt: new Date().toISOString() }
    })
    persist()
  }

  function markFired(id: string, dateKey: string, when: Date): void {
    tasks = tasks.map((task) => (task.id === id ? { ...task, lastFiredAt: when.toISOString(),
      firedDates: { ...task.firedDates, [dateKey]: when.toISOString() } } : task))
    persist()
  }

  return {
    getTasks,
    getFilePath,
    addTask,
    updateTask,
    deleteTask,
    toggleDone,
    dismiss,
    snooze,
    markFired,
    reloadIfChanged,
    moveTo,
    importFrom,
    exportTo
  }
}

export type Store = ReturnType<typeof createStore>
