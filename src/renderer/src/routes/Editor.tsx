import { useEffect, useState } from 'react'
import type { GraphState, StoryNode, Canvas, Media } from '@shared/index.d'

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

function GraphPanel({
  canvasId,
  nodes,
  canvas,
  onNodeCreated
}: GraphPanelProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const hasNodes = nodes.length > 0

  // Calculate timeline positions for nodes (Doc F: Two Timecodes)
  const calculateNodePositions = (): { node: StoryNode; x: number; width: number }[] => {
    const PIXELS_PER_SECOND = 10
    const positions: { node: StoryNode; x: number; width: number }[] = []

    // Find the ORIGIN node first
    const originNode = nodes.find((n) => n.anchor_type === 'ORIGIN')
    if (!originNode) return positions

    // Build a map of parent -> children for traversal
    const childrenMap = new Map<string, StoryNode[]>()
    nodes.forEach((node) => {
      if (node.parent_id) {
        const children = childrenMap.get(node.parent_id) || []
        children.push(node)
        childrenMap.set(node.parent_id, children)
      }
    })

    // Calculate positions recursively
    const processNode = (node: StoryNode, startX: number): void => {
      const duration = (node.media_out_point ?? 0) - node.media_in_point
      const width = Math.max(duration * PIXELS_PER_SECOND, 60) // Min 60px width

      positions.push({ node, x: startX, width })

      // Process APPEND children
      const children = childrenMap.get(node.id) || []
      let nextX = startX + width
      children.forEach((child) => {
        if (child.anchor_type === 'APPEND') {
          nextX += child.drift * PIXELS_PER_SECOND / 1000 // drift is in ms
          processNode(child, nextX)
          const childDuration = (child.media_out_point ?? 0) - child.media_in_point
          nextX += Math.max(childDuration * PIXELS_PER_SECOND, 60)
        }
      })
    }

    processNode(originNode, 50) // Start 50px from left edge
    return positions
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = (): void => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setIsDragOver(false)

    const mediaId = e.dataTransfer.getData('mediaId')
    if (!mediaId) return

    try {
      console.log(`[GraphPanel] Creating node for media: ${mediaId}`)
      await window.api.createNode(canvasId, mediaId)
      onNodeCreated()
    } catch (error) {
      console.error('[GraphPanel] Failed to create node:', error)
    }
  }

  const nodePositions = calculateNodePositions()

  return (
    <div
      style={{
        ...graphStyles.container,
        ...(isDragOver ? graphStyles.containerDragOver : {})
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Grid background pattern */}
      <div style={graphStyles.gridOverlay} />

      {/* Drop zone indicator */}
      {isDragOver && (
        <div style={graphStyles.dropIndicator}>
          <span>Drop to create node</span>
        </div>
      )}

      {/* Placeholder content when empty */}
      {!hasNodes && !isDragOver && (
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
          <div style={graphStyles.badge}>Y-AXIS: Structure & Hierarchy</div>
        </div>
      )}

      {/* Render nodes on the canvas */}
      {hasNodes && (
        <div style={graphStyles.nodeLayer}>
          {nodePositions.map(({ node, x, width }) => (
            <div
              key={node.id}
              style={{
                ...graphStyles.nodeBlock,
                left: `${x}px`,
                width: `${width}px`,
                ...(node.anchor_type === 'ORIGIN' ? graphStyles.nodeOrigin : {})
              }}
            >
              <div style={graphStyles.nodeLabel}>
                {node.anchor_type === 'ORIGIN' ? 'ORIGIN' : 'SPINE'}
              </div>
              <div style={graphStyles.nodeDuration}>
                {((node.media_out_point ?? 0) - node.media_in_point).toFixed(1)}s
              </div>
            </div>
          ))}

          {/* Connection lines between nodes */}
          {nodePositions.slice(1).map(({ node, x }, index) => {
            const prevPos = nodePositions[index]
            const lineStart = prevPos.x + prevPos.width
            const lineWidth = x - lineStart
            if (lineWidth <= 0) return null
            return (
              <div
                key={`line-${node.id}`}
                style={{
                  ...graphStyles.connectionLine,
                  left: `${lineStart}px`,
                  width: `${lineWidth}px`
                }}
              />
            )
          })}
        </div>
      )}

      {/* Node count indicator when nodes exist */}
      {hasNodes && (
        <div style={graphStyles.nodeCount}>
          <span>
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
          {canvas?.fps && <span style={graphStyles.fpsBadge}>{canvas.fps} fps</span>}
        </div>
      )}

      {/* Coordinate indicators */}
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
