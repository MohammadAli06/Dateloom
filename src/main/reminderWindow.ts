import { BrowserWindow, nativeTheme, screen } from "electron"
import { join } from "node:path"
import type { PendingReminder } from "../shared/scheduler"

const WIDTH = 340
const MARGIN = 16
const MIN_HEIGHT = 120

let reminderWindow: BrowserWindow | null = null
let contentHeight = MIN_HEIGHT

export function showReminders(reminders: PendingReminder[]): void {
  const window = ensureWindow()
  window.webContents.send("reminders:update", reminders)
  applyBounds()
  if (!window.isVisible()) window.showInactive()
}

export function setReminderContentHeight(height: number): void {
  contentHeight = Math.max(MIN_HEIGHT, Math.round(height))
  applyBounds()
}

export function hideReminders(): void {
  reminderWindow?.hide()
}

function ensureWindow(): BrowserWindow {
  if (reminderWindow && !reminderWindow.isDestroyed()) return reminderWindow

  reminderWindow = new BrowserWindow({
    width: WIDTH,
    height: MIN_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1d2025" : "#f6f7f9",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  reminderWindow.setAlwaysOnTop(true, "floating")
  reminderWindow.on("closed", () => {
    reminderWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    const base = process.env.ELECTRON_RENDERER_URL.replace(/\/+$/, "")
    void reminderWindow.loadURL(`${base}/reminder.html`)
  } else {
    void reminderWindow.loadFile(join(__dirname, "../renderer/reminder.html"))
  }

  return reminderWindow
}

function applyBounds(): void {
  if (!reminderWindow || reminderWindow.isDestroyed()) return

  const { workArea } = screen.getPrimaryDisplay()
  const height = Math.min(contentHeight, workArea.height - MARGIN * 2)

  reminderWindow.setBounds({
    x: workArea.x + workArea.width - WIDTH - MARGIN,
    y: workArea.y + MARGIN,
    width: WIDTH,
    height
  })
}
