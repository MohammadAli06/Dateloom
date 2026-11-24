import { Menu, Tray } from "electron"
import trayIcon from "../../build/tray.png?asset"

type TrayActions = {
  open: () => void
  quit: () => void
}

export function createTray(actions: TrayActions): Tray {
  const tray = new Tray(trayIcon)
  tray.setToolTip("Dateloom")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Dateloom", click: actions.open },
      { type: "separator" },
      { label: "Quit", click: actions.quit }
    ])
  )
  tray.on("click", actions.open)
  return tray
}
