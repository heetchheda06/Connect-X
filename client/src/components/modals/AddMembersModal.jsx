import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check, Loader2 } from 'lucide-react';
import { searchUsersApi } from '../../api/user.api.js';
import { addMembersApi } from '../../api/chat.api.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function AddMembersModal({ isOpen, onClose, conversation, onMembersAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [isOpen]);

  // Search contacts debounced
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        setIsLoadingSearch(true);
        const res = await searchUsersApi(searchQuery);
        if (res.success && res.data?.users) {
          // Filter out users who are already members of this conversation
          const existingMemberIds = new Set(
            (conversation?.members || []).map((m) => (m.user?._id || m.user)?.toString())
          );
          const available = res.data.users.filter((u) => !existingMemberIds.has(u._id.toString()));
          setSearchResults(available);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsLoadingSearch(false);
      }
    };

    const delay = setTimeout(fetchUsers, 250);
    return () => clearTimeout(delay);
  }, [searchQuery, conversation]);

  if (!isOpen || !conversation) return null;

  const toggleSelectUser = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;
    try {
      setIsSubmitting(true);
      const memberIds = selectedUsers.map((u) => u._id);
      const res = await addMembersApi(conversation._id, memberIds);
      if (res.success) {
        toast.success(`Added ${selectedUsers.length} member(s) to ${conversation.name}! 👥`);
        if (onMembersAdded) onMembersAdded(res.data?.conversation);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-md overflow-hidden flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface-alt/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-text-primary">
                Add Members
              </h3>
              <p className="text-[11px] text-text-muted truncate max-w-[240px]">
                to {conversation.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected chips */}
        {selectedUsers.length > 0 && (
          <div className="p-3 border-b border-border-main flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto bg-surface-alt/30">
            {selectedUsers.map((u) => (
              <span
                key={u._id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200 text-xs font-semibold"
              >
                <span>{u.name}</span>
                <button
                  type="button"
                  onClick={() => toggleSelectUser(u)}
                  className="hover:text-status-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="p-3 border-b border-border-main">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or username..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface"
            />
          </div>
        </div>

        {/* Member list */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          {isLoadingSearch ? (
            <div className="flex items-center justify-center py-8 text-xs text-text-muted gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>Searching...</span>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((u) => {
              const isSelected = selectedUsers.some((sel) => sel._id === u._id);
              return (
                <div
                  key={u._id}
                  onClick={() => toggleSelectUser(u)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-50 border-brand-300'
                      : 'bg-surface hover:bg-surface-alt border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Avatar
                      src={u.avatar}
                      name={u.name}
                      id={u._id}
                      size="sm"
                      showOnline={true}
                      isOnline={u.isOnline}
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {u.name}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'border-border-main bg-surface'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-text-muted">
              {searchQuery ? 'No eligible users found' : 'Type a name or username to search contacts'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-main flex items-center justify-between bg-surface-alt/20">
          <span className="text-xs text-text-muted">
            {selectedUsers.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-button text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting || selectedUsers.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-button bg-brand-gradient text-white text-xs font-semibold shadow-brand hover:shadow-brand-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span>Add to Channel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

