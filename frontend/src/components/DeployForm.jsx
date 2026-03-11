import { useState } from 'react';

function DeployForm({ onDeploy }) {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate GitHub URL
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub URL');
      return;
    }

    if (!githubUrl.startsWith('https://github.com/')) {
      setError('Please enter a valid GitHub URL (https://github.com/...)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ github_url: githubUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Deployment failed');
      }

      const space = await response.json();
      onDeploy(space);
      setGithubUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if a URL was dropped (e.g., dragging a GitHub link)
    const droppedUrl = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');

    if (droppedUrl && droppedUrl.startsWith('https://github.com/')) {
      setGithubUrl(droppedUrl);
      setError('');
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // File was dropped - show helpful message
      setError('File uploads are not supported. Please enter a GitHub repository URL.');
    } else if (droppedUrl) {
      setError('Please drop a valid GitHub URL (https://github.com/...)');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="deploy-section">
      <div className="deploy-form-header">
        <span className="deploy-form-icon">+</span>
        <span className="deploy-form-title">Create a new Space</span>
      </div>
      <div className="deploy-form" onDrop={handleDrop} onDragOver={handleDragOver}>
        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <span className="input-icon">@</span>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={`deploy-btn ${loading ? 'loading' : ''}`}
            disabled={loading || !githubUrl}
          >
            {loading ? (
              <>Deploying...</>
            ) : (
              <>+ Deploy</>
            )}
          </button>
        </form>
        {error && <div className="deploy-error">{error}</div>}
      </div>
    </div>
  );
}

export default DeployForm;
