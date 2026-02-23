import React, { useRef } from 'react';
import { useChannels } from '../hooks/useChannels';

const Dashboard = ({ onPlayChannel }) => {
  const fileInputRef = useRef(null);
  const { 
    channels, 
    loading, 
    hasMore, 
    searchQuery, 
    loadMore, 
    handleSearch, 
    uploadFile 
  } = useChannels();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      await uploadFile(event.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden relative">
      <header className="h-20 px-8 flex items-center justify-between shrink-0 glass-effect sticky top-0 z-30 border-b border-slate-800/30">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white tracking-tight">Home Dashboard</h2>
          <p className="text-sm text-slate-400">Discover your favorite content</p>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="relative group w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-500 group-focus-within:text-primary transition-colors">search</span>
            </div>
            <input 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl leading-5 bg-surface-dark text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 sm:text-sm transition-all" 
              placeholder="Search channels..." 
              type="text"
            />
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            Upload M3U
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".m3u,.m3u8"
            onChange={handleFileUpload}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth no-scrollbar">
        {loading && channels.length === 0 && (
          <div className="flex h-64 items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">local_fire_department</span>
              All Channels
            </h3>
            {loading && channels.length > 0 && <span className="text-xs text-primary animate-pulse">Loading...</span>}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {channels.map((channel, i) => (
              <div 
                key={channel.id || i} 
                className="group cursor-pointer bg-surface-dark rounded-xl p-3 border border-slate-800/50 hover:border-primary/50 transition-all card-zoom"
                onClick={() => onPlayChannel(channel)}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-4xl text-slate-700 group-hover:text-primary transition-colors">live_tv</span>
                    {channel.state === 'NO' && (
                        <div className="absolute top-2 right-2 bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">OFFLINE</div>
                    )}
                </div>
                <h4 className="text-white font-medium text-sm truncate group-hover:text-primary transition-colors" title={channel.name}>
                    {channel.name}
                </h4>
                <div className="text-slate-500 text-xs mt-1 flex items-center justify-between">
                    <span>IPTV Stream</span>
                    {channel.state === 'OK' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                </div>
              </div>
            ))}
          </div>

          {hasMore && !searchQuery && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-surface-dark hover:bg-surface-hover border border-slate-700 rounded-full text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Context'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
