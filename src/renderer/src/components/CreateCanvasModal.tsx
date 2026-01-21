import { useState, useEffect } from 'react'
import Modal from './ui/Modal'

interface CreateCanvasModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, fps: number | null, resolution: string | null) => void
}

const FPS_OPTIONS = [
  { value: 23.976, label: '23.976 (Film)' },
  { value: 24, label: '24.00 (Cinema)' },
  { value: 25, label: '25.00 (PAL)' },
  { value: 29.97, label: '29.97 (NTSC)' },
  { value: 30, label: '30.00 (Web)' },
  { value: 50, label: '50.00 (HFR)' },
  { value: 59.94, label: '59.94 (Sports)' },
  { value: 60, label: '60.00 (Gaming)' }
]

const RESOLUTION_OPTIONS = [
  { value: '1280x720', label: '1280x720 (HD)' },
  { value: '1920x1080', label: '1920x1080 (FHD)' },
  { value: '3840x2160', label: '3840x2160 (4K UHD)' }
]

function CreateCanvasModal({
  isOpen,
  onClose,
  onSubmit
}: CreateCanvasModalProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [fps, setFps] = useState<number>(23.976)
  const [resolution, setResolution] = useState('1920x1080')
  const [useDefaults, setUseDefaults] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setUseDefaults(true)
      setFps(23.976)
      setResolution('1920x1080')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit(name.trim(), useDefaults ? null : fps, useDefaults ? null : resolution)
  }

  const isValid = name.trim().length > 0

  const inputDisabledStyle: React.CSSProperties = useDefaults
    ? { opacity: 0.4, cursor: 'not-allowed' }
    : {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Canvas">
      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="canvas-name">
            Canvas Name <span style={styles.required}>*</span>
          </label>
          <input
            id="canvas-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Director's Cut"
            style={styles.input}
            autoFocus
          />
        </div>

        <div style={styles.field}>
          <label
            style={{
              ...styles.label,
              color: useDefaults ? '#606060' : '#cccccc'
            }}
            htmlFor="canvas-fps"
          >
            Frame Rate
          </label>
          <select
            id="canvas-fps"
            value={fps}
            onChange={(e) => setFps(parseFloat(e.target.value))}
            disabled={useDefaults}
            style={{ ...styles.select, ...inputDisabledStyle }}
          >
            {FPS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label
            style={{
              ...styles.label,
              color: useDefaults ? '#606060' : '#cccccc'
            }}
            htmlFor="canvas-resolution"
          >
            Resolution
          </label>
          <select
            id="canvas-resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            disabled={useDefaults}
            style={{ ...styles.select, ...inputDisabledStyle }}
          >
            {RESOLUTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.footer}>
          <div style={styles.checkboxContainer}>
            <input
              id="use-defaults"
              type="checkbox"
              checked={useDefaults}
              onChange={(e) => setUseDefaults(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="use-defaults" style={styles.checkboxLabel}>
              Use project defaults
            </label>
          </div>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton} disabled={!isValid}>
              Create Canvas
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

const styles: Record<string, React.CSSProperties> = {
  field: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#cccccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  required: {
    color: '#f14c4c'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#cccccc',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#cccccc',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #3c3c3c'
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#0e639c'
  },
  checkboxLabel: {
    fontSize: '12px',
    color: '#cccccc',
    cursor: 'pointer',
    userSelect: 'none'
  },
  actions: {
    display: 'flex',
    gap: '12px'
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    color: '#808080',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#ffffff',
    cursor: 'pointer'
  }
}

export default CreateCanvasModal
