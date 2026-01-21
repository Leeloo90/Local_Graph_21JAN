import { ElectronAPI } from '@electron-toolkit/preload'

export interface Project {
  id: string
  name: string
  default_fps: number | null
  default_resolution: string | null
  last_edited_at: string | null
}

export interface Media {
  id: string
  project_id: string
  file_path: string
  fps: number | null
  duration_sec: number | null
  start_tc_string: string | null
  proxy_status: string
  proxy_path: string | null
  waveform_status: string
  waveform_path: string | null
}

export interface Canvas {
  id: string
  project_id: string
  name: string
  fps: number | null
  resolution: string | null
  created_at: string | null
}

export type NodeType = 'SPINE' | 'SATELLITE' | 'CONTAINER'
export type AnchorType = 'ORIGIN' | 'APPEND' | 'PREPEND' | 'TOP'
export type ContainerRole = 'ACT' | 'SCENE'

export interface StoryNode {
  id: string
  canvas_id: string
  type: NodeType
  container_role: ContainerRole | null
  asset_id: string | null
  parent_id: string | null
  anchor_type: AnchorType | null
  container_id: string | null
  drift: number
  ui_track_lane: number | null
  media_in_point: number
  media_out_point: number | null
  playback_rate: number
  active_channels: number[] | null
  transition_in_type: string | null
  transition_in_duration: number
  internal_state_map: Record<string, unknown> | null
}

export interface GraphState {
  canvas: Canvas
  nodes: StoryNode[]
}

export interface Api {
  // Project APIs
  createProject: (name: string, client: string) => Promise<Project>
  getAllProjects: () => Promise<Project[]>

  // Media APIs
  importMedia: (projectId: string, filePaths: string[]) => Promise<Media[]>
  getMedia: (projectId: string) => Promise<Media[]>

  // Dialog APIs
  openFileDialog: () => Promise<string[]>

  // Canvas APIs
  createCanvas: (
    projectId: string,
    name: string,
    fps: number | null,
    resolution: string | null
  ) => Promise<Canvas>
  getCanvases: (projectId: string) => Promise<Canvas[]>

  // Graph APIs (Doc A 3.4)
  getGraphState: (canvasId: string) => Promise<GraphState>

  // Node APIs (Doc E: Topology, Doc H: Smart Drop Zones)
  createNode: (
    canvasId: string,
    mediaId: string,
    targetNodeId?: string,
    anchorType?: 'append' | 'stack' | 'prepend'
  ) => Promise<StoryNode>

  // Node Update API (Doc I: Inspector-driven updates)
  updateNode: (
    nodeId: string,
    updates: {
      drift?: number
      media_in_point?: number
      media_out_point?: number | null
      playback_rate?: number
    }
  ) => Promise<StoryNode>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
