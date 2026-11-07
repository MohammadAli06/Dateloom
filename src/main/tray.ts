import { Menu, nativeImage, Tray } from "electron"

type TrayActions = {
  open: () => void
  quit: () => void
}

function insideRoundedRect(
  x: number,
  y: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number
): boolean {
  const nearestX = Math.min(Math.max(x, left + radius), right - radius)
  const nearestY = Math.min(Math.max(y, top + radius), bottom - radius)
  const dx = x - nearestX
  const dy = y - nearestY
  return dx * dx + dy * dy <= radius * radius
}

function createTrayIcon(): Electron.NativeImage {
  const size = 32
  const buffer = Buffer.alloc(size * size * 4)

  const paint = (x: number, y: number, red: number, green: number, blue: number, alpha: number) => {
    const offset = (y * size + x) * 4
    buffer[offset] = blue
    buffer[offset + 1] = green
    buffer[offset + 2] = red
    buffer[offset + 3] = alpha
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5

      if (!insideRoundedRect(px, py, 1, 1, 31, 31, 8)) continue

      paint(x, y, 0x2f, 0x6f, 0xeb, 255)

      if (!insideRoundedRect(px, py, 7, 9, 25, 27, 3)) continue

      paint(x, y, 0xff, 0xff, 0xff, 255)

      if (py < 13) {
        paint(x, y, 0x2f, 0x6f, 0xeb, 255)
        continue
      }

      const dotColumns = [11, 16, 21]
      const dotRows = [17, 22]
      if (dotColumns.some((dotX) => px >= dotX && px < dotX + 2) && dotRows.some((dotY) => py >= dotY && py < dotY + 2)) {
        paint(x, y, 0x2f, 0x6f, 0xeb, 255)
      }
    }
  }

  return nativeImage.createFromBitmap(buffer, { width: size, height: size })
}

export function createTray(actions: TrayActions): Tray {
  const tray = new Tray(createTrayIcon())
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
