import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { GraphState, StoryNode, Canvas, Media } from '@shared/index.d'
import {
  computeGraphLayout,
  detectDropZone,
  type DropZone,
  NODE_HEIGHT
} from '../utils/layout'

interface EditorProps {
  projectId: string
  projectName: string
  canvasId: string
  canvasName: string
  onBack: () => void
}

function Editor({
  projectId,
  projectName,
  canvasId,
  canvasName,
  onBack
}: EditorProps): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [canvas, setCanvas] = useState<Canvas | null>(null)
  const [nodes, setNodes] = useState<StoryNode[]>([])
  const [mediaItems, setMediaItems] = useState<Media[]>([])
  const [importing, setImporting] = useState(false)

  const fetchMedia = async (): Promise<void> => {
    try {
      const data = await window.api.getMedia(projectId)
      setMediaItems(data)
    } catch (error) {
      console.error('[Editor] Failed to fetch media:', error)
    }
  }

  useEffect(() => {
    const initEditor = async (): Promise<void> => {
      try {
        console.log(`[Editor] Initializing for Project: ${projectId}, Canvas: ${canvasId}`)

        // Fetch graph state (Doc A 3.4)
        const graphState: GraphState = await window.api.getGraphState(canvasId)

        setCanvas(graphState.canvas)
        setNodes(graphState.nodes)

        // Fetch media for the project
        await fetchMedia()

        console.log(
          `[Editor] Loaded canvas "${graphState.canvas.name}" with ${graphState.nodes.length} nodes`
        )

        setLoading(false)
      } catch (error) {
        console.error('[Editor] Failed to load editor state:', error)
        setLoading(false)
      }
    }

    if (projectId && canvasId) {
      initEditor()
    }
  }, [projectId, canvasId])

  const handleImportMedia = async (): Promise<void> => {
    try {
      const paths = await window.api.openFileDialog()
      if (paths && paths.length > 0) {
        setImporting(true)
        await window.api.importMedia(projectId, paths)
        await fetchMedia()
      }
    } catch (error) {
      console.error('[Editor] Failed to import media:', error)
    } finally {
      setImporting(false)
    }
  }

  const refreshGraph = async (): Promise<void> => {
    try {
      const graphState: GraphState = await window.api.getGraphState(canvasId)
      setNodes(graphState.nodes)
      console.log(`[Editor] Refreshed graph: ${graphState.nodes.length} nodes`)
    } catch (error) {
      console.error('[Editor] Failed to refresh graph:', error)
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading Story Graph Engine...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Top Toolbar */}
      <header style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button style={styles.backButton} onClick={onBack}>
            ← Back
          </button>
          <div style={styles.toolbarInfo}>
            <span style={styles.projectName}>{projectName}</span>
            <span style={styles.separator}>/</span>
            <span style={styles.canvasName}>{canvasName}</span>
          </div>
        </div>
        <div style={styles.toolbarCenter}>
          {/* Playback controls placeholder */}
        </div>
        <div style={styles.toolbarRight}>
          {/* Export / Settings buttons placeholder */}
        </div>
      </header>

      {/* Main Workspace */}
      <div style={styles.workspace}>
        {/* ZONE A: Left Sidebar (Media Library / Bucket) */}
        <aside style={styles.leftSidebar}>
          <MediaPanel
            mediaItems={mediaItems}
            importing={importing}
            onImport={handleImportMedia}
          />
        </aside>

        {/* Center Column: The Narrative Physics Engine */}
        <div style={styles.centerColumn}>
          {/* ZONE B: The Graph Canvas (Topology - Y-Axis) */}
          <main style={styles.graphPanel}>
            <GraphPanel
              canvasId={canvasId}
              nodes={nodes}
              canvas={canvas}
              onNodeCreated={refreshGraph}
            />
          </main>

          {/* ZONE C: The Timeline (Temporal Floor - X-Axis) */}
          <div style={styles.timelinePanel}>
            <TimelinePanel />
          </div>
        </div>

        {/* ZONE D: Right Sidebar (Inspector) */}
        <aside style={styles.rightSidebar}>
          <InspectorPanel />
        </aside>
      </div>
    </div>
  )
}

// ============================================================
// Placeholder Panel Components (To be built out in future phases)
// ============================================================

interface MediaPanelProps {
  mediaItems: Media[]
  importing: boolean
  onImport: () => void
}

function MediaPanel({ mediaItems, importing, onImport }: MediaPanelProps): React.JSX.Element {
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getFileName = (filePath: string): string => {
    return filePath.split('/').pop()?.split('\\').pop() || filePath
  }

  return (
    <div style={panelStyles.container}>
      {/* Media Library Header */}
      <div style={panelStyles.header}>
        <span style={panelStyles.title}>Media Library</span>
        <button style={mediaPanelStyles.importButton} onClick={onImport} disabled={importing}>
          {importing ? '...' : '+ Import'}
        </button>
      </div>

      {/* Media List */}
      <div style={mediaPanelStyles.mediaList}>
        {mediaItems.length === 0 ? (
          <div style={panelStyles.placeholder}>
            <div style={panelStyles.placeholderIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p style={panelStyles.placeholderText}>No media yet</p>
            <p style={panelStyles.placeholderHint}>Click + Import to add files</p>
          </div>
        ) : (
          <div style={mediaPanelStyles.mediaGrid}>
            {mediaItems.map((item) => (
              <div
                key={item.id}
                style={mediaPanelStyles.mediaCard}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('mediaId', item.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
              >
                <div style={mediaPanelStyles.mediaThumbnail}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div style={mediaPanelStyles.mediaInfo}>
                  <div style={mediaPanelStyles.mediaName}>{getFileName(item.file_path)}</div>
                  <div style={mediaPanelStyles.mediaMeta}>
                    <span>{formatDuration(item.duration_sec)}</span>
                    {item.fps && <span>{item.fps.toFixed(2)} fps</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bucket Section */}
      <div style={panelStyles.footer}>
        <div style={panelStyles.header}>
          <span style={panelStyles.title}>Bucket</span>
        </div>
        <div style={{ ...panelStyles.content, flex: '0 0 120px' }}>
          <div style={panelStyles.placeholder}>
            <p style={panelStyles.placeholderHint}>Staging Area (Doc C)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface GraphPanelProps {
  canvasId: string
  nodes: StoryNode[]
  canvas: Canvas | null
  onNodeCreated: () => void
}

// Viewport state for pan/zoom camera
interface Viewport {
  x: number
  y: number
  scale: number
}

function GraphPanel({
  canvasId,
  nodes,
  canvas,
  onNodeCreated
}: GraphPanelProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dropZone, setDropZone] = useState<DropZone | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Viewport camera state (Doc H: Pan & Zoom)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)

  // Compute layout using the physics engine (Doc E)
  const layout = useMemo(() => computeGraphLayout(nodes), [nodes])
  const hasNodes = nodes.length > 0

  // Calculate vertical center offset to position V1 (track 0) in the middle
  const getVerticalOffset = useCallback(() => {
    if (!containerRef.current) return 200
    const containerHeight = containerRef.current.clientHeight
    // Center the V1 track (y=0) vertically
    return containerHeight / 2 - NODE_HEIGHT / 2
  }, [])

  // Convert screen coordinates to canvas coordinates (accounting for viewport transform)
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { x: screenX, y: screenY }

      const relX = screenX - rect.left
      const relY = screenY - rect.top

      // Reverse the viewport transform: (screen - pan) / scale
      const canvasX = (relX - viewport.x) / viewport.scale
      const canvasY = (relY - viewport.y - getVerticalOffset()) / viewport.scale

      return { x: canvasX, y: canvasY }
    },
    [viewport, getVerticalOffset]
  )

  // Handle keyboard events for Space key (pan mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true)
        e.preventDefault()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [spacePressed])

  // Pan handlers (Doc H: Middle Mouse OR Space + Left Click)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button (1) or Space + Left click
      if (e.button === 1 || (e.button === 0 && spacePressed)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
      }
    },
    [spacePressed, viewport.x, viewport.y]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setViewport((prev) => ({
          ...prev,
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        }))
      }
    },
    [isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Zoom handler (Doc H: Mouse Wheel OR Trackpad Pinch)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      // Zoom toward cursor position
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Determine if this is a zoom or pan gesture
      // Trackpad pinch events have ctrlKey set, regular wheel is zoom
      // Shift + Wheel = horizontal pan (Doc H)
      if (e.shiftKey) {
        // Horizontal scroll/pan
        setViewport((prev) => ({
          ...prev,
          x: prev.x - e.deltaY
        }))
        return
      }

      // Regular wheel or Ctrl/Cmd+wheel = Zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(viewport.scale * zoomFactor, 0.1), 3.0)

      // Adjust pan to zoom toward cursor
      const scaleRatio = newScale / viewport.scale
      const newX = mouseX - (mouseX - viewport.x) * scaleRatio
      const newY = mouseY - (mouseY - viewport.y) * scaleRatio

      setViewport({ x: newX, y: newY, scale: newScale })
    },
    [viewport]
  )

  // Drag & Drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragging(true)

      // Get mouse position in canvas coordinates (accounting for viewport transform)
      const canvasPos = screenToCanvas(e.clientX, e.clientY)
      const zone = detectDropZone(canvasPos.x, canvasPos.y, layout, 5)
      setDropZone(zone)
    },
    [layout, screenToCanvas]
  )

  const handleDragLeave = useCallback((): void => {
    setIsDragging(false)
    setDropZone(null)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent): Promise<void> => {
      e.preventDefault()
      setIsDragging(false)

      const mediaId = e.dataTransfer.getData('mediaId')
      console.log('[GraphPanel] Drop Event. Media:', mediaId, 'Zone:', dropZone)

      if (!mediaId) {
        console.warn('[GraphPanel] No Media ID found in dataTransfer')
        setDropZone(null)
        return
      }

      try {
        const targetNodeId = dropZone?.targetNodeId || undefined
        const anchorType = dropZone?.type || undefined
        console.log(
          `[GraphPanel] Creating node for Canvas: ${canvasId}, Media: ${mediaId}, Target: ${targetNodeId}, Anchor: ${anchorType}`
        )
        const newNode = await window.api.createNode(canvasId, mediaId, targetNodeId, anchorType)
        console.log('[GraphPanel] Node Created Successfully:', newNode)
        onNodeCreated()
      } catch (error) {
        console.error('[GraphPanel] CRITICAL ERROR during node creation:', error)
      }

      setDropZone(null)
    },
    [canvasId, dropZone, onNodeCreated]
  )

  const verticalOffset = getVerticalOffset()

  return (
    <div
      ref={containerRef}
      style={{
        ...graphStyles.container,
        ...(isDragging ? graphStyles.containerDragOver : {}),
        cursor: spacePressed ? 'grab' : isPanning ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Grid background pattern */}
      <div style={graphStyles.gridOverlay} />

      {/* Placeholder content when empty */}
      {!hasNodes && !isDragging && (
        <div style={graphStyles.placeholder}>
          <div style={graphStyles.icon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="4" cy="8" r="2" />
              <circle cx="20" cy="8" r="2" />
              <circle cx="4" cy="16" r="2" />
              <circle cx="20" cy="16" r="2" />
              <line x1="6" y1="8" x2="9" y2="10" />
              <line x1="18" y1="8" x2="15" y2="10" />
              <line x1="6" y1="16" x2="9" y2="14" />
              <line x1="18" y1="16" x2="15" y2="14" />
            </svg>
          </div>
          <h2 style={graphStyles.title}>Infinite Canvas</h2>
          <p style={graphStyles.subtitle}>Fractal Topology & Physics (Doc E)</p>
          <p style={graphStyles.canvasId}>Canvas: {canvasId.slice(0, 8)}...</p>
          <p style={graphStyles.emptyHint}>Drop media from the library to create your first node</p>
          <p style={graphStyles.emptyHint}>Space+Drag to pan, Ctrl+Wheel to zoom</p>
          <div style={graphStyles.badge}>Y-AXIS: Structure & Hierarchy</div>
        </div>
      )}

      {/* Viewport Transform Container (Pan/Zoom) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          willChange: 'transform'
        }}
      >
        {/* SVG Layer for Connection Lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${layout.totalWidth + 500}px`,
            height: `${layout.totalHeight + 500}px`,
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          {layout.connections.map((conn) => {
            const y1 = conn.fromY + verticalOffset
            const y2 = conn.toY + verticalOffset
            const midX = (conn.fromX + conn.toX) / 2

            return (
              <g key={conn.id}>
                {conn.type === 'append' ? (
                  <path
                    d={`M ${conn.fromX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${conn.toX} ${y2}`}
                    fill="none"
                    stroke="#4a4a4a"
                    strokeWidth="2"
                  />
                ) : conn.type === 'stack' ? (
                  <path
                    d={`M ${conn.fromX} ${y1} L ${conn.fromX} ${(y1 + y2) / 2} L ${conn.toX} ${(y1 + y2) / 2} L ${conn.toX} ${y2}`}
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                ) : (
                  <line x1={conn.fromX} y1={y1} x2={conn.toX} y2={y2} stroke="#4a4a4a" strokeWidth="2" />
                )}
                <circle cx={conn.toX} cy={y2} r="4" fill={conn.type === 'stack' ? '#06B6D4' : '#4a4a4a'} />
              </g>
            )
          })}
        </svg>

        {/* HTML Layer for Data Block Nodes */}
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          {layout.nodes.map((renderNode) => {
            const isSatellite = renderNode.node.type === 'SATELLITE'
            const headerColor = isSatellite ? '#06B6D4' : '#A855F7'

            return (
              <div
                key={renderNode.node.id}
                style={{
                  position: 'absolute',
                  left: `${renderNode.x}px`,
                  top: `${renderNode.y + verticalOffset}px`,
                  width: `${renderNode.width}px`,
                  height: `${renderNode.height}px`,
                  backgroundColor: '#1e1e1e',
                  borderRadius: '6px',
                  border: renderNode.isOrigin
                    ? '2px solid #F59E0B'
                    : '1px solid #3c3c3c',
                  boxShadow: renderNode.isOrigin
                    ? '0 0 16px rgba(245, 158, 11, 0.5)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
              >
                {/* Header Strip (6px colored bar at top) */}
                <div
                  style={{
                    height: '6px',
                    backgroundColor: headerColor,
                    borderTopLeftRadius: '5px',
                    borderTopRightRadius: '5px'
                  }}
                />

                {/* Body Content */}
                <div
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    height: `${renderNode.height - 6}px`,
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Node label (truncated) */}
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {renderNode.isOrigin ? 'ORIGIN' : renderNode.node.type}
                  </div>

                  {/* Duration */}
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#808080',
                      marginTop: '2px'
                    }}
                  >
                    {((renderNode.node.media_out_point ?? 0) - renderNode.node.media_in_point).toFixed(1)}s
                  </div>
                </div>

                {/* Track Badge (bottom-right pill) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    padding: '2px 6px',
                    backgroundColor: headerColor,
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#ffffff'
                  }}
                >
                  {renderNode.trackLabel}
                </div>

                {/* Left Anchor Point */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#4a4a4a',
                    borderRadius: '50%',
                    border: '2px solid #2d2d2d'
                  }}
                />

                {/* Right Anchor Point */}
                <div
                  style={{
                    position: 'absolute',
                    right: '-5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#4a4a4a',
                    borderRadius: '50%',
                    border: '2px solid #2d2d2d'
                  }}
                />
              </div>
            )
          })}

          {/* Ghost Node Preview during drag */}
          {isDragging && dropZone && (
            <div
              style={{
                position: 'absolute',
                left: `${dropZone.ghostX}px`,
                top: `${dropZone.ghostY + verticalOffset}px`,
                width: `${dropZone.ghostWidth}px`,
                height: `${NODE_HEIGHT}px`,
                backgroundColor:
                  dropZone.type === 'stack' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                border: `2px dashed ${dropZone.type === 'stack' ? '#06B6D4' : '#A855F7'}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: dropZone.type === 'stack' ? '#06B6D4' : '#A855F7',
                  textTransform: 'uppercase'
                }}
              >
                {dropZone.type === 'stack' ? 'Stack Above' : dropZone.type === 'prepend' ? 'Prepend' : 'Append'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* HUD Overlay (fixed position, not affected by viewport) */}
      {/* Node count indicator */}
      {hasNodes && (
        <div style={graphStyles.nodeCount}>
          <span>
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
          {canvas?.fps && <span style={graphStyles.fpsBadge}>{canvas.fps} fps</span>}
        </div>
      )}

      {/* Zoom controls */}
      <div style={graphStyles.zoomControls}>
        <button
          style={graphStyles.zoomButton}
          onClick={() => setViewport(prev => ({
            ...prev,
            scale: Math.min(prev.scale * 1.2, 3.0)
          }))}
          title="Zoom In"
        >
          +
        </button>
        <span style={graphStyles.zoomIndicatorText}>{Math.round(viewport.scale * 100)}%</span>
        <button
          style={graphStyles.zoomButton}
          onClick={() => setViewport(prev => ({
            ...prev,
            scale: Math.max(prev.scale * 0.8, 0.1)
          }))}
          title="Zoom Out"
        >
          -
        </button>
        <button
          style={graphStyles.zoomResetButton}
          onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}
          title="Reset View (100%)"
        >
          Reset
        </button>
      </div>

      {/* Floor indicator */}
      <div style={graphStyles.floorIndicator}>
        <span>Y = 0 (The Floor)</span>
      </div>
    </div>
  )
}

function TimelinePanel(): React.JSX.Element {
  return (
    <div style={timelineStyles.container}>
      <div style={timelineStyles.header}>
        <span style={timelineStyles.title}>Temporal Floor</span>
        <div style={timelineStyles.timecode}>00:00:00:00</div>
      </div>
      <div style={timelineStyles.tracks}>
        <div style={timelineStyles.trackLabel}>V3</div>
        <div style={timelineStyles.trackLane} />
        <div style={timelineStyles.trackLabel}>V2</div>
        <div style={timelineStyles.trackLane} />
        <div style={timelineStyles.trackLabel}>V1</div>
        <div style={{ ...timelineStyles.trackLane, backgroundColor: '#252526' }} />
        <div style={timelineStyles.trackLabel}>A1</div>
        <div style={timelineStyles.trackLane} />
      </div>
      <div style={timelineStyles.placeholder}>
        <p style={timelineStyles.placeholderText}>Timeline View (Doc F)</p>
        <p style={timelineStyles.placeholderHint}>X-AXIS: Time & Sequence</p>
      </div>
    </div>
  )
}

function InspectorPanel(): React.JSX.Element {
  return (
    <div style={panelStyles.container}>
      <div style={panelStyles.header}>
        <span style={panelStyles.title}>Inspector</span>
      </div>
      <div style={panelStyles.content}>
        <div style={panelStyles.placeholder}>
          <div style={panelStyles.placeholderIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="14" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <p style={panelStyles.placeholderText}>Source Monitor</p>
          <p style={panelStyles.placeholderHint}>Doc I: Karaoke Transcripts</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Styles
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0d0d0d',
    color: '#cccccc',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0d0d0d'
  },
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '2px solid #3c3c3c',
    borderTopColor: '#0e639c',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#606060',
    fontSize: '14px'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '40px',
    padding: '0 12px',
    backgroundColor: '#1e1e1e',
    borderBottom: '1px solid #3c3c3c',
    flexShrink: 0
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  toolbarCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  backButton: {
    padding: '4px 10px',
    backgroundColor: 'transparent',
    border: '1px solid #3c3c3c',
    borderRadius: '3px',
    color: '#808080',
    fontSize: '12px',
    cursor: 'pointer'
  },
  toolbarInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  projectName: {
    fontSize: '12px',
    color: '#808080'
  },
  separator: {
    color: '#3c3c3c'
  },
  canvasName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#cccccc'
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0
  },
  leftSidebar: {
    width: '256px',
    flexShrink: 0,
    backgroundColor: '#1e1e1e',
    borderRight: '1px solid #3c3c3c',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  centerColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0
  },
  graphPanel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#151515',
    position: 'relative',
    overflow: 'hidden'
  },
  timelinePanel: {
    height: '200px',
    flexShrink: 0,
    backgroundColor: '#1e1e1e',
    borderTop: '1px solid #3c3c3c'
  },
  rightSidebar: {
    width: '320px',
    flexShrink: 0,
    backgroundColor: '#1e1e1e',
    borderLeft: '1px solid #3c3c3c',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }
}

const mediaPanelStyles: Record<string, React.CSSProperties> = {
  importButton: {
    padding: '4px 8px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '3px',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  mediaList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px'
  },
  mediaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  mediaCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    backgroundColor: '#252526',
    borderRadius: '4px',
    cursor: 'grab',
    border: '1px solid transparent',
    transition: 'border-color 0.15s ease'
  },
  mediaThumbnail: {
    width: '40px',
    height: '28px',
    backgroundColor: '#1e1e1e',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4a4a4a',
    flexShrink: 0
  },
  mediaInfo: {
    flex: 1,
    minWidth: 0
  },
  mediaName: {
    fontSize: '11px',
    color: '#cccccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  mediaMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '9px',
    color: '#606060',
    marginTop: '2px'
  }
}

const panelStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3c3c3c',
    minHeight: '32px'
  },
  title: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#bbbbbb'
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  footer: {
    borderTop: '1px solid #3c3c3c'
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px'
  },
  placeholderIcon: {
    color: '#3c3c3c',
    marginBottom: '12px'
  },
  placeholderText: {
    fontSize: '12px',
    color: '#606060',
    margin: 0
  },
  placeholderHint: {
    fontSize: '10px',
    color: '#3c3c3c',
    marginTop: '4px'
  }
}

const graphStyles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#151515',
    overflow: 'hidden',
    transition: 'background-color 0.15s ease'
  },
  containerDragOver: {
    backgroundColor: '#1a1a2e'
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
    pointerEvents: 'none'
  },
  placeholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    zIndex: 1
  },
  icon: {
    color: '#2d2d2d',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 500,
    color: '#3c3c3c'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#2d2d2d'
  },
  canvasId: {
    margin: '8px 0 0 0',
    fontSize: '10px',
    color: '#3c3c3c',
    fontFamily: 'monospace'
  },
  badge: {
    marginTop: '16px',
    padding: '4px 8px',
    backgroundColor: '#1e1e1e',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#4a4a4a',
    letterSpacing: '0.5px'
  },
  floorIndicator: {
    position: 'absolute',
    left: '12px',
    bottom: '50%',
    transform: 'translateY(50%)',
    padding: '4px 8px',
    backgroundColor: 'rgba(14, 99, 156, 0.3)',
    border: '1px solid rgba(14, 99, 156, 0.5)',
    borderRadius: '3px',
    fontSize: '9px',
    color: '#0e639c',
    fontFamily: 'monospace'
  },
  emptyHint: {
    margin: '12px 0 0 0',
    fontSize: '11px',
    color: '#4a4a4a'
  },
  nodeCount: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#808080',
    fontFamily: 'monospace'
  },
  fpsBadge: {
    padding: '2px 6px',
    backgroundColor: 'rgba(14, 99, 156, 0.3)',
    borderRadius: '3px',
    fontSize: '10px',
    color: '#0e639c'
  },
  zoomControls: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: '6px',
    border: '1px solid #3c3c3c'
  },
  zoomButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    color: '#cccccc',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  zoomResetButton: {
    padding: '4px 8px',
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    color: '#808080',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  zoomIndicatorText: {
    minWidth: '40px',
    textAlign: 'center' as const,
    fontSize: '11px',
    color: '#808080',
    fontFamily: 'monospace'
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    padding: '4px 8px',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#808080',
    fontFamily: 'monospace'
  },
  dropIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '16px 32px',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    border: '2px dashed #A855F7',
    borderRadius: '8px',
    color: '#A855F7',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 10
  },
  nodeLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  nodeBlock: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    height: '60px',
    backgroundColor: '#A855F7',
    borderRadius: '4px',
    border: '1px solid #7C3AED',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease'
  },
  nodeOrigin: {
    border: '2px solid #F59E0B',
    boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
  },
  nodeLabel: {
    fontSize: '9px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  nodeDuration: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#ffffff',
    marginTop: '2px'
  },
  connectionLine: {
    position: 'absolute',
    top: '50%',
    height: '2px',
    backgroundColor: '#4a4a4a',
    transform: 'translateY(-50%)'
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 5
  },
  trackBadge: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    padding: '2px 4px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '2px',
    fontSize: '8px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: '0.5px'
  },
  anchorPoint: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '8px',
    backgroundColor: '#4a4a4a',
    borderRadius: '50%',
    border: '1px solid #2d2d2d'
  }
}

const timelineStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3c3c3c'
  },
  title: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#808080'
  },
  timecode: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#0e639c'
  },
  tracks: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr',
    flex: 1,
    overflow: 'hidden'
  },
  trackLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 600,
    color: '#4a4a4a',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #2d2d2d'
  },
  trackLane: {
    backgroundColor: '#1e1e1e',
    borderBottom: '1px solid #2d2d2d'
  },
  placeholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center'
  },
  placeholderText: {
    fontSize: '11px',
    color: '#4a4a4a',
    margin: 0
  },
  placeholderHint: {
    fontSize: '9px',
    color: '#3c3c3c',
    marginTop: '4px'
  }
}

export default Editor
