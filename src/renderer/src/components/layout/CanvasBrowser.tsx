import { useEffect, useState } from 'react'
import type { Canvas } from '@shared/index.d'
import CreateCanvasModal from '../CreateCanvasModal'

interface CanvasBrowserProps {
  projectId: string
  onOpenCanvas: (canvasId: string, canvasName: string) => void
}

function CanvasBrowser({ projectId, onOpenCanvas }: CanvasBrowserProps): React.JSX.Element {
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchCanvases = async (): Promise<void> => {
    try {
      const data = await window.api.getCanvases(projectId)
      setCanvases(data)
    } catch (error) {
      console.error('Failed to fetch canvases:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCanvases()
  }, [projectId])

  const handleOpenModal = (): void => {
    setIsModalOpen(true)
  }

  const handleCloseModal = (): void => {
    setIsModalOpen(false)
  }

  const handleCreateCanvas = async (
    name: string,
    fps: number | null,
    resolution: string | null
  ): Promise<void> => {
    try {
      const newCanvas = await window.api.createCanvas(projectId, name, fps, resolution)
      await fetchCanvases()
      setIsModalOpen(false)
      onOpenCanvas(newCanvas.id, newCanvas.name)
    } catch (error) {
      console.error('Failed to create canvas:', error)
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading canvases...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Canvases</h2>
        <button style={styles.newButton} onClick={handleOpenModal}>
          + New Canvas
        </button>
      </div>

      {canvases.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <p style={styles.emptyText}>No canvases yet</p>
          <p style={styles.emptyHint}>Create a canvas to start building your timeline</p>
          <button style={styles.emptyButton} onClick={handleOpenModal}>
            Create Your First Canvas
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {canvases.map((canvas) => (
            <div
              key={canvas.id}
              style={styles.card}
              onClick={() => onOpenCanvas(canvas.id, canvas.name)}
              onKeyDown={(e) => e.key === 'Enter' && onOpenCanvas(canvas.id, canvas.name)}
              role="button"
              tabIndex={0}
            >
              <div style={styles.cardPreview}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.cardName}>{canvas.name}</div>
                <div style={styles.cardMeta}>
                  {canvas.fps && <span>{canvas.fps} fps</span>}
                  {canvas.fps && canvas.resolution && <span> · </span>}
                  {canvas.resolution && <span>{canvas.resolution}</span>}
                  {!canvas.fps && !canvas.resolution && canvas.created_at && (
                    <span>{formatDate(canvas.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* New Canvas Card */}
          <div
            style={{ ...styles.card, ...styles.cardNew }}
            onClick={handleOpenModal}
            onKeyDown={(e) => e.key === 'Enter' && handleOpenModal()}
            role="button"
            tabIndex={0}
          >
            <div style={styles.cardNewIcon}>+</div>
            <div style={styles.cardNewText}>New Canvas</div>
          </div>
        </div>
      )}

      <CreateCanvasModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateCanvas}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e1e',
    overflow: 'auto',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 500,
    color: '#cccccc'
  },
  newButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#606060',
    fontSize: '14px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100% - 60px)',
    textAlign: 'center'
  },
  emptyIcon: {
    color: '#3c3c3c',
    marginBottom: '16px'
  },
  emptyText: {
    margin: 0,
    fontSize: '16px',
    color: '#606060'
  },
  emptyHint: {
    margin: '8px 0 24px 0',
    fontSize: '13px',
    color: '#4a4a4a'
  },
  emptyButton: {
    padding: '10px 20px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px'
  },
  card: {
    backgroundColor: '#252526',
    borderRadius: '6px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: '1px solid transparent'
  },
  cardPreview: {
    width: '100%',
    height: '100px',
    backgroundColor: '#1e1e1e',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4a4a4a',
    marginBottom: '12px'
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  cardName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#cccccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardMeta: {
    fontSize: '11px',
    color: '#808080'
  },
  cardNew: {
    border: '1px dashed #3c3c3c',
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '160px'
  },
  cardNewIcon: {
    fontSize: '32px',
    color: '#4a4a4a',
    marginBottom: '8px'
  },
  cardNewText: {
    fontSize: '13px',
    color: '#606060'
  }
}

export default CanvasBrowser
