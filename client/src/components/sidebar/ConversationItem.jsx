import React, { useState } from 'react';
import Avatar from '../ui/Avatar.jsx';
import { formatConversationTimestamp } from '../../utils/date.js';
import { 
  Check, 
  CheckCheck, 
  Pin, 
  BellOff, 
  MoreVertical, 
  Archive, 
  Trash2, 
  Eraser, 
  MailCheck, 
  MailWarning 
} from 'lucide-react';
import { 
  pinChatApi, 
  muteChatApi, 
  archiveChatApi, 
  markUnreadApi 
} from '../../api/chat.api.js';
import { toast } from 'react-hot-toast';

export default function ConversationItem({ 
  conversation, 
  isActive, 
  currentUserId, 
  onSelect,
  onClearChat,
  onDeleteChat
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDirect = conversation.type === 'direct';

  const otherMember = isDirect
    ? conversation.members.find((m) => m.user?._id?.toString() !== currentUserId?.toString())?.user
    : null;

  const title = isDirect ? otherMember?.name || 'User' : conversation.name;
  const avatarSrc = isDirect ? otherMember?.avatar : conversation.avatar;
  const avatarId = isDirect ? otherMember?._id : conversation._id;
  const isOnline = isDirect ? otherMember?.isOnline : false;

  const lastMessage = conversation.lastMessage;
  const isSender = lastMessage?.sender?._id?.toString() === currentUserId?.toString();
  const isRead = lastMessage?.readBy && lastMessage.readBy.length > 1;

  let previewText = 'No messages yet';
  if (lastMessage) {
    if (lastMessage.isDeletedForEveryone) {
      previewText = '🚫 This message was deleted';
    } else if (lastMessage.content) {
      previewText = lastMessage.content;
    } else if (lastMessage.type === 'image') {
      previewText = '📷 Photo';
    } else if (lastMessage.type === 'video') {
      previewText = '📹 Video';
    } else if (lastMessage.type === 'sticker') {
      previewText = '🎨 Sticker';
    } else if (lastMessage.type === 'gif') {
      previewText = '👾 GIF';
    } else if (lastMessage.type === 'poll') {
      previewText = `📊 Poll: ${lastMessage.poll?.question || 'Question'}`;
    } else if (lastMessage.type === 'call') {
      previewText = `📞 ${lastMessage.content || 'Call'}`;
    } else if (lastMessage.type === 'file') {
      previewText = `📄 ${lastMessage.attachment?.name || 'File'}`;
    } else if (lastMessage.type === 'system') {
      previewText = lastMessage.content;
    }
  }

  const timestamp = lastMessage?.createdAt
    ? formatConversationTimestamp(lastMessage.createdAt)
    : formatConversationTimestamp(conversation.updatedAt);

  const isPinned = Boolean(conversation.isPinned);
  const isMuted = Boolean(conversation.isMuted);
  const isMarkedUnread = Boolean(conversation.markedUnread);
  const isArchived = Boolean(conversation.isArchived);

  const handleTogglePin = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      const res = await pinChatApi(conversation._id, !isPinned);
      if (res.success) {
        toast.success(!isPinned ? 'Chat pinned to top 📌' : 'Chat unpinned');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pin');
    }
  };

  const handleToggleArchive = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      const res = await archiveChatApi(conversation._id, !isArchived);
      if (res.success) {
        toast.success(!isArchived ? 'Chat moved to archive 📦' : 'Chat unarchived');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive chat');
    }
  };

  const handleToggleMute = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      const res = await muteChatApi(conversation._id, isMuted ? null : 'forever');
      if (res.success) {
        toast.success(isMuted ? 'Notifications unmuted 🔔' : 'Chat muted 🔕');
      }
    } catch (err) {
      toast.error('Failed to update mute settings');
    }
  };

  const handleToggleUnread = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      const res = await markUnreadApi(conversation._id, !isMarkedUnread);
      if (res.success) {
        toast.success(!isMarkedUnread ? 'Marked as unread' : 'Marked as read');
      }
    } catch (err) {
      toast.error('Failed to update unread status');
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
        isActive
          ? 'bg-brand-50/90 border border-brand-200/80 shadow-subtle'
          : 'bg-surface hover:bg-surface-alt border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
        <Avatar
          src={avatarSrc}
          name={title}
          id={avatarId}
          size="md"
          showOnline={isDirect}
          isOnline={isOnline}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <h4
                className={`text-xs sm:text-sm font-semibold truncate ${
                  isActive ? 'text-brand-900 font-bold' : 'text-text-primary'
                }`}
              >
                {title}
              </h4>
              {isPinned && <Pin className="w-3 h-3 text-brand-600 fill-brand-600 flex-shrink-0" />}
              {isMuted && <BellOff className="w-3 h-3 text-text-muted flex-shrink-0" />}
            </div>

            <span className="text-[11px] text-text-muted flex-shrink-0 font-medium">
              {timestamp}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate">
            {isSender && lastMessage && !lastMessage.isDeletedForEveryone && (
              <span className="flex-shrink-0">
                {isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-brand-500" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-text-muted" />
                )}
              </span>
            )}
            <p className="truncate text-[11px] sm:text-xs text-text-secondary flex-1">
              {previewText}
            </p>

            {/* Marked Unread or Unread Count */}
            {conversation.unreadCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-accent-coral text-white text-[10px] font-bold shadow-sm flex-shrink-0">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            ) : isMarkedUnread ? (
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-xs flex-shrink-0" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Context Menu Button on Hover */}
      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary"
          title="Chat Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-6 w-44 bg-surface rounded-2xl border border-border-main shadow-2xl p-1 z-30 animate-fade-in text-xs space-y-0.5"
          >
            <button
              onClick={handleTogglePin}
              className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-surface-alt text-text-primary transition-colors"
            >
              <Pin className="w-3.5 h-3.5 text-brand-500" />
              <span>{isPinned ? 'Unpin chat' : 'Pin chat'}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-surface-alt text-text-primary transition-colors"
            >
              <BellOff className="w-3.5 h-3.5 text-brand-500" />
              <span>{isMuted ? 'Unmute' : 'Mute chat'}</span>
            </button>

            <button
              onClick={handleToggleArchive}
              className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-surface-alt text-text-primary transition-colors"
            >
              <Archive className="w-3.5 h-3.5 text-brand-500" />
              <span>{isArchived ? 'Unarchive' : 'Archive chat'}</span>
            </button>

            <button
              onClick={handleToggleUnread}
              className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-surface-alt text-text-primary transition-colors"
            >
              <MailCheck className="w-3.5 h-3.5 text-brand-500" />
              <span>{isMarkedUnread ? 'Mark read' : 'Mark unread'}</span>
            </button>

            {onClearChat && (
              <button
                onClick={(e) => {
                  setMenuOpen(false);
                  onClearChat(conversation);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-status-danger/10 text-status-danger transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Clear chat</span>
              </button>
            )}

            {onDeleteChat && (
              <button
                onClick={(e) => {
                  setMenuOpen(false);
                  onDeleteChat(conversation);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-status-danger/10 text-status-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete chat</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
