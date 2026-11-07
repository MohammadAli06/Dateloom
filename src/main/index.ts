import { app, BrowserWindow, ipcMain, Menu, powerMonitor, shell, Tray } from "electron"
import { join } from "node:path"
import { getPendingReminders, type PendingReminder } from "../shared/scheduler"
import type { NewTaskInput, TaskPatch } from "../shared/types"
import { hideReminders, setReminderContentHeight, showReminders } from "./reminderWindow"
import { createStore, type Store } from "./store"
import { createTray } from "./tray"

app.setName("Dateloom")
app.setAppUserModelId("com.dateloom.app")
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required")

const hiddenLaunch = process.argv.includes("--hidden")
const TICK_MS = 15_000

let store: Store
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
  store = createStore(join(app.getPath("userData"), "tasks.json"))
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

  ipcMain.handle("reminders:snooze", (_event, id: string, dateKey: string, minutes: number) => {
    store.snooze(id, dateKey, minutes)
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
  const tasks = store.getTasks()
  pending = getPendingReminders(tasks, new Date())

  const ids = new Set(pending.map((reminder) => reminder.id))
  const arrived = pending.filter((reminder) => !shownIds.has(reminder.id))
  shownIds = ids

  for (const reminder of arrived) store.markFired(reminder.taskId, new Date())

  if (pending.length === 0) {
    hideReminders()
    return
  }

  showReminders(pending)
}
