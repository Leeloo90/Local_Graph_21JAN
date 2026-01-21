interface CanvasViewProps {
  canvasId: string
}

function CanvasView({ canvasId }: CanvasViewProps): React.JSX.Element {
  return (
    <div style={styles.container}>
      <div style={styles.placeholder}>
        <div style={styles.icon}>
          <svg
            width="48"
            height="48"
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
        <h2 style={styles.title}>Infinite Canvas</h2>
        <p style={styles.subtitle}>Node-based timeline editor</p>
        <p style={styles.canvasId}>Canvas: {canvasId.slice(0, 8)}...</p>
        <div style={styles.hint}>
          <span style={styles.badge}>Phase 3</span>
          <span>Drag media from the bin to create nodes</span>
        </div>
      </div>

      {/* Grid background pattern */}
      <div style={styles.gridOverlay} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#1e1e1e',
    overflow: 'hidden'
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
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
    color: '#3c3c3c',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 500,
    color: '#4a4a4a'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#3c3c3c'
  },
  canvasId: {
    margin: '8px 0 0 0',
    fontSize: '10px',
    color: '#4a4a4a',
    fontFamily: 'monospace'
  },
  hint: {
    marginTop: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#3c3c3c'
  },
  badge: {
    padding: '2px 6px',
    backgroundColor: '#2d2d2d',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#606060'
  }
}

export default CanvasView
