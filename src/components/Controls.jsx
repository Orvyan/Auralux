import { useRef, useState, useCallback } from 'react';
import {
  Upload,
  Mic,
  Play,
  Pause,
  StopCircle,
  BarChart3,
  CircleDot,
  Sparkles,
  Volume2,
  Activity,
  ChevronDown,
} from 'lucide-react';

const MODES = [
  { value: 'bars', label: 'Bars', icon: BarChart3 },
  { value: 'ring', label: 'Ring', icon: CircleDot },
  { value: 'particles', label: 'Particles', icon: Sparkles },
];

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Controls({
  source,
  isPlaying,
  fileName,
  currentTime,
  duration,
  mode,
  volume,
  sensitivity,
  onLoadFile,
  onUseMic,
  onPlay,
  onPause,
  onStop,
  onModeChange,
  onVolumeChange,
  onSensitivityChange,
  onSeek,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const dropRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) onLoadFile(file);
  }, [onLoadFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onLoadFile(file);
    }
  }, [onLoadFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const currentMode = MODES.find(m => m.value === mode);
  const ModeIcon = currentMode?.icon || BarChart3;

  return (
    <section className="controls glass">
      {/* Audio Source Section */}
      <div className="control-section">
        <div className="control-section-header">
          <span className="section-label">Source</span>
        </div>
        <div className="source-row">
          <div
            ref={dropRef}
            className={`drop-zone ${dragOver ? 'drag-over' : ''} ${source === 'file' ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload size={20} />
            <span>{fileName || 'Drop audio file here or click to browse'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={handleFileSelect}
            />
          </div>
          <button
            className={`mic-btn ${source === 'mic' ? 'active' : ''}`}
            onClick={onUseMic}
            title="Use Microphone"
          >
            <Mic size={20} />
            <span>Mic</span>
          </button>
        </div>
      </div>

      {/* Transport + Progress */}
      <div className="control-section">
        <div className="control-section-header">
          <span className="section-label">Playback</span>
          {source === 'file' && duration > 0 && (
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
        </div>

        {source === 'file' && duration > 0 && (
          <div className="progress-bar-container">
            <input
              type="range"
              className="progress-bar"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
            />
          </div>
        )}

        <div className="transport-row">
          <button
            className={`transport-btn ${isPlaying ? '' : 'highlight'}`}
            onClick={onPlay}
            title="Play"
          >
            <Play size={18} />
          </button>
          <button className="transport-btn" onClick={onPause} title="Pause">
            <Pause size={18} />
          </button>
          <button className="transport-btn" onClick={onStop} title="Stop">
            <StopCircle size={18} />
          </button>
        </div>
      </div>

      {/* Mode + Sliders */}
      <div className="control-section">
        <div className="control-section-header">
          <span className="section-label">Visualization</span>
        </div>
        <div className="vis-controls-row">
          {/* Mode dropdown */}
          <div className="mode-dropdown">
            <button
              className="mode-toggle"
              onClick={() => setModeOpen(!modeOpen)}
            >
              <ModeIcon size={16} />
              <span>{currentMode?.label}</span>
              <ChevronDown size={14} className={modeOpen ? 'rotated' : ''} />
            </button>
            {modeOpen && (
              <ul className="mode-menu glass">
                {MODES.map((item) => (
                  <li
                    key={item.value}
                    className={mode === item.value ? 'selected' : ''}
                    onClick={() => { onModeChange(item.value); setModeOpen(false); }}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                    {mode === item.value && <span className="check">&#10003;</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Volume */}
          <div className="slider-group">
            <label>
              <Volume2 size={14} />
              <span>Volume</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            />
          </div>

          {/* Sensitivity */}
          <div className="slider-group">
            <label>
              <Activity size={14} />
              <span>Sensitivity</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
