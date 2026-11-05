import React, { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Search, Smile, Image as ImageIcon, Sparkles, Star, Clock, X } from 'lucide-react';
import {
  getStickerPacksApi,
  getStickersInPackApi,
  getRecentsAndFavoritesApi,
  getTrendingGifsApi,
  searchGifsApi,
} from '../../api/chat.api.js';
import { getMediaUrl } from '../../utils/file.js';

export default function MediaPickerPanel({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectGif,
  onSelectSticker,
}) {
  const [activeTab, setActiveTab] = useState('emoji'); // 'emoji' | 'gif' | 'sticker'

  // GIF states
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Sticker states
  const [stickerPacks, setStickerPacks] = useState([]);
  const [activePackId, setActivePackId] = useState(null);
  const [currentStickers, setCurrentStickers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recents, setRecents] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  // Load GIF trending on first open of gif tab
  useEffect(() => {
    if (isOpen && activeTab === 'gif' && gifs.length === 0) {
      loadTrendingGifs();
    }
  }, [isOpen, activeTab]);

  // Load stickers on first open of sticker tab
  useEffect(() => {
    if (isOpen && activeTab === 'sticker' && stickerPacks.length === 0) {
      loadStickerPacks();
    }
  }, [isOpen, activeTab]);

  const loadTrendingGifs = async () => {
    try {
      setLoadingGifs(true);
      const res = await getTrendingGifsApi(24);
      if (res.success && res.data?.gifs) {
        setGifs(res.data.gifs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGifs(false);
    }
  };

  const handleGifSearch = async (e) => {
    e.preventDefault();
    if (!gifQuery.trim()) {
      return loadTrendingGifs();
    }
    try {
      setLoadingGifs(true);
      const res = await searchGifsApi(gifQuery, 24);
      if (res.success && res.data?.gifs) {
        setGifs(res.data.gifs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGifs(false);
    }
  };

  const loadStickerPacks = async () => {
    try {
      setLoadingStickers(true);
      const [packsRes, recentsRes] = await Promise.all([
        getStickerPacksApi(),
        getRecentsAndFavoritesApi(),
      ]);

      if (packsRes.success && packsRes.data?.packs) {
        setStickerPacks(packsRes.data.packs);
        if (packsRes.data.packs.length > 0) {
          selectPack(packsRes.data.packs[0]._id);
        }
      }

      if (recentsRes.success && recentsRes.data) {
        setFavorites(recentsRes.data.favorites || []);
        setRecents(recentsRes.data.recents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStickers(false);
    }
  };

  const selectPack = async (packId) => {
    setActivePackId(packId);
    try {
      const res = await getStickersInPackApi(packId);
      if (res.success && res.data?.stickers) {
        setCurrentStickers(res.data.stickers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 right-0 sm:right-4 z-40 w-[95vw] sm:w-[380px] h-[440px] bg-surface rounded-3xl shadow-2xl border border-border-main flex flex-col overflow-hidden animate-scale-in select-none">
      {/* Top Tab Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-main/70 bg-surface-alt/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('emoji')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'emoji'
                ? 'bg-brand-500 text-white shadow-brand'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            onClick={() => setActiveTab('gif')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'gif'
                ? 'bg-brand-500 text-white shadow-brand'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>GIFs</span>
          </button>

          <button
            onClick={() => setActiveTab('sticker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'sticker'
                ? 'bg-brand-500 text-white shadow-brand'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stickers</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Emoji Picker */}
      {activeTab === 'emoji' && (
        <div className="flex-1 overflow-hidden [&_.EmojiPickerReact]:!border-none [&_.EmojiPickerReact]:!w-full [&_.EmojiPickerReact]:!h-full [&_.EmojiPickerReact]:!shadow-none">
          <EmojiPicker
            onEmojiClick={(emojiData) => onSelectEmoji(emojiData)}
            autoFocusSearch={false}
            theme="light"
            searchPlaceHolder="Search emoji..."
            width="100%"
            height="100%"
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Tab 2: GIFs Search & Grid */}
      {activeTab === 'gif' && (
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <form onSubmit={handleGifSearch} className="relative mb-2">
            <input
              type="text"
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
              placeholder="Search trending GIFs..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-text-muted" />
          </form>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 p-1 no-scrollbar">
            {loadingGifs ? (
              <div className="col-span-2 py-10 text-center text-xs text-text-muted">
                Loading GIFs...
              </div>
            ) : gifs.length > 0 ? (
              gifs.map((g) => (
                <div
                  key={g.id}
                  onClick={() => {
                    onSelectGif(g);
                    onClose();
                  }}
                  className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-surface-alt cursor-pointer hover:ring-2 hover:ring-brand-400 transition-all"
                >
                  <img
                    src={g.previewUrl || g.url}
                    alt={g.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center text-xs text-text-muted">
                No GIFs found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Stickers */}
      {activeTab === 'sticker' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticker Pack Selector Header */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border-main/50 overflow-x-auto no-scrollbar bg-surface-alt/30">
            {stickerPacks.map((pack) => (
              <button
                key={pack._id}
                onClick={() => selectPack(pack._id)}
                className={`p-1.5 rounded-xl flex-shrink-0 transition-all flex items-center justify-center ${
                  activePackId === pack._id
                    ? 'ring-2 ring-brand-500 bg-brand-50 shadow-sm'
                    : 'opacity-70 hover:opacity-100 hover:bg-surface-alt'
                }`}
                title={pack.name}
              >
                <img
                  src={getMediaUrl(pack.cover)}
                  alt={pack.name}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline';
                  }}
                />
                <span className="hidden text-base leading-none">🌊</span>
              </button>
            ))}
          </div>

          {/* Sticker Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 gap-3 no-scrollbar">
            {loadingStickers ? (
              <div className="col-span-4 py-10 text-center text-xs text-text-muted">
                Loading stickers...
              </div>
            ) : currentStickers.length > 0 ? (
              currentStickers.map((st) => (
                <button
                  key={st._id}
                  onClick={() => {
                    onSelectSticker(st);
                    onClose();
                  }}
                  className="p-2 rounded-2xl hover:bg-brand-50/70 hover:scale-110 active:scale-95 transition-all flex items-center justify-center aspect-square"
                  title={st.emojis?.join(' ')}
                >
                  <img
                    src={getMediaUrl(st.url)}
                    alt={st.emojis?.[0] || 'sticker'}
                    className="w-14 h-14 object-contain filter drop-shadow-sm select-none"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span className="hidden text-3xl select-none items-center justify-center">
                    {st.emojis?.[0] || '✨'}
                  </span>
                </button>
              ))
            ) : (
              <div className="col-span-4 py-10 text-center text-xs text-text-muted">
                No stickers in this pack
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

