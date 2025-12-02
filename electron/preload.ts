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

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),

  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // File operations
  saveConfig: (data: string) => ipcRenderer.invoke('dialog:save-config', data),
  loadConfig: () => ipcRenderer.invoke('dialog:load-config'),
  loadRecentFile: (filePath: string) => ipcRenderer.invoke('dialog:load-recent-file', filePath),
  exportResults: (data: string) => ipcRenderer.invoke('dialog:export-results', data),

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
  }
}
