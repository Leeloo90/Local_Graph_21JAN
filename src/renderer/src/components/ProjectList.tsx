import type { Project } from '@shared/index.d'

interface ProjectListProps {
  projects: Project[]
  onSelectProject: (project: Project) => void
}

function ProjectList({ projects, onSelectProject }: ProjectListProps): React.JSX.Element {
  if (projects.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No projects yet. Create your first project above.</p>
      </div>
    )
  }

  return (
    <div style={styles.grid}>
      {projects.map((project) => (
        <div
          key={project.id}
          style={styles.card}
          onClick={() => onSelectProject(project)}
          onKeyDown={(e) => e.key === 'Enter' && onSelectProject(project)}
          role="button"
          tabIndex={0}
        >
          <h3 style={styles.cardTitle}>{project.name}</h3>
          <div style={styles.cardMeta}>
            {project.last_edited_at && (
              <span>Last edited: {new Date(project.last_edited_at).toLocaleDateString()}</span>
            )}
          </div>
          <div style={styles.cardFooter}>
            {project.default_fps && <span>{project.default_fps} fps</span>}
            {project.default_resolution && <span>{project.default_resolution}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    padding: '16px 0'
  },
  card: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #3a3a3a',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff'
  },
  cardMeta: {
    fontSize: '12px',
    color: '#888888',
    marginBottom: '12px'
  },
  cardFooter: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#666666'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#666666'
  }
}

export default ProjectList
