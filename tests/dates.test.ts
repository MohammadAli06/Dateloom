import { describe, expect, it } from "vitest"
import {
  addMonths,
  buildMonthGrid,
  fromDateKey,
  isSameDay,
  isSameMonth,
  monthCursorOf,
  monthTitle,
  toDateKey
} from "../src/renderer/src/lib/dates"

describe("buildMonthGrid", () => {
  it("starts every grid on a Monday and has whole weeks", () => {
    for (let month = 0; month < 12; month++) {
      const grid = buildMonthGrid({ year: 2026, month })
      expect(grid[0].getDay()).toBe(1)
      expect(grid.length % 7).toBe(0)
    }
  })

  it("uses five rows when the month fits", () => {
    // June 2026 starts on a Monday and has 30 days.
    expect(buildMonthGrid({ year: 2026, month: 5 })).toHaveLength(35)
  })

  it("uses six rows when the month spills into a sixth week", () => {
    // November 2026 starts on a Sunday and has 30 days.
    const grid = buildMonthGrid({ year: 2026, month: 10 })
    expect(grid).toHaveLength(42)
  })

  it("contains every day of the month exactly once, contiguously", () => {
    const grid = buildMonthGrid({ year: 2026, month: 10 })
    for (let index = 1; index < grid.length; index++) {
      const previous = grid[index - 1]
      const current = grid[index]
      const expected = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1)
      expect(isSameDay(current, expected)).toBe(true)
    }

    const inMonth = grid.filter((day) => day.getMonth() === 10)
    expect(inMonth).toHaveLength(30)
    expect(inMonth[0].getDate()).toBe(1)
    expect(inMonth[29].getDate()).toBe(30)
  })

  it("handles a February that starts on a Monday", () => {
    // February 2027 starts Monday with 28 days: exactly four rows, padded to five.
    const grid = buildMonthGrid({ year: 2027, month: 1 })
    expect(grid).toHaveLength(35)
    expect(grid[0].getDate()).toBe(1)
    expect(grid[0].getMonth()).toBe(1)
  })
})

describe("addMonths", () => {
  it("rolls backwards across a year boundary", () => {
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
  })

  it("rolls forwards across a year boundary", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
  })

  it("handles multi-month jumps", () => {
    expect(addMonths({ year: 2026, month: 0 }, 13)).toEqual({ year: 2027, month: 1 })
    expect(addMonths({ year: 2026, month: 0 }, -13)).toEqual({ year: 2024, month: 11 })
  })
})

describe("date keys", () => {
  it("formats and parses locally without a UTC shift", () => {
    const date = new Date(2026, 0, 1)
    expect(toDateKey(date)).toBe("2026-01-01")
    expect(isSameDay(fromDateKey("2026-01-01"), date)).toBe(true)
    expect(fromDateKey("2026-12-31").getDate()).toBe(31)
  })
})

describe("month cursor helpers", () => {
  it("derives the cursor from a date", () => {
    expect(monthCursorOf(new Date(2026, 10, 4))).toEqual({ year: 2026, month: 10 })
  })

  it("titles the month", () => {
    expect(monthTitle({ year: 2026, month: 10 })).toBe("November 2026")
  })

  it("matches dates by month only when they share year and month", () => {
    expect(isSameMonth(new Date(2026, 10, 1), { year: 2026, month: 10 })).toBe(true)
    expect(isSameMonth(new Date(2026, 9, 31), { year: 2026, month: 10 })).toBe(false)
    expect(isSameMonth(new Date(2025, 10, 1), { year: 2026, month: 10 })).toBe(false)
  })
})
