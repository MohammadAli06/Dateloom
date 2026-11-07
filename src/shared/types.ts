export type RepeatRule = "none" | "daily" | "weekly" | "monthly"

export type ThemePreference = "light" | "dark"

export type StorageInfo = {
  dir: string
  defaultDir: string
  isDefault: boolean
}

export type ImportExportResult = {
  ok: boolean
  count: number
  message: string
}

export type Task = {
  id: string
  title: string
  date: string
  time: string
  repeat: RepeatRule
  done: boolean
  snoozedUntil?: string
  snoozedFor?: string
  lastFiredAt?: string
  firedDates?: Record<string, string>
  snoozedDates?: Record<string, string>
  doneDates?: string[]
  dismissedDates?: string[]
  updatedAt?: string
}

export type NewTaskInput = {
  title: string
  date: string
  time: string
  repeat: RepeatRule
}

export type TaskPatch = Partial<Pick<Task, "title" | "date" | "time" | "repeat">>
