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
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const hueShiftRef = useRef(0);

  // Initialize particles
  useEffect(() => {
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
  }, []);

  // Render loop
  useEffect(() => {
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
  }, [isPlaying]);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.smoothingTimeConstant = 0.85;
      analyserRef.current.fftSize = 64;
      sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!hasMusic) return;

    try {
      initAudio();
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
  }, [isPlaying, initAudio, hasMusic]);

  // Auto-play on mount (after user interaction with page)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tryAutoPlay = async () => {
      try {
        initAudio();
        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        // Browser may block autoplay, wait for user interaction
        const handleInteraction = async () => {
          try {
            initAudio();
            await audio.play();
            setIsPlaying(true);
          } catch (err) {
            console.warn('Auto-play failed:', err.message);
          }
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('touchstart', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
        };
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
      }
    };

    tryAutoPlay();

    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setHasMusic(false);
      setIsPlaying(false);
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [initAudio]);

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
