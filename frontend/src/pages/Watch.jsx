import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import {
  FaPlay, FaPause, FaVolumeMute, FaVolumeUp,
  FaExpand, FaArrowLeft, FaTv, FaBroadcastTower
} from 'react-icons/fa';

const PALETTES = [
  ['#f97316','#ef4444'], ['#3b82f6','#8b5cf6'],
  ['#10b981','#06b6d4'], ['#f59e0b','#f97316'],
  ['#ec4899','#ef4444'], ['#8b5cf6','#3b82f6'],
  ['#06b6d4','#10b981'], ['#f59e0b','#84cc16'],
];
const getColor = (name = '') => {
  let h = 0; for (const c of name) h += c.charCodeAt(0);
  return PALETTES[h % PALETTES.length];
};
const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const Logo = ({ channel, size = 56 }) => {
  const [err, setErr] = useState(false);
  const [c1, c2] = getColor(channel?.name || '');
  if (channel?.logoUrl && !err) {
    return <img src={channel.logoUrl} alt={channel.name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      onError={() => setErr(true)} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, color: '#fff', fontSize: size * 0.32,
    }}>{getInitials(channel?.name || '?')}</div>
  );
};

export default function Watch() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const channel   = state?.channel;

  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const hideTimer = useRef(null);

  const [playing,   setPlaying]   = useState(false);
  const [muted,     setMuted]     = useState(false);
  const [volume,    setVolume]    = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [showCtrl,  setShowCtrl]  = useState(true);

  const [c1, c2] = getColor(channel?.name || '');

  /* ── HLS setup ── */
  useEffect(() => {
    if (!channel?.streamUrl) return;
    const vid = videoRef.current;
    if (!vid) return;

    setLoading(true); setError(false);

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(channel.streamUrl);
      hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        vid.play().then(() => setPlaying(true)).catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { setError(true); setLoading(false); } });
    } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
      vid.src = channel.streamUrl;
      vid.addEventListener('loadedmetadata', () => {
        setLoading(false);
        vid.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
    } else {
      setError(true); setLoading(false);
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [channel?.streamUrl]);

  /* ── Volume / Mute ── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  /* ── Auto-hide controls ── */
  const showControls = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => playing && setShowCtrl(false), 3000);
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) { vid.pause(); setPlaying(false); }
    else { vid.play().catch(() => {}); setPlaying(true); }
    showControls();
  };

  const fullscreen = () => {
    const vid = videoRef.current;
    if (vid?.requestFullscreen) vid.requestFullscreen();
    else if (vid?.webkitRequestFullscreen) vid.webkitRequestFullscreen();
  };

  if (!channel) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <FaTv style={{ fontSize: 48, color: '#374151' }} />
        <p style={{ color: '#6b7280', fontSize: 18 }}>No channel selected.</p>
        <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
        padding: '20px 28px',
        display: 'flex', alignItems: 'center', gap: 18,
        transition: 'opacity 0.4s',
        opacity: showCtrl ? 1 : 0,
        pointerEvents: showCtrl ? 'auto' : 'none',
      }}>
        <button onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '8px 18px', color: '#fff', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <FaArrowLeft style={{ fontSize: 12 }} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo glow */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: `linear-gradient(135deg,${c1},${c2})`, filter: 'blur(8px)', opacity: playing ? 0.7 : 0.3, transition: 'opacity 0.5s' }} />
            <div style={{ position: 'relative' }}><Logo channel={channel} size={44} /></div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px' }}>{channel.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: playing ? '#4ade80' : '#f87171', display: 'inline-block', boxShadow: playing ? '0 0 8px #4ade80' : 'none', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {loading ? 'Connecting...' : error ? 'Offline' : playing ? 'Live Now' : 'Paused'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 900, background: `linear-gradient(135deg,${c1},${c2})`, color: '#fff', padding: '2px 10px', borderRadius: 99, letterSpacing: '1px' }}>TV</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Video area ── */}
      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', cursor: showCtrl ? 'default' : 'none', position: 'relative', background: '#000' }}
        onMouseMove={showControls}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100vh', objectFit: 'contain', display: 'block' }}
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
        />

        {/* Loading overlay */}
        {loading && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 20 }}>
              <div style={{ position: 'absolute', inset: 0, border: `2px solid ${c1}25`, borderRadius: '50%', animation: 'ping 2s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: 10, border: `2px solid ${c1}45`, borderRadius: '50%', animation: 'ping 2s ease-out infinite 0.5s' }} />
              <div style={{ position: 'absolute', inset: 20, border: `3px solid ${c1}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaTv style={{ color: c1, fontSize: 22 }} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Loading Stream</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Connecting to {channel.name}...</div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', pointerEvents: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <FaTv style={{ fontSize: 56, color: '#374151', marginBottom: 16 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Stream Unavailable</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'center', maxWidth: 340 }}>
              The channel may be offline or the stream URL is blocked.
            </div>
            <button onClick={() => navigate('/')} style={{ background: `linear-gradient(135deg,${c1},${c2})`, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              ← Go Back
            </button>
          </div>
        )}

        {/* Centre play/pause flash icon */}
        {!loading && !error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: showCtrl ? 0 : 0, pointerEvents: 'none',
          }} />
        )}

        {/* LIVE badge */}
        {playing && !loading && (
          <div style={{
            position: 'absolute', top: 100, left: 28,
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '6px 14px', borderRadius: 99,
            transition: 'opacity 0.4s', opacity: showCtrl ? 1 : 0,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block', animation: 'pulse 1s infinite', boxShadow: '0 0 10px #f87171' }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '1.5px' }}>LIVE</span>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, transparent 100%)',
        padding: '32px 28px 24px',
        transition: 'opacity 0.4s',
        opacity: showCtrl ? 1 : 0,
        pointerEvents: showCtrl ? 'auto' : 'none',
      }}>
        {/* Gradient progress bar (fake live indicator) */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: playing ? '100%' : '0%', background: `linear-gradient(90deg,${c1},${c2})`, transition: 'width 0.5s', borderRadius: 99 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Play + Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Play/Pause */}
            <button onClick={e => { e.stopPropagation(); togglePlay(); }}
              style={{
                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg,${c1},${c2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 30px ${c1}60`, transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
            >
              {playing ? <FaPause style={{ color: '#fff', fontSize: 18 }} /> : <FaPlay style={{ color: '#fff', fontSize: 18, marginLeft: 3 }} />}
            </button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setMuted(m => !m)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, padding: 4 }}>
                {muted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
              <input type="range" min="0" max="1" step="0.02"
                value={muted ? 0 : volume}
                onChange={e => { setVolume(+e.target.value); if (+e.target.value > 0) setMuted(false); }}
                style={{ width: 90, accentColor: c1, cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Centre: Channel info */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{channel.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <FaBroadcastTower style={{ color: c1, fontSize: 11 }} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>Live Television</span>
            </div>
          </div>

          {/* Right: Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
            <button onClick={fullscreen}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '10px 20px', color: '#fff', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, backdropFilter: 'blur(10px)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >
              <FaExpand style={{ fontSize: 13 }} /> Full Screen
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes ping  { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        input[type=range] { height: 4px; }
      `}</style>
    </div>
  );
}
