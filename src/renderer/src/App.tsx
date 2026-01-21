import { useEffect, useState } from 'react'
import type { Project } from '@shared/index.d'
import ProjectList from './components/ProjectList'
import CreateProjectForm from './components/CreateProjectForm'
import ProjectDetail from './components/ProjectDetail'
import Editor from './routes/Editor'

interface EditorState {
  projectId: string
  projectName: string
  canvasId: string
  canvasName: string
}

function App(): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)

  const fetchProjects = async (): Promise<void> => {
    try {
      const data = await window.api.getAllProjects()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreateProject = async (name: string, client: string): Promise<void> => {
    try {
      await window.api.createProject(name, client)
      await fetchProjects()
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleSelectProject = (project: Project): void => {
    setSelectedProject(project)
  }

  const handleBackToDashboard = (): void => {
    setSelectedProject(null)
  }

  const handleOpenCanvas = (canvasId: string, canvasName: string): void => {
    if (selectedProject) {
      setEditorState({
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        canvasId,
        canvasName
      })
    }
  }

  const handleBackToProject = (): void => {
    setEditorState(null)
  }

  // Show editor if a canvas is selected
  if (editorState) {
    return (
      <Editor
        projectId={editorState.projectId}
        projectName={editorState.projectName}
        canvasId={editorState.canvasId}
        canvasName={editorState.canvasName}
        onBack={handleBackToProject}
      />
    )
  }

  // Show project detail view if a project is selected
  if (selectedProject) {
    return (
      <ProjectDetail
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        onBack={handleBackToDashboard}
        onOpenCanvas={handleOpenCanvas}
      />
    )
  }

  // Show dashboard
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Story Graph</h1>
        <p style={styles.subtitle}>Local Projects</p>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>New Project</h2>
          <CreateProjectForm onSubmit={handleCreateProject} />
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Projects</h2>
          {loading ? (
            <p style={styles.loading}>Loading projects...</p>
          ) : (
            <ProjectList projects={projects} onSelectProject={handleSelectProject} />
          )}
        </section>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: '24px'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#888888'
  },
  main: {
    maxWidth: '1200px'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#cccccc'
  },
  loading: {
    color: '#666666',
    padding: '20px 0'
  }
}

export default App
