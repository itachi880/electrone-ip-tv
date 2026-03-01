import React, { useState, useEffect } from 'react';

const ChannelEditorModal = ({ channel, playlists = [], onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: '',
        link: '',
        playlist: '',
        user_agent: '',
        referer: ''
    });

    useEffect(() => {
        if (channel) {
            setFormData({
                name: channel.name || '',
                link: channel.link || '',
                playlist: channel.playlist || '',
                user_agent: channel.user_agent || '',
                referer: channel.referer || ''
            });
        }
    }, [channel]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(channel.id, formData);
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this channel?')) {
            onDelete(channel.id);
        }
    };

    if (!channel) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0b0b15] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in">
                <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-surface-dark">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">edit_square</span>
                        Edit Channel
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-300">Channel Name <span className="text-red-500">*</span></label>
                        <input 
                            required 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            placeholder="e.g. BEIN Sports 1"
                            className="bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm" 
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-300">Stream URL <span className="text-red-500">*</span></label>
                        <input 
                            required 
                            name="link" 
                            value={formData.link} 
                            onChange={handleChange} 
                            placeholder="https://..."
                            className="bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm font-mono" 
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-300">Playlist Group</label>
                        <div className="relative">
                            <input 
                                name="playlist" 
                                list="playlist-options"
                                value={formData.playlist} 
                                onChange={handleChange} 
                                placeholder="Type or select a playlist"
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm" 
                            />
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                                library_add
                            </span>
                            <datalist id="playlist-options">
                                {playlists.map((pl, idx) => (
                                    <option key={idx} value={pl} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400">User Agent</label>
                            <input 
                                name="user_agent" 
                                value={formData.user_agent} 
                                onChange={handleChange} 
                                placeholder="Mozilla/5.0..."
                                className="bg-black/50 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all text-xs" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400">Referer</label>
                            <input 
                                name="referer" 
                                value={formData.referer} 
                                onChange={handleChange} 
                                placeholder="https://..."
                                className="bg-black/50 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all text-xs" 
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-800 mt-4 pt-5 flex justify-between items-center">
                        <button 
                            type="button" 
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-4 py-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors font-medium text-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Delete
                        </button>
                        
                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-5 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl transition-colors shadow-lg shadow-primary/20 font-bold text-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChannelEditorModal;
