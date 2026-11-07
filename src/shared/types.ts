export type RepeatRule = "none" | "daily" | "weekly" | "monthly"

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
  doneDates?: string[]
  dismissedDates?: string[]
}

export type NewTaskInput = {
  title: string
  date: string
  time: string
  repeat: RepeatRule
}

export type TaskPatch = Partial<Pick<Task, "title" | "date" | "time" | "repeat">>
