import { useRef, useCallback, useState } from 'react';

export default function useAudioEngine() {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const srcNodeRef = useRef(null);
  const mediaDestRef = useRef(null);
  const audioElRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafIdRef = useRef(null);

  const [source, setSource] = useState('file'); // 'file' | 'mic'
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gainNodeRef.current = gain;
      const mediaDest = ctx.createMediaStreamDestination();
      mediaDestRef.current = mediaDest;
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      gain.connect(analyser);
      analyser.connect(ctx.destination);
      gain.connect(mediaDest);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    if (srcNodeRef.current?.mediaStream) {
      srcNodeRef.current.mediaStream.getTracks().forEach(t => t.stop());
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const loadFile = useCallback(async (file) => {
    ensureAudio();
    stopAudio();

    if (!audioElRef.current) {
      audioElRef.current = new Audio();
      audioElRef.current.crossOrigin = 'anonymous';
    }

    // Disconnect old source node if it exists
    try { srcNodeRef.current?.disconnect(); } catch { /* already disconnected */ }

    const url = URL.createObjectURL(file);
    audioElRef.current.src = url;
    setFileName(file.name);
    setSource('file');

    // Wait for metadata to load
    await new Promise((resolve) => {
      audioElRef.current.addEventListener('loadedmetadata', resolve, { once: true });
    });
    setDuration(audioElRef.current.duration);

    // Set up time update listener
    audioElRef.current.ontimeupdate = () => {
      setCurrentTime(audioElRef.current.currentTime);
    };
    audioElRef.current.onended = () => {
      setIsPlaying(false);
    };

    srcNodeRef.current = audioCtxRef.current.createMediaElementSource(audioElRef.current);
    srcNodeRef.current.connect(gainNodeRef.current);
  }, [ensureAudio, stopAudio]);

  const useMic = useCallback(async () => {
    ensureAudio();
    stopAudio();
    try { srcNodeRef.current?.disconnect(); } catch { /* already disconnected */ }
    setSource('mic');
    setFileName('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    srcNodeRef.current = audioCtxRef.current.createMediaStreamSource(stream);
    srcNodeRef.current.connect(gainNodeRef.current);
    setIsPlaying(true);
  }, [ensureAudio, stopAudio]);

  const play = useCallback(async () => {
    ensureAudio();
    if (source === 'mic') {
      setIsPlaying(true);
      return;
    }
    if (audioElRef.current?.src) {
      try {
        await audioElRef.current.play();
        setIsPlaying(true);
      } catch { /* autoplay blocked */ }
    }
  }, [ensureAudio, source]);

  const pause = useCallback(() => {
    if (source !== 'mic' && audioElRef.current) {
      audioElRef.current.pause();
      setIsPlaying(false);
    }
  }, [source]);

  const stop = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  const setVolume = useCallback((val) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val;
    }
  }, []);

  const setFftSize = useCallback((size) => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = size;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }
  }, []);

  const getFrequencyData = useCallback(() => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      return dataArrayRef.current;
    }
    return null;
  }, []);

  const seek = useCallback((time) => {
    if (audioElRef.current && source === 'file') {
      audioElRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [source]);

  return {
    source,
    isPlaying,
    fileName,
    currentTime,
    duration,
    loadFile,
    useMic,
    play,
    pause,
    stop,
    setVolume,
    setFftSize,
    getFrequencyData,
    seek,
    setSource,
    audioElRef,
    mediaDestRef,
    rafIdRef,
    analyserRef,
    canvasStreamable: true,
  };
}
