import { addDaysToKey, daysBetweenKeys, dueDateTime, fromDateKey, lastDayOfMonth, toDateKey } from "./dates"
import type { Task } from "./types"

export type Occurrence = {
  date: string
  dueAt: Date
}

export function monthlyDayFor(anchorDay: number, year: number, month: number): number {
  return Math.min(anchorDay, lastDayOfMonth(year, month))
}

export function occursOn(task: Task, dateKey: string): boolean {
  const offset = daysBetweenKeys(task.date, dateKey)
  if (offset < 0) return false

  switch (task.repeat) {
    case "none":
      return offset === 0
    case "daily":
      return true
    case "weekly":
      return offset % 7 === 0
    case "monthly": {
      const date = fromDateKey(dateKey)
      const anchor = fromDateKey(task.date)
      return date.getDate() === monthlyDayFor(anchor.getDate(), date.getFullYear(), date.getMonth())
    }
  }
}

export function latestOccurrence(task: Task, now: Date): Occurrence | null {
  if (task.repeat === "none") {
    const dueAt = dueDateTime(task.date, task.time)
    return dueAt.getTime() <= now.getTime() ? { date: task.date, dueAt } : null
  }

  const todayKey = toDateKey(now)
  if (daysBetweenKeys(task.date, todayKey) < 0) return null

  if (task.repeat === "daily" || task.repeat === "weekly") {
    const step = task.repeat === "daily" ? 1 : 7
    const offset = Math.floor(daysBetweenKeys(task.date, todayKey) / step) * step
    let key = addDaysToKey(task.date, offset)
    let dueAt = dueDateTime(key, task.time)

    if (dueAt.getTime() > now.getTime()) {
      if (offset < step) return null
      key = addDaysToKey(task.date, offset - step)
      dueAt = dueDateTime(key, task.time)
    }

    return { date: key, dueAt }
  }

  const anchor = fromDateKey(task.date)
  const today = fromDateKey(todayKey)
  const anchorDay = anchor.getDate()
  let cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  let latest: Occurrence | null = null

  while (cursor.getTime() <= lastMonth.getTime()) {
    const key = toDateKey(
      new Date(cursor.getFullYear(), cursor.getMonth(), monthlyDayFor(anchorDay, cursor.getFullYear(), cursor.getMonth()))
    )
    const dueAt = dueDateTime(key, task.time)
    if (dueAt.getTime() <= now.getTime()) latest = { date: key, dueAt }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return latest
}

export function isOccurrenceDone(task: Task, dateKey: string): boolean {
  if (task.repeat === "none") return task.done
  return task.doneDates?.includes(dateKey) ?? false
}

export function isOccurrenceDismissed(task: Task, dateKey: string): boolean {
  return task.dismissedDates?.includes(dateKey) ?? false
}

export function occurrencesOn(tasks: Task[], dateKey: string): Task[] {
  return tasks.filter((task) => occursOn(task, dateKey)).sort((a, b) => a.time.localeCompare(b.time))
}
