import { contextBridge } from "electron"

const api = {
  platform: process.platform
}

contextBridge.exposeInMainWorld("dateloom", api)

export type DateloomApi = typeof api
