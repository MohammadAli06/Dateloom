/// <reference types="vite/client" />
import type { DateloomApi } from "../../preload"

declare global {
  interface Window {
    dateloom: DateloomApi
  }
}

export {}
