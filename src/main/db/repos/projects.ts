import { getDB } from '../init'
import { v4 as uuidv4 } from 'uuid'

export interface Project {
  id: string
  name: string
  default_fps: number | null
  default_resolution: string | null
  last_edited_at: string | null
}

export function createProject(name: string, client: string): Project {
  const db = getDB()
  const id = uuidv4()
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO projects (id, name, default_fps, default_resolution, last_edited_at)
    VALUES (?, ?, NULL, NULL, ?)
  `)

  stmt.run(id, `${client} - ${name}`, now)

  return {
    id,
    name: `${client} - ${name}`,
    default_fps: null,
    default_resolution: null,
    last_edited_at: now
  }
}

export function getAllProjects(): Project[] {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT id, name, default_fps, default_resolution, last_edited_at
    FROM projects
    ORDER BY last_edited_at DESC
  `)

  return stmt.all() as Project[]
}

export function getProjectById(projectId: string): Project | null {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT id, name, default_fps, default_resolution, last_edited_at
    FROM projects
    WHERE id = ?
  `)

  return (stmt.get(projectId) as Project) || null
}
