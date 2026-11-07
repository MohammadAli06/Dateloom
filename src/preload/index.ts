import { contextBridge, ipcRenderer } from "electron"
import type {
  ImportExportResult,
  NewTaskInput,
  StorageInfo,
  Task,
  TaskPatch,
  ThemePreference
} from "../shared/types"
import type { PendingReminder } from "../shared/scheduler"

function subscribe<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, value: T) => callback(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  platform: process.platform,
  getTasks: (): Promise<Task[]> => ipcRenderer.invoke("tasks:list"),
  addTask: (input: NewTaskInput): Promise<Task[]> => ipcRenderer.invoke("tasks:add", input),
  updateTask: (id: string, patch: TaskPatch): Promise<Task[]> => ipcRenderer.invoke("tasks:update", id, patch),
  deleteTask: (id: string): Promise<Task[]> => ipcRenderer.invoke("tasks:delete", id),
  toggleDone: (id: string, dateKey: string): Promise<Task[]> => ipcRenderer.invoke("tasks:toggleDone", id, dateKey),
  getReminders: (): Promise<PendingReminder[]> => ipcRenderer.invoke("reminders:list"),
  completeReminder: (id: string, dateKey: string): Promise<PendingReminder[]> =>
    ipcRenderer.invoke("reminders:done", id, dateKey),
  snoozeReminder: (id: string, dateKey: string, minutes: number): Promise<PendingReminder[]> =>
    ipcRenderer.invoke("reminders:snooze", id, dateKey, minutes),
  dismissReminder: (id: string, dateKey: string): Promise<PendingReminder[]> =>
    ipcRenderer.invoke("reminders:dismiss", id, dateKey),
  reportReminderHeight: (height: number): void => ipcRenderer.send("reminders:height", height),
  setTheme: (theme: ThemePreference): Promise<void> => ipcRenderer.invoke("settings:theme", theme),
  getStorage: (): Promise<StorageInfo> => ipcRenderer.invoke("settings:storage"),
  chooseStorage: (): Promise<StorageInfo | null> => ipcRenderer.invoke("settings:chooseStorage"),
  resetStorage: (): Promise<StorageInfo> => ipcRenderer.invoke("settings:resetStorage"),
  importTasks: (): Promise<ImportExportResult> => ipcRenderer.invoke("tasks:import"),
  exportTasks: (): Promise<ImportExportResult> => ipcRenderer.invoke("tasks:export"),
  onTasksChanged: (callback: (tasks: Task[]) => void): (() => void) => subscribe("tasks:changed", callback),
  onRemindersChanged: (callback: (reminders: PendingReminder[]) => void): (() => void) =>
    subscribe("reminders:update", callback)
}

contextBridge.exposeInMainWorld("dateloom", api)

export type DateloomApi = typeof api
