(() => {
  const canvas = document.getElementById('vis');
  const ctx = canvas.getContext('2d', { alpha: false });
  const audioEl = document.getElementById('audio');

  const el = (id) => document.getElementById(id);
  const loader = el('loader');
  const btnPlay = el('btnPlay'), btnPause = el('btnPause'), btnStop = el('btnStop');
  const btnPick = el('btnPick'), file = el('file');
  const srcFile = el('srcFile'), srcMic = el('srcMic');
  const themeToggle = el('themeToggle'), btnFull = el('btnFull'), btnShot = el('btnShot');
  const btnRec = el('btnRec'), btnRecTrack = el('btnRecTrack');
  const modeSel = el('mode'), gainRange = el('gain'), sensRange = el('sens'), fftSel = el('fft');

  let audioCtx, analyser, srcNode, gainNode, mediaDest;
  let dataArray, rafId; let usingMic = false;
  let particles = [];

  let rec, recChunks = [], isRecording = false;

  function showLoader(text='Loading…'){
    loader.querySelector('.loader-text').textContent = text;
    loader.classList.remove('hidden');
  }
  async function hideLoader(){ loader.classList.add('hidden'); }

  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function ensureAudio(){
    if (!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      gainNode = audioCtx.createGain(); gainNode.gain.value = parseFloat(gainRange.value);
      mediaDest = audioCtx.createMediaStreamDestination();
      analyser.fftSize = parseInt(fftSel.value);
      analyser.smoothingTimeConstant = 0.85;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      gainNode.connect(analyser);
      analyser.connect(audioCtx.destination);
      gainNode.connect(mediaDest);
    }
  }

  function updateFFT(){ if (analyser){ analyser.fftSize = parseInt(fftSel.value); dataArray = new Uint8Array(analyser.frequencyBinCount);} }

  async function useFileSource(blobUrl){
    ensureAudio();
    stopAudio();
    usingMic = false;
    audioEl.src = blobUrl;
    srcNode = audioCtx.createMediaElementSource(audioEl);
    srcNode.connect(gainNode);
  }

  async function useMicSource(){
    ensureAudio();
    stopAudio();
    usingMic = true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    srcNode = audioCtx.createMediaStreamSource(stream);
    srcNode.connect(gainNode);
  }

  function stopAudio(){
    cancelAnimationFrame(rafId);
    if (srcNode && srcNode.mediaStream){
      const tracks = srcNode.mediaStream.getTracks();
      tracks.forEach(t => t.stop());
    }
    if (audioEl){
      audioEl.pause(); audioEl.currentTime = 0;
    }
  }

  function startRecording(){
    const fps = 60;
    const canvasStream = canvas.captureStream ? canvas.captureStream(fps) : null;
    if (!canvasStream){
      alert('Canvas streaming is not supported by your browser.');
      return;
    }
    const audioTracks = mediaDest?.stream?.getAudioTracks?.() || [];
    if (audioTracks.length){ canvasStream.addTrack(audioTracks[0]); }
    const mimePrefs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    const mimeType = mimePrefs.find(m => MediaRecorder.isTypeSupported(m)) || '';
    try{
      rec = new MediaRecorder(canvasStream, mimeType ? { mimeType } : {});
    }catch(e){
      alert('MediaRecorder is not supported.');
      return;
    }
    recChunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    rec.onstop = () => saveRecording();
    rec.start(100);
    isRecording = true;
    btnRec.textContent = '■ Stop';
    btnRec.classList.add('active');
    btnRecTrack.disabled = true;
  }

  function stopRecording(){
    if (rec && isRecording){
      rec.stop();
      isRecording = false;
      btnRec.textContent = '● Record';
      btnRec.classList.remove('active');
      btnRecTrack.disabled = false;
    }
  }

  function saveRecording(){
    const blob = new Blob(recChunks, { type: rec?.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    a.download = `auralux-${ts}.webm`;
    a.href = url; a.click();
    URL.revokeObjectURL(url);
  }

  async function recordFullTrack(){
    if (usingMic){
      alert('Track export is only available for file sources.');
      return;
    }
    if (!audioEl.src){
      alert('Please choose an audio file first.');
      return;
    }
    ensureAudio();
    startRecording();
    try{
      await audioEl.play();
    }catch(e){
      alert('Please press Play once to allow autoplay, then start track export again.');
      stopRecording();
      return;
    }
    const onEnded = () => {
      audioEl.removeEventListener('ended', onEnded);
      stopRecording();
    };
    audioEl.addEventListener('ended', onEnded);
    draw();
  }

  function draw(){
    rafId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0,0,w,h);
    const sens = parseFloat(sensRange.value);
    const mode = modeSel.value;
    if (mode === 'bars') drawBars(w, h, sens);
    else if (mode === 'ring') drawRing(w, h, sens);
    else drawParticles(w, h, sens);
  }

  function drawBars(w, h, sens){
    const N = dataArray.length;
    const barW = (w / N) * 2.5;
    for (let i=0;i<N;i++){
      const v = dataArray[i] / 255 * sens;
      const y = Math.max(2, v * h * 0.9);
      const x = i * barW;
      ctx.fillStyle = `rgba(10,132,255,${0.15 + v*0.6})`;
      ctx.fillRect(x, h - y, barW*0.9, y);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(10,132,255,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0;i<N;i++){
      const v = dataArray[i] / 255 * sens;
      const y = h - (v * h * 0.9);
      const x = i * (w/N);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawRing(w, h, sens){
    const cx = w/2, cy = h/2;
    const radius = Math.min(w,h)*0.28;
    const N = dataArray.length;
    ctx.save();
    ctx.translate(cx, cy);
    for (let i=0;i<N;i++){
      const v = (dataArray[i]/255) * sens;
      const a = (i/N) * Math.PI * 2;
      const r = radius + v * 160;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(10,132,255,${0.12 + v*0.6})`;
      ctx.lineWidth = 2 + v*3;
      ctx.moveTo(Math.cos(a)*radius, Math.sin(a)*radius);
      ctx.lineTo(x,y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0,0,radius*0.6,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles(w, h, sens){
    if (particles.length < 200) {
      for (let i=0; i<10; i++) particles.push(randParticle(w,h));
    }
    const avg = avgEnergy() * sens;
    for (const p of particles){
      p.vx += (Math.random()-0.5)*0.2;
      p.vy += (Math.random()-0.5)*0.2;
      p.x += p.vx * (1 + avg*2);
      p.y += p.vy * (1 + avg*2);
      if (p.x < -50 || p.x > w+50 || p.y < -50 || p.y > h+50){
        Object.assign(p, randParticle(w,h));
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(10,132,255,${0.08 + avg*0.6})`;
      ctx.arc(p.x, p.y, 1 + avg*4, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(10,132,255,${0.05 + avg*0.3})`;
    ctx.lineWidth = 1;
    for (let i=0;i<particles.length;i++){
      for (let j=i+1;j<i+10 && j<particles.length;j++){
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 120*120){
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }
  function randParticle(w,h){
    return { x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*1.2, vy:(Math.random()-0.5)*1.2 };
  }
  function avgEnergy(){
    let s=0; for (let i=0;i<dataArray.length;i++) s+=dataArray[i];
    return s / (255 * dataArray.length);
  }

  btnPick.addEventListener('click', () => file.click());
  file.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    showLoader('Loading file…');
    const url = URL.createObjectURL(f);
    await useFileSource(url);
    await audioEl.play().catch(()=>{});
    draw();
    await hideLoader();
  });

  srcFile.addEventListener('click', () => { srcFile.classList.add('active'); srcMic.classList.remove('active'); });
  srcMic.addEventListener('click', async () => {
    srcMic.classList.add('active'); srcFile.classList.remove('active');
    try{
      showLoader('Activating microphone…');
      await useMicSource();
      draw();
    }catch(err){
      alert('Microphone access denied or unavailable.');
    } finally { await hideLoader(); }
  });

  btnPlay.addEventListener('click', async () => {
    ensureAudio();
    if (usingMic){
      draw();
    } else {
      try { await audioEl.play(); } catch(e){}
      draw();
    }
  });
  btnPause.addEventListener('click', () => { if (!usingMic) audioEl.pause(); });
  btnStop.addEventListener('click', () => { stopAudio(); });

  gainRange.addEventListener('input', () => gainNode && (gainNode.gain.value = parseFloat(gainRange.value)));
  sensRange.addEventListener('input', () => {});
  fftSel.addEventListener('change', () => updateFFT());

  themeToggle.addEventListener('change', () => {
    document.documentElement.classList.toggle('light', themeToggle.checked);
    localStorage.setItem('vj_theme', themeToggle.checked ? 'light' : 'dark');
  });
  const saved = localStorage.getItem('vj_theme');
  if (saved === 'light'){ themeToggle.checked = true; document.documentElement.classList.add('light'); }

  btnFull.addEventListener('click', () => {
    const target = canvas;
    if (document.fullscreenElement === target){
      document.exitFullscreen?.();
    } else if (!document.fullscreenElement){
      target.requestFullscreen?.();
    } else {
      document.exitFullscreen?.().then(() => target.requestFullscreen?.());
    }
  });

  btnShot.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'auralux.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  btnRec.addEventListener('click', () => {
    if (!isRecording) startRecording(); else stopRecording();
  });
  btnRecTrack.addEventListener('click', () => { recordFullTrack(); });

  const modeDD = document.getElementById('modeDropdown');
  const modeBtn = document.getElementById('modeBtn');
  const modeMenu = document.getElementById('modeMenu');
  const modeLabel = document.getElementById('modeLabel');
  const nativeSelect = document.getElementById('mode');

  function setMode(value){
    nativeSelect.value = value;
    modeLabel.textContent = nativeSelect.options[nativeSelect.selectedIndex].textContent;
  }

  function openMenu(){
    modeMenu.classList.add('show');
    modeDD.setAttribute('aria-expanded','true');
    document.addEventListener('click', onDocClick, { once:true });
  }
  function closeMenu(){
    modeMenu.classList.remove('show');
    modeDD.setAttribute('aria-expanded','false');
  }
  function onDocClick(e){
    if (!modeDD.contains(e.target)) closeMenu();
  }

  modeBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if (modeMenu.classList.contains('show')) closeMenu(); else openMenu();
  });
  modeMenu.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      modeMenu.querySelectorAll('li').forEach(x=>x.removeAttribute('aria-selected'));
      li.setAttribute('aria-selected','true');
      setMode(li.dataset.value);
      closeMenu();
    });
  });
  setMode(nativeSelect.value || 'bars');

  (async () => {
    showLoader('Ready…');
    await hideLoader();
  })();
})();
