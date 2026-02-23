import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useChannels } from '../hooks/useChannels';

const PlayerPage = ({ channel, onBack }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [searchSidebar, setSearchSidebar] = useState("");
  
  const { channels, toggleFavorite } = useChannels(50); // Get some channels for sidebar
  
  useEffect(() => {
    if (!channel || !channel.link || !videoRef.current) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          if (channel.referer) xhr.setRequestHeader("from", channel.referer);
        },
        maxMaxBufferLength: 15, // buffer optimization
      });
      hlsRef.current = hls;

      hls.loadSource(channel.link);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setQualities(data.levels);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });

      return () => {
        if (hlsRef.current) hlsRef.current.destroy();
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = channel.link;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [channel]);

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

  const toggleFav = async () => {
     await toggleFavorite(channel.id, !channel.is_favorite);
     channel.is_favorite = !channel.is_favorite; // Optimistic update
  };
  
  const filteredNavChannels = channels.filter(c => c.name.toLowerCase().includes(searchSidebar.toLowerCase()));

  return (
    <div ref={containerRef} className="w-full h-full relative selection:bg-primary/30 bg-black flex overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col relative">
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                 <video ref={videoRef} className="w-full h-full object-contain" onClick={togglePlay} />
            </div>
            
            <div className="absolute inset-0 video-overlay-gradient pointer-events-none z-0"></div>

            {/* Top Bar */}
            <header className="relative z-10 flex items-start justify-between w-full pointer-events-none p-6 shrink-0">
                <button 
                  onClick={onBack}
                  className="pointer-events-auto flex items-center gap-3 glass-panel rounded-full pl-1.5 pr-4 py-1.5 hover:bg-white/5 transition-all duration-200 group/back"
                >
                    <div className="flex items-center justify-center bg-white/10 rounded-full w-8 h-8 group-hover/back:bg-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px] text-white">arrow_back</span>
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-slate-200">Back</span>
                </button>
                
                <div className="flex flex-col items-end pointer-events-auto">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-bold text-white drop-shadow-md tracking-tight">{channel.name}</h1>
                        <div className="flex items-center gap-1.5 bg-red-500/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full shadow-lg shadow-red-900/20 border border-white/10 cursor-pointer">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="flex-1 shrink flex min-h-0 pointer-events-none"></div>

            {/* Bottom Controls */}
            <div className="w-full flex justify-center mb-6 pointer-events-none z-10 shrink-0 px-6">
                <div className="w-full max-w-4xl glass-panel rounded-3xl p-4 pointer-events-auto shadow-2xl">
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
                            <button className="glass-button px-3 py-1.5 rounded-lg text-slate-200 hover:text-white flex items-center gap-2" title="Quality">
                                <span className="text-xs font-bold">{currentQuality}</span>
                                <span className="material-symbols-outlined text-[16px]">hd</span>
                            </button>
                            <button onClick={toggleFullscreen} className="glass-button p-2 rounded-lg text-slate-200 hover:text-white" title="Fullscreen">
                                <span className="material-symbols-outlined text-[20px]">fullscreen</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Channels Sidebar Right */}
        <aside className="w-64 glass-sidebar z-30 flex flex-col shadow-2xl shrink-0 h-full border-l border-white/5 bg-[#0a0a0f]/80 backdrop-blur-3xl">
            <div className="p-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-sm tracking-wide uppercase opacity-80">Channels</h2>
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input 
                        value={searchSidebar}
                        onChange={(e) => setSearchSidebar(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none" 
                        placeholder="Find channel..." 
                        type="text"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-0">
                {filteredNavChannels.map(navCh => (
                    <div 
                        key={navCh.id} 
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all group ${
                            navCh.id === channel.id 
                            ? 'bg-white/10 border-white/10 shadow-lg' 
                            : 'bg-transparent border-transparent hover:border-white/5 hover:bg-white/5'
                        }`}
                        onClick={() => {
                            if(navCh.id !== channel.id) {
                                // For now, just a placeholder as reloading involves passing state up.
                                // In a full app, we'd trigger onPlayChannel(navCh) from parent to remount PlayerPage.
                                alert("Routing logic handling for side-channel not implemented without parent context callback. For now, navigate back to dash");
                            }
                        }}
                    >
                        <div className={`w-8 h-8 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
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
                                <p className="text-[10px] text-slate-500 truncate">IPTV</p>
                            </div>
                        </div>
                        {navCh.id === channel.id && (
                             <div className="flex flex-col gap-0.5">
                                <span className="w-0.5 h-0.5 bg-white/50 rounded-full"></span>
                                <span className="w-0.5 h-0.5 bg-white/50 rounded-full"></span>
                                <span className="w-0.5 h-0.5 bg-white/50 rounded-full"></span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Preferences Button */}
            <div className="p-3 border-t border-white/5 bg-black/20 shrink-0">
                <button className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Preferences</span>
                </button>
            </div>
        </aside>
    </div>
  );
};

export default PlayerPage;
