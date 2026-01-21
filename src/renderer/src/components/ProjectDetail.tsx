import { useEffect, useState } from 'react'
import type { Media } from '@shared/index.d'
import MediaBin from './layout/MediaBin'
import CanvasBrowser from './layout/CanvasBrowser'
import Inspector from './layout/Inspector'
import './layout/WorkspaceLayout.css'

interface ProjectDetailProps {
  projectId: string
  projectName: string
  onBack: () => void
  onOpenCanvas: (canvasId: string, canvasName: string) => void
}

function ProjectDetail({
  projectId,
  projectName,
  onBack,
  onOpenCanvas
}: ProjectDetailProps): React.JSX.Element {
  const [mediaItems, setMediaItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)

  const fetchMedia = async (): Promise<void> => {
    try {
      const data = await window.api.getMedia(projectId)
      setMediaItems(data)
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [projectId])

  const handleImport = async (): Promise<void> => {
    try {
      const paths = await window.api.openFileDialog()
      if (paths && paths.length > 0) {
        setImporting(true)
        await window.api.importMedia(projectId, paths)
        await fetchMedia()
      }
    } catch (error) {
      console.error('Failed to import media:', error)
    } finally {
      setImporting(false)
    }
  }

  const handleSelectMedia = (id: string): void => {
    setSelectedMediaId(id)
  }

  const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId) || null

  return (
    <div className="workspace">
      {/* Top Toolbar */}
      <header className="workspace-toolbar">
        <div className="workspace-toolbar-left">
          <button className="workspace-back-btn" onClick={onBack}>
            ← Back
          </button>
          <div>
            <div className="workspace-toolbar-title">{projectName}</div>
            <div className="workspace-toolbar-subtitle">
              {mediaItems.length} media file{mediaItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      {/* Left Sidebar - Media Bin Only */}
      <aside className="workspace-sidebar">
        <MediaBin
          mediaItems={mediaItems}
          selectedId={selectedMediaId}
          loading={loading}
          importing={importing}
          onImport={handleImport}
          onSelect={handleSelectMedia}
        />
      </aside>

      {/* Center - Canvas Browser */}
      <main className="workspace-canvas">
        <CanvasBrowser projectId={projectId} onOpenCanvas={onOpenCanvas} />
      </main>

      {/* Right - Inspector */}
      <aside className="workspace-inspector">
        <Inspector selectedItem={selectedMedia} />
      </aside>
    </div>
  )
}

export default ProjectDetail
