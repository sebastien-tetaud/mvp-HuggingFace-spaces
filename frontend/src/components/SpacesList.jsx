function SpacesList({ spaces, onDelete, onViewLogs }) {
  const getStatusClass = (status) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'building':
        return 'status-building';
      case 'exited':
        return 'status-exited';
      default:
        return 'status-stopped';
    }
  };

  const getRepoName = (url) => {
    return url.replace('https://github.com/', '').split('/').pop() || 'Untitled';
  };

  if (spaces.length === 0) {
    return (
      <div className="spaces-section">
        <div className="empty-state">
          <div className="empty-state-icon">@</div>
          <h3 className="empty-state-title">No Spaces yet</h3>
          <p className="empty-state-description">
            Deploy your first Gradio app by entering a GitHub repository URL above
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="spaces-section">
      <div className="spaces-header">
        <h2 className="spaces-title">Your Spaces</h2>
        <span className="spaces-count">{spaces.length}</span>
      </div>
      <div className="spaces-grid">
        {spaces.map((space) => (
          <div key={space.id} className="space-card">
            <div className="space-card-preview">
              <span className="space-card-preview-icon">@</span>
              <div className="space-card-status">
                <span className={`status-badge ${getStatusClass(space.status)}`}>
                  <span className="status-dot"></span>
                  {space.status}
                </span>
              </div>
            </div>
            <div className="space-card-body">
              <h3 className="space-card-title">
                {getRepoName(space.github_url)}
              </h3>
              <p className="space-card-repo">
                <a href={space.github_url} target="_blank" rel="noopener noreferrer">
                  {space.github_url.replace('https://github.com/', '')}
                </a>
              </p>
              <div className="space-card-footer">
                <a
                  href={space.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="space-btn space-btn-primary"
                >
                  Open
                </a>
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
        ))}
      </div>
    </div>
  );
}

export default SpacesList;
