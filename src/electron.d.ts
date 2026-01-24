/**
 * Type declarations for the Electron API exposed via preload
 */

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

interface FolderSelectResult {
  success: boolean
  folderPath?: string
  canceled?: boolean
  error?: string
}

interface TestRunMetadata {
  id: string
  name: string
  filePath: string
}

interface TestSessionMetadata {
  id: string
  name: string
  folderPath: string
  runs: TestRunMetadata[]
}

interface ScanDataFolderResult {
  success: boolean
  sessions?: TestSessionMetadata[]
  error?: string
}

interface ReadCSVResult {
  success: boolean
  content?: string
  error?: string
}

interface ElectronAPI {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  saveToPath: (data: string, filePath: string) => Promise<SaveResult>
  saveConfig: (data: string, defaultName?: string) => Promise<SaveResult>
  loadConfig: () => Promise<LoadResult>
  loadRecentFile: (filePath: string) => Promise<LoadResult>
  exportResults: (data: string) => Promise<SaveResult>
  // Data folder operations
  selectDataFolder: () => Promise<FolderSelectResult>
  scanDataFolder: (folderPath: string) => Promise<ScanDataFolderResult>
  readCSV: (filePath: string) => Promise<ReadCSVResult>
  onMenuEvent: (callback: (event: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
