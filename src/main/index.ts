import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, powerMonitor, shell, Tray } from "electron"
import { join } from "node:path"
import { getPendingReminders, type PendingReminder } from "../shared/scheduler"
import { latestOccurrence } from "../shared/recurrence"
import type {
  ImportExportResult,
  NewTaskInput,
  StorageInfo,
  TaskPatch,
  ThemePreference
} from "../shared/types"
import {
  hideReminders,
  setReminderContentHeight,
  setRemindersFocusable,
  showReminders
} from "./reminderWindow"
import { createSettings, type SettingsStore } from "./settings"
import { createStore, type Store } from "./store"
import { createTray } from "./tray"

app.setName("Dateloom")
app.setAppUserModelId("com.dateloom.app")
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required")

const hiddenLaunch = process.argv.includes("--hidden")
const TICK_MS = 15_000

let store: Store
let settings: SettingsStore
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let pending: PendingReminder[] = []
let shownIds = new Set<string>()
let quitting = false
let ticker: NodeJS.Timeout | null = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => openMainWindow())
  app.on("activate", () => openMainWindow())
  app.whenReady().then(start)
}

app.on("window-all-closed", () => {
  if (!tray) app.quit()
})

function start(): void {
  Menu.setApplicationMenu(null)
  const defaultDir = app.getPath("userData")
  settings = createSettings(join(defaultDir, "settings.json"), nativeTheme.shouldUseDarkColors ? "dark" : "light")
  const tasksDir = settings.get().tasksDir
  store = createStore(join(tasksDir ?? defaultDir, "tasks.json"))
  nativeTheme.themeSource = settings.get().theme
  registerIpc()
  createMainWindow(!hiddenLaunch)
  tray = createTray({ open: openMainWindow, quit: quitApp })
  enableAutoStart()

  refreshReminders()
  ticker = setInterval(refreshReminders, TICK_MS)
  powerMonitor.on("resume", () => refreshReminders())

  app.on("before-quit", () => {
    quitting = true
  })
  app.on("will-quit", () => {
    if (ticker) clearInterval(ticker)
    tray?.destroy()
    tray = null
  })
}

function storageInfo(): StorageInfo {
  const defaultDir = app.getPath("userData")
  const dir = settings.get().tasksDir
  return { dir: dir ?? defaultDir, defaultDir, isDefault: !dir }
}

function createMainWindow(showOnReady: boolean): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (showOnReady) {
      mainWindow.show()
      mainWindow.focus()
    }
    return
  }

  const window = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 940,
    minHeight: 620,
    show: false,
    title: "Dateloom",
    backgroundColor: "#f6f7f9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow = window
  window.once("ready-to-show", () => {
    if (showOnReady) window.show()
  })
  window.on("close", (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
  })
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: "deny" }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

function openMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow(true)
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function quitApp(): void {
  quitting = true
  app.quit()
}

function enableAutoStart(): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: true, args: ["--hidden"] })
}

function registerIpc(): void {
  ipcMain.handle("tasks:list", () => store.getTasks())

  ipcMain.handle("tasks:add", (_event, input: NewTaskInput) => {
    store.addTask(input)
    afterTaskChange()
    return store.getTasks()
  })

  ipcMain.handle("tasks:update", (_event, id: string, patch: TaskPatch) => {
    store.updateTask(id, patch)
    afterTaskChange()
    return store.getTasks()
  })

  ipcMain.handle("tasks:delete", (_event, id: string) => {
    store.deleteTask(id)
    afterTaskChange()
    return store.getTasks()
  })

  ipcMain.handle("tasks:toggleDone", (_event, id: string, dateKey: string) => {
    store.toggleDone(id, dateKey)
    afterTaskChange()
    return store.getTasks()
  })

  ipcMain.handle("reminders:list", () => pending)

  ipcMain.handle("reminders:done", (_event, id: string, dateKey: string) => {
    store.toggleDone(id, dateKey)
    afterTaskChange()
    return pending
  })

  ipcMain.handle("reminders:snooze", (_event, id: string, dateKey: string, until: string) => {
    store.snooze(id, dateKey, new Date(until))
    afterTaskChange()
    return pending
  })

  ipcMain.handle("reminders:dismiss", (_event, id: string, dateKey: string) => {
    store.dismiss(id, dateKey)
    afterTaskChange()
    return pending
  })

  ipcMain.on("reminders:height", (_event, height: number) => {
    if (typeof height === "number" && Number.isFinite(height)) setReminderContentHeight(height)
  })

  ipcMain.on("reminders:focus", (_event, focusable: boolean) => {
    setRemindersFocusable(focusable === true)
  })

  ipcMain.handle("settings:theme", (_event, theme: ThemePreference) => {
    nativeTheme.themeSource = theme
    settings.update({ theme })
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(theme === "dark" ? "#16181c" : "#f6f7f9")
    }
  })

  ipcMain.handle("settings:storage", () => storageInfo())

  ipcMain.handle("settings:chooseStorage", async () => {
    const parent = BrowserWindow.getFocusedWindow() ?? mainWindow
    const options: Electron.OpenDialogOptions = {
      title: "Choose where Dateloom keeps your tasks",
      properties: ["openDirectory", "createDirectory"],
      defaultPath: storageInfo().dir
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    store.moveTo(result.filePaths[0])
    settings.update({ tasksDir: result.filePaths[0] })
    afterTaskChange()
    return storageInfo()
  })

  ipcMain.handle("settings:resetStorage", () => {
    store.moveTo(storageInfo().defaultDir)
    settings.update({ tasksDir: null })
    afterTaskChange()
    return storageInfo()
  })

  ipcMain.handle("tasks:import", async (): Promise<ImportExportResult> => {
    const parent = BrowserWindow.getFocusedWindow() ?? mainWindow
    const options: Electron.OpenDialogOptions = {
      title: "Import tasks",
      properties: ["openFile"],
      filters: [{ name: "Dateloom backup", extensions: ["json"] }]
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, count: 0, message: "" }
    }

    try {
      const count = store.importFrom(result.filePaths[0])
      afterTaskChange()
      return { ok: true, count, message: `Imported ${count} ${count === 1 ? "task" : "tasks"}.` }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read that file"
      return { ok: false, count: 0, message }
    }
  })

  ipcMain.handle("tasks:export", async (): Promise<ImportExportResult> => {
    const parent = BrowserWindow.getFocusedWindow() ?? mainWindow
    const stamp = new Date().toISOString().slice(0, 10)
    const options: Electron.SaveDialogOptions = {
      title: "Export tasks",
      defaultPath: join(app.getPath("documents"), `dateloom-${stamp}.json`),
      filters: [{ name: "Dateloom backup", extensions: ["json"] }]
    }
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) {
      return { ok: false, count: 0, message: "" }
    }

    try {
      const count = store.exportTo(result.filePath)
      return { ok: true, count, message: `Exported ${count} ${count === 1 ? "task" : "tasks"}.` }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not write that file"
      return { ok: false, count: 0, message }
    }
  })
}

function afterTaskChange(): void {
  broadcastTasks()
  refreshReminders()
}

function broadcastTasks(): void {
  const tasks = store.getTasks()
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("tasks:changed", tasks)
  }
}

function refreshReminders(): void {
  const changed = store.reloadIfChanged()
  const tasks = store.getTasks()
  if (changed) broadcastTasks()
  pending = getPendingReminders(tasks, new Date())

  const ids = new Set(pending.map((reminder) => reminder.id))
  const arrived = pending.filter((reminder) => !shownIds.has(reminder.id))
  shownIds = ids

  for (const reminder of arrived) {
    const task = tasks.find((item) => item.id === reminder.taskId)!
    const legacyFired = !task.firedDates && task.lastFiredAt &&
      latestOccurrence(task, new Date(task.lastFiredAt))?.date === reminder.occurrenceDate
      ? task.lastFiredAt : undefined
    const fired = task.firedDates?.[reminder.occurrenceDate] ?? legacyFired
    if (!fired || new Date(fired) < new Date(reminder.dueAt)) {
      store.markFired(reminder.taskId, reminder.occurrenceDate, new Date())
    }
  }

  if (pending.length === 0) {
    hideReminders()
    return
  }

  showReminders(pending)
}
