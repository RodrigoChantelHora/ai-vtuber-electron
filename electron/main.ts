import { app, BrowserWindow, ipcMain, desktopCapturer, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ===== Helpers =====

function modelsDir(): string {
  const dir = path.join(app.getPath('userData'), 'models')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function copyFile(src: string, dest: string): void {
  fs.copyFileSync(src, dest)
}

function readFileB64(filePath: string): string {
  return fs.readFileSync(filePath).toString('base64')
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

// ===== IPC Handlers =====

ipcMain.handle('capture-screen', async () => {
  if (!mainWindow) return null

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
    fetchWindowIcons: false,
  })

  if (sources.length === 0) return null

  const source = sources[0]
  const pngBuffer = source.thumbnail.toPNG()
  return pngBuffer.toString('base64')
})

ipcMain.handle('import-vrm', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Selecionar modelo VRM',
    filters: [
      { name: 'Modelo VRM', extensions: ['vrm'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'Cancelado' }
  }

  const srcPath = result.filePaths[0]
  const fileName = path.basename(srcPath)
  const destPath = path.join(modelsDir(), fileName)

  try {
    copyFile(srcPath, destPath)
    return { success: true, fileName, filePath: destPath, data: readFileB64(destPath) }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('get-loaded-model', async () => {
  const dir = modelsDir()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.vrm'))
  if (files.length === 0) return null

  const fileName = files[0]
  const filePath = path.join(dir, fileName)
  return { fileName, filePath, data: readFileB64(filePath) }
})

ipcMain.handle('remove-model', async (_event, fileName: string) => {
  const filePath = path.join(modelsDir(), fileName)
  if (fileExists(filePath)) {
    fs.unlinkSync(filePath)
    return { success: true }
  }
  return { success: false, error: 'Arquivo não encontrado' }
})

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize()
})

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('close-window', () => {
  mainWindow?.close()
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
