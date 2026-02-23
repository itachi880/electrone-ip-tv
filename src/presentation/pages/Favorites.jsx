import React, { useEffect, useState } from 'react';
import { useChannels } from '../hooks/useChannels';

const Favorites = ({ onPlayChannel }) => {
  const { fetchFavorites, toggleFavorite } = useChannels();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const favs = await fetchFavorites();
      setFavorites(favs);
      setLoading(false);
    })();
  }, [fetchFavorites]);

  const handleToggleFav = async (e, channel) => {
    e.stopPropagation();
    const success = await toggleFavorite(channel.id, !channel.is_favorite);
    if (success) {
      setFavorites(prev => prev.filter(c => c.id !== channel.id));
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">My Favorites</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Manage your curated list of channels.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">heart_broken</span>
            <h3 className="text-xl font-bold text-white mb-2">No Favorites Yet</h3>
            <p className="text-slate-400">Head over to the Dashboard to add channels to your favorites.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {favorites.map((channel, i) => (
            <div 
                key={channel.id || i}
                onClick={() => onPlayChannel(channel)} 
                className="group relative aspect-video rounded-xl overflow-hidden bg-surface-dark border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer"
            >
              <div className="absolute inset-0 bg-black flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <span className="material-symbols-outlined text-6xl text-slate-800">live_tv</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
              
              <div className="absolute top-3 right-3 z-10">
                <button 
                    onClick={(e) => handleToggleFav(e, channel)}
                    className="size-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-amber-400 hover:bg-white hover:text-primary transition-colors group/heart"
                >
                  <span className="material-symbols-outlined filled text-[20px] group-hover/heart:hidden text-primary">favorite</span>
                  <span className="material-symbols-outlined text-[20px] hidden group-hover/heart:block">heart_broken</span>
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white font-bold text-lg leading-tight mb-1 truncate">{channel.name}</h3>
                <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
                  {channel.state === 'NO' ? (
                       <span className="text-red-500 font-bold">OFFLINE</span>
                  ) : (
                       <span className="text-green-500 font-bold">ONLINE</span>
                  )}
                  <span className="text-white/60">IPTV</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default Favorites;
