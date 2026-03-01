import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { useChannels } from '../hooks/useChannels';
import toast from 'react-hot-toast';
import ChannelEditorModal from '../components/ChannelEditorModal';

const PlayerPage = ({ channel, onBack, onPlayChannel }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [volume, setVolume] = useState(1);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [searchSidebar, setSearchSidebar] = useState("");
  
  // New State variables
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [editingChannel, setEditingChannel] = useState(null);
  const controlsTimeoutRef = useRef(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(null);
  const [dvrBufferConfig, setDvrBufferConfig] = useState(15);
  const [isLiveLive, setIsLiveLive] = useState(true);

  const { channels, playlists, toggleFavorite, loadMore, hasMore, handleSearch, loading: loadingChannels, editChannel, removeChannel } = useChannels(25); // Get channels for sidebar
  
  useEffect(() => {
    // Load config
    const savedBuffer = localStorage.getItem('dvrBufferLength');
    if (savedBuffer) {
        setDvrBufferConfig(parseInt(savedBuffer, 10));
    }

    if (!channel || !videoRef.current) return;
    
    if (!channel.link) {
      setError("No stream link available.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          if (channel.referer) xhr.setRequestHeader("from", channel.referer);
          if (channel.user_agent) xhr.setRequestHeader("x-user-agent", channel.user_agent);
        },
        maxMaxBufferLength: dvrBufferConfig, // configurable buffer
        backBufferLength: dvrBufferConfig, // Use same value for back buffer
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(channel.link);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Prepare human-readable qualities
        const availableQualities = data.levels.map((level, index) => {
            const h = level.height || 0;
            let resLabel = h ? `${h}p` : 'Unknown';
            if (h >= 2160) resLabel = '4K';
            
            let bitrateLabel = '';
            if (level.bitrate) {
                if (level.bitrate >= 1000000) {
                    bitrateLabel = `${(level.bitrate / 1000000).toFixed(1)} mb/s`;
                } else {
                    bitrateLabel = `${Math.round(level.bitrate / 1000)} kb/s`;
                }
            }

            const label = bitrateLabel ? `${resLabel} (${bitrateLabel})` : resLabel;
            return { index, label, height: h, bitrate: level.bitrate || 0, resLabel };
        });
        
        // Sort descending by height
        availableQualities.sort((a, b) => b.height - a.height);
        setQualities(availableQualities);
        
        setIsLoading(false);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
         if (hls.autoLevelEnabled) {
             setCurrentQuality(-1);
         } else {
             setCurrentQuality(data.level);
         }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS Error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Network error: Failed to fetch stream.");
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Media error: Failed to decode stream.");
              hls.recoverMediaError();
              break;
            default:
              setError(`Fatal error: ${data.details}`);
              hls.destroy();
              break;
          }
          setIsLoading(false);
        }
      });

      return () => {
        if (hlsRef.current) hlsRef.current.destroy();
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = channel.link;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setError("Playback failed.");
          setIsLoading(false);
        });
    } else {
      setError("HLS is not supported in this browser.");
      setIsLoading(false);
    }
  }, [channel, retryCount, dvrBufferConfig]);

  // Fullscreen Detection
  useEffect(() => {
      const handleFullscreenChange = () => {
          const isFs = !!document.fullscreenElement;
          setIsFullscreen(isFs);
          if (isFs) {
              setShowSidebar(false);
          } else {
              setShowSidebar(true);
          }
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      
      if (isFullscreen) {
          controlsTimeoutRef.current = setTimeout(() => {
              if (isPlaying) {
                  setShowControls(false);
                  setShowQualityMenu(false);
              }
          }, 3500); // Hide after 3.5s of inactivity
      }
  };

  useEffect(() => {
      handleMouseMove();
      return () => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
  }, [isFullscreen, isPlaying]);

  // Time tracking for timeline
  useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
          setCurrentTime(video.currentTime);
          setDuration(video.duration);
          if (video.buffered.length > 0) {
              const bStart = video.buffered.start(0);
              const bEnd = video.buffered.end(video.buffered.length - 1);
              setBuffered({ start: bStart, end: bEnd });
              
              // Indicate live if within 5 seconds of the live edge
              setIsLiveLive(video.currentTime >= bEnd - 5);
          }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
        videoRef.current.volume = vol;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const handleQualityChange = (levelIndex) => {
      if (hlsRef.current) {
          hlsRef.current.currentLevel = levelIndex; // -1 for auto
          setCurrentQuality(levelIndex);
          setShowQualityMenu(false);
      }
  };

  const jumpToLive = () => {
      if (videoRef.current && buffered) {
          videoRef.current.currentTime = buffered.end;
      }
  };

  const handleSeek = (e) => {
      if (!videoRef.current || !buffered) return;
      
      const seekRatio = parseFloat(e.target.value) / 100;
      const seekableStart = buffered.start;
      const seekableEnd = buffered.end;
      const targetTime = seekableStart + (seekableEnd - seekableStart) * seekRatio;
      
      videoRef.current.currentTime = targetTime;
  };

  const toggleFav = async () => {
     await toggleFavorite(channel.id, !channel.is_favorite);
     channel.is_favorite = !channel.is_favorite; // Optimistic update
  };

  const handleScroll = (e) => {
      const { scrollTop, clientHeight, scrollHeight } = e.target;
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !loadingChannels) {
          loadMore();
      }
  };

  const onSearchChange = (e) => {
      const val = e.target.value;
      setSearchSidebar(val);
      handleSearch(val);
  };

  const controlsVisible = !(isFullscreen && !showControls);

  const memoizedChannelList = useMemo(() => {
      return channels
          .filter(c => c.name.toLowerCase().includes(searchSidebar.toLowerCase()))
          .map(navCh => (
              <div 
                  key={navCh.id} 
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all group ${
                      navCh.id === channel.id 
                      ? 'bg-white/10 border-white/10 shadow-lg' 
                      : 'bg-transparent border-transparent hover:border-white/5 hover:bg-white/5'
                  }`}
                  onClick={() => {
                      if(navCh.id !== channel.id && onPlayChannel) {
                          onPlayChannel(navCh);
                      }
                  }}
              >
                  <div className={`w-8 h-8 rounded flex items-center justify-center border shrink-0 transition-colors ${
                       navCh.id === channel.id 
                       ? 'bg-primary/20 border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                       : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/20'
                  }`}>
                      <span className="material-symbols-outlined text-white text-[18px]">live_tv</span>
                  </div>
                  <div className="min-w-0 flex-1">
                      <h4 className={`text-xs font-bold truncate transition-colors ${navCh.id === channel.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                          {navCh.name}
                      </h4>
                      <div className="flex items-center gap-1.5">
                          {navCh.state === 'NO' ? (
                              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                          ) : (
                              <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                          )}
                          <p className={`text-[10px] truncate ${navCh.id === channel.id ? 'text-slate-300' : 'text-slate-500'}`}>
                              {navCh.playlist || 'IPTV Stream'}
                          </p>
                      </div>
                  </div>
                  
                  {/* Three-dotted Edit button */}
                  <div className="relative group/menu flex items-center justify-center">
                      <button 
                          onClick={(e) => { e.stopPropagation(); setEditingChannel(navCh); }}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 ${navCh.id === channel.id ? 'opacity-100 hover:bg-white/20' : ''}`}
                          title="Edit Channel"
                      >
                          <div className="flex flex-col gap-0.5 pointer-events-none">
                              <span className="w-1 h-1 bg-slate-400 group-hover/menu:bg-white rounded-full transition-colors"></span>
                              <span className="w-1 h-1 bg-slate-400 group-hover/menu:bg-white rounded-full transition-colors"></span>
                              <span className="w-1 h-1 bg-slate-400 group-hover/menu:bg-white rounded-full transition-colors"></span>
                          </div>
                      </button>
                  </div>
              </div>
          ));
  }, [channels, searchSidebar, channel.id, onPlayChannel]);

  return (
    <div 
        ref={containerRef} 
        className={`w-full h-full relative selection:bg-primary/30 bg-black flex overflow-hidden ${!controlsVisible ? 'cursor-none' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isFullscreen && isPlaying && setShowControls(false)}
    >
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col relative">
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                 <video ref={videoRef} className="w-full h-full object-contain" onClick={togglePlay} />
                 
                 {isLoading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-medium animate-pulse">Loading Stream...</p>
                    </div>
                 )}

                 {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20 p-6 text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
                        </div>
                        <h3 className="text-white text-xl font-bold mb-2">Internal Player Error</h3>
                        <p className="text-slate-400 max-w-md mb-6">{error}</p>
                        <button 
                            onClick={() => setRetryCount(prev => prev + 1)} 
                            className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            Retry Loading
                        </button>
                    </div>
                 )}
            </div>
            
            <div className="absolute inset-0 video-overlay-gradient pointer-events-none z-0"></div>

            {/* Top Bar */}
            <header className={`relative z-10 flex items-start justify-between w-full pointer-events-none p-6 shrink-0 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                <button 
                  onClick={onBack}
                  className={`${controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'} flex items-center gap-3 glass-panel rounded-full pl-1.5 pr-4 py-1.5 hover:bg-white/5 transition-all duration-200 group/back`}
                >
                    <div className="flex items-center justify-center bg-white/10 rounded-full w-8 h-8 group-hover/back:bg-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px] text-white">arrow_back</span>
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-slate-200">Back</span>
                </button>
                
                <div className={`flex flex-col items-end ${controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-bold text-white drop-shadow-md tracking-tight">{channel.name}</h1>
                        
                        {/* Live Indicator Sync Button (Top Right) */}
                        <button 
                            onClick={jumpToLive}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                                isLiveLive 
                                ? 'bg-red-500/80 border-red-500/50 shadow-lg shadow-red-900/20 text-white cursor-default' 
                                : 'bg-black/50 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer pointer-events-auto'
                            }`}
                            title={isLiveLive ? "Playing at Live Edge" : "Jump to Live Edge"}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isLiveLive ? 'bg-white animate-pulse' : 'bg-slate-500'}`}></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Live</span>
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="flex-1 shrink flex min-h-0 pointer-events-none"></div>

            {/* Bottom Controls */}
            <div className={`w-full flex justify-center mb-6 pointer-events-none z-10 shrink-0 px-6 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`w-full max-w-4xl glass-panel rounded-3xl p-4 ${controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'} shadow-2xl`}>
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <button className="text-slate-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                                <span className="material-symbols-outlined text-[24px]">skip_previous</span>
                            </button>
                            <button 
                                onClick={togglePlay}
                                className="flex items-center justify-center w-10 h-10 bg-white text-black rounded-full hover:bg-slate-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                            >
                                <span className="material-symbols-outlined text-[24px] filled font-variation-settings-'FILL':1">
                                    {isPlaying ? 'pause' : 'play_arrow'}
                                </span>
                            </button>
                            <button className="text-slate-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                                <span className="material-symbols-outlined text-[24px]">skip_next</span>
                            </button>
                            
                            <div className="flex items-center gap-2 group/volume ml-2">
                                <span className="material-symbols-outlined text-[20px] text-slate-300">volume_up</span>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-16 h-1 bg-white/20 rounded-full cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={toggleFav}
                                className="glass-button p-2 rounded-lg text-slate-200 hover:text-red-500" title="Favorite">
                                <span className={`material-symbols-outlined text-[20px] ${channel.is_favorite ? 'filled text-red-500' : ''}`}>favorite</span>
                            </button>
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                                    className="glass-button px-3 py-1.5 rounded-lg text-slate-200 hover:text-white flex items-center gap-2" 
                                    title="Quality"
                                >
                                    <span className="text-xs font-bold whitespace-nowrap">
                                        {currentQuality === -1 ? 'Auto' : qualities.find(q => q.index === currentQuality)?.resLabel || 'Auto'}
                                    </span>
                                    <span className="material-symbols-outlined text-[16px]">hd</span>
                                </button>
                                
                                {showQualityMenu && qualities.length > 0 && (
                                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-[#0a0a0f]/90 backdrop-blur-3xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                                        <button 
                                            onClick={() => handleQualityChange(-1)}
                                            className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${currentQuality === -1 ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10'}`}
                                        >
                                            Auto
                                        </button>
                                        {qualities.map(q => (
                                            <button 
                                                key={q.index}
                                                onClick={() => handleQualityChange(q.index)}
                                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${currentQuality === q.index ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10'}`}
                                            >
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={toggleFullscreen} className="glass-button p-2 rounded-lg text-slate-200 hover:text-white" title="Fullscreen">
                                <span className="material-symbols-outlined text-[20px]">fullscreen</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Seamless DVR Timeline */}
                    {buffered && (
                        <div className="mt-3 px-2 group/timeline">
                            <div className="relative w-full h-1.5 bg-white/10 rounded-full flex items-center cursor-pointer">
                                {/* Buffered Area */}
                                <div 
                                    className="absolute h-full bg-white/20 rounded-full"
                                    style={{ 
                                        left: '0%', 
                                        width: '100%' 
                                    }}
                                />
                                {/* Current Position Indicator */}
                                <div 
                                    className="absolute h-full bg-primary rounded-full z-10"
                                    style={{ 
                                        width: `${Math.max(0, Math.min(100, ((currentTime - buffered.start) / (buffered.end - buffered.start)) * 100))}%` 
                                    }}
                                >
                                    {/* Handle */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/timeline:opacity-100 transition-opacity" />
                                </div>
                                {/* Invisible Range Input for sweeping */}
                                <input 
                                    type="range" 
                                    min="0" max="100" step="0.1"
                                    value={Math.max(0, Math.min(100, ((currentTime - buffered.start) / (buffered.end - buffered.start)) * 100)) || 100}
                                    onChange={handleSeek}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                                    title="Seek backward in buffer"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium px-0.5">
                                <span>-{Math.round(buffered.end - buffered.start)}s</span>
                                <span>Live</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Fullscreen Hover Detect Zone (Right Edge) */}
        {isFullscreen && !showSidebar && (
            <div 
                className="absolute top-0 right-0 w-8 h-full z-20"
                onMouseEnter={() => setShowSidebar(true)}
            />
        )}

        {/* Channels Sidebar Right */}
        <aside 
            className={`w-64 glass-sidebar z-30 flex flex-col shadow-2xl shrink-0 h-full border-l border-white/5 bg-[#0a0a0f]/80 backdrop-blur-3xl transition-transform duration-300 ease-in-out ${
                isFullscreen && !showSidebar ? 'translate-x-full fixed right-0 top-0 bottom-0' : 'translate-x-0 relative'
            } ${isFullscreen ? 'fixed right-0 top-0 bottom-0' : ''}`}
            onMouseLeave={() => {
                if (isFullscreen) {
                    setShowSidebar(false);
                }
            }}
        >
            <div className="p-5 border-b border-white/5 bg-linear-to-b from-white/5 to-transparent shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-sm tracking-wide uppercase opacity-80">Channels</h2>
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input 
                        value={searchSidebar}
                        onChange={onSearchChange}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none" 
                        placeholder="Find channel..." 
                        type="text"
                    />
                </div>
            </div>
            
            <div 
                className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-0 relative"
                onScroll={handleScroll}
            >
                {memoizedChannelList}
                
                {loadingChannels && (
                    <div className="flex justify-center p-4">
                        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
            
            {/* Preferences Button */}
            <div className="p-3 border-t border-white/5 bg-black/20 shrink-0">
                <button className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Preferences</span>
                </button>
            </div>
        </aside>

        {editingChannel && (
            <ChannelEditorModal 
                channel={editingChannel} 
                playlists={playlists}
                onClose={() => setEditingChannel(null)} 
                onSave={async (id, updates) => {
                    const success = await editChannel(id, updates);
                    if (success) {
                        toast.success(`Channel "${updates.name}" updated`);
                        setEditingChannel(null);
                        if (id === channel.id) {
                            // Reflect the name dynamically if playing channel was edited
                            channel.name = updates.name;
                        }
                    } else {
                        toast.error('Failed to update channel');
                    }
                }}
                onDelete={async (id) => {
                    const success = await removeChannel(id);
                    if (success) {
                        toast.success('Channel deleted');
                        setEditingChannel(null);
                        if (id === channel.id) {
                            onBack(); // close player if playing deleted channel
                        }
                    } else {
                        toast.error('Failed to delete channel');
                    }
                }}
            />
        )}
    </div>
  );
};

export default PlayerPage;
