# Dateloom

A calm desktop month calendar with reminders. No account, no cloud — everything lives in one JSON file on your computer.

## Run it

```powershell
npm install --include=dev
npm run dev
```

`--include=dev` matters on machines where npm is configured with `omit=dev`; without it Vite, Electron and TypeScript will not install.

Other commands:

```powershell
npm test        # unit tests (recurrence, scheduler, store)
npm run build   # production bundles in out/
npm run dist:win   # Windows installer in release/
npm run dist:mac   # macOS dmg
npm run dist:linux # Linux AppImage
```

## Using it

- Arrows or `←` / `→` change month, `T` jumps to today.
- Click any day to add a task: title, time, optional repeat. Enter saves, Esc closes.
- Click a task to edit it, mark it done, or delete it.
- The panel on the right lists today and the next seven days; the header button hides it.
- Closing the window keeps Dateloom running in the system tray. `Quit` lives there.
- Reminders slide in at the top-right on their own, stacked, with Done / Snooze / Dismiss.

## Where data lives

`%APPDATA%\Dateloom\tasks.json` on Windows (`~/Library/Application Support/Dateloom` on macOS). Writes go to a temp file first and are then renamed, so a crash cannot leave a half-written file. A corrupt file is set aside as `tasks.json.corrupt-<timestamp>` and the app starts empty.

## Layout

```
src/main      store, scheduler, tray, reminder window, IPC
src/preload   typed contextBridge API
src/renderer  calendar UI (React)
src/shared    pure recurrence + scheduler logic with tests
tests         Vitest suites
```
