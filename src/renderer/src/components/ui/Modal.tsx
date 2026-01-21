import { useEffect, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProps): React.JSX.Element | null {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #3c3c3c',
    borderRadius: '8px',
    minWidth: '400px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#252526'
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#cccccc'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#808080',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1
  },
  content: {
    padding: '20px'
  }
}

export default Modal
