import { getDB } from '../init'
import { v4 as uuidv4 } from 'uuid'

/**
 * Node Types as per Doc E: Fractal Topology
 * - SPINE: Main narrative elements on Y=0 (Dialogue/Audio)
 * - SATELLITE: Context elements stacking above spine (B-Roll, Images)
 * - CONTAINER: Acts and Scenes that wrap other nodes
 */
export type NodeType = 'SPINE' | 'SATELLITE' | 'CONTAINER'

/**
 * Anchor Types as per Doc E: The Rigid Structure
 * - ORIGIN: First item on Canvas (X=0, Y=0)
 * - APPEND: Attached to Right Edge of parent
 * - PREPEND: Attached to Left Edge (Satellites only)
 * - TOP: Attached to Top Edge (Satellites - composites)
 */
export type AnchorType = 'ORIGIN' | 'APPEND' | 'PREPEND' | 'TOP'

/**
 * Container Roles for CONTAINER type nodes
 */
export type ContainerRole = 'ACT' | 'SCENE'

/**
 * StoryNode interface matching Doc B: Database Dictionary
 * The unified structure for all topological elements
 */
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

/**
 * Raw database row before JSON parsing
 */
interface StoryNodeRow {
  id: string
  canvas_id: string
  type: string
  container_role: string | null
  asset_id: string | null
  parent_id: string | null
  anchor_type: string | null
  container_id: string | null
  drift: number
  ui_track_lane: number | null
  media_in_point: number
  media_out_point: number | null
  playback_rate: number
  active_channels: string | null
  transition_in_type: string | null
  transition_in_duration: number
  internal_state_map: string | null
}

/**
 * Retrieves all nodes belonging to a specific canvas.
 *
 * Doc A 3.4 - Graph Read Layer:
 * Returns the full graph state for rendering the Canvas topology.
 *
 * @param canvasId - The UUID of the canvas
 * @returns Array of StoryNode objects for physics calculation and rendering
 */
export function getNodesByCanvasId(canvasId: string): StoryNode[] {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT
      id,
      canvas_id,
      type,
      asset_id,
      parent_id,
      anchor_type,
      container_id,
      drift,
      media_in_point,
      media_out_point,
      playback_rate,
      active_channels,
      transition_in_type,
      transition_in_duration,
      internal_state_map
    FROM nodes
    WHERE canvas_id = ?
    ORDER BY
      CASE WHEN anchor_type = 'ORIGIN' THEN 0 ELSE 1 END,
      parent_id ASC
  `)

  const rows = stmt.all(canvasId) as StoryNodeRow[]

  // Parse JSON fields and cast types
  return rows.map((row) => ({
    id: row.id,
    canvas_id: row.canvas_id,
    type: row.type as NodeType,
    container_role: row.container_role as ContainerRole | null,
    asset_id: row.asset_id,
    parent_id: row.parent_id,
    anchor_type: row.anchor_type as AnchorType | null,
    container_id: row.container_id,
    drift: row.drift,
    ui_track_lane: row.ui_track_lane,
    media_in_point: row.media_in_point,
    media_out_point: row.media_out_point,
    playback_rate: row.playback_rate,
    active_channels: row.active_channels ? JSON.parse(row.active_channels) : null,
    transition_in_type: row.transition_in_type,
    transition_in_duration: row.transition_in_duration,
    internal_state_map: row.internal_state_map ? JSON.parse(row.internal_state_map) : null
  }))
}

/**
 * Input payload for creating a new node
 */
export interface CreateNodePayload {
  canvas_id: string
  type: NodeType
  asset_id?: string | null
  parent_id?: string | null
  anchor_type?: AnchorType | null
  container_id?: string | null
  drift?: number
  ui_track_lane?: number | null
  media_in_point?: number
  media_out_point?: number | null
  playback_rate?: number
  active_channels?: number[] | null
  transition_in_type?: string | null
  transition_in_duration?: number
  internal_state_map?: Record<string, unknown> | null
}

/**
 * Creates a new node in the graph.
 *
 * Doc E: Fractal Topology - Node creation with anchor-based positioning
 *
 * @param payload - The node data to insert
 * @returns The newly created StoryNode
 */
export function createNode(payload: CreateNodePayload): StoryNode {
  const db = getDB()
  const id = uuidv4()

  const stmt = db.prepare(`
    INSERT INTO nodes (
      id,
      canvas_id,
      type,
      asset_id,
      parent_id,
      anchor_type,
      container_id,
      drift,
      ui_track_lane,
      media_in_point,
      media_out_point,
      playback_rate,
      active_channels,
      transition_in_type,
      transition_in_duration,
      internal_state_map
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    payload.canvas_id,
    payload.type,
    payload.asset_id ?? null,
    payload.parent_id ?? null,
    payload.anchor_type ?? null,
    payload.container_id ?? null,
    payload.drift ?? 0,
    payload.ui_track_lane ?? null,
    payload.media_in_point ?? 0,
    payload.media_out_point ?? null,
    payload.playback_rate ?? 1.0,
    payload.active_channels ? JSON.stringify(payload.active_channels) : null,
    payload.transition_in_type ?? null,
    payload.transition_in_duration ?? 0,
    payload.internal_state_map ? JSON.stringify(payload.internal_state_map) : null
  )

  console.log(`[Node] Created ${payload.type} node ${id} on canvas ${payload.canvas_id}`)

  return {
    id,
    canvas_id: payload.canvas_id,
    type: payload.type,
    container_role: null,
    asset_id: payload.asset_id ?? null,
    parent_id: payload.parent_id ?? null,
    anchor_type: payload.anchor_type ?? null,
    container_id: payload.container_id ?? null,
    drift: payload.drift ?? 0,
    ui_track_lane: payload.ui_track_lane ?? null,
    media_in_point: payload.media_in_point ?? 0,
    media_out_point: payload.media_out_point ?? null,
    playback_rate: payload.playback_rate ?? 1.0,
    active_channels: payload.active_channels ?? null,
    transition_in_type: payload.transition_in_type ?? null,
    transition_in_duration: payload.transition_in_duration ?? 0,
    internal_state_map: payload.internal_state_map ?? null
  }
}

/**
 * Finds the tail node of the spine (last node on Y=0).
 *
 * Doc E: For "Smart Append" - find the rightmost node to attach to.
 *
 * @param canvasId - The canvas to search
 * @returns The tail SPINE node or null if canvas is empty
 */
export function getSpineTail(canvasId: string): StoryNode | null {
  const db = getDB()

  // Find nodes that have no children appended to them (the tail)
  // A tail node is one where no other node has it as parent_id with APPEND anchor
  const stmt = db.prepare(`
    SELECT
      n.id,
      n.canvas_id,
      n.type,
      n.asset_id,
      n.parent_id,
      n.anchor_type,
      n.container_id,
      n.drift,
      n.ui_track_lane,
      n.media_in_point,
      n.media_out_point,
      n.playback_rate,
      n.active_channels,
      n.transition_in_type,
      n.transition_in_duration,
      n.internal_state_map
    FROM nodes n
    WHERE n.canvas_id = ?
      AND n.type = 'SPINE'
      AND NOT EXISTS (
        SELECT 1 FROM nodes child
        WHERE child.parent_id = n.id
          AND child.anchor_type = 'APPEND'
      )
    LIMIT 1
  `)

  const row = stmt.get(canvasId) as StoryNodeRow | undefined

  if (!row) return null

  return {
    id: row.id,
    canvas_id: row.canvas_id,
    type: row.type as NodeType,
    container_role: row.container_role as ContainerRole | null,
    asset_id: row.asset_id,
    parent_id: row.parent_id,
    anchor_type: row.anchor_type as AnchorType | null,
    container_id: row.container_id,
    drift: row.drift,
    ui_track_lane: row.ui_track_lane,
    media_in_point: row.media_in_point,
    media_out_point: row.media_out_point,
    playback_rate: row.playback_rate,
    active_channels: row.active_channels ? JSON.parse(row.active_channels) : null,
    transition_in_type: row.transition_in_type,
    transition_in_duration: row.transition_in_duration,
    internal_state_map: row.internal_state_map ? JSON.parse(row.internal_state_map) : null
  }
}

/**
 * Retrieves a single node by its ID.
 *
 * @param nodeId - The UUID of the node
 * @returns The StoryNode or null if not found
 */
export function getNodeById(nodeId: string): StoryNode | null {
  const db = getDB()

  const stmt = db.prepare(`
    SELECT
      id,
      canvas_id,
      type,
      asset_id,
      parent_id,
      anchor_type,
      container_id,
      drift,
      ui_track_lane,
      media_in_point,
      media_out_point,
      playback_rate,
      active_channels,
      transition_in_type,
      transition_in_duration,
      internal_state_map
    FROM nodes
    WHERE id = ?
  `)

  const row = stmt.get(nodeId) as StoryNodeRow | undefined

  if (!row) return null

  return {
    id: row.id,
    canvas_id: row.canvas_id,
    type: row.type as NodeType,
    container_role: row.container_role as ContainerRole | null,
    asset_id: row.asset_id,
    parent_id: row.parent_id,
    anchor_type: row.anchor_type as AnchorType | null,
    container_id: row.container_id,
    drift: row.drift,
    ui_track_lane: row.ui_track_lane,
    media_in_point: row.media_in_point,
    media_out_point: row.media_out_point,
    playback_rate: row.playback_rate,
    active_channels: row.active_channels ? JSON.parse(row.active_channels) : null,
    transition_in_type: row.transition_in_type,
    transition_in_duration: row.transition_in_duration,
    internal_state_map: row.internal_state_map ? JSON.parse(row.internal_state_map) : null
  }
}

/**
 * Payload for updating an existing node
 * All fields are optional - only provided fields will be updated
 */
export interface UpdateNodePayload {
  drift?: number
  media_in_point?: number
  media_out_point?: number | null
  playback_rate?: number
  ui_track_lane?: number | null
  parent_id?: string | null
  anchor_type?: AnchorType | null
  active_channels?: number[] | null
  transition_in_type?: string | null
  transition_in_duration?: number
}

/**
 * Updates an existing node with the provided fields.
 *
 * Doc I: Inspector-driven updates for Drift, In/Out Points, etc.
 * This triggers re-calculation of the Topology (Snowplow effect).
 *
 * @param nodeId - The UUID of the node to update
 * @param updates - Partial payload with fields to update
 * @returns The updated StoryNode
 * @throws Error if node not found
 */
export function updateNode(nodeId: string, updates: UpdateNodePayload): StoryNode {
  const db = getDB()

  // Build dynamic UPDATE statement based on provided fields
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.drift !== undefined) {
    setClauses.push('drift = ?')
    values.push(updates.drift)
  }
  if (updates.media_in_point !== undefined) {
    setClauses.push('media_in_point = ?')
    values.push(updates.media_in_point)
  }
  if (updates.media_out_point !== undefined) {
    setClauses.push('media_out_point = ?')
    values.push(updates.media_out_point)
  }
  if (updates.playback_rate !== undefined) {
    setClauses.push('playback_rate = ?')
    values.push(updates.playback_rate)
  }
  if (updates.ui_track_lane !== undefined) {
    setClauses.push('ui_track_lane = ?')
    values.push(updates.ui_track_lane)
  }
  if (updates.parent_id !== undefined) {
    setClauses.push('parent_id = ?')
    values.push(updates.parent_id)
  }
  if (updates.anchor_type !== undefined) {
    setClauses.push('anchor_type = ?')
    values.push(updates.anchor_type)
  }
  if (updates.active_channels !== undefined) {
    setClauses.push('active_channels = ?')
    values.push(updates.active_channels ? JSON.stringify(updates.active_channels) : null)
  }
  if (updates.transition_in_type !== undefined) {
    setClauses.push('transition_in_type = ?')
    values.push(updates.transition_in_type)
  }
  if (updates.transition_in_duration !== undefined) {
    setClauses.push('transition_in_duration = ?')
    values.push(updates.transition_in_duration)
  }

  if (setClauses.length === 0) {
    // No updates provided, just return the existing node
    const existing = getNodeById(nodeId)
    if (!existing) {
      throw new Error(`[Node] Node not found: ${nodeId}`)
    }
    return existing
  }

  // Add nodeId to values for WHERE clause
  values.push(nodeId)

  const sql = `UPDATE nodes SET ${setClauses.join(', ')} WHERE id = ?`
  const stmt = db.prepare(sql)
  const result = stmt.run(...values)

  if (result.changes === 0) {
    throw new Error(`[Node] Node not found: ${nodeId}`)
  }

  console.log(`[Node] Updated node ${nodeId}:`, updates)

  // Return the freshly updated node
  const updated = getNodeById(nodeId)
  if (!updated) {
    throw new Error(`[Node] Failed to retrieve updated node: ${nodeId}`)
  }

  return updated
}
