/**
 * Layout Engine - Doc E: Fractal Topology & Physics
 *
 * Implements the "Elastic Column" algorithm for positioning nodes on the graph.
 * Nodes are positioned based on their topological relationships, not absolute coordinates.
 */

import type { StoryNode } from '@shared/index.d'

// Layout Constants per Doc E: Fractal Topology & Physics
export const BASE_NODE_WIDTH = 300 // Doc E: "Base Width: Fixed at 300px"
export const NODE_HEIGHT = 100 // Height of each node block
export const GAP_BETWEEN_NODES = 100 // Doc E: "Standard gap between nodes is 100px"
export const CANVAS_PADDING = 50 // Initial offset from left edge

/**
 * Rendered node with computed layout coordinates
 */
export interface RenderNode {
  node: StoryNode
  x: number
  y: number
  width: number
  height: number
  color: string
  borderColor: string
  isOrigin: boolean
  trackLabel: string
}

/**
 * Connection line between parent and child nodes
 */
export interface ConnectionLine {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  type: 'append' | 'stack' | 'prepend'
}

/**
 * Complete layout result
 */
export interface GraphLayout {
  nodes: RenderNode[]
  connections: ConnectionLine[]
  totalWidth: number
  totalHeight: number
}

/**
 * Node colors per Doc E
 * - SPINE (V1): Purple - Main narrative floor
 * - SATELLITE (V2+): Cyan - Context/B-Roll above
 * - CONTAINER: Gray - Acts/Scenes
 */
const NODE_COLORS = {
  SPINE: { bg: '#A855F7', border: '#7C3AED' },
  SATELLITE: { bg: '#06B6D4', border: '#0891B2' },
  CONTAINER: { bg: '#6B7280', border: '#4B5563' }
}

/**
 * Computes the graph layout for all nodes.
 *
 * Doc E: Elastic Column Physics
 * - Y=0 is the "Floor" where SPINE nodes live
 * - Negative Y is "Sky" where SATELLITES stack upward
 * - X is determined by the chain of APPEND anchors (Snowplow effect)
 * - SPINE nodes expand their "Elastic Column" to accommodate satellites
 *
 * @param nodes - Flat list of StoryNode from database
 * @returns Complete layout with positioned nodes and connection lines
 */
export function computeGraphLayout(nodes: StoryNode[]): GraphLayout {
  if (nodes.length === 0) {
    return { nodes: [], connections: [], totalWidth: 0, totalHeight: 0 }
  }

  const renderNodes: RenderNode[] = []
  const connections: ConnectionLine[] = []

  // Build parent -> children map for traversal
  const childrenMap = new Map<string, StoryNode[]>()
  const nodeMap = new Map<string, StoryNode>()

  nodes.forEach((node) => {
    nodeMap.set(node.id, node)
    if (node.parent_id) {
      const children = childrenMap.get(node.parent_id) || []
      children.push(node)
      childrenMap.set(node.parent_id, children)
    }
  })

  // Find the ORIGIN node (root of the graph)
  const originNode = nodes.find((n) => n.anchor_type === 'ORIGIN')
  if (!originNode) {
    return { nodes: [], connections: [], totalWidth: 0, totalHeight: 0 }
  }

  // Track positions for layout calculation
  const positionMap = new Map<string, { x: number; y: number; width: number }>()

  /**
   * Calculate base node width
   * Doc E: "Base Width: Fixed at 300px"
   */
  const calculateBaseWidth = (_node: StoryNode): number => {
    return BASE_NODE_WIDTH
  }

  /**
   * Doc E: Elastic Column - Calculate the "tree width" for a node
   * This is the width needed to contain the node and all its stacked children
   * SPINE nodes expand to fit their satellite "wings"
   *
   * @returns The total width needed for this node's column
   */
  const calculateElasticWidth = (node: StoryNode): number => {
    const baseWidth = calculateBaseWidth(node)
    const children = childrenMap.get(node.id) || []

    // Get TOP (stacked) children - these expand the column
    const stackChildren = children.filter((c) => c.anchor_type === 'TOP')

    if (stackChildren.length === 0) {
      return baseWidth
    }

    // Find the maximum width among stacked children (recursively)
    let maxChildWidth = 0
    for (const child of stackChildren) {
      const childElasticWidth = calculateElasticWidth(child)
      maxChildWidth = Math.max(maxChildWidth, childElasticWidth)
    }

    // The elastic width is the max of base width and stacked children widths
    // This creates the "umbrella" effect where a spine node covers its satellites
    return Math.max(baseWidth, maxChildWidth)
  }

  /**
   * Recursive function to process node tree
   * Returns the rightmost X position after processing this subtree
   */
  const processNode = (
    node: StoryNode,
    startX: number,
    parentPos?: { x: number; y: number; width: number }
  ): number => {
    // Determine X and Y position based on anchor type per Doc E
    let x = startX
    let y = 0 // Floor (Y=0) by default

    if (node.anchor_type === 'ORIGIN') {
      // ORIGIN: X=0, Y=0 (The Floor)
      x = startX
      y = 0
    } else if (node.anchor_type === 'APPEND' && parentPos) {
      // Doc E: APPEND - X = Parent.X + Parent.Width + Gap
      x = parentPos.x + parentPos.width + GAP_BETWEEN_NODES
      y = parentPos.y // Same Y as parent (stays on same track)
    } else if (node.anchor_type === 'TOP' && parentPos) {
      // Doc E: TOP - Y = Parent.Y - Self.Height - Gap (stacks upward into negative Y)
      x = parentPos.x // Same X as parent
      y = parentPos.y - NODE_HEIGHT - GAP_BETWEEN_NODES // Stack above parent
    } else if (node.anchor_type === 'PREPEND' && parentPos) {
      // Doc E: PREPEND - X = Parent.X - Self.Width - Gap
      const baseWidth = calculateBaseWidth(node)
      x = parentPos.x - baseWidth - GAP_BETWEEN_NODES
      y = parentPos.y // Same Y as parent
    }

    // Calculate width: SPINE nodes get elastic width, satellites get base width
    // Doc E: Elastic Column - SPINE nodes expand to fit their satellite children
    const width =
      node.type === 'SPINE' ? calculateElasticWidth(node) : calculateBaseWidth(node)

    // Store position for children to reference
    const pos = { x, y, width }
    positionMap.set(node.id, pos)

    // Determine colors based on type
    const colors = NODE_COLORS[node.type] || NODE_COLORS.SPINE
    // Calculate track label from Y position: Y=0 is V1, Y=-200 (one level up) is V2, etc.
    const trackNumber = Math.abs(Math.round(y / (NODE_HEIGHT + GAP_BETWEEN_NODES))) + 1
    const trackLabel = `V${trackNumber}`

    // Add to render list
    renderNodes.push({
      node,
      x,
      y,
      width,
      height: NODE_HEIGHT,
      color: colors.bg,
      borderColor: colors.border,
      isOrigin: node.anchor_type === 'ORIGIN',
      trackLabel
    })

    // Create connection line to parent
    if (parentPos && node.anchor_type) {
      const connectionType =
        node.anchor_type === 'TOP'
          ? 'stack'
          : node.anchor_type === 'PREPEND'
            ? 'prepend'
            : 'append'

      // For stack connections, draw from parent center-top to child center-bottom
      if (connectionType === 'stack') {
        connections.push({
          id: `conn-${node.id}`,
          fromX: parentPos.x + parentPos.width / 2,
          fromY: parentPos.y,
          toX: x + width / 2,
          toY: y + NODE_HEIGHT,
          type: connectionType
        })
      } else {
        connections.push({
          id: `conn-${node.id}`,
          fromX: parentPos.x + parentPos.width,
          fromY: parentPos.y + NODE_HEIGHT / 2,
          toX: x,
          toY: y + NODE_HEIGHT / 2,
          type: connectionType
        })
      }
    }

    // Track the rightmost position for this subtree
    let rightmostX = x + width

    // Process children
    const children = childrenMap.get(node.id) || []

    // Sort children: APPEND first (they extend the spine), then TOP/PREPEND
    const appendChildren = children.filter((c) => c.anchor_type === 'APPEND')
    const stackChildren = children.filter((c) => c.anchor_type === 'TOP')
    const prependChildren = children.filter((c) => c.anchor_type === 'PREPEND')

    // Process APPEND children sequentially (they chain together)
    let nextX = x + width + GAP_BETWEEN_NODES
    for (const child of appendChildren) {
      const childRight = processNode(child, nextX, pos)
      rightmostX = Math.max(rightmostX, childRight)
      // Update nextX for the next sibling
      const childPos = positionMap.get(child.id)
      if (childPos) {
        nextX = childPos.x + childPos.width + GAP_BETWEEN_NODES
      }
    }

    // Process TOP (stack) children - they sit above at the same X
    for (const child of stackChildren) {
      const childRight = processNode(child, x, pos)
      rightmostX = Math.max(rightmostX, childRight)
    }

    // Process PREPEND children - they go before (rare case)
    for (const child of prependChildren) {
      const childWidth = calculateBaseWidth(child)
      processNode(child, x - childWidth - GAP_BETWEEN_NODES, pos)
    }

    return rightmostX
  }

  // Start processing from origin
  const totalWidth = processNode(originNode, CANVAS_PADDING)

  // Calculate total height based on actual Y positions
  // Y=0 is the floor, negative Y values go "up" into the sky
  // Find the minimum Y (most negative = highest up)
  const minY = Math.min(...renderNodes.map((rn) => rn.y), 0)
  // Total height spans from highest node (minY) to floor (Y=0) plus node height
  const totalHeight = Math.abs(minY) + NODE_HEIGHT + CANVAS_PADDING

  return {
    nodes: renderNodes,
    connections,
    totalWidth: totalWidth + CANVAS_PADDING,
    totalHeight
  }
}

/**
 * Drop Zone Types for interaction
 */
export type DropZoneType = 'append' | 'stack' | 'prepend' | null

/**
 * Drop zone detection result
 */
export interface DropZone {
  targetNodeId: string
  type: DropZoneType
  ghostX: number
  ghostY: number
  ghostWidth: number
}

/**
 * Detects which drop zone the cursor is hovering over.
 *
 * Doc H: Drop Zones
 * - Right 30% of node = APPEND zone
 * - Top 50% of node = STACK zone (for satellites)
 * - Left 20% of node = PREPEND zone (rare)
 *
 * @param mouseX - Mouse X relative to canvas
 * @param mouseY - Mouse Y relative to canvas
 * @param layout - Current graph layout
 * @param draggedDuration - Duration of the dragged media (for ghost sizing)
 * @returns Drop zone info or null if not over any zone
 */
export function detectDropZone(
  mouseX: number,
  mouseY: number,
  layout: GraphLayout,
  _draggedDuration: number = 5
): DropZone | null {
  // Doc E: Ghost width is fixed at BASE_NODE_WIDTH (300px)
  const ghostWidth = BASE_NODE_WIDTH

  // If no nodes exist, return a genesis drop zone
  if (layout.nodes.length === 0) {
    return {
      targetNodeId: '',
      type: 'append',
      ghostX: CANVAS_PADDING,
      ghostY: 0,
      ghostWidth
    }
  }

  // Check each node for hit
  for (const renderNode of layout.nodes) {
    const { x, y, width, height } = renderNode

    // Check if mouse is within this node's bounding box (with some padding)
    const hitPadding = 20
    if (
      mouseX >= x - hitPadding &&
      mouseX <= x + width + hitPadding &&
      mouseY >= y - hitPadding &&
      mouseY <= y + height + hitPadding
    ) {
      // Determine which zone based on position within node
      const relativeX = mouseX - x
      const relativeY = mouseY - y

      // Right 30% = APPEND
      if (relativeX > width * 0.7) {
        return {
          targetNodeId: renderNode.node.id,
          type: 'append',
          ghostX: x + width + GAP_BETWEEN_NODES,
          ghostY: y,
          ghostWidth
        }
      }

      // Top 50% = STACK (only if this is a spine node or satellite)
      // Doc E: TOP anchor - Y = Parent.Y - Self.Height - Gap
      if (relativeY < height * 0.5) {
        return {
          targetNodeId: renderNode.node.id,
          type: 'stack',
          ghostX: x,
          ghostY: y - NODE_HEIGHT - GAP_BETWEEN_NODES, // Stack above per Doc E
          ghostWidth
        }
      }

      // Left 20% = PREPEND (rare)
      if (relativeX < width * 0.2) {
        return {
          targetNodeId: renderNode.node.id,
          type: 'prepend',
          ghostX: x - ghostWidth - GAP_BETWEEN_NODES,
          ghostY: y,
          ghostWidth
        }
      }

      // Default to APPEND if inside node but no specific zone
      return {
        targetNodeId: renderNode.node.id,
        type: 'append',
        ghostX: x + width + GAP_BETWEEN_NODES,
        ghostY: y,
        ghostWidth
      }
    }
  }

  // Not over any node - find the rightmost node and offer to append there
  const rightmostNode = layout.nodes.reduce((prev, curr) =>
    (curr.x + curr.width > prev.x + prev.width) ? curr : prev
  )

  return {
    targetNodeId: rightmostNode.node.id,
    type: 'append',
    ghostX: rightmostNode.x + rightmostNode.width + GAP_BETWEEN_NODES,
    ghostY: rightmostNode.y,
    ghostWidth
  }
}
