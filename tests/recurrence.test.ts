import { describe, expect, it } from "vitest"
import { daysBetweenKeys } from "../src/shared/dates"
import { latestOccurrence, monthlyDayFor, nextOccurrence, occursOn } from "../src/shared/recurrence"
import type { Task } from "../src/shared/types"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Water plants",
    date: "2026-01-05",
    time: "09:00",
    repeat: "none",
    done: false,
    ...overrides
  }
}

describe("nextOccurrence", () => {
  it("returns the first future occurrence and stops after a one-off", () => {
    expect(nextOccurrence(makeTask(), new Date(2026, 0, 4))?.date).toBe("2026-01-05")
    expect(nextOccurrence(makeTask(), new Date(2026, 0, 5, 9))).toBeNull()
  })
  it("advances daily and weekly at the exact due time", () => {
    expect(nextOccurrence(makeTask({ repeat: "daily" }), new Date(2026, 0, 5, 9))?.date).toBe("2026-01-06")
    expect(nextOccurrence(makeTask({ repeat: "weekly" }), new Date(2026, 0, 5, 9))?.date).toBe("2026-01-12")
  })
  it("keeps today's slot when its time is ahead", () => {
    expect(nextOccurrence(makeTask({ repeat: "daily" }), new Date(2026, 0, 8, 8))?.date).toBe("2026-01-08")
  })
  it("clamps February then restores the original day in March", () => {
    const task = makeTask({ date: "2026-01-31", repeat: "monthly" })
    const feb = nextOccurrence(task, new Date(2026, 0, 31, 9))!
    expect(feb.date).toBe("2026-02-28")
    expect(nextOccurrence(task, feb.dueAt)?.date).toBe("2026-03-31")
    expect(nextOccurrence(task, new Date(2028, 0, 31, 9))?.date).toBe("2028-02-29")
    expect(nextOccurrence(task, new Date(2026, 11, 31, 9))?.date).toBe("2027-01-31")
  })
})

describe("occursOn", () => {
  it("matches only its own date for a one-off task", () => {
    const task = makeTask()
    expect(occursOn(task, "2026-01-05")).toBe(true)
    expect(occursOn(task, "2026-01-04")).toBe(false)
    expect(occursOn(task, "2026-01-06")).toBe(false)
  })

  it("never occurs before the start date", () => {
    const task = makeTask({ repeat: "daily" })
    expect(occursOn(task, "2026-01-04")).toBe(false)
    expect(occursOn(task, "2026-01-05")).toBe(true)
  })

  it("repeats daily", () => {
    const task = makeTask({ repeat: "daily" })
    expect(occursOn(task, "2026-02-20")).toBe(true)
  })

  it("repeats weekly on the same weekday", () => {
    const task = makeTask({ repeat: "weekly" })
    expect(occursOn(task, "2026-01-12")).toBe(true)
    expect(occursOn(task, "2026-02-02")).toBe(true)
    expect(occursOn(task, "2026-01-13")).toBe(false)
  })

  it("repeats monthly on the same day", () => {
    const task = makeTask({ repeat: "monthly" })
    expect(occursOn(task, "2026-02-05")).toBe(true)
    expect(occursOn(task, "2026-03-05")).toBe(true)
    expect(occursOn(task, "2026-02-06")).toBe(false)
  })
})

describe("monthly repeat on the 31st", () => {
  const task = makeTask({ date: "2026-01-31", repeat: "monthly" })

  it("clamps to the last day of shorter months", () => {
    expect(monthlyDayFor(31, 2026, 1)).toBe(28)
    expect(monthlyDayFor(31, 2026, 3)).toBe(30)
    expect(occursOn(task, "2026-02-28")).toBe(true)
    expect(occursOn(task, "2026-02-27")).toBe(false)
    expect(occursOn(task, "2026-04-30")).toBe(true)
  })

  it("does not drift onto the 28th in long months", () => {
    expect(occursOn(task, "2026-03-28")).toBe(false)
    expect(occursOn(task, "2026-03-31")).toBe(true)
    expect(occursOn(task, "2028-03-28")).toBe(false)
  })

  it("uses the leap day when the month has one", () => {
    expect(monthlyDayFor(31, 2028, 1)).toBe(29)
    expect(occursOn(task, "2028-02-29")).toBe(true)
    expect(occursOn(task, "2028-02-28")).toBe(false)
  })

  it("clamps a 30th-of-month repeat too", () => {
    const thirtieth = makeTask({ date: "2026-01-30", repeat: "monthly" })
    expect(occursOn(thirtieth, "2026-02-28")).toBe(true)
    expect(occursOn(thirtieth, "2026-02-27")).toBe(false)
  })
})

describe("latestOccurrence", () => {
  it("returns nothing for a future one-off", () => {
    const task = makeTask()
    expect(latestOccurrence(task, new Date(2026, 0, 5, 8, 59))).toBeNull()
  })

  it("returns the one-off when its time has passed", () => {
    const occurrence = latestOccurrence(makeTask(), new Date(2026, 0, 5, 9, 0, 5))
    expect(occurrence?.date).toBe("2026-01-05")
    expect(occurrence?.dueAt.getHours()).toBe(9)
  })

  it("falls back to yesterday when today's time is still ahead", () => {
    const task = makeTask({ repeat: "daily" })
    const occurrence = latestOccurrence(task, new Date(2026, 0, 6, 8, 0))
    expect(occurrence?.date).toBe("2026-01-05")
  })

  it("has no daily occurrence before the first day's time", () => {
    const task = makeTask({ repeat: "daily" })
    expect(latestOccurrence(task, new Date(2026, 0, 5, 8, 0))).toBeNull()
  })

  it("picks the most recent weekly slot", () => {
    const task = makeTask({ repeat: "weekly" })
    const occurrence = latestOccurrence(task, new Date(2026, 0, 14, 12, 0))
    expect(occurrence?.date).toBe("2026-01-12")
  })

  it("picks the clamped monthly slot", () => {
    const task = makeTask({ date: "2026-01-31", repeat: "monthly" })
    const occurrence = latestOccurrence(task, new Date(2026, 1, 28, 10, 0))
    expect(occurrence?.date).toBe("2026-02-28")
  })

  it("keeps the previous month's slot while this month's is ahead", () => {
    const task = makeTask({ date: "2026-01-31", repeat: "monthly" })
    const occurrence = latestOccurrence(task, new Date(2026, 1, 28, 8, 0))
    expect(occurrence?.date).toBe("2026-01-31")
  })
})

describe("daysBetweenKeys", () => {
  it("counts calendar days without daylight-saving drift", () => {
    expect(daysBetweenKeys("2026-03-07", "2026-03-09")).toBe(2)
    expect(daysBetweenKeys("2026-10-31", "2026-11-02")).toBe(2)
    expect(daysBetweenKeys("2026-01-01", "2027-01-01")).toBe(365)
  })
})
