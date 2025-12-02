/// <reference types="vite/client" />

interface SaveResult {
  success: boolean
  filePath?: string
  error?: string
  canceled?: boolean
}

interface LoadResult {
  success: boolean
  data?: string
  filePath?: string
  error?: string
  canceled?: boolean
}

interface ElectronAPI {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  saveConfig: (data: string) => Promise<SaveResult>
  loadConfig: () => Promise<LoadResult>
  loadRecentFile: (filePath: string) => Promise<LoadResult>
  exportResults: (data: string) => Promise<SaveResult>
  onMenuEvent: (callback: (event: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
