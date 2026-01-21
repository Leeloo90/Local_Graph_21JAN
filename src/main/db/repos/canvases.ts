import { getDB } from '../init'
import { v4 as uuidv4 } from 'uuid'
import { getProjectById } from './projects'

export interface Canvas {
  id: string
  project_id: string
  name: string
  fps: number | null
  resolution: string | null
  created_at: string | null
}

/**
 * Creates a new canvas within a project.
 *
 * Doc K 3.2 - Canvas Settings Inheritance:
 * - If fps or resolution is null, inherit from project's default_fps/default_resolution
 * - This ensures the "Temporal Floor" grid aligns with master project settings
 *
 * @param projectId - The parent project UUID
 * @param name - Canvas name (e.g., "Director's Cut")
 * @param fps - Frame rate (null = inherit from project)
 * @param resolution - Resolution string (null = inherit from project)
 * @returns The newly created Canvas object
 * @throws Error if projectId doesn't exist
 */
export function createCanvas(
  projectId: string,
  name: string,
  fps: number | null,
  resolution: string | null
): Canvas {
  const db = getDB()
  const id = uuidv4()
  const now = new Date().toISOString()

  // Doc K 3.2: Inheritance Logic
  // If fps or resolution is null, query the project for defaults
  let effectiveFps = fps
  let effectiveResolution = resolution

  if (fps === null || resolution === null) {
    const project = getProjectById(projectId)

    if (!project) {
      throw new Error(`[Canvas] Project not found: ${projectId}`)
    }

    // Inherit from project defaults if not explicitly provided
    if (fps === null) {
      effectiveFps = project.default_fps
      console.log(`[Canvas] Inheriting FPS from project: ${effectiveFps}`)
    }

    if (resolution === null) {
      effectiveResolution = project.default_resolution
      console.log(`[Canvas] Inheriting resolution from project: ${effectiveResolution}`)
    }
  }

  const stmt = db.prepare(`
    INSERT INTO canvases (id, project_id, name, fps, resolution, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(id, projectId, name, effectiveFps, effectiveResolution, now)

  console.log(
    `[Canvas] Created "${name}" in project ${projectId} (fps: ${effectiveFps}, res: ${effectiveResolution})`
  )

  return {
    id,
    project_id: projectId,
    name,
    fps: effectiveFps,
    resolution: effectiveResolution,
    created_at: now
  }
}

export function getProjectCanvases(projectId: string): Canvas[] {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT id, project_id, name, fps, resolution, created_at
    FROM canvases
    WHERE project_id = ?
    ORDER BY created_at DESC
  `)

  return stmt.all(projectId) as Canvas[]
}

export function getCanvasById(canvasId: string): Canvas | null {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT id, project_id, name, fps, resolution, created_at
    FROM canvases
    WHERE id = ?
  `)

  return (stmt.get(canvasId) as Canvas) || null
}
