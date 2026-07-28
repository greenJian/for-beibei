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

  // Render loop (desktop only)
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
      if (analyserRef.current && isPlaying) {
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
        const targetSpeed = isPlaying ? p.speed + (pFreq * PARAMS.audioSpeedMultiplier) : p.speed;
        p.angle += targetSpeed;
        p.driftBaseX += p.driftSpeed;
        p.driftBaseY += p.driftSpeed;
        const driftX = Math.cos(p.driftBaseX) * 10;
        const driftY = Math.sin(p.driftBaseY) * 10;
        const audioOffset = isPlaying ? (pFreq * PARAMS.audioRadiusMultiplier) : 0;
        const currentRadius = p.radius + audioOffset;
        p.x = centerX + Math.cos(p.angle) * currentRadius + driftX;
        p.y = centerY + Math.sin(p.angle) * currentRadius + driftY;
        const distFromCenter = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
        const edgeFade = Math.max(0, 1 - (distFromCenter / (maxDist - 10)));
        if (edgeFade > 0) {
          ctx.beginPath();
          const currentSize = Math.max(0.1, p.size + (isPlaying ? pFreq * PARAMS.audioSizeMultiplier : 0));
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          const audioAlpha = isPlaying ? (pFreq * PARAMS.audioAlphaMultiplier) : 0;
          const finalAlpha = Math.min(1, PARAMS.baseAlpha * 0.5 + audioAlpha) * edgeFade;
          const hue = hueShift;
          ctx.fillStyle = 'hsla(' + hue + ', ' + PARAMS.saturation + '%, ' + PARAMS.lightness + '%, ' + finalAlpha + ')';
          ctx.shadowBlur = isPlaying ? 3 + (pFreq * 5) : 2;
          ctx.shadowColor = 'hsla(' + hue + ', ' + PARAMS.saturation + '%, ' + PARAMS.lightness + '%, ' + (finalAlpha * 0.5) + ')';
          ctx.fill();
        }
      });
    };
    renderFrame();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, isMobile]);

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

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!hasMusic) return;

    try {
      await setupAudioGraph();
      if (isPlaying) {
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
  }, [isPlaying, setupAudioGraph, hasMusic]);

  // Auto-play on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let interactionCleanup = null;

    const tryAutoPlay = async () => {
      if (autoplayAttempted.current) return;
      autoplayAttempted.current = true;

      try {
        // Play directly through the audio element — do NOT set up the Web Audio
        // graph here, because the AudioContext would be suspended without a user
        // gesture and createMediaElementSource would route audio into a dead graph.
        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        // Browser blocked autoplay — retry on first user interaction.
        const handleInteraction = async () => {
          try {
            await setupAudioGraph();
            await audio.play();
            setIsPlaying(true);
          } catch (err) {
            console.warn('Auto-play failed after interaction:', err.message);
          }
          if (interactionCleanup) interactionCleanup();
        };

        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });

        interactionCleanup = () => {
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('touchstart', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
        };
      }
    };

    const timer = setTimeout(tryAutoPlay, isMobile ? 300 : 100);

    // Even if autoplay succeeded, we still need to set up the Web Audio graph
    // for the particle visualization. Do it on the first user interaction (any
    // click/touch/keydown), at which point the AudioContext can actually run.
    const setupGraphOnInteraction = () => {
      setupAudioGraph();
      document.removeEventListener('click', setupGraphOnInteraction);
      document.removeEventListener('touchstart', setupGraphOnInteraction);
      document.removeEventListener('keydown', setupGraphOnInteraction);
    };
    document.addEventListener('click', setupGraphOnInteraction);
    document.addEventListener('touchstart', setupGraphOnInteraction);
    document.addEventListener('keydown', setupGraphOnInteraction);

    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setHasMusic(false);
      setIsPlaying(false);
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      clearTimeout(timer);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      if (interactionCleanup) interactionCleanup();
      document.removeEventListener('click', setupGraphOnInteraction);
      document.removeEventListener('touchstart', setupGraphOnInteraction);
      document.removeEventListener('keydown', setupGraphOnInteraction);
      // Reset for React 18 StrictMode double-mount: the second mount
      // would otherwise see autoplayAttempted=true and skip autoplay.
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
      title={hasMusic ? (isPlaying ? '点击暂停背景音乐' : '点击播放背景音乐') : '请在 public/music/ 目录放入 bg.mp3'}
      style={{
        position: 'fixed', bottom: 30, left: 30, zIndex: 99999,
        width: 120, height: 120, cursor: hasMusic ? 'pointer' : 'default',
      }}
    >
      <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop />
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
  );
};

export default MusicPlayer;
