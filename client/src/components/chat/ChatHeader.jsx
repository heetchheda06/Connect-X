import React from 'react';
import { ArrowLeft, PanelRight, MoreVertical, Search } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';

export default function ChatHeader({
  conversation,
  currentUserId,
  onBack,
}) {
  const { toggleInfoDrawer, infoDrawerOpen } = useChatStore();
  const { typingUsers } = useSocketStore();

  const isDirect = conversation.type === 'direct';
  const otherMember = isDirect
    ? conversation.members.find((m) => m.user?._id?.toString() !== currentUserId?.toString())?.user
    : null;

  const title = isDirect ? otherMember?.name || 'User' : conversation.name;
  const avatarSrc = isDirect ? otherMember?.avatar : conversation.avatar;
  const avatarId = isDirect ? otherMember?._id : conversation._id;
  const isOnline = isDirect ? otherMember?.isOnline : false;

  const convTyping = typingUsers[conversation._id] || {};
  const typingList = Object.entries(convTyping)
    .filter(([uId]) => uId !== currentUserId)
    .map(([_, u]) => u.name || u.username);

  const isTyping = typingList.length > 0;

  return (
    <header className="h-16 px-4 bg-surface border-b border-border-main flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-full hover:bg-surface-alt text-text-secondary"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <Avatar
          src={avatarSrc}
          name={title}
          id={avatarId}
          size="md"
          showOnline={isDirect}
          isOnline={isOnline}
        />

        {/* Title and Status */}
        <div className="truncate">
          <h3 className="text-sm sm:text-base font-heading font-bold text-text-primary truncate">
            {title}
          </h3>
          <div className="text-[11px] text-text-muted truncate">
            {isTyping ? (
              <span className="text-brand-600 font-semibold animate-pulse">
                {typingList[0]} is typing...
              </span>
            ) : isDirect ? (
              <span className={isOnline ? 'text-status-online font-medium' : 'text-text-muted'}>
                {isOnline ? 'Active now' : 'Offline'}
              </span>
            ) : (
              <span>{conversation.members?.length || 0} members</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 text-text-secondary">
        <button
          onClick={toggleInfoDrawer}
          className={`p-2 rounded-xl transition-colors ${
            infoDrawerOpen
              ? 'bg-brand-50 text-brand-600'
              : 'hover:bg-surface-alt hover:text-text-primary'
          }`}
          title="Conversation details"
        >
          <PanelRight className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

