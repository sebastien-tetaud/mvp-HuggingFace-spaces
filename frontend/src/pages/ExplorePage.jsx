import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LogViewer from '../components/LogViewer';
import './ExplorePage.css';

// SpaceCard component with image error handling
function SpaceCard({ space, onDelete, onViewLogs }) {
  const [imageError, setImageError] = useState(false);

  const getStatusClass = (status) => {
    if (status === 'running') return 'status-running';
    if (status === 'building') return 'status-building';
    return 'status-stopped';
  };

  const getRepoName = (url) => {
    try {
      const parts = url.replace(/\.git$/, '').split('/');
      return parts[parts.length - 1];
    } catch {
      return 'Unknown';
    }
  };

  const showImage = space.image_url && !imageError;

  return (
    <div className="space-card">
      <div className="space-card-preview">
        {showImage ? (
          <img
            src={space.image_url}
            alt={space.title || getRepoName(space.github_url)}
            className="space-card-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="space-card-preview-placeholder">
            <span className="space-card-preview-icon"></span>
          </div>
        )}
        <div className="space-card-status">
          <span className={`status-badge ${getStatusClass(space.status)}`}>
            <span className="status-dot"></span>
            {space.status}
          </span>
        </div>
      </div>
      <div className="space-card-body">
        <h3 className="space-card-title">
          {space.title || getRepoName(space.github_url)}
        </h3>
        {space.description && (
          <p className="space-card-description">{space.description}</p>
        )}
        <p className="space-card-repo">
          <a href={space.github_url} target="_blank" rel="noopener noreferrer">
            {space.github_url}
          </a>
        </p>
        <div className="space-card-footer">
          {space.status === 'running' ? (
            <a
              href={space.url}
              target="_blank"
              rel="noopener noreferrer"
              className="space-btn space-btn-primary"
            >
              Open App
            </a>
          ) : (
            <span className="space-btn space-btn-disabled">Offline</span>
          )}
          <button
            className="space-btn space-btn-secondary"
            onClick={() => onViewLogs(space.id)}
          >
            Logs
          </button>
          <button
            className="space-btn space-btn-danger"
            onClick={() => onDelete(space.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ExplorePage() {
  const [spaces, setSpaces] = useState([]);
  const [viewingLogsFor, setViewingLogsFor] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSpaces();
    const interval = setInterval(fetchSpaces, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSpaces = async () => {
    try {
      const response = await fetch('/api/spaces');
      if (response.ok) {
        const data = await response.json();
        setSpaces(data);
      }
    } catch (err) {
      console.error('Failed to fetch spaces:', err);
    }
  };

  const handleDelete = async (spaceId) => {
    if (!confirm('Are you sure you want to delete this space?')) return;

    try {
      const response = await fetch(`/api/spaces/${spaceId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
        if (viewingLogsFor === spaceId) {
          setViewingLogsFor(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };

  const filteredSpaces = spaces.filter((space) => {
    if (filter === 'all') return true;
    if (filter === 'running') return space.status === 'running';
    if (filter === 'stopped') return space.status !== 'running';
    return true;
  });

  return (
    <div className="explore-page">
      <div className="explore-header">
        <div className="explore-header-content">
          <h1 className="explore-title">Explore Spaces</h1>
          <p className="explore-subtitle">
            Discover and interact with deployed Gradio applications
          </p>
        </div>
        {/* <Link to="/deploy" className="create-space-btn">
          + Create Space
        </Link> */}
      </div>

      <div className="explore-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({spaces.length})
        </button>
        <button
          className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
          onClick={() => setFilter('running')}
        >
          Running ({spaces.filter((s) => s.status === 'running').length})
        </button>
        <button
          className={`filter-btn ${filter === 'stopped' ? 'active' : ''}`}
          onClick={() => setFilter('stopped')}
        >
          Stopped ({spaces.filter((s) => s.status !== 'running').length})
        </button>
      </div>

      {filteredSpaces.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-state-title">
            {spaces.length === 0 ? 'No spaces yet' : 'No matching spaces'}
          </h3>
          <p className="empty-state-description">
            {spaces.length === 0
              ? 'Deploy your first Gradio app to get started'
              : 'Try adjusting your filters'}
          </p>
          {spaces.length === 0 && (
            <Link to="/deploy" className="empty-state-btn">
              Create your first Space
            </Link>
          )}
        </div>
      ) : (
        <div className="spaces-grid">
          {filteredSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onDelete={handleDelete}
              onViewLogs={setViewingLogsFor}
            />
          ))}
        </div>
      )}

      {viewingLogsFor && (
        <LogViewer spaceId={viewingLogsFor} onClose={() => setViewingLogsFor(null)} />
      )}
    </div>
  );
}

export default ExplorePage;
