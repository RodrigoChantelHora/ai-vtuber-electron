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
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
})
