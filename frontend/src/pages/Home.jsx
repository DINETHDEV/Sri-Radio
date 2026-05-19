import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Hls from 'hls.js';
import { useNavigate } from 'react-router-dom';
import {
  FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
  FaBroadcastTower, FaSearch, FaHeart, FaRegHeart,
  FaStepForward, FaStepBackward, FaRandom,
  FaTv, FaTimes, FaExpand
} from 'react-icons/fa';

/* ─── Colors ─────────────────────────────────────────── */
const PALETTES = [
  ['#f97316','#ef4444'], ['#3b82f6','#8b5cf6'],
  ['#10b981','#06b6d4'], ['#f59e0b','#f97316'],
  ['#ec4899','#ef4444'], ['#8b5cf6','#3b82f6'],
  ['#06b6d4','#10b981'], ['#f59e0b','#84cc16'],
];
const getColor = (name) => {
  let h = 0; for (const c of name) h += c.charCodeAt(0);
  return PALETTES[h % PALETTES.length];
};
const getInitials = (name) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* ─── Logo ───────────────────────────────────────────── */
const Logo = ({ channel, size = 64 }) => {
  const [err, setErr] = useState(false);
  const [c1, c2] = getColor(channel.name);
  if (channel.logoUrl && !err) {
    return (
      <img src={channel.logoUrl} alt={channel.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, color: '#fff', fontSize: size * 0.32,
      letterSpacing: '-0.5px',
    }}>
      {getInitials(channel.name)}
    </div>
  );
};

/* ─── Wave Bars ──────────────────────────────────────── */
const WaveBars = ({ color }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} className="wave-bar" style={{
        width: 3, minHeight: 4, borderRadius: 99, background: color
      }} />
    ))}
  </div>
);

/* ─── Skeleton ───────────────────────────────────────── */
const Skeleton = () => (
  <div className="skeleton rounded-2xl" style={{ height: 180 }} />
);

/* ═══════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════ */
export default function Home() {
  const navigate  = useNavigate();
  const [channels, setChannels]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [activeTab, setActiveTab]   = useState('radio');
  const [favorites, setFavorites]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('sr_favs') || '[]'); } catch { return []; }
  });
  const [current, setCurrent]       = useState(null);
  const [playing, setPlaying]       = useState(false);
  const [volume, setVolume]         = useState(0.8);
  const [muted, setMuted]           = useState(false);
  const [livePct, setLivePct]       = useState(0);
  const [videoOpen, setVideoOpen]   = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);

  /* fetch */
  useEffect(() => {
    axios.get('/api/channels')
      .then(({ data }) => { setChannels(data.filter(c => c.isActive)); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  /* volume */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  /* fake live bar */
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setLivePct(p => (p + 0.12) % 100), 1000);
    return () => clearInterval(t);
  }, [playing]);

  /* filtered list */
  const filtered = channels.filter(c => {
    const s = c.name.toLowerCase().includes(search.toLowerCase());
    const isTV = c.category?.toLowerCase() === 'tv' || c.streamUrl?.includes('.m3u8') || c.streamUrl?.includes('chunklist');
    
    let matchesTab = false;
    if (activeTab === 'radio') matchesTab = !isTV;
    else if (activeTab === 'tv') matchesTab = isTV;
    else if (activeTab === 'fav') matchesTab = favorites.includes(c._id);
    
    return s && matchesTab;
  });

  /* play */
  const play = useCallback((ch) => {
    const isTV = ch.category === 'TV' || ch.streamUrl?.includes('.m3u8') || ch.streamUrl?.includes('/api/stream');

    if (isTV) {
      // Navigate to dedicated watch page
      navigate('/watch', { state: { channel: ch } });
      return;
    }

    // Audio channels
    setVideoOpen(false);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (current?._id === ch._id) {
      playing ? audioRef.current.pause() : audioRef.current.play().catch(() => {});
      setPlaying(p => !p);
    } else {
      setCurrent(ch);
      setPlaying(true);
      setLivePct(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = ch.streamUrl;
          audioRef.current.play().catch(() => {});
        }
      }, 30);
    }
  }, [current, playing]);

  const closeVideo = () => {
    setVideoOpen(false);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
    setPlaying(false);
    setCurrent(null);
  };

  const curIdx = filtered.findIndex(c => c._id === current?._id);
  const playNext   = () => filtered.length && play(filtered[(curIdx + 1) % filtered.length]);
  const playPrev   = () => filtered.length && play(filtered[(curIdx - 1 + filtered.length) % filtered.length]);
  const playShuffle = () => {
    if (!filtered.length) return;
    let i; do { i = Math.floor(Math.random() * filtered.length); } while (filtered[i]?._id === current?._id && filtered.length > 1);
    play(filtered[i]);
  };

  /* fav */
  const toggleFav = (id, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('sr_favs', JSON.stringify(next));
      return next;
    });
  };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', paddingBottom: 120, position: 'relative', overflowX: 'hidden' }}>

      {/* BG blobs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: 100, right: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '30%', width: 700, height: 250, background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />
      </div>

      {/* ═══ HEADER ════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,20,0.9)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          {/* Row 1: Logo + Search + Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 14, paddingBottom: 12 }}>
            {/* ── Premium Logo ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              {/* Icon with animated glow */}
              <div style={{ position: 'relative', width: 46, height: 46 }}>
                {/* outer glow ring */}
                <div style={{
                  position: 'absolute', inset: -3, borderRadius: 16,
                  background: 'linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899)',
                  filter: 'blur(8px)', opacity: 0.7,
                  animation: 'pulse 3s ease-in-out infinite',
                }} />
                {/* icon box */}
                <div style={{
                  position: 'relative', width: 46, height: 46, borderRadius: 14,
                  background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 0 0 1px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}>
                  {/* Custom radio wave SVG */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="15" r="2.5" fill="white"/>
                    <path d="M8.5 11.5C9.4 10.3 10.6 9.5 12 9.5C13.4 9.5 14.6 10.3 15.5 11.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M5.5 8.5C7.2 6.4 9.5 5 12 5C14.5 5 16.8 6.4 18.5 8.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="12" y1="17.5" x2="12" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="9.5" y1="20" x2="14.5" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                {/* live dot */}
                {playing && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 11, height: 11, borderRadius: '50%',
                    background: '#4ade80', border: '2px solid #0d0d14',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}/>
                )}
              </div>

              {/* Brand name */}
              <div>
                <div style={{
                  fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1,
                  background: 'linear-gradient(90deg,#ffffff 0%,#93c5fd 50%,#c4b5fd 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  SriRadio
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
                  <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, letterSpacing: '0.3px' }}>Live FM · Sri Lanka</span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 13 }} />
              <input
                type="text" placeholder="Search channels..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <a href="/login" style={{
              fontSize: 13, fontWeight: 600, color: '#9ca3af',
              border: '1px solid rgba(255,255,255,0.10)',
              padding: '8px 18px', borderRadius: 10,
              textDecoration: 'none', flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.color='#fff'; e.target.style.background='rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.target.style.color='#9ca3af'; e.target.style.background='transparent'; }}>
              Admin
            </a>
          </div>

        </div>
      </header>

      {/* ═══ ULTRA PREMIUM HERO ══════════════════════════════════════════ */}
      <section style={{ 
        textAlign: 'center', padding: '80px 24px 60px', position: 'relative', zIndex: 1,
        overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {/* Animated Mesh Background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: -1, opacity: 0.15,
          background: 'radial-gradient(circle at 0% 0%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 100% 100%, #a855f7 0%, transparent 50%), radial-gradient(circle at 50% 50%, #4f46e5 0%, transparent 50%)',
          backgroundSize: '200% 200%',
          animation: 'mesh-gradient-bg 15s ease infinite',
        }} />
        
        {/* Glowing Orbs */}
        <div style={{ position: 'absolute', top: -50, left: '20%', width: 300, height: 300, background: '#3b82f6', filter: 'blur(100px)', opacity: 0.2, borderRadius: '50%', zIndex: -1 }} />
        <div style={{ position: 'absolute', bottom: -50, right: '20%', width: 300, height: 300, background: '#a855f7', filter: 'blur(100px)', opacity: 0.2, borderRadius: '50%', zIndex: -1 }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#e5e7eb', fontSize: 13, fontWeight: 700,
          padding: '8px 20px', borderRadius: 99, marginBottom: 32,
          backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite', boxShadow: '0 0 10px #4ade80' }} />
          {channels.filter(c => c.isActive).length} Channels Live Now
        </div>

        <h2 style={{ fontSize: 'clamp(42px, 8vw, 76px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 20, margin: '0 auto 20px', letterSpacing: '-1.5px' }}>
          <span style={{ color: '#fff', textShadow: '0 0 40px rgba(255,255,255,0.2)' }}>
            SriRadio Hub
          </span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(96,165,250,0.3))' }}>
            Live TV & FM
          </span>
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 18, maxWidth: 600, margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>
          Experience the next generation of streaming. Crystal clear FM radio and high-definition live TV, all in one premium hub.
        </p>
      </section>

      {/* ═══ CHANNEL GRID ══════════════════════════════════ */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 40px', position: 'relative', zIndex: 1 }}>
        {/* Ultra Premium Segmented Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40, marginTop: -24 }}>
          <div style={{
            display: 'inline-flex', background: 'rgba(15,15,20,0.8)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 6,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative', zIndex: 10
          }}>
            {[
              { id: 'radio', label: '🎧 Live FM Radio' },
              { id: 'tv', label: '📺 Live TV' },
              { id: 'fav', label: '❤️ Favorites' }
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: '12px 32px', borderRadius: 16,
                  fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  border: 'none',
                  background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
                  color: active ? '#fff' : '#9ca3af',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: active ? '0 8px 20px rgba(59,130,246,0.3)' : 'none',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={e => { if(!active) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if(!active) e.currentTarget.style.color = '#9ca3af'; }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : error ? (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400, margin: '0 auto'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <p style={{ color: '#f87171', fontWeight: 700, marginBottom: 8 }}>Connection Failed</p>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Make sure the backend server is running.</p>
            <button onClick={() => window.location.reload()} style={{
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff',
              border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer'
            }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>
            <FaBroadcastTower style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 18, fontWeight: 700 }}>No channels found</p>
            <p style={{ fontSize: 14 }}>Try a different search or category</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: activeTab === 'tv' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))', 
            gap: activeTab === 'tv' ? 24 : 16 
          }}>
            {filtered.map((ch, idx) => {
              const isActive = current?._id === ch._id;
              const isThisPlaying = isActive && playing;
              const [c1, c2] = getColor(ch.name);
              const isFav = favorites.includes(ch._id);
              const isTV = ch.category?.toLowerCase() === 'tv' || ch.streamUrl?.includes('.m3u8') || ch.streamUrl?.includes('chunklist');

              return (
                <div key={ch._id} onClick={() => play(ch)}
                  className="card-hover"
                  style={{
                    position: 'relative', borderRadius: isTV ? 16 : 20, overflow: 'hidden', cursor: 'pointer',
                    background: isActive ? `linear-gradient(135deg,${c1}22,${c2}22)` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? c1 + '60' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: isThisPlaying ? `0 0 40px ${c1}35` : 'none',
                    animationDelay: `${idx * 40}ms`,
                    display: 'flex', flexDirection: isTV ? 'column' : 'column',
                  }}
                >
                  {/* Fav btn */}
                  <button onClick={e => toggleFav(ch._id, e)} style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 10,
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', backdropFilter: 'blur(4px)'
                  }}>
                    {isFav
                      ? <FaHeart style={{ color: '#f43f5e', fontSize: 13 }} />
                      : <FaRegHeart style={{ color: '#9ca3af', fontSize: 13 }} />
                    }
                  </button>

                  {isTV ? (
                    /* TV Card Layout (16:9 Banner) */
                    <>
                      <div style={{ width: '100%', aspectRatio: '16/9', background: `linear-gradient(135deg,${c1}44,${c2}44)`, position: 'relative' }}>
                         {ch.logoUrl ? (
                           <img src={ch.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={ch.name} />
                         ) : (
                           <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: '#fff', opacity: 0.5 }}>
                             {getInitials(ch.name)}
                           </div>
                         )}
                         {/* TV Overlay Badge */}
                         <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 1, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>TV</div>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{ch.name}</div>
                         {isThisPlaying && <WaveBars color={c1} />}
                      </div>
                    </>
                  ) : (
                    /* Radio Card Layout (Circle Logo) */
                    <div style={{ padding: '24px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ position: 'relative', marginBottom: 16 }}>
                        {isThisPlaying && (
                          <div style={{
                            position: 'absolute', inset: -6, borderRadius: '50%',
                            border: `2px solid ${c1}`, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.4
                          }} />
                        )}
                        <Logo channel={ch} size={72} />
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
                        {ch.name}
                      </div>

                      {isThisPlaying ? (
                        <WaveBars color={c1} />
                      ) : (
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: '#6b7280',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          padding: '4px 12px', borderRadius: 99,
                        }}>
                          FM Radio
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hover play overlay */}
                  {!isActive && (
                    <div className="play-overlay" style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      }}>
                        <FaPlay style={{ color: '#0d0d14', fontSize: 14, marginLeft: 3 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ AUDIO ══════════════════════════════════════════ */}
      <audio ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={playNext}
        onError={() => setPlaying(false)}
      />

      {/* ═══ TV VIDEO POPUP — PREMIUM ════════════════════════ */}
      {videoOpen && current && (() => {
        const [c1, c2] = getColor(current.name);
        return (
          <>
            {/* Gradient border wrapper */}
            <div style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 200,
              padding: 1.5, borderRadius: 22,
              background: `linear-gradient(135deg, ${c1}, ${c2}, rgba(255,255,255,0.15))`,
              boxShadow: `0 32px 80px rgba(0,0,0,0.9), 0 0 60px ${c1}40, 0 0 120px ${c2}20`,
              animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <div style={{
                width: 420, borderRadius: 21, overflow: 'hidden',
                background: 'rgba(8,8,16,0.97)', backdropFilter: 'blur(40px)',
              }}>

                {/* ── Header ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Logo with glow ring */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute', inset: -3, borderRadius: '50%',
                        background: `linear-gradient(135deg,${c1},${c2})`,
                        filter: 'blur(6px)', opacity: playing ? 0.8 : 0.3,
                        transition: 'opacity 0.5s',
                        animation: playing ? 'pulse 2s infinite' : 'none',
                      }} />
                      <div style={{ position: 'relative' }}>
                        <Logo channel={current} size={36} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, color: '#fff', fontSize: 15, letterSpacing: '-0.3px' }}>{current.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: playing ? '#4ade80' : videoLoading ? '#fbbf24' : '#f87171',
                          display: 'inline-block',
                          boxShadow: playing ? '0 0 8px #4ade80' : 'none',
                          animation: playing ? 'pulse 1.5s infinite' : 'none',
                        }} />
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          {videoLoading ? 'Connecting' : playing ? 'Live Now' : 'Paused'}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 900, letterSpacing: '1px',
                          background: `linear-gradient(135deg,${c1},${c2})`,
                          padding: '2px 10px', borderRadius: 99, color: '#fff',
                          textTransform: 'uppercase',
                        }}>TV</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => { const v = videoRef.current; if (v?.requestFullscreen) v.requestFullscreen(); }}
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 9, width: 32, height: 32, cursor: 'pointer', color: '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#9ca3af'; }}
                      title="Fullscreen"
                    ><FaExpand style={{ fontSize: 11 }} /></button>
                    <button
                      onClick={closeVideo}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: 9, width: 32, height: 32, cursor: 'pointer', color: '#f87171',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.08)'; }}
                    ><FaTimes style={{ fontSize: 11 }} /></button>
                  </div>
                </div>

                {/* ── Video ── */}
                <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
                  <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    playsInline autoPlay
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                  />

                  {/* Loading overlay */}
                  {videoLoading && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
                    }}>
                      {/* Concentric rings */}
                      <div style={{ position: 'relative', width: 70, height: 70, marginBottom: 16 }}>
                        <div style={{ position: 'absolute', inset: 0, border: `2px solid ${c1}30`, borderRadius: '50%', animation: 'ping 2s ease-out infinite' }} />
                        <div style={{ position: 'absolute', inset: 8, border: `2px solid ${c1}50`, borderRadius: '50%', animation: 'ping 2s ease-out infinite 0.4s' }} />
                        <div style={{ position: 'absolute', inset: 16, border: `3px solid ${c1}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaTv style={{ color: c1, fontSize: 18 }} />
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 4 }}>Loading Stream</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Connecting to {current.name}...</div>
                    </div>
                  )}

                  {/* Corner live badge */}
                  {playing && !videoLoading && (
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '4px 10px', borderRadius: 99,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', display: 'inline-block', animation: 'pulse 1s infinite', boxShadow: '0 0 8px #f87171' }} />
                      <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>LIVE</span>
                    </div>
                  )}
                </div>

                {/* ── Controls bar ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: 'linear-gradient(0deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                }}>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          width: 3, height: playing ? `${40 + Math.random()*60}%` : '20%',
                          borderRadius: 99, minHeight: 3,
                          background: `linear-gradient(180deg,${c1},${c2})`,
                          transition: 'height 0.3s ease',
                          animation: playing ? `wave${i} 0.8s ease-in-out infinite` : 'none',
                          animationDelay: `${i * 0.1}s`,
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: videoLoading ? '#fbbf24' : playing ? '#4ade80' : '#6b7280', fontWeight: 600 }}>
                      {videoLoading ? 'Buffering...' : playing ? 'Playing' : 'Paused'}
                    </span>
                  </div>

                  {/* Play/Pause */}
                  <button
                    onClick={() => { const v = videoRef.current; if (!v) return; playing ? v.pause() : v.play().catch(() => {}); }}
                    disabled={videoLoading}
                    style={{
                      width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: videoLoading ? 'not-allowed' : 'pointer',
                      background: videoLoading ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${c1},${c2})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: playing && !videoLoading ? `0 0 24px ${c1}60, 0 0 48px ${c1}20` : 'none',
                      transition: 'all 0.3s',
                      transform: 'scale(1)',
                    }}
                    onMouseEnter={e => { if (!videoLoading) e.currentTarget.style.transform='scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
                  >
                    {videoLoading
                      ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      : playing
                        ? <FaPause style={{ color: '#fff', fontSize: 15 }} />
                        : <FaPlay style={{ color: '#fff', fontSize: 15, marginLeft: 2 }} />
                    }
                  </button>

                  {/* Fullscreen shortcut */}
                  <button
                    onClick={() => { const v = videoRef.current; if (v?.requestFullscreen) v.requestFullscreen(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '6px 12px', cursor: 'pointer', color: '#9ca3af',
                      fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='#9ca3af'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
                  >
                    <FaExpand style={{ fontSize: 10 }} /> Full Screen
                  </button>
                </div>

              </div>
            </div>
          </>
        );
      })()}

      {/* ═══ ULTRA PREMIUM BOTTOM PLAYER ════════════════════════════════════ */}
      {current && (() => {
        const [c1, c2] = getColor(current.name);
        return (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', 
            width: 'calc(100% - 48px)', maxWidth: 1100, zIndex: 100,
            background: 'rgba(15, 15, 20, 0.75)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28,
            boxShadow: `0 30px 60px rgba(0,0,0,0.6), 0 0 40px ${c1}15, inset 0 1px 0 rgba(255,255,255,0.15)`,
            padding: '4px',
            animation: 'fadeInUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {/* Progress bar inside floating container */}
            <div style={{ position: 'absolute', top: -1, left: 24, right: 24, height: 2, background: 'transparent', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${livePct}%`,
                background: `linear-gradient(90deg,${c1},${c2})`,
                transition: 'width 1s linear', borderRadius: 99,
                boxShadow: `0 0 10px ${c1}`
              }} />
            </div>

            <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Logo channel={current} size={48} />
                  {playing && (
                    <span style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 12, height: 12, borderRadius: '50%',
                      background: '#4ade80', border: '2px solid #0d0d14',
                    }} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: c1, textTransform: 'uppercase', letterSpacing: 1 }}>Live</span>
                    <WaveBars color={c1} />
                  </div>
                  <div style={{ fontWeight: 900, color: '#fff', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {current.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{current.category}</div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={playShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16, padding: 4 }} title="Shuffle">
                  <FaRandom />
                </button>
                <button onClick={playPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, padding: 4 }}>
                  <FaStepBackward />
                </button>
                <button onClick={() => { playing ? audioRef.current.pause() : audioRef.current.play().catch(()=>{}); setPlaying(p=>!p); }}
                  style={{
                    width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg,${c1},${c2})`,
                    boxShadow: `0 0 24px ${c1}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  {playing
                    ? <FaPause style={{ color: '#fff', fontSize: 18 }} />
                    : <FaPlay style={{ color: '#fff', fontSize: 18, marginLeft: 3 }} />
                  }
                </button>
                <button onClick={playNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, padding: 4 }}>
                  <FaStepForward />
                </button>
              </div>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                <button onClick={() => setMuted(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>
                  {muted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <input type="range" min="0" max="1" step="0.01"
                  value={muted ? 0 : volume}
                  onChange={e => { setVolume(+e.target.value); if (+e.target.value > 0) setMuted(false); }}
                  style={{ width: 100, accentColor: c1 }}
                />
              </div>
            </div>
          </div>
        );
      })()}
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
