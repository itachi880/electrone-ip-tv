import React, { useState } from 'react';
import toast from 'react-hot-toast';

const CreatePlaylistModal = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Playlist name cannot be empty.');
            return;
        }

        const success = await onCreate(trimmedName);
        if (success) {
            toast.success(`Playlist "${trimmedName}" created`);
            onClose();
        } else {
            setError('Failed to create playlist. It may already exist.');
            toast.error('Failed to create playlist');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0b0b15] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col scale-in">
                <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-surface-dark">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">playlist_add</span>
                        New Playlist
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-300">Playlist Name <span className="text-red-500">*</span></label>
                        <input 
                            required 
                            autoFocus
                            value={name} 
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            placeholder="e.g. Documentary"
                            className={`bg-black/50 border ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50' : 'border-slate-700 focus:border-primary/50 focus:ring-primary/50'} rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm`} 
                        />
                        {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
                    </div>
                    
                    <div className="mt-2 flex gap-3 flex-row-reverse">
                        <button 
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 py-2.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary rounded-xl transition-colors shadow-lg shadow-primary/20 font-bold text-sm"
                        >
                            Create
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePlaylistModal;
