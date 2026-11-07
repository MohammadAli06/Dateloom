import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { createStore } from "../src/main/store"

let directory: string
let filePath: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "dateloom-store-"))
  filePath = join(directory, "tasks.json")
})

describe("store", () => {
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
    store.snooze(task.id, "2026-02-03", 10, new Date(2026, 1, 3, 8, 0))

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
})
