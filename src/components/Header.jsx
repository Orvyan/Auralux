import {
  Maximize,
  Camera,
  Circle,
  Square,
  Download,
  Sun,
  Moon,
  Github,
} from 'lucide-react';

export default function Header({
  theme,
  onToggleTheme,
  onFullscreen,
  onScreenshot,
  isRecording,
  onToggleRecord,
  onExportTrack,
}) {
  return (
    <header className="topbar glass">
      <div className="brand">
        <span className="dot" />
        <h1>
          Auralux <span className="thin">Visualizer</span>
        </h1>
      </div>

      <div className="actions">
        <button className="icon-btn" onClick={onFullscreen} title="Fullscreen">
          <Maximize size={18} />
        </button>
        <button className="icon-btn" onClick={onScreenshot} title="Screenshot">
          <Camera size={18} />
        </button>
        <button
          className={`icon-btn primary ${isRecording ? 'recording' : ''}`}
          onClick={onToggleRecord}
          title={isRecording ? 'Stop Recording' : 'Record'}
        >
          {isRecording ? <Square size={16} /> : <Circle size={16} />}
          <span className="btn-label">{isRecording ? 'Stop' : 'Record'}</span>
        </button>
        <button className="icon-btn" onClick={onExportTrack} title="Export Track">
          <Download size={18} />
          <span className="btn-label">Export</span>
        </button>

        <button
          className="theme-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <a
          href="https://github.com/Orvyan/Auralux"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn github-link"
          title="View on GitHub"
        >
          <Github size={18} />
        </a>
      </div>
    </header>
  );
}
