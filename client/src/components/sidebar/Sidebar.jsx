import React from 'react';
import { Search, X, Plus, MessageSquare, Compass, Users } from 'lucide-react';
import ConversationItem from './ConversationItem.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { useAuthStore } from '../../store/authStore.js';

export default function Sidebar({ onOpenNewChat, onOpenCreateGroup }) {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    loadingConversations,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
  } = useChatStore();

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // 1. Tab filter
    if (filter === 'unread' && (!conv.unreadCount || conv.unreadCount <= 0)) {
      return false;
    }
    if (filter === 'groups' && conv.type === 'direct') {
      return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const isDirect = conv.type === 'direct';
      const otherMember = isDirect
        ? conv.members.find((m) => m.user?._id?.toString() !== user?._id?.toString())?.user
        : null;
      const title = (isDirect ? otherMember?.name : conv.name) || '';
      return title.toLowerCase().includes(q);
    }

    return true;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalGroups = conversations.filter((c) => c.type !== 'direct').length;

  return (
    <aside className="w-full md:w-[340px] lg:w-[360px] h-[100dvh] bg-surface border-r border-border-main flex flex-col flex-shrink-0 z-10">
      {/* Top Header */}
      <div className="p-4 pb-3 border-b border-border-main/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-heading font-extrabold text-text-primary tracking-tight">
            Messages
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-alt text-brand-700 border border-border-main">
            {conversations.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCreateGroup}
            className="p-1.5 rounded-button bg-surface-alt border border-border-main text-text-secondary hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Create Group or Room"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-brand-gradient text-white text-xs font-semibold shadow-brand hover:shadow-brand-lg transition-all active:scale-95"
            title="Start a new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="px-4 py-2.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips: All, Unread, Groups */}
      <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-brand-500 text-white shadow-brand'
              : 'bg-surface-alt text-text-secondary hover:text-text-primary border border-border-main'
          }`}
        >
          All
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-brand-500 text-white shadow-brand'
              : 'bg-surface-alt text-text-secondary hover:text-text-primary border border-border-main'
          }`}
        >
          <span>Unread</span>
          {totalUnread > 0 && (
            <span className="w-4 h-4 rounded-full bg-accent-coral text-white text-[10px] font-bold flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter('groups')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            filter === 'groups'
              ? 'bg-brand-500 text-white shadow-brand'
              : 'bg-surface-alt text-text-secondary hover:text-text-primary border border-border-main'
          }`}
        >
          <span>Groups</span>
          {totalGroups > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-800 text-[10px]">
              {totalGroups}
            </span>
          )}
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {loadingConversations ? (
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-alt/70 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-border-main" />
                <div className="flex-1 space-y-2">
                  <div className="w-28 h-3.5 bg-border-main rounded" />
                  <div className="w-40 h-2.5 bg-border-main rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={activeConversationId === conv._id}
              currentUserId={user?._id}
              onSelect={() => setActiveConversation(conv._id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 p-4 text-center text-text-muted">
            <MessageSquare className="w-8 h-8 text-brand-400 mb-2 opacity-60" />
            <p className="text-xs font-semibold text-text-primary">No conversations</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {searchQuery
                ? `No chats match "${searchQuery}"`
                : 'Click "+ New" to find contacts and start chatting!'}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

