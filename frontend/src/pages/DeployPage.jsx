import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeployPage.css';

function DeployPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const [formData, setFormData] = useState({
    github_url: '',
    title: '',
    description: '',
    image_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent default drag/drop behavior on the entire page to avoid "please enter URL" errors
  useEffect(() => {
    const preventDefaults = (e) => {
      // Only prevent if not dropping on the dropzone
      if (dropzoneRef.current && dropzoneRef.current.contains(e.target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent the browser from opening dropped files
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Upload failed');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, image_url: data.url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate GitHub URL
    if (!formData.github_url.trim()) {
      setError('Please enter a GitHub URL');
      return;
    }

    if (!formData.github_url.startsWith('https://github.com/')) {
      setError('Please enter a valid GitHub URL (https://github.com/...)');
      return;
    }

    setLoading(true);
    setDeploymentStatus('Starting deployment...');

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Deployment failed');
      }

      const space = await response.json();
      setDeploymentStatus('Deployment successful!');

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err.message);
      setDeploymentStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const getRepoName = (url) => {
    if (!url) return '';
    try {
      const parts = url.replace(/\.git$/, '').split('/');
      return parts[parts.length - 1];
    } catch {
      return '';
    }
  };

  return (
    <div className="deploy-page">
      <div className="deploy-page-header">
        <h1 className="deploy-page-title">Create a new Space</h1>
        <p className="deploy-page-subtitle">
          Deploy your Gradio application from a GitHub repository
        </p>
      </div>

      <form className="deploy-form-container" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2 className="form-section-title">Repository</h2>
          <div className="form-group">
            <label htmlFor="github_url" className="form-label">
              GitHub Repository URL <span className="required">*</span>
            </label>
            <input
              type="text"
              id="github_url"
              name="github_url"
              value={formData.github_url}
              onChange={handleChange}
              placeholder="https://github.com/username/repository"
              className="form-input"
              required
              disabled={loading}
            />
            <p className="form-hint">
              Enter the URL of a public GitHub repository containing a Gradio app
            </p>
          </div>
        </div>

        <div className="form-section">
          <h2 className="form-section-title">Space Details</h2>

          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={getRepoName(formData.github_url) || 'My Awesome Space'}
              className="form-input"
              disabled={loading}
            />
            <p className="form-hint">
              Give your space a memorable name (defaults to repository name)
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what your space does..."
              className="form-textarea"
              rows={3}
              disabled={loading}
            />
            <p className="form-hint">
              Help others understand what your application does
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Cover Image</label>

            {formData.image_url ? (
              <div className="image-preview">
                <img
                  src={formData.image_url}
                  alt="Cover preview"
                  className="image-preview-img"
                  onError={(e) => {
                    e.target.src = '';
                    e.target.alt = 'Failed to load image';
                  }}
                />
                <div className="image-preview-actions">
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={handleRemoveImage}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={dropzoneRef}
                className={`dropzone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleDropZoneClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileInputChange}
                  className="dropzone-input"
                  disabled={loading || uploading}
                />
                <div className="dropzone-content">
                  {uploading ? (
                    <>
                      <div className="dropzone-spinner"></div>
                      <p className="dropzone-text">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="dropzone-icon">📷</div>
                      <p className="dropzone-text">
                        Drag and drop an image here, or click to select
                      </p>
                      <p className="dropzone-hint">
                        JPEG, PNG, GIF, or WebP (max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="image-url-divider">
              <span>or</span>
            </div>

            <input
              type="text"
              id="image_url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="Paste an image URL"
              className="form-input"
              disabled={loading || uploading || formData.image_url.startsWith('/uploads/')}
            />
          </div>
        </div>

        {error && <div className="deploy-error">{error}</div>}

        {deploymentStatus && !error && (
          <div className="deploy-status">{deploymentStatus}</div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            disabled={loading || !formData.github_url}
          >
            {loading ? 'Deploying...' : 'Deploy Space'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeployPage;
