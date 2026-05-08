import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaTv, FaBroadcastTower, FaTimes, FaExpand } from 'react-icons/fa';
import Hls from 'hls.js';

const AudioPlayer = ({ streamUrl, channelName, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mediaRef = useRef(null);
  const hlsRef = useRef(null);

  const isVideo = streamUrl?.includes('.m3u8') || streamUrl?.includes('chunklist') || streamUrl?.includes('/api/stream?url=https%3A%2F%2Ftv');
  const isTV = isVideo;

  useEffect(() => {
    let hls = null;
    const media = mediaRef.current;
    if (!media) return;

    setError(null);
    setLoading(true);
    setIsPlaying(false);

    const onPlay = () => {
      setIsPlaying(true);
      setLoading(false);
    };

    const onError = () => {
      setLoading(false);
      setError('Stream load failed. The channel may be offline or blocked.');
    };

    media.addEventListener('playing', onPlay);
    media.addEventListener('waiting', () => setLoading(true));
    media.addEventListener('canplay', () => setLoading(false));
    media.addEventListener('error', onError);

    if (streamUrl.includes('.m3u8') || streamUrl.includes('/api/stream')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(media);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          media.play().then(() => setIsPlaying(true)).catch(onError);
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) onError();
        });
      } else if (media.canPlayType('application/vnd.apple.mpegurl')) {
        media.src = streamUrl;
        media.addEventListener('loadedmetadata', () => {
          setLoading(false);
          media.play().then(() => setIsPlaying(true)).catch(onError);
        });
      } else {
        setError('HLS not supported in this browser.');
        setLoading(false);
      }
    } else {
      media.src = streamUrl;
      media.play().then(() => setIsPlaying(true)).catch(onError);
    }

    return () => {
      if (hls) hls.destroy();
      if (media) {
        media.pause();
        media.removeAttribute('src');
        media.load();
      }
    };
  }, [streamUrl]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      media.play().then(() => setIsPlaying(true)).catch(() => setError('Playback failed.'));
    }
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const openFullscreen = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.requestFullscreen) media.requestFullscreen();
    else if (media.webkitRequestFullscreen) media.webkitRequestFullscreen();
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10 animate-fade-in-up ${
        isTV ? 'w-96' : 'w-80'
      }`}
      style={{ background: 'rgba(15,15,25,0.97)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying && !error ? 'bg-green-400 animate-pulse' : error ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}`} />
          {isTV
            ? <FaTv className="text-red-400 text-sm" />
            : <FaBroadcastTower className="text-primary-400 text-sm" />
          }
          <span className="text-sm font-semibold text-white truncate max-w-[180px]">
            {channelName || (isTV ? 'TV Channel' : 'Radio')}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isTV ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {isTV ? 'TV' : 'LIVE'}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
          <FaTimes />
        </button>
      </div>

      {/* Video area (TV only) */}
      {isTV && (
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          <video
            ref={mediaRef}
            className="w-full h-full object-contain"
            playsInline
            autoPlay
            muted={isMuted}
          />
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs text-gray-400">Loading stream...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
              <FaTv className="text-red-500 text-3xl mb-2 opacity-50" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
          {/* Fullscreen btn */}
          {!error && (
            <button
              onClick={openFullscreen}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded transition-colors"
            >
              <FaExpand className="text-xs" />
            </button>
          )}
        </div>
      )}

      {/* Audio element (Radio only) */}
      {!isTV && (
        <audio
          ref={mediaRef}
          src={streamUrl}
          preload="none"
          autoPlay
        />
      )}

      {/* Error for audio */}
      {!isTV && error && (
        <div className="mx-4 my-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2 rounded">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-xs text-gray-500 truncate max-w-[180px]" title={streamUrl}>
          {loading && !error ? 'Connecting...' : error ? 'Offline' : isPlaying ? '▶ Playing' : '⏸ Paused'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FaVolumeMute className="text-sm" /> : <FaVolumeUp className="text-sm" />}
          </button>
          <button
            onClick={togglePlay}
            disabled={!!error}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
              isTV
                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30'
                : 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/30'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isPlaying ? <FaPause className="text-xs" /> : <FaPlay className="text-xs ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
