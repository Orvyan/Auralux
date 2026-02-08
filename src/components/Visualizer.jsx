import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const COLORS = {
  bars: { r: 10, g: 132, b: 255 },
  ring: { r: 10, g: 132, b: 255 },
  particles: { r: 10, g: 132, b: 255 },
};

const Visualizer = forwardRef(function Visualizer(
  { mode, sensitivity, getFrequencyData, isPlaying, theme },
  ref
) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useImperativeHandle(ref, () => canvasRef.current);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  const drawBars = useCallback((ctx, w, h, data, sens) => {
    const N = data.length;
    const barW = (w / N) * 2.5;
    const c = COLORS.bars;

    for (let i = 0; i < N; i++) {
      const v = (data[i] / 255) * sens;
      const y = Math.max(2, v * h * 0.9);
      const x = i * barW;

      // Gradient bar
      const grad = ctx.createLinearGradient(x, h, x, h - y);
      grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${0.08 + v * 0.3})`);
      grad.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${0.2 + v * 0.5})`);
      grad.addColorStop(1, `rgba(100,200,255,${0.3 + v * 0.7})`);
      ctx.fillStyle = grad;

      // Rounded bars
      const bw = barW * 0.85;
      const radius = Math.min(bw / 2, 4);
      ctx.beginPath();
      ctx.moveTo(x + radius, h - y);
      ctx.lineTo(x + bw - radius, h - y);
      ctx.quadraticCurveTo(x + bw, h - y, x + bw, h - y + radius);
      ctx.lineTo(x + bw, h);
      ctx.lineTo(x, h);
      ctx.lineTo(x, h - y + radius);
      ctx.quadraticCurveTo(x, h - y, x + radius, h - y);
      ctx.fill();
    }

    // Glow line on top
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.4)`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},0.6)`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const v = (data[i] / 255) * sens;
      const y = h - v * h * 0.9;
      const x = i * (w / N);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const drawRing = useCallback((ctx, w, h, data, sens) => {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.25;
    const N = data.length;
    const c = COLORS.ring;

    ctx.save();
    ctx.translate(cx, cy);

    // Outer ring lines
    for (let i = 0; i < N; i++) {
      const v = (data[i] / 255) * sens;
      const a = (i / N) * Math.PI * 2;
      const r = radius + v * 180;
      const x1 = Math.cos(a) * radius;
      const y1 = Math.sin(a) * radius;
      const x2 = Math.cos(a) * r;
      const y2 = Math.sin(a) * r;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${0.05 + v * 0.2})`);
      grad.addColorStop(1, `rgba(100,200,255,${0.15 + v * 0.7})`);

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 + v * 3;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Glow ring
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.15)`;
    ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},0.4)`;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner circle
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }, []);

  const drawParticles = useCallback((ctx, w, h, data, sens) => {
    const c = COLORS.particles;

    // Calculate average energy
    let s = 0;
    for (let i = 0; i < data.length; i++) s += data[i];
    const avg = (s / (255 * data.length)) * sens;

    // Spawn particles
    if (particlesRef.current.length < 200) {
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
        });
      }
    }

    const particles = particlesRef.current;

    for (const p of particles) {
      p.vx += (Math.random() - 0.5) * 0.2;
      p.vy += (Math.random() - 0.5) * 0.2;
      p.x += p.vx * (1 + avg * 2);
      p.y += p.vy * (1 + avg * 2);
      if (p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.vx = (Math.random() - 0.5) * 1.2;
        p.vy = (Math.random() - 0.5) * 1.2;
      }

      const size = 1.5 + avg * 5;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      grad.addColorStop(0, `rgba(100,200,255,${0.15 + avg * 0.7})`);
      grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${0.12 + avg * 0.6})`;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connect nearby particles
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.04 + avg * 0.25})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < i + 10 && j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        if (dx * dx + dy * dy < 14400) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const bg = theme === 'light' ? '#e8ecf2' : '#0b0f17';

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const data = getFrequencyData();
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!data) return;

      const sens = sensitivity;
      if (mode === 'bars') drawBars(ctx, w, h, data, sens);
      else if (mode === 'ring') drawRing(ctx, w, h, data, sens);
      else drawParticles(ctx, w, h, data, sens);
    }

    if (isPlaying) {
      draw();
    } else {
      // Draw empty state
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, sensitivity, getFrequencyData, isPlaying, drawBars, drawRing, drawParticles, theme]);

  return (
    <section className="stage glass">
      <canvas ref={canvasRef} className="vis-canvas" />
      {!isPlaying && (
        <div className="stage-placeholder">
          <div className="stage-placeholder-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p>Load an audio file or enable the microphone to begin</p>
        </div>
      )}
    </section>
  );
});

export default Visualizer;
