import { useState, useCallback, useEffect, useRef } from 'react';
import ChannelService from '../../core/services/ChannelService';

export function useChannels(initialLimit = 20) {
    const [channels, setChannels] = useState([]);
    const [displayedChannels, setDisplayedChannels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, channelName: '' });
    const [uploadStarted, setUploadStarted] = useState(false);
    const loadingRef = useRef(false);

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingRef.current || searchQuery) return;

        loadingRef.current = true;
        setLoading(true);
        const newChannels = await ChannelService.getPaginatedChannels(initialLimit, offset);

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
    }, [hasMore, offset, initialLimit, searchQuery]);

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    // Debounced search logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setDisplayedChannels(channels);
                return;
            }

            setLoading(true);
            const dbResults = await ChannelService.searchChannels(searchQuery);
            setDisplayedChannels(dbResults);

            setChannels(prev => {
                const newItems = dbResults.filter(r => !prev.some(p => p.id === r.id));
                return [...prev, ...newItems];
            });
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, channels]);

    const uploadFile = useCallback(async (fileContent) => {
        setLoading(true);
        setUploadStarted(true);
        setUploadProgress({ current: 0, total: 0, channelName: '' });

        const newChannels = await ChannelService.uploadChannelsFile(fileContent);

        // We do NOT clear state here instantly because the background task might still be broadcasting
        // The background task sends `isComplete: true` which will be caught by the global listener
        return newChannels.length;
    }, []);

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

    // Initial load
    useEffect(() => {
        loadMore();
    }, []);

    return {
        channels: displayedChannels,
        loading,
        hasMore,
        searchQuery,
        loadMore,
        handleSearch,
        uploadFile,
        uploadProgress,
        uploadStarted,
        fetchFavorites,
        toggleFavorite
    };
}
