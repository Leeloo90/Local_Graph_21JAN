import type { Media } from '@shared/index.d'

interface InspectorProps {
  selectedItem: Media | null
}

function Inspector({ selectedItem }: InspectorProps): React.JSX.Element {
  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Inspector</span>
      </div>

      <div className="panel-content">
        {!selectedItem ? (
          <div className="panel-empty">
            <p className="panel-empty-text">No Selection</p>
            <p className="panel-empty-hint">Select media to view details</p>
          </div>
        ) : (
          <div style={styles.content}>
            <Section title="File Info">
              <Property label="Name" value={getFileName(selectedItem.file_path)} />
              <Property label="Path" value={selectedItem.file_path} mono />
            </Section>

            <Section title="Media Properties">
              <Property label="FPS" value={selectedItem.fps?.toString() ?? 'N/A'} />
              <Property
                label="Duration"
                value={formatDuration(selectedItem.duration_sec)}
              />
              <Property
                label="Start TC"
                value={selectedItem.start_tc_string || '00:00:00:00'}
                mono
              />
            </Section>

            <Section title="Processing Status">
              <Property label="Proxy" value={selectedItem.proxy_status} badge />
              <Property label="Waveform" value={selectedItem.waveform_status} badge />
              {selectedItem.proxy_path && (
                <Property label="Proxy Path" value={selectedItem.proxy_path} mono />
              )}
            </Section>

            <Section title="Identifiers">
              <Property label="ID" value={selectedItem.id} mono />
              <Property label="Project ID" value={selectedItem.project_id} mono />
            </Section>
          </div>
        )}
      </div>
    </>
  )
}

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.sectionContent}>{children}</div>
    </div>
  )
}

function Property({
  label,
  value,
  mono,
  badge
}: {
  label: string
  value: string
  mono?: boolean
  badge?: boolean
}): React.JSX.Element {
  return (
    <div style={styles.property}>
      <span style={styles.propertyLabel}>{label}</span>
      {badge ? (
        <span style={styles.badge}>{value}</span>
      ) : (
        <span style={{ ...styles.propertyValue, ...(mono ? styles.mono : {}) }}>
          {value}
        </span>
      )}
    </div>
  )
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'N/A'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '0'
  },
  section: {
    borderBottom: '1px solid #1a1a1a'
  },
  sectionTitle: {
    padding: '10px 12px 6px 12px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#808080',
    backgroundColor: '#2a2a2a'
  },
  sectionContent: {
    padding: '8px 12px 12px 12px'
  },
  property: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '4px 0',
    gap: '12px'
  },
  propertyLabel: {
    fontSize: '11px',
    color: '#808080',
    flexShrink: 0
  },
  propertyValue: {
    fontSize: '11px',
    color: '#cccccc',
    textAlign: 'right',
    wordBreak: 'break-all'
  },
  mono: {
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    fontSize: '10px',
    color: '#9cdcfe'
  },
  badge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 500,
    backgroundColor: '#3c3c3c',
    borderRadius: '3px',
    color: '#808080'
  }
}

export default Inspector
