import { useState, useCallback, useEffect } from 'react';
import ChannelService from '../../core/services/ChannelService';

export function useChannels(initialLimit = 20) {
    const [channels, setChannels] = useState([]);
    const [displayedChannels, setDisplayedChannels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadMore = useCallback(async () => {
        if (!hasMore || loading) return;
        setLoading(true);
        const newChannels = await ChannelService.getPaginatedChannels(initialLimit, offset);

        if (newChannels.length === 0) {
            setHasMore(false);
        } else {
            setChannels(prev => [...prev, ...newChannels]);
            if (!searchQuery) {
                setDisplayedChannels(prev => [...prev, ...newChannels]);
            }
            setOffset(prev => prev + initialLimit);
        }
        setLoading(false);
    }, [hasMore, loading, offset, initialLimit, searchQuery]);

    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setDisplayedChannels(channels);
            return;
        }

        const localResults = channels.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
        if (localResults.length > 0) {
            setDisplayedChannels(localResults);
        } else {
            setLoading(true);
            const dbResults = await ChannelService.searchChannels(query);
            setDisplayedChannels(dbResults);

            // Append missing results to global list without duplicates
            setChannels(prev => {
                const newItems = dbResults.filter(r => !prev.some(p => p.id === r.id));
                return [...prev, ...newItems];
            });
            setLoading(false);
        }
    }, [channels]);

    const uploadFile = useCallback(async (fileContent) => {
        setLoading(true);
        const newChannels = await ChannelService.uploadChannelsFile(fileContent);
        if (newChannels.length > 0) {
            setChannels(prev => [...prev, ...newChannels]);
            setDisplayedChannels(prev => [...prev, ...newChannels]);
        }
        setLoading(false);
        return newChannels.length;
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
        fetchFavorites,
        toggleFavorite
    };
}
