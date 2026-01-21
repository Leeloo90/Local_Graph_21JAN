/**
 * Timeline Logic Engine
 * Doc F: The Two Timecodes & Propagation
 *
 * The Timeline is a "Read-Only Projection" of the Graph.
 * We do not store absolute timeline positions; we calculate them live from the topology.
 *
 * Type Propagation Rules (Doc E):
 * - Lane 0 = Spine (V1)
 * - Lane > 0 = Satellite (V2, V3, etc.)
 * - Stack (TOP): Always increments lane by 1
 * - Append/Prepend: Stays on same lane as target
 */

import type { StoryNode } from '@shared/index.d'

/**
 * A clip representation for the timeline view
 */
export interface TimelineClip {
  id: string
  nodeId: string
  mediaId: string | null
  start: number // Timeline start time in seconds
  end: number // Timeline end time in seconds
  track: number // Track index (0 = V1, 1 = V2, etc.)
  color: string
  name: string
  duration: number // Source duration in seconds
}

/**
 * A track/row in the timeline
 */
export interface TimelineRow {
  id: number
  label: string
  type: 'video' | 'audio'
  clips: TimelineClip[]
}

/**
 * Timeline derivation result
 */
export interface TimelineState {
  rows: TimelineRow[]
  totalDuration: number // Total timeline length in seconds
}

/**
 * Derives a linear timeline from the graph topology.
 * Doc F: Timeline Time is calculated live, not stored.
 *
 * Algorithm:
 * 1. Find the Origin node (anchor_type = 'ORIGIN')
 * 2. Build parent-child relationships
 * 3. Traverse from Origin, calculating timeline positions
 * 4. Use ui_track_lane directly for track assignment
 *
 * @param nodes - All nodes in the graph
 * @returns Timeline state with rows and clips
 */
export function deriveTimeline(nodes: StoryNode[]): TimelineState {
  if (nodes.length === 0) {
    return {
      rows: createEmptyRows(),
      totalDuration: 0
    }
  }

  // Build lookup maps
  const nodeMap = new Map<string, StoryNode>()
  const childrenMap = new Map<string, StoryNode[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    if (node.parent_id) {
      const children = childrenMap.get(node.parent_id) || []
      children.push(node)
      childrenMap.set(node.parent_id, children)
    }
  }

  // Find the Origin node
  const originNode = nodes.find((n) => n.anchor_type === 'ORIGIN')
  if (!originNode) {
    return {
      rows: createEmptyRows(),
      totalDuration: 0
    }
  }

  // Initialize clips arrays for each track
  const clipsByTrack = new Map<number, TimelineClip[]>()
  let totalDuration = 0

  // Store timeline positions for child reference
  const timelinePositions = new Map<string, { start: number; end: number }>()

  /**
   * Calculate duration for a node
   * Doc F: Duration = (out_point - in_point) / playback_rate
   */
  const getNodeDuration = (node: StoryNode): number => {
    const inPoint = node.media_in_point ?? 0
    const outPoint = node.media_out_point ?? inPoint
    const rate = node.playback_rate ?? 1
    return (outPoint - inPoint) / rate
  }

  /**
   * Process a node and all its children recursively
   * Uses ui_track_lane directly from the node for track assignment
   */
  const processNode = (node: StoryNode, startTime: number): number => {
    const duration = getNodeDuration(node)
    const endTime = startTime + duration

    // Store position for child reference
    timelinePositions.set(node.id, { start: startTime, end: endTime })

    // Use ui_track_lane directly for track assignment
    const track = node.ui_track_lane ?? 0
    const isSpine = track === 0

    // Create clip
    const clip: TimelineClip = {
      id: `clip-${node.id}`,
      nodeId: node.id,
      mediaId: node.asset_id,
      start: startTime,
      end: endTime,
      track,
      color: isSpine ? '#A855F7' : '#06B6D4', // Purple for spine, Cyan for satellites
      name: isSpine ? 'SPINE' : 'SATELLITE',
      duration
    }

    // Add to appropriate track
    if (!clipsByTrack.has(track)) {
      clipsByTrack.set(track, [])
    }
    clipsByTrack.get(track)!.push(clip)

    // Update total duration
    totalDuration = Math.max(totalDuration, endTime)

    // Process children
    const children = childrenMap.get(node.id) || []

    // Process TOP (stacked) children - they start at parent's start time
    const topChildren = children.filter((c) => c.anchor_type === 'TOP')
    for (const child of topChildren) {
      const driftSeconds = (child.drift ?? 0) / 1000
      processNode(child, startTime + driftSeconds)
    }

    // Process APPEND children - they start after parent ends
    const appendChildren = children.filter((c) => c.anchor_type === 'APPEND')
    let chainTime = endTime
    for (const child of appendChildren) {
      const driftSeconds = (child.drift ?? 0) / 1000
      const childEndTime = processNode(child, chainTime + driftSeconds)
      chainTime = childEndTime
    }

    // Process PREPEND children (rare) - for now, treat like APPEND
    // In a full implementation, these would need special handling
    const prependChildren = children.filter((c) => c.anchor_type === 'PREPEND')
    for (const child of prependChildren) {
      processNode(child, startTime)
    }

    return endTime
  }

  // Start processing from the Origin node at time 0
  processNode(originNode, 0)

  // Build the rows array
  const rows = buildTimelineRows(clipsByTrack)

  return {
    rows,
    totalDuration
  }
}

/**
 * Create empty timeline rows structure
 */
function createEmptyRows(): TimelineRow[] {
  return [
    { id: 2, label: 'V3', type: 'video', clips: [] },
    { id: 1, label: 'V2', type: 'video', clips: [] },
    { id: 0, label: 'V1', type: 'video', clips: [] },
    { id: -1, label: 'A1', type: 'audio', clips: [] }
  ]
}

/**
 * Build timeline rows from clips grouped by track
 */
function buildTimelineRows(clipsByTrack: Map<number, TimelineClip[]>): TimelineRow[] {
  // Find the highest track number used
  let maxTrack = 0
  for (const track of clipsByTrack.keys()) {
    maxTrack = Math.max(maxTrack, track)
  }

  // Ensure we have at least V1, V2, V3
  maxTrack = Math.max(maxTrack, 2)

  const rows: TimelineRow[] = []

  // Build video tracks from highest to lowest (V3, V2, V1 order for display)
  for (let track = maxTrack; track >= 0; track--) {
    rows.push({
      id: track,
      label: `V${track + 1}`,
      type: 'video',
      clips: clipsByTrack.get(track) || []
    })
  }

  // Add audio track (placeholder for now)
  rows.push({
    id: -1,
    label: 'A1',
    type: 'audio',
    clips: []
  })

  return rows
}

/**
 * Format time in seconds to timecode string (HH:MM:SS:FF)
 * @param seconds - Time in seconds
 * @param fps - Frames per second (default 24)
 */
export function formatTimecode(seconds: number, fps: number = 24): string {
  const totalFrames = Math.floor(seconds * fps)
  const frames = totalFrames % fps
  const totalSeconds = Math.floor(seconds)
  const secs = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const mins = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

/**
 * Format time in seconds to simple MM:SS display
 */
export function formatTimeSimple(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
