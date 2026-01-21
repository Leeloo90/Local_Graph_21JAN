import { getDB } from '../init'
import { v4 as uuidv4 } from 'uuid'
import type { MediaMetadata } from '../../utils/forensics'

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

export function addMediaToProject(
  projectId: string,
  filePath: string,
  metadata: MediaMetadata
): Media {
  const db = getDB()
  const id = uuidv4()

  const stmt = db.prepare(`
    INSERT INTO media_library (
      id, project_id, file_path, fps, duration_sec, start_tc_string,
      proxy_status, proxy_path, waveform_status, waveform_path
    )
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NULL, 'PENDING', NULL)
  `)

  stmt.run(id, projectId, filePath, metadata.fps, metadata.duration, metadata.startTc)

  console.log(`[Media] Added to project ${projectId}: ${filePath}`)

  return {
    id,
    project_id: projectId,
    file_path: filePath,
    fps: metadata.fps,
    duration_sec: metadata.duration,
    start_tc_string: metadata.startTc,
    proxy_status: 'PENDING',
    proxy_path: null,
    waveform_status: 'PENDING',
    waveform_path: null
  }
}

export function getProjectMedia(projectId: string): Media[] {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT id, project_id, file_path, fps, duration_sec, start_tc_string,
           proxy_status, proxy_path, waveform_status, waveform_path
    FROM media_library
    WHERE project_id = ?
    ORDER BY file_path ASC
  `)

  return stmt.all(projectId) as Media[]
}

/**
 * Retrieves a single media item by its ID.
 *
 * @param mediaId - The UUID of the media item
 * @returns The Media object or null if not found
 */
export function getMediaById(mediaId: string): Media | null {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT id, project_id, file_path, fps, duration_sec, start_tc_string,
           proxy_status, proxy_path, waveform_status, waveform_path
    FROM media_library
    WHERE id = ?
  `)

  return (stmt.get(mediaId) as Media) || null
}
