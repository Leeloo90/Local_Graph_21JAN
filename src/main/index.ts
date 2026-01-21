import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeDatabase } from './db/init'
import { createProject, getAllProjects } from './db/repos/projects'
import { addMediaToProject, getProjectMedia, type Media } from './db/repos/media'
import { createCanvas, getProjectCanvases, getCanvasById } from './db/repos/canvases'
import { getNodesByCanvasId, createNode, getSpineTail, getNodeById } from './db/repos/nodes'
import { getMediaById } from './db/repos/media'
import { analyzeFile } from './utils/forensics'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize database
  initializeDatabase()

  // IPC handlers for projects
  ipcMain.handle('project:create', (_event, name: string, client: string) => {
    return createProject(name, client)
  })

  ipcMain.handle('project:get-all', () => {
    return getAllProjects()
  })

  // IPC handlers for media
  ipcMain.handle(
    'media:import',
    async (_event, { projectId, filePaths }: { projectId: string; filePaths: string[] }) => {
      const results: Media[] = []

      for (const filePath of filePaths) {
        try {
          const metadata = await analyzeFile(filePath)
          const media = addMediaToProject(projectId, filePath, metadata)
          results.push(media)
        } catch (error) {
          console.error(`[Media] Failed to import ${filePath}:`, error)
        }
      }

      return results
    }
  )

  ipcMain.handle('media:get-all', (_event, projectId: string) => {
    return getProjectMedia(projectId)
  })

  // IPC handlers for canvases
  ipcMain.handle(
    'canvas:create',
    (
      _event,
      {
        projectId,
        name,
        fps,
        resolution
      }: { projectId: string; name: string; fps: number | null; resolution: string | null }
    ) => {
      return createCanvas(projectId, name, fps, resolution)
    }
  )

  ipcMain.handle('canvas:get-all', (_event, projectId: string) => {
    return getProjectCanvases(projectId)
  })

  // IPC handler for graph state (Doc A 3.4)
  ipcMain.handle('graph:get-state', (_event, canvasId: string) => {
    const canvas = getCanvasById(canvasId)
    if (!canvas) {
      throw new Error(`[Graph] Canvas not found: ${canvasId}`)
    }

    const nodes = getNodesByCanvasId(canvasId)

    console.log(`[Graph] Loaded state for canvas "${canvas.name}": ${nodes.length} nodes`)

    return {
      canvas,
      nodes
    }
  })

  // IPC handler for node creation (Doc E: Smart Append, Doc H: Smart Drop Zones)
  ipcMain.handle(
    'node:create',
    (
      _event,
      {
        canvasId,
        mediaId,
        targetNodeId,
        anchorType
      }: {
        canvasId: string
        mediaId: string
        targetNodeId?: string
        anchorType?: 'append' | 'stack' | 'prepend'
      }
    ) => {
      // 1. Fetch media to get duration and fps
      const media = getMediaById(mediaId)
      if (!media) {
        throw new Error(`[Node] Media not found: ${mediaId}`)
      }

      // 2. Determine parent node
      // If targetNodeId provided from drop zone, fetch it from DB
      // Otherwise, find the tail of the spine (Smart Append behavior)
      const tailNode = getSpineTail(canvasId)
      const targetNode = targetNodeId ? getNodeById(targetNodeId) : null
      const parentNode = targetNode || tailNode

      // 3. Determine topology based on context
      if (!parentNode) {
        // Case A: Genesis - First node on canvas
        console.log(`[Node] Genesis: Creating ORIGIN node for canvas ${canvasId}`)

        return createNode({
          canvas_id: canvasId,
          type: 'SPINE',
          asset_id: mediaId,
          parent_id: null,
          anchor_type: 'ORIGIN',
          container_id: null,
          drift: 0,
          ui_track_lane: 0,
          media_in_point: 0,
          media_out_point: media.duration_sec,
          playback_rate: 1.0
        })
      } else {
        // Case B: Create node with specified anchor type
        // Map drop zone types to DB anchor types
        let dbAnchorType: 'APPEND' | 'TOP' | 'PREPEND' = 'APPEND'
        let nodeType: 'SPINE' | 'SATELLITE' = 'SPINE'
        let trackLane = parentNode.ui_track_lane ?? 0 // Inherit parent's track by default

        if (anchorType === 'stack') {
          // Stack creates a SATELLITE above the parent (Doc G: V(n+1))
          // Track lane increments: parent on V1 (lane 0) -> child on V2 (lane 1)
          dbAnchorType = 'TOP'
          nodeType = 'SATELLITE'
          trackLane = (parentNode.ui_track_lane ?? 0) + 1
          console.log(
            `[Node] Stack: Creating SATELLITE on V${trackLane + 1} above node ${parentNode.id} (V${(parentNode.ui_track_lane ?? 0) + 1})`
          )
        } else if (anchorType === 'prepend') {
          dbAnchorType = 'PREPEND'
          // Prepend stays on the same track as target
          trackLane = parentNode.ui_track_lane ?? 0
          console.log(`[Node] Prepend: Before node ${parentNode.id} on V${trackLane + 1}`)
        } else {
          // Append stays on the same track as target
          dbAnchorType = 'APPEND'
          trackLane = parentNode.ui_track_lane ?? 0
          console.log(`[Node] Append: After node ${parentNode.id} on V${trackLane + 1}`)
        }

        return createNode({
          canvas_id: canvasId,
          type: nodeType,
          asset_id: mediaId,
          parent_id: parentNode.id,
          anchor_type: dbAnchorType,
          container_id: null,
          drift: 0,
          ui_track_lane: trackLane,
          media_in_point: 0,
          media_out_point: media.duration_sec,
          playback_rate: 1.0
        })
      }
    }
  )

  // Dialog handlers
  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media Files', extensions: ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'webm', 'wav', 'mp3', 'aac'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.filePaths
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.