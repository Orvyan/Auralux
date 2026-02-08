import { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import useAudioEngine from './hooks/useAudioEngine';
import useRecorder from './hooks/useRecorder';
import useTheme from './hooks/useTheme';

export default function App() {
  const canvasRef = useRef(null);
  const { theme, toggle: toggleTheme } = useTheme();

  const audio = useAudioEngine();
  const recorder = useRecorder(canvasRef, audio.mediaDestRef);

  const [mode, setMode] = useState('bars');
  const [volume, setVolume] = useState(1);
  const [sensitivity, setSensitivity] = useState(1);

  const handleVolumeChange = useCallback((val) => {
    setVolume(val);
    audio.setVolume(val);
  }, [audio]);

  const handleLoadFile = useCallback(async (file) => {
    await audio.loadFile(file);
    await audio.play();
  }, [audio]);

  const handleUseMic = useCallback(async () => {
    try {
      await audio.useMic();
    } catch {
      // Mic access denied
    }
  }, [audio]);

  const handleFullscreen = useCallback(() => {
    const target = canvasRef.current;
    if (!target) return;
    if (document.fullscreenElement === target) {
      document.exitFullscreen?.();
    } else {
      target.requestFullscreen?.();
    }
  }, []);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'auralux.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (recorder.isRecording) {
      recorder.stop();
    } else {
      recorder.start();
    }
  }, [recorder]);

  const handleExportTrack = useCallback(async () => {
    if (audio.source === 'mic') {
      alert('Track export is only available for file sources.');
      return;
    }
    if (!audio.audioElRef.current?.src) {
      alert('Please choose an audio file first.');
      return;
    }
    const started = recorder.start();
    if (!started) return;
    try {
      await audio.play();
    } catch {
      recorder.stop();
      return;
    }
    const el = audio.audioElRef.current;
    const onEnded = () => {
      el.removeEventListener('ended', onEnded);
      recorder.stop();
    };
    el.addEventListener('ended', onEnded);
  }, [audio, recorder]);

  return (
    <div className="app-wrap">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onFullscreen={handleFullscreen}
        onScreenshot={handleScreenshot}
        isRecording={recorder.isRecording}
        onToggleRecord={handleToggleRecord}
        onExportTrack={handleExportTrack}
      />
      <Visualizer
        ref={canvasRef}
        mode={mode}
        sensitivity={sensitivity}
        getFrequencyData={audio.getFrequencyData}
        isPlaying={audio.isPlaying}
        theme={theme}
      />
      <Controls
        source={audio.source}
        isPlaying={audio.isPlaying}
        fileName={audio.fileName}
        currentTime={audio.currentTime}
        duration={audio.duration}
        mode={mode}
        volume={volume}
        sensitivity={sensitivity}
        onLoadFile={handleLoadFile}
        onUseMic={handleUseMic}
        onPlay={audio.play}
        onPause={audio.pause}
        onStop={audio.stop}
        onModeChange={setMode}
        onVolumeChange={handleVolumeChange}
        onSensitivityChange={setSensitivity}
        onSeek={audio.seek}
      />
    </div>
  );
}
