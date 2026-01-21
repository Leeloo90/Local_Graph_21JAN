import { useState } from 'react'

interface CreateProjectFormProps {
  onSubmit: (name: string, client: string) => void
}

function CreateProjectForm({ onSubmit }: CreateProjectFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (name.trim() && client.trim()) {
      onSubmit(name.trim(), client.trim())
      setName('')
      setClient('')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Client Name</label>
        <input
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Enter client name"
          style={styles.input}
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Project Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          style={styles.input}
        />
      </div>
      <button type="submit" style={styles.button}>
        Create Project
      </button>
    </form>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    padding: '16px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    border: '1px solid #3a3a3a'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  label: {
    fontSize: '12px',
    color: '#888888',
    fontWeight: 500
  },
  input: {
    padding: '8px 12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none'
  },
  button: {
    padding: '8px 20px',
    backgroundColor: '#4a9eff',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
}

export default CreateProjectForm
