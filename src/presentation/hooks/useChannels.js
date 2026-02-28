import { useState, useCallback, useEffect, useRef } from 'react';
import ChannelService from '../../core/services/ChannelService';

export function useChannels(initialLimit = 20) {
    const [channels, setChannels] = useState([]);
    const [displayedChannels, setDisplayedChannels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [playlists, setPlaylists] = useState([]);
    const [activePlaylist, setActivePlaylist] = useState(null); // null means "All"
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, channelName: '' });
    const [uploadStarted, setUploadStarted] = useState(false);
    const loadingRef = useRef(false);
    const channelsRef = useRef([]);

    useEffect(() => {
        channelsRef.current = channels;
    }, [channels]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingRef.current || searchQuery) return;

        loadingRef.current = true;
        setLoading(true);

        let newChannels = [];
        if (activePlaylist) {
            newChannels = await ChannelService.getChannelsByPlaylist(activePlaylist, initialLimit, offset);
        } else {
            newChannels = await ChannelService.getPaginatedChannels(initialLimit, offset);
        }

        if (newChannels.length === 0) {
            setHasMore(false);
        } else {
            setChannels(prev => [...prev, ...newChannels]);
            if (!searchQuery) {
                setDisplayedChannels(prev => [...prev, ...newChannels]);
            }
            if (newChannels.length < initialLimit) {
                setHasMore(false);
            }
            setOffset(prev => prev + initialLimit);
        }
        loadingRef.current = false;
        setLoading(false);
    }, [hasMore, offset, initialLimit, searchQuery, activePlaylist]);

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    // Debounced search logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setDisplayedChannels(channelsRef.current);
                return;
            }

            setLoading(true);
            const dbResults = await ChannelService.searchChannels(searchQuery);
            setDisplayedChannels(dbResults);

            setChannels(prev => {
                const newItems = dbResults.filter(r => !prev.some(p => p.id === r.id));
                if (newItems.length === 0) return prev;
                return [...prev, ...newItems];
            });
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const uploadFile = useCallback(async (fileContent) => {
        setLoading(true);
        setUploadStarted(true);
        setUploadProgress({ current: 0, total: 0, channelName: '' });

        const newChannels = await ChannelService.uploadChannelsFile(fileContent);

        // We do NOT clear state here instantly because the background task might still be broadcasting
        // The background task sends `isComplete: true` which will be caught by the global listener
        return newChannels.length;
    }, []);

    const fetchPlaylists = useCallback(async () => {
        const dbPlaylists = await ChannelService.getPlaylists();
        setPlaylists(dbPlaylists);
    }, []);

    const handlePlaylistChange = useCallback((playlist) => {
        setActivePlaylist(playlist);
        setChannels([]);
        setDisplayedChannels([]);
        setOffset(0);
        setHasMore(true);
        setSearchQuery('');
    }, []);

    const addPlaylist = useCallback(async (name) => {
        const success = await ChannelService.createPlaylist(name);
        if (success) {
            await fetchPlaylists();
        }
        return success;
    }, [fetchPlaylists]);

    const removePlaylist = useCallback(async (name) => {
        const success = await ChannelService.deletePlaylist(name);
        if (success) {
            await fetchPlaylists();
            if (activePlaylist === name) {
                handlePlaylistChange(null);
            }
        }
        return success;
    }, [fetchPlaylists, activePlaylist, handlePlaylistChange]);

    // Global listener for background upload progress
    useEffect(() => {
        const checkInitialState = async () => {
            if (window.api && window.api.getUploadState) {
                const state = await window.api.getUploadState();
                if (state.isUploading) {
                    setUploadStarted(true);
                    setLoading(true);
                    setUploadProgress({ current: state.current, total: state.total, channelName: state.channelName });
                }
            }
        };

        checkInitialState();

        const progressListener = (data) => {
            setUploadProgress({
                current: data.current,
                total: data.total,
                channelName: data.channelName
            });

            if (data.isComplete) {
                setUploadStarted(false);
                setLoading(false);
                setUploadProgress({ current: 0, total: 0, channelName: '' });
                // We could optionally trigger a reload of channels here
                // loadMore(); // Wait, offset might be tricky. Let's just let the user see the new ones or search.
            }
        };

        if (window.api && window.api.onUploadProgress) {
            window.api.onUploadProgress(progressListener);
        }

        return () => {
            if (window.api && window.api.removeUploadProgressListener) {
                window.api.removeUploadProgressListener();
            }
        };
    }, []);

    const fetchFavorites = useCallback(async () => {
        setLoading(true);
        const favs = await ChannelService.getFavorites();
        setLoading(false);
        return favs;
    }, []);

    const toggleFavorite = useCallback(async (channelId, isFav) => {
        const success = await ChannelService.toggleFavorite(channelId, isFav);
        if (success) {
            setChannels(prev => prev.map(c => c.id === channelId ? { ...c, is_favorite: isFav } : c));
            setDisplayedChannels(prev => prev.map(c => c.id === channelId ? { ...c, is_favorite: isFav } : c));
        }
        return success;
    }, []);

    const editChannel = useCallback(async (id, updates) => {
        const success = await ChannelService.updateChannel(id, updates);
        if (success) {
            setChannels(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            setDisplayedChannels(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        }
        return success;
    }, []);

    const removeChannel = useCallback(async (id) => {
        const success = await ChannelService.deleteChannel(id);
        if (success) {
            setChannels(prev => prev.filter(c => c.id !== id));
            setDisplayedChannels(prev => prev.filter(c => c.id !== id));
        }
        return success;
    }, []);

    // Initial load
    useEffect(() => {
        fetchPlaylists();
    }, []);

    useEffect(() => {
        loadMore();
    }, [activePlaylist]);

    return {
        channels: displayedChannels,
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
        fetchFavorites,
        toggleFavorite,
        editChannel,
        removeChannel
    };
}
