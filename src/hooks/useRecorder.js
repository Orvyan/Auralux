import { useRef, useCallback, useState } from 'react';

function saveRecording(chunks, mimeType) {
  const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = `auralux-${ts}.webm`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

export default function useRecorder(canvasRef, mediaDestRef) {
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const fps = 60;
    const canvasStream = canvas.captureStream?.(fps);
    if (!canvasStream) return false;

    const audioTracks = mediaDestRef.current?.stream?.getAudioTracks?.() || [];
    if (audioTracks.length) canvasStream.addTrack(audioTracks[0]);

    const mimePrefs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    const mimeType = mimePrefs.find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      recRef.current = new MediaRecorder(canvasStream, mimeType ? { mimeType } : {});
    } catch {
      return false;
    }

    chunksRef.current = [];
    recRef.current.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    recRef.current.onstop = () => {
      saveRecording(chunksRef.current, recRef.current?.mimeType);
    };
    recRef.current.start(100);
    setIsRecording(true);
    return true;
  }, [canvasRef, mediaDestRef]);

  const stop = useCallback(() => {
    if (recRef.current && isRecording) {
      recRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, start, stop };
}
