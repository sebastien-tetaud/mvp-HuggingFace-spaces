import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ExplorePage from './pages/ExplorePage';
import DeployPage from './pages/DeployPage';
import './App.css';

function App() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-title">DestinE Spaces</span>
        </Link>
        <div className="navbar-links">
          <Link
            to="/"
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Explore
          </Link>
          <Link
            to="/deploy"
            className={`navbar-link ${location.pathname === '/deploy' ? 'active' : ''}`}
          >
            Deploy
          </Link>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/deploy" element={<DeployPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
