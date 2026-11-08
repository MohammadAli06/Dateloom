import { existsSync, mkdtempSync, readFileSync, readdirSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { createStore } from "../src/main/store"
import { getPendingReminders } from "../src/shared/scheduler"
import { addDaysToKey } from "../src/shared/dates"

let directory: string
let filePath: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "dateloom-store-"))
  filePath = join(directory, "tasks.json")
})

describe("store", () => {
  it("preserves a legacy on-time firing after recording the next occurrence", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Daily", date: "2026-02-03", time: "08:00", repeat: "daily" })
    writeFileSync(filePath, JSON.stringify({ version: 1, tasks: [{ ...task,
      lastFiredAt: new Date(2026, 1, 3, 8).toISOString() }] }))
    const reloaded = createStore(filePath)
    reloaded.markFired(task.id, "2026-02-04", new Date(2026, 1, 4, 8))
    const pending = getPendingReminders(createStore(filePath).getTasks(), new Date(2026, 1, 4, 10))
    expect(pending).toHaveLength(2)
    expect(pending.every(item => !item.missed)).toBe(true)
    reloaded.dismiss(task.id, "2026-02-04")
    expect(getPendingReminders(reloaded.getTasks(), new Date(2026, 1, 4, 10)).map(item => item.occurrenceDate)).toEqual(["2026-02-03"])
  })

  it("does not resurrect completions after 400 occurrences", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Daily", date: "2024-01-01", time: "08:00", repeat: "daily" })
    const doneDates = Array.from({ length: 400 }, (_, i) => addDaysToKey(task.date, i))
    writeFileSync(filePath, JSON.stringify({ version: 1, tasks: [{ ...task, doneDates }] }))
    const reloaded = createStore(filePath)
    reloaded.toggleDone(task.id, addDaysToKey(task.date, 400))
    expect(createStore(filePath).getTasks()[0].doneDates).toHaveLength(401)
    expect(createStore(filePath).getTasks()[0].doneDates).toContain(task.date)
  })
  it("persists separate firing and snooze records for repeat occurrences", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Daily", date: "2026-02-03", time: "08:00", repeat: "daily" })
    const now = new Date(2026, 1, 4, 8)
    store.markFired(task.id, "2026-02-03", now)
    store.markFired(task.id, "2026-02-04", now)
    store.snooze(task.id, "2026-02-03", new Date(2026, 1, 4, 8, 5))
    store.snooze(task.id, "2026-02-04", new Date(2026, 1, 4, 8, 30))
    const [saved] = createStore(filePath).getTasks()
    expect(Object.keys(saved.firedDates!)).toEqual(["2026-02-03", "2026-02-04"])
    expect(saved.snoozedDates?.["2026-02-03"]).toBe(new Date(2026, 1, 4, 8, 5).toISOString())
    expect(saved.snoozedDates?.["2026-02-04"]).toBe(new Date(2026, 1, 4, 8, 30).toISOString())
  })
  it("writes tasks atomically and reloads them", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Dentist", date: "2026-02-03", time: "14:30", repeat: "none" })

    expect(readdirSync(directory)).toEqual(["tasks.json"])

    const reloaded = createStore(filePath)
    expect(reloaded.getTasks()).toHaveLength(1)
    expect(reloaded.getTasks()[0].title).toBe("Dentist")
  })

  it("saves valid JSON", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Rent", date: "2026-02-01", time: "09:00", repeat: "monthly" })

    const saved = JSON.parse(readFileSync(filePath, "utf8"))
    expect(saved.version).toBe(1)
    expect(saved.tasks[0].repeat).toBe("monthly")
  })

  it("rejects a task without a title", () => {
    const store = createStore(filePath)
    expect(() => store.addTask({ title: "   ", date: "2026-02-03", time: "14:30", repeat: "none" })).toThrow()
  })

  it("toggles a repeating occurrence without touching siblings", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Pills", date: "2026-02-03", time: "08:00", repeat: "daily" })

    store.toggleDone(task.id, "2026-02-04")
    const [saved] = store.getTasks()
    expect(saved.done).toBe(false)
    expect(saved.doneDates).toEqual(["2026-02-04"])

    store.toggleDone(task.id, "2026-02-04")
    expect(store.getTasks()[0].doneDates).toEqual([])
  })

  it("flips the done flag on a one-off task", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Renew passport", date: "2026-02-03", time: "08:00", repeat: "none" })

    store.toggleDone(task.id, "2026-02-03")
    expect(store.getTasks()[0].done).toBe(true)
  })

  it("records dismissals and snoozes", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Invoice", date: "2026-02-03", time: "08:00", repeat: "none" })

    store.dismiss(task.id, "2026-02-03")
    store.snooze(task.id, "2026-02-03", new Date(2026, 1, 3, 8, 10))

    const [saved] = store.getTasks()
    expect(saved.dismissedDates).toEqual(["2026-02-03"])
    expect(saved.snoozedFor).toBe("2026-02-03")
    expect(saved.snoozedUntil).toBe(new Date(2026, 1, 3, 8, 10).toISOString())
  })

  it("deletes tasks", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Temp", date: "2026-02-03", time: "08:00", repeat: "none" })
    store.deleteTask(task.id)
    expect(store.getTasks()).toEqual([])
  })

  it("recovers from a corrupt file", () => {
    writeFileSync(filePath, "{ not json", "utf8")
    const store = createStore(filePath)

    expect(store.getTasks()).toEqual([])
    expect(existsSync(filePath)).toBe(false)
    expect(readdirSync(directory).some((name) => name.startsWith("tasks.json.corrupt-"))).toBe(true)
  })

  it("moves tasks into a picked folder and keeps them there", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Dentist", date: "2026-02-03", time: "14:30", repeat: "none" })

    const shared = join(directory, "OneDrive", "Dateloom")
    store.moveTo(shared)

    expect(store.getFilePath()).toBe(join(shared, "tasks.json"))
    expect(createStore(join(shared, "tasks.json")).getTasks()[0].title).toBe("Dentist")
  })

  it("merges tasks already in the picked folder", () => {
    const shared = join(directory, "shared")
    const other = createStore(join(shared, "tasks.json"))
    const fromOther = other.addTask({ title: "From laptop", date: "2026-02-05", time: "09:00", repeat: "none" })

    const store = createStore(filePath)
    const mine = store.addTask({ title: "From desktop", date: "2026-02-03", time: "14:30", repeat: "none" })
    store.moveTo(shared)

    expect(store.getTasks().map((task) => task.id).sort()).toEqual([mine.id, fromOther.id].sort())
  })

  it("picks up edits written by another machine", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Local", date: "2026-02-03", time: "14:30", repeat: "none" })

    const remote = addDaysToKey("2026-03-01", 0)
    writeFileSync(filePath, JSON.stringify({ version: 1, tasks: [{
      id: "remote-1", title: "Remote", date: remote, time: "10:00", repeat: "none", done: false
    }] }))
    const future = Date.now() + 5_000
    utimesSync(filePath, future / 1000, future / 1000)

    expect(store.reloadIfChanged()).toBe(true)
    expect(store.getTasks().map((task) => task.title)).toEqual(["Remote"])
  })

  it("ignores a file it wrote itself", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Local", date: "2026-02-03", time: "14:30", repeat: "none" })

    expect(store.reloadIfChanged()).toBe(false)
  })

  it("exports every task and imports them into an empty store", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Dentist", date: "2026-02-03", time: "14:30", repeat: "none" })
    store.addTask({ title: "Rent", date: "2026-02-01", time: "09:00", repeat: "monthly" })

    const backup = join(directory, "backup.json")
    expect(store.exportTo(backup)).toBe(2)

    const fresh = createStore(join(directory, "other", "tasks.json"))
    expect(fresh.importFrom(backup)).toBe(2)
    expect(fresh.getTasks().map((task) => task.title).sort()).toEqual(["Dentist", "Rent"])
  })

  it("imports a bare array as well as a full backup", () => {
    const backup = join(directory, "bare.json")
    writeFileSync(backup, JSON.stringify([
      { id: "a", title: "Bare", date: "2026-02-03", time: "10:00", repeat: "none", done: false }
    ]))

    const store = createStore(filePath)
    expect(store.importFrom(backup)).toBe(1)
    expect(store.getTasks()[0].title).toBe("Bare")
  })

  it("does not duplicate tasks when the same backup is imported twice", () => {
    const store = createStore(filePath)
    store.addTask({ title: "Dentist", date: "2026-02-03", time: "14:30", repeat: "none" })
    const backup = join(directory, "backup.json")
    store.exportTo(backup)

    store.importFrom(backup)
    store.importFrom(backup)
    expect(store.getTasks()).toHaveLength(1)
  })

  it("drops junk entries while importing", () => {
    const backup = join(directory, "mixed.json")
    writeFileSync(backup, JSON.stringify({
      version: 1,
      tasks: [
        { id: "good", title: "Real", date: "2026-02-03", time: "10:00", repeat: "none", done: false },
        { id: "bad-date", title: "Nope", date: "03/02/2026", time: "10:00", repeat: "none", done: false },
        { id: "no-title", date: "2026-02-04", time: "10:00", repeat: "none", done: false },
        "junk",
        null
      ]
    }))

    const store = createStore(filePath)
    expect(store.importFrom(backup)).toBe(1)
    expect(store.getTasks().map((task) => task.id)).toEqual(["good"])
  })

  it("rejects a file that is not a backup", () => {
    const bad = join(directory, "bad.json")
    writeFileSync(bad, JSON.stringify({ hello: "world" }))

    const store = createStore(filePath)
    expect(() => store.importFrom(bad)).toThrow()
    expect(store.getTasks()).toEqual([])
  })

  it("snoozes to an arbitrary future date", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Dentist", date: "2026-02-03", time: "08:00", repeat: "none" })

    const until = new Date(2026, 2, 15, 14, 30)
    store.snooze(task.id, "2026-02-03", until)

    const [saved] = createStore(filePath).getTasks()
    expect(saved.snoozedDates?.["2026-02-03"]).toBe(until.toISOString())
  })

  it("keeps a far-future snooze quiet until it arrives", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Renew passport", date: "2026-02-03", time: "08:00", repeat: "none" })

    store.snooze(task.id, "2026-02-03", new Date(2026, 2, 15, 14, 30))

    const tasks = store.getTasks()
    expect(getPendingReminders(tasks, new Date(2026, 1, 4, 9))).toEqual([])
    expect(getPendingReminders(tasks, new Date(2026, 2, 15, 14, 30, 10))).toHaveLength(1)
  })

  it("rejects an invalid snooze time", () => {
    const store = createStore(filePath)
    const task = store.addTask({ title: "Dentist", date: "2026-02-03", time: "08:00", repeat: "none" })

    expect(() => store.snooze(task.id, "2026-02-03", new Date("nonsense"))).toThrow()
  })
})
