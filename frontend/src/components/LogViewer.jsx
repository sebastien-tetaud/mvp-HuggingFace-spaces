import { useState, useEffect, useRef } from 'react';

function LogViewer({ spaceId, onClose }) {
  const [logs, setLogs] = useState({ build: [], runtime: '' });
  const [activeTab, setActiveTab] = useState('build');
  const [loading, setLoading] = useState(true);
  const logContainerRef = useRef(null);

  useEffect(() => {
    fetchLogs();
  }, [spaceId]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const buildRes = await fetch(`/api/spaces/${spaceId}/logs/build`);
      const buildData = await buildRes.json();

      const runtimeRes = await fetch(`/api/spaces/${spaceId}/logs/runtime?tail=200`);
      const runtimeData = await runtimeRes.json();

      setLogs({
        build: buildData.logs || [],
        runtime: runtimeData.logs || '',
      });
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="log-viewer-overlay" onClick={onClose}>
      <div className="log-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="log-viewer-header">
          <h3 className="log-viewer-title">
            <span>@</span>
            Logs - {spaceId}
          </h3>
          <div className="log-viewer-actions">
            <button onClick={fetchLogs} className="log-action-btn">
              Refresh
            </button>
            <button onClick={onClose} className="log-close-btn">
              x
            </button>
          </div>
        </div>

        <div className="log-tabs">
          <button
            className={`log-tab ${activeTab === 'build' ? 'active' : ''}`}
            onClick={() => setActiveTab('build')}
          >
            Build Logs
          </button>
          <button
            className={`log-tab ${activeTab === 'runtime' ? 'active' : ''}`}
            onClick={() => setActiveTab('runtime')}
          >
            Runtime Logs
          </button>
        </div>

        <div className="log-content" ref={logContainerRef}>
          {loading ? (
            <div className="log-loading">Loading logs...</div>
          ) : activeTab === 'build' ? (
            logs.build.length > 0 ? (
              logs.build.map((line, i) => (
                <div key={i} className="log-line">
                  {line}
                </div>
              ))
            ) : (
              <div className="log-empty">No build logs available</div>
            )
          ) : logs.runtime ? (
            <pre className="log-pre">{logs.runtime}</pre>
          ) : (
            <div className="log-empty">No runtime logs available</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogViewer;
