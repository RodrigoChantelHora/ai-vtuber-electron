export {}

declare global {
  interface Window {
    electronAPI?: {
      captureScreen: () => Promise<string | null>
      importVRM: () => Promise<{ success: boolean; fileName?: string; filePath?: string; data?: string; error?: string }>
      getLoadedModel: () => Promise<{ fileName: string; filePath: string; data: string } | null>
      removeModel: (fileName: string) => Promise<{ success: boolean; error?: string }>
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
    }
  }
}
