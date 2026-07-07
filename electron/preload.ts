import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: (): Promise<string | null> =>
    ipcRenderer.invoke('capture-screen'),
  importVRM: (): Promise<{ success: boolean; fileName?: string; filePath?: string; data?: string; error?: string }> =>
    ipcRenderer.invoke('import-vrm'),
  getLoadedModel: (): Promise<{ fileName: string; filePath: string; data: string } | null> =>
    ipcRenderer.invoke('get-loaded-model'),
  removeModel: (fileName: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('remove-model', fileName),
  importVRMFromPath: (filePath: string): Promise<{ success: boolean; fileName?: string; filePath?: string; data?: string; error?: string }> =>
    ipcRenderer.invoke('import-vrm-from-path', filePath),
  importVRMData: (fileName: string, base64: string): Promise<{ success: boolean; fileName?: string; filePath?: string; data?: string; error?: string }> =>
    ipcRenderer.invoke('import-vrm-data', fileName, base64),
  minimize: () => ipcRenderer.invoke('minimize-window'),
  showNotification: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('show-notification', title, body),
  appendLog: (line: string): Promise<void> => ipcRenderer.invoke('append-log', line),
  getLogPath: (): Promise<string> => ipcRenderer.invoke('get-log-path'),
  clearLogFile: (): Promise<void> => ipcRenderer.invoke('clear-log-file'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
})
