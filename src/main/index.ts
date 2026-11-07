import { app, BrowserWindow, Menu, shell } from "electron"
import { join } from "node:path"

app.setName("Dateloom")

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 940,
    minHeight: 620,
    show: false,
    title: "Dateloom",
    backgroundColor: "#f7f8fa",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createMainWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
