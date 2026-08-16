import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MusicPlayer.css';

const MUSIC_SRC = `${import.meta.env.BASE_URL}music/bg.mp3`;

const PARAMS = {
  particleCount: 200, baseSize: 2, sizeVariance: 1,
  baseAlpha: 1, baseSpeed: 0.005,
  audioRadiusMultiplier: 39, audioSizeMultiplier: 5,
  audioAlphaMultiplier: 3, audioSpeedMultiplier: 0.028,
  saturation: 85, lightness: 75,
  innerRadiusClearance: 15,
  hueCycleSpeed: 0.15, // degrees per frame, ~9°/s → full cycle ~40s
};

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasMusic, setHasMusic] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isBuffering, setIsBuffering] = useState(false);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const hueShiftRef = useRef(0);
  const audioGraphReady = useRef(false);
  const autoplayAttempted = useRef(false);
  const isPlayingRef = useRef(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initialize particles (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const pArray = [];
    const centerX = size / 2, centerY = size / 2;
    for (let i = 0; i < PARAMS.particleCount; i++) {
      pArray.push({
        x: centerX, y: centerY,
        angle: Math.random() * Math.PI * 2,
        radius: PARAMS.innerRadiusClearance + Math.random() * (size / 2 - 20 - PARAMS.innerRadiusClearance),
        size: PARAMS.baseSize + Math.random() * PARAMS.sizeVariance,
        baseAlpha: PARAMS.baseAlpha * (0.6 + Math.random() * 0.4),
        speed: PARAMS.baseSpeed * (0.5 + Math.random() * 1.5),
        driftBaseX: Math.random() * Math.PI * 2,
        driftBaseY: Math.random() * Math.PI * 2,
        driftSpeed: Math.random() * 0.01 + 0.005,
      });
    }
    particlesRef.current = pArray;
  }, [isMobile]);

  // Sync ref with state
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Render loop (desktop only) — uses ref instead of state in deps
  // so the animation loop isn't torn down/recreated on every play/pause toggle.
  useEffect(() => {
    if (isMobile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width, centerX = size / 2, centerY = size / 2;
    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      ctx.clearRect(0, 0, size, size);
      hueShiftRef.current = (hueShiftRef.current + PARAMS.hueCycleSpeed) % 360;
      let dataArray = null;
      const playing = isPlayingRef.current;
      if (analyserRef.current && playing) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
      }
      const particles = particlesRef.current;
      const maxDist = size / 2;
      const hueShift = hueShiftRef.current;
      particles.forEach((p, index) => {
        let pFreq = 0;
        if (dataArray) {
          const binIndex = index % dataArray.length;
          pFreq = dataArray[binIndex] / 256;
        }
        const targetSpeed = playing ? p.speed + (pFreq * PARAMS.audioSpeedMultiplier) : p.speed;
        p.angle += targetSpeed;
        p.driftBaseX += p.driftSpeed;
        p.driftBaseY += p.driftSpeed;
        const driftX = Math.cos(p.driftBaseX) * 10;
        const driftY = Math.sin(p.driftBaseY) * 10;
        const audioOffset = playing ? (pFreq * PARAMS.audioRadiusMultiplier) : 0;
        const currentRadius = p.radius + audioOffset;
        p.x = centerX + Math.cos(p.angle) * currentRadius + driftX;
        p.y = centerY + Math.sin(p.angle) * currentRadius + driftY;
        const distFromCenter = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
        const edgeFade = Math.max(0, 1 - (distFromCenter / (maxDist - 10)));
        if (edgeFade > 0) {
          ctx.beginPath();
          const currentSize = Math.max(0.1, p.size + (playing ? pFreq * PARAMS.audioSizeMultiplier : 0));
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          const audioAlpha = playing ? (pFreq * PARAMS.audioAlphaMultiplier) : 0;
          const finalAlpha = Math.min(1, PARAMS.baseAlpha * 0.5 + audioAlpha) * edgeFade;
          const hue = hueShift;
          ctx.fillStyle = 'hsla(' + hue + ', ' + PARAMS.saturation + '%, ' + PARAMS.lightness + '%, ' + finalAlpha + ')';
          ctx.shadowBlur = playing ? 3 + (pFreq * 5) : 2;
          ctx.shadowColor = 'hsla(' + hue + ', ' + PARAMS.saturation + '%, ' + PARAMS.lightness + '%, ' + (finalAlpha * 0.5) + ')';
          ctx.fill();
        }
      });
    };
    renderFrame();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isMobile]);

  // Set up Web Audio API graph (AudioContext + analyser + media source).
  // MUST be called from within a user gesture so the AudioContext can run.
  // Before this is called, the audio element plays directly through speakers.
  // After this is called, audio is routed through: source → analyser → destination
  const setupAudioGraph = useCallback(async () => {
    if (audioGraphReady.current) {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      return;
    }
    if (!audioRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state === 'running') {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.smoothingTimeConstant = 0.85;
      analyserRef.current.fftSize = 64;
      analyserRef.current.connect(ctx.destination);
      sourceRef.current = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      audioGraphReady.current = true;
    }
  }, []);

  // Toggle play/pause — checks audio.paused (ground truth) instead of
  // isPlaying state to avoid race conditions with the auto-play listeners.
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!hasMusic) return;

    try {
      await setupAudioGraph();
      if (!audio.paused) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Audio playback failed, maybe no music file yet:', err.message);
      setIsPlaying(false);
    }
  }, [setupAudioGraph, hasMusic]);

  // Auto-play on mount — registers interaction listeners BEFORE attempting
  // autoplay, so any click (e.g. login button) triggers music immediately.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Single handler: sets up AudioContext (needs user gesture) and starts playback.
    // With { once: true } the listener auto-removes after the first interaction.
    const handleInteraction = async () => {
      try {
        await setupAudioGraph();
        if (audio.paused) {
          await audio.play();
        }
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback after interaction failed:', err.message);
      }
    };

    // Register IMMEDIATELY — before the delayed autoplay attempt — so no
    // click is ever missed. Includes mousedown for broader browser coverage.
    const EVENTS = ['click', 'mousedown', 'touchstart', 'keydown'];
    EVENTS.forEach(evt => {
      document.addEventListener(evt, handleInteraction, { once: true });
    });

    // Try direct autoplay (may succeed if the browser already has a gesture
    // token or if autoplay policy allows it).
    const tryAutoPlay = async () => {
      if (autoplayAttempted.current) return;
      autoplayAttempted.current = true;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        // Browser blocked — the interaction listener above handles the rest.
      }
    };

    const timer = setTimeout(tryAutoPlay, 100);

    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setHasMusic(false);
      setIsPlaying(false);
    };

    // Buffering event handlers — keep UI state in sync and help diagnostics
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => { setIsBuffering(false); setIsPlaying(true); };
    const onCanPlay = () => setIsBuffering(false);
    const onStalled = () => setIsBuffering(true);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('stalled', onStalled);

    // Visibility change handler — resume AudioContext when tab becomes
    // visible again. Browsers suspend AudioContext in background tabs,
    // which stops audio routed through the Web Audio API graph.
    const onVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          try {
            await audioCtxRef.current.resume();
          } catch (e) {
            // ignore — will retry on next interaction
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('stalled', onStalled);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      EVENTS.forEach(evt => {
        document.removeEventListener(evt, handleInteraction);
      });
      autoplayAttempted.current = false;
    };
  }, [setupAudioGraph, isMobile]);

  // Mobile: invisible audio only, no particle UI
  if (isMobile) {
    return (
      <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop style={{ display: 'none' }} />
    );
  }

  // Desktop: particle music player
  return (
    <div
      className="music-player-particles"
      onClick={togglePlay}
      title={hasMusic ? (isBuffering ? '音乐缓冲中…' : isPlaying ? '点击暂停背景音乐' : '点击播放背景音乐') : '请在 public/music/ 目录放入 bg.mp3'}
      style={{
        position: 'fixed', bottom: 30, left: 30, zIndex: 99999,
        width: 120, height: 120, cursor: hasMusic ? 'pointer' : 'default',
        opacity: isBuffering ? 0.6 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop />
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
  );
};

export default MusicPlayer;
