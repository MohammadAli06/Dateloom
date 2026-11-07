import { describe, expect, it } from "vitest"
import { getPendingReminders } from "../src/shared/scheduler"
import type { Task } from "../src/shared/types"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Call the bank",
    date: "2026-01-05",
    time: "09:00",
    repeat: "none",
    done: false,
    ...overrides
  }
}

describe("getPendingReminders", () => {
  it("keeps an on-time card on-time across later ticks and restart", () => {
    const task = makeTask({ firedDates: { "2026-01-05": new Date(2026, 0, 5, 9, 0, 10).toISOString() } })
    expect(getPendingReminders([task], new Date(2026, 0, 6))[0].missed).toBe(false)
  })

  it("preserves the missed label of an originally late firing", () => {
    const task = makeTask({ firedDates: { "2026-01-05": new Date(2026, 0, 5, 10).toISOString() } })
    expect(getPendingReminders([task], new Date(2026, 0, 6))[0].missed).toBe(true)
  })

  it("restores legacy firing state", () => {
    const task = makeTask({ lastFiredAt: new Date(2026, 0, 5, 9, 0, 10).toISOString() })
    expect(getPendingReminders([task], new Date(2026, 0, 6))[0].missed).toBe(false)
  })

  it("keeps independent snoozes across recurrence boundaries", () => {
    const task = makeTask({ repeat: "daily", snoozedDates: {
      "2026-01-05": new Date(2026, 0, 6, 9, 10).toISOString(),
      "2026-01-06": new Date(2026, 0, 6, 9, 30).toISOString()
    } })
    expect(getPendingReminders([task], new Date(2026, 0, 6, 9, 5))).toEqual([])
    expect(getPendingReminders([task], new Date(2026, 0, 6, 9, 10)).map(item => item.occurrenceDate)).toEqual(["2026-01-05"])
    expect(getPendingReminders([task], new Date(2026, 0, 6, 9, 30))).toHaveLength(2)
  })

  it("does not assign an older occurrence's firing to today's occurrence", () => {
    const fired = new Date(2026, 0, 6, 9).toISOString()
    const task = makeTask({ repeat: "daily", lastFiredAt: fired, firedDates: { "2026-01-05": fired } })
    const pending = getPendingReminders([task], new Date(2026, 0, 6, 10))
    expect(pending[1].missed).toBe(true)
  })

  it("fires a one-off task as soon as its time arrives", () => {
    const pending = getPendingReminders([makeTask()], new Date(2026, 0, 5, 9, 0, 10))
    expect(pending).toHaveLength(1)
    expect(pending[0].missed).toBe(false)
    expect(pending[0].occurrenceDate).toBe("2026-01-05")
  })

  it("ignores tasks that are not due yet", () => {
    expect(getPendingReminders([makeTask()], new Date(2026, 0, 5, 8, 59))).toEqual([])
  })

  it("labels reminders that are well past due as missed", () => {
    const pending = getPendingReminders([makeTask()], new Date(2026, 0, 5, 11, 0))
    expect(pending[0].missed).toBe(true)
  })

  it("catches up on days-old tasks", () => {
    const pending = getPendingReminders([makeTask()], new Date(2026, 0, 9, 7, 0))
    expect(pending).toHaveLength(1)
    expect(pending[0].missed).toBe(true)
  })

  it("skips completed one-off tasks", () => {
    const pending = getPendingReminders([makeTask({ done: true })], new Date(2026, 0, 5, 10, 0))
    expect(pending).toEqual([])
  })

  it("skips dismissed occurrences", () => {
    const pending = getPendingReminders(
      [makeTask({ dismissedDates: ["2026-01-05"] })],
      new Date(2026, 0, 5, 10, 0)
    )
    expect(pending).toEqual([])
  })

  it("treats daily repeats as due each day", () => {
    const task = makeTask({ repeat: "daily" })
    const pending = getPendingReminders([task], new Date(2026, 0, 8, 9, 1))
    expect(pending.map(item => item.occurrenceDate)).toEqual(["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"])
  })

  it("retains earlier unhandled occurrences when today is done", () => {
    const task = makeTask({ repeat: "daily", doneDates: ["2026-01-08"] })
    const pending = getPendingReminders([task], new Date(2026, 0, 8, 10, 0))
    expect(pending.map(item => item.occurrenceDate)).toEqual(["2026-01-05", "2026-01-06", "2026-01-07"])
  })

  it("shows a missed monthly occurrence on the clamped day", () => {
    const task = makeTask({ date: "2026-01-31", repeat: "monthly", doneDates: ["2026-01-31"] })
    const pending = getPendingReminders([task], new Date(2026, 1, 28, 10, 0))
    expect(pending[0].occurrenceDate).toBe("2026-02-28")
  })

  it("honours snooze before the snooze time", () => {
    const task = makeTask({ snoozedFor: "2026-01-05", snoozedUntil: new Date(2026, 0, 5, 9, 5).toISOString() })
    const pending = getPendingReminders([task], new Date(2026, 0, 5, 9, 2))
    expect(pending).toEqual([])
  })

  it("re-fires after the snooze elapses without calling it missed", () => {
    const task = makeTask({ snoozedFor: "2026-01-05", snoozedUntil: new Date(2026, 0, 5, 9, 5).toISOString() })
    const pending = getPendingReminders([task], new Date(2026, 0, 5, 9, 5, 10))
    expect(pending).toHaveLength(1)
    expect(pending[0].missed).toBe(false)
    expect(pending[0].dueAt).toBe(task.snoozedUntil)
  })

  it("labels a long-overdue snooze as missed", () => {
    const task = makeTask({ snoozedFor: "2026-01-05", snoozedUntil: new Date(2026, 0, 5, 9, 5).toISOString() })
    const pending = getPendingReminders([task], new Date(2026, 0, 5, 10, 0))
    expect(pending[0].missed).toBe(true)
  })

  it("ignores a snooze that belongs to an earlier occurrence", () => {
    const task = makeTask({
      repeat: "daily",
      snoozedFor: "2026-01-04",
      snoozedUntil: new Date(2026, 0, 4, 9, 10).toISOString()
    })
    const pending = getPendingReminders([task], new Date(2026, 0, 5, 9, 1))
    expect(pending[0].occurrenceDate).toBe("2026-01-05")
    expect(pending[0].missed).toBe(false)
  })

  it("stacks several due reminders oldest first", () => {
    const tasks = [
      makeTask({ id: "late", title: "Late", time: "08:00" }),
      makeTask({ id: "early", title: "Early", time: "07:00" }),
      makeTask({ id: "soon", title: "Soon", time: "09:00" })
    ]
    const pending = getPendingReminders(tasks, new Date(2026, 0, 5, 9, 0, 30))
    expect(pending.map((reminder) => reminder.taskId)).toEqual(["early", "late", "soon"])
  })
})
