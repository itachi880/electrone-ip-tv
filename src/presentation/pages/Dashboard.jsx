import React, { useRef, useState } from 'react';
import { useChannels } from '../hooks/useChannels';
import ChannelEditorModal from '../components/ChannelEditorModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';

const Dashboard = ({ onPlayChannel }) => {
  const fileInputRef = useRef(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const { 
    channels, 
    loading, 
    hasMore, 
    searchQuery, 
    playlists,
    activePlaylist,
    loadMore, 
    handleSearch,
    handlePlaylistChange,
    addPlaylist,
    removePlaylist,
    uploadFile,
    uploadProgress,
    uploadStarted,
    editChannel,
    removeChannel
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
          
          {/* Actions */}
          <div className="flex gap-3">
              <button 
                onClick={() => setIsCreatingPlaylist(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-slate-700 text-slate-300 rounded-xl hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[20px]">playlist_add</span>
                New Playlist
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                Upload M3U
              </button>
          </div>
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
        {uploadStarted && (
          <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">
                    {uploadProgress.total > 0 ? 'Importing Channels...' : 'Preparing Playlist...'}
                  </h4>
                  <p className="text-slate-500 text-xs truncate max-w-[200px]">
                    {uploadProgress.total > 0 
                      ? `Now importing: ${uploadProgress.channelName || '...'}` 
                      : 'Parsing file content'}
                  </p>
                </div>
              </div>
              <span className="text-primary font-bold text-sm">
                {uploadProgress.total > 0 
                  ? `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` 
                  : '...'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`bg-primary h-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)] ${uploadProgress.total === 0 ? 'w-1/4 animate-pulse' : ''}`} 
                style={uploadProgress.total > 0 ? { width: `${(uploadProgress.current / uploadProgress.total) * 100}%` } : {}}
              ></div>
            </div>
            {uploadProgress.total > 0 && (
              <div className="mt-2 text-[10px] text-slate-500 text-right font-mono tracking-tighter uppercase">
                {uploadProgress.current} / {uploadProgress.total} Channels Processed
              </div>
            )}
          </div>
        )}

        {loading && channels.length === 0 && !uploadStarted && (
          <div className="flex h-64 items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Playlists Filter Bar */}
        <div className="mb-6 overflow-x-auto no-scrollbar pb-2">
            <div className="flex items-center gap-2 w-max">
                <button 
                    onClick={() => handlePlaylistChange(null)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 ${activePlaylist === null ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-surface-dark text-slate-400 hover:text-white hover:bg-surface-hover border border-slate-800'}`}
                >
                    All Channels
                </button>
                {playlists.map((pl, idx) => (
                    <div 
                        key={idx}
                        className={`flex items-center rounded-full transition-all shrink-0 ${activePlaylist === pl ? 'bg-primary text-white shadow-lg shadow-primary/25 pr-1.5' : 'bg-surface-dark text-slate-400 hover:text-white hover:bg-surface-hover border border-slate-800'}`}
                    >
                        <button 
                            onClick={() => handlePlaylistChange(pl)}
                            className={`px-4 py-1.5 text-sm font-medium ${activePlaylist === pl ? '' : ''}`}
                        >
                            {pl}
                        </button>
                        {activePlaylist === pl && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if(window.confirm(`Are you sure you want to delete the playlist "${pl}"?`)) {
                                        removePlaylist(pl);
                                    }
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                                title="Delete Playlist"
                            >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">local_fire_department</span>
              {activePlaylist ? activePlaylist : "All Channels"}
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
                <h4 className="text-white font-medium text-sm truncate group-hover:text-primary transition-colors pr-6" title={channel.name}>
                    {channel.name}
                </h4>
                <div className="text-slate-500 text-xs mt-1 flex items-center justify-between">
                    <span className="truncate">{channel.playlist || 'IPTV Stream'}</span>
                    {channel.state === 'OK' && <span className="w-2 h-2 bg-green-500 rounded-full shrink-0 ml-2"></span>}
                </div>

                {/* Edit Button overlay */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setEditingChannel(channel); }}
                    className="absolute bottom-3 right-3 p-1.5 bg-black/60 hover:bg-primary text-slate-300 hover:text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-slate-700 hover:border-transparent z-10"
                    title="Edit Channel"
                >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
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

      {editingChannel && (
          <ChannelEditorModal 
              channel={editingChannel} 
              playlists={playlists}
              onClose={() => setEditingChannel(null)} 
              onSave={async (id, updates) => {
                  await editChannel(id, updates);
                  setEditingChannel(null);
                  if (activePlaylist && updates.playlist !== activePlaylist && activePlaylist !== null) {
                      handlePlaylistChange(activePlaylist);
                  }
              }}
              onDelete={async (id) => {
                  await removeChannel(id);
                  setEditingChannel(null);
              }}
          />
      )}

      {isCreatingPlaylist && (
          <CreatePlaylistModal 
              onClose={() => setIsCreatingPlaylist(false)}
              onCreate={addPlaylist}
          />
      )}
    </main>
  );
};

export default Dashboard;
