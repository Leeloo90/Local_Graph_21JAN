import type { Media } from '@shared/index.d'

interface MediaBinProps {
  mediaItems: Media[]
  selectedId: string | null
  loading: boolean
  importing: boolean
  onImport: () => void
  onSelect: (id: string) => void
}

function MediaBin({
  mediaItems,
  selectedId,
  loading,
  importing,
  onImport,
  onSelect
}: MediaBinProps): React.JSX.Element {
  const getFileName = (filePath: string): string => {
    return filePath.split('/').pop() || filePath
  }

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Media Bin</span>
        <div className="panel-actions">
          <button
            className="panel-btn panel-btn-primary"
            onClick={onImport}
            disabled={importing}
          >
            {importing ? 'Importing...' : '+ Import'}
          </button>
        </div>
      </div>

      <div className="panel-content">
        {loading ? (
          <div className="panel-loading">Loading...</div>
        ) : mediaItems.length === 0 ? (
          <div className="panel-empty">
            <p className="panel-empty-text">No media files</p>
            <p className="panel-empty-hint">Click Import to add files</p>
          </div>
        ) : (
          <div style={styles.list}>
            {mediaItems.map((item) => (
              <div
                key={item.id}
                style={{
                  ...styles.item,
                  ...(selectedId === item.id ? styles.itemSelected : {})
                }}
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(item.id)}
                role="button"
                tabIndex={0}
              >
                <div style={styles.itemIcon}>
                  <MediaIcon type={getMediaType(item.file_path)} />
                </div>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{getFileName(item.file_path)}</div>
                  <div style={styles.itemMeta}>
                    {item.fps && <span>{item.fps} fps</span>}
                    {item.fps && item.duration_sec && <span style={styles.dot}>·</span>}
                    {item.duration_sec && <span>{formatDuration(item.duration_sec)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function getMediaType(filePath: string): 'video' | 'audio' | 'unknown' {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const videoExts = ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'webm']
  const audioExts = ['wav', 'mp3', 'aac', 'flac', 'ogg']

  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  return 'unknown'
}

function MediaIcon({ type }: { type: 'video' | 'audio' | 'unknown' }): React.JSX.Element {
  const iconStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: type === 'video' ? '#264f78' : type === 'audio' ? '#4d3d00' : '#3c3c3c',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#cccccc'
  }

  const label = type === 'video' ? 'VID' : type === 'audio' ? 'AUD' : 'FILE'

  return <div style={iconStyle}>{label}</div>
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: 'flex',
    flexDirection: 'column'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #1a1a1a',
    transition: 'background-color 0.1s ease'
  },
  itemSelected: {
    backgroundColor: '#094771'
  },
  itemIcon: {
    flexShrink: 0
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden'
  },
  itemName: {
    fontSize: '12px',
    color: '#cccccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  itemMeta: {
    fontSize: '10px',
    color: '#808080',
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  dot: {
    color: '#4a4a4a'
  }
}

export default MediaBin
