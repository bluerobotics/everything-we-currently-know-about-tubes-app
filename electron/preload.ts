import { contextBridge, ipcRenderer } from 'electron'

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

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  
  // Console logging to main process
  log: (...args: unknown[]) => ipcRenderer.send('console:log', ...args),

  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // File operations
  saveToPath: (data: string, filePath: string) => ipcRenderer.invoke('dialog:save-to-path', data, filePath),
  saveConfig: (data: string, defaultName?: string) => ipcRenderer.invoke('dialog:save-config', data, defaultName),
  loadConfig: () => ipcRenderer.invoke('dialog:load-config'),
  loadRecentFile: (filePath: string) => ipcRenderer.invoke('dialog:load-recent-file', filePath),
  exportResults: (data: string) => ipcRenderer.invoke('dialog:export-results', data),

  // Data folder operations
  selectDataFolder: () => ipcRenderer.invoke('dialog:select-data-folder'),
  scanDataFolder: (folderPath: string) => ipcRenderer.invoke('fs:scan-data-folder', folderPath),
  readCSV: (filePath: string) => ipcRenderer.invoke('fs:read-csv', filePath),

  onMenuEvent: (callback: (event: string) => void) => {
    const events = [
      'menu:save-config',
      'menu:load-config',
      'menu:export',
      'menu:toggle-sidebar',
      'menu:about'
    ]
    
    events.forEach(event => {
      ipcRenderer.on(event, () => callback(event))
    })

    return () => {
      events.forEach(event => {
        ipcRenderer.removeAllListeners(event)
      })
    }
  }
})

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      log: (...args: unknown[]) => void
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
  }
}
