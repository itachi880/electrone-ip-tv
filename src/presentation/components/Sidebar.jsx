import React from 'react';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  return (
    <aside className="w-64 h-full flex flex-col bg-[#0b0b15] border-r border-slate-800/50 flex-shrink-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-lg">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>stream</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-white text-lg font-bold leading-none tracking-tight">StreamFlow</h1>
          <p className="text-slate-500 text-xs font-medium mt-1">Premium IPTV</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
        
        <button 
          onClick={() => setCurrentPage('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            currentPage === 'dashboard' 
              ? 'bg-primary text-white shadow-lg shadow-primary/25' 
              : 'text-slate-400 hover:bg-surface-hover hover:text-white group'
          }`}
        >
          <span className={`material-symbols-outlined ${currentPage !== 'dashboard' && 'group-hover:text-primary transition-colors'}`}>home</span>
          <span className="text-sm font-medium">Home</span>
        </button>
        
        <div className="my-4 border-t border-slate-800/50"></div>
        
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Library</p>
        
        <button 
          onClick={() => setCurrentPage('favorites')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            currentPage === 'favorites' 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'text-slate-400 hover:bg-surface-hover hover:text-white group'
          }`}
        >
          <span className={`material-symbols-outlined ${currentPage !== 'favorites' && 'group-hover:text-primary transition-colors'}`}>favorite</span>
          <span className="text-sm font-medium">Favorites</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-800/50">
        <button 
          onClick={() => setCurrentPage('settings')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-surface-hover hover:text-white transition-colors group mb-2"
        >
          <span className="material-symbols-outlined group-hover:text-primary transition-colors">settings</span>
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
