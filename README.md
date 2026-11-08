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

- Arrows or `←` / `→` change month, `PageUp` / `PageDown` change year, `T` jumps to today.
- Click the month button in the top-left to jump straight to any month and year.
- The sun/moon button in the header switches between light and dark.
- Click any day to add a task: title, time, optional repeat. Enter saves, Esc closes.
- Click a task to edit it, mark it done, or delete it.
- The panel on the right lists today and the next seven days; the header button hides it.
- Closing the window keeps Dateloom running in the system tray. `Quit` lives there.
- Reminders slide in at the top-right on their own, stacked, with Done / Snooze / Dismiss.
- Snooze offers 5, 10 or 30 minutes, Tomorrow 9am, or **Pick date…** for any date and time you choose.
- Every unhandled repeat occurrence stays available until acted on, including after restart. Snoozing one occurrence does not snooze another.
- An empty time field uses the next full hour when saved. Today and Upcoming refresh at midnight and when the window is reopened.

## Moving to another computer

Data stays offline, in one JSON file. To share it between machines, put that file in a folder
your cloud provider already syncs:

1. Open the right-hand panel and click **Choose folder…** under *Storage*.
2. Pick a folder inside OneDrive (or Dropbox, Google Drive). Dateloom writes `tasks.json` there.
3. On the second computer, pick the same folder.

Changes from either machine are picked up within 15 seconds. When you first pick a folder that
already holds tasks, Dateloom merges both sets; after that the shared file is the source of truth,
so deletions also carry over. **Use this computer only** switches back to the local file.

Do not run two copies of Dateloom against the same file at the same instant — the last write wins.

## Backup, import and export

Under *Storage* in the side panel:

- **Export…** writes every task to a `.json` file you choose — a manual backup.
- **Import…** reads a `.json` backup and adds its tasks to what you already have. Matching
  ids are merged rather than duplicated, bad entries are skipped, and importing the same
  file twice changes nothing.

This is the simple fallback if you would rather not keep tasks in a synced folder at all: export
on the old computer, import on the new one.

## Manual release checks

- Install on Windows, sign out and back in: Dateloom should start hidden in the tray.
- Schedule a reminder, put the PC to sleep past its due time, then wake it: the reminder should appear (labelled Missed when over two minutes late).
- Confirm the bundled chime is audible and the popup does not take focus from another app.
- Point Storage at a synced folder, add a task on that machine, edit the file from another, and confirm the change appears.
- macOS and Linux targets are configured; their packages have not been built or tested on this Windows machine.

## Where data lives

`%APPDATA%\Dateloom\tasks.json` on Windows (`~/Library/Application Support/Dateloom` on macOS), or the folder you pick under *Storage*. Writes go to a temp file first and are then renamed, so a crash cannot leave a half-written file. A corrupt file is set aside as `tasks.json.corrupt-<timestamp>` and the app starts empty. Window and theme preferences are kept next to it in `settings.json`.

## Layout

```
src/main      store, settings, scheduler, tray, reminder window, IPC
src/preload   typed contextBridge API
src/renderer  calendar UI (React)
src/shared    pure recurrence + scheduler logic with tests
tests         Vitest suites
```
