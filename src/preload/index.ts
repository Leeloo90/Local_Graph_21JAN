import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Project APIs
  createProject: (name: string, client: string): Promise<unknown> =>
    ipcRenderer.invoke('project:create', name, client),
  getAllProjects: (): Promise<unknown[]> => ipcRenderer.invoke('project:get-all'),

  // Media APIs
  importMedia: (projectId: string, filePaths: string[]): Promise<unknown[]> =>
    ipcRenderer.invoke('media:import', { projectId, filePaths }),
  getMedia: (projectId: string): Promise<unknown[]> => ipcRenderer.invoke('media:get-all', projectId),

  // Dialog APIs
  openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('dialog:open-file'),

  // Canvas APIs
  createCanvas: (
    projectId: string,
    name: string,
    fps: number | null,
    resolution: string | null
  ): Promise<unknown> => ipcRenderer.invoke('canvas:create', { projectId, name, fps, resolution }),
  getCanvases: (projectId: string): Promise<unknown[]> => ipcRenderer.invoke('canvas:get-all', projectId),

  // Graph APIs (Doc A 3.4)
  getGraphState: (canvasId: string): Promise<unknown> => ipcRenderer.invoke('graph:get-state', canvasId),

  // Node APIs (Doc E: Topology)
  createNode: (canvasId: string, mediaId: string): Promise<unknown> =>
    ipcRenderer.invoke('node:create', { canvasId, mediaId })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
