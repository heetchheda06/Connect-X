import React, { useState, useEffect } from 'react';
import { 
  X, 
  Compass, 
  Search, 
  Users, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { discoverRoomsApi, joinRoomApi } from '../../api/chat.api.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function DiscoverRoomsModal({ isOpen, onClose, onSelectRoom, onOpenCreateGroup }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);

  const fetchRooms = async (query = '') => {
    try {
      setIsLoading(true);
      const res = await discoverRoomsApi(query);
      if (res.success && res.data?.rooms) {
        setRooms(res.data.rooms);
      }
    } catch (err) {
      console.error('Failed to discover rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms(searchQuery);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const delay = setTimeout(() => {
      fetchRooms(searchQuery);
    }, 250);
    return () => clearTimeout(delay);
  }, [searchQuery, isOpen]);

  if (!isOpen) return null;

  const handleJoinOrOpen = async (room) => {
    try {
      setJoiningRoomId(room._id);
      if (room.hasJoined) {
        onSelectRoom(room);
        onClose();
      } else {
        const res = await joinRoomApi(room._id);
        if (res.success && res.data?.conversation) {
          toast.success(`Joined "${room.name}"! 🌊`);
          onSelectRoom(res.data.conversation);
          onClose();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border-main flex items-center justify-between bg-surface-alt/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-text-primary">
                Discover Public Rooms
              </h3>
              <p className="text-xs text-text-muted">
                Explore open channels and communities
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="p-4 border-b border-border-main flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by name or topic..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCreateGroup) onOpenCreateGroup();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button bg-surface border border-border-main hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 text-xs font-semibold text-text-secondary transition-all shadow-subtle"
            title="Create a new room"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>

        {/* Rooms Listing */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-text-muted gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span>Browsing public rooms...</span>
            </div>
          ) : rooms.length > 0 ? (
            rooms.map((room) => {
              const isJoining = joiningRoomId === room._id;
              return (
                <div
                  key={room._id}
                  className="p-3.5 rounded-2xl bg-surface hover:bg-surface-alt/70 border border-border-main transition-all flex items-center justify-between gap-3 shadow-subtle"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <Avatar
                      name={room.name}
                      id={room._id}
                      size="lg"
                    />

                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {room.name}
                        </h4>
                        {room.hasJoined && (
                          <span className="px-2 py-0.5 rounded-full bg-status-online/15 text-status-online text-[9px] font-bold border border-status-online/20">
                            Joined
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {room.description || 'Public discussion room'}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-brand-500" />
                          {room.memberCount || 0} members
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinOrOpen(room)}
                    disabled={isJoining}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-semibold shadow-brand transition-all flex-shrink-0 ${
                      room.hasJoined
                        ? 'bg-surface border border-border-main text-brand-700 hover:bg-brand-50'
                        : 'bg-brand-gradient text-white hover:shadow-brand-lg'
                    }`}
                  >
                    {isJoining ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : room.hasJoined ? (
                      <>
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Join</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
              <Compass className="w-8 h-8 text-brand-400 mb-2 opacity-50" />
              <p className="text-xs font-semibold text-text-primary">No public rooms found</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {searchQuery
                  ? `No public rooms match "${searchQuery}"`
                  : 'Be the first to create an open room on ConnectX!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

