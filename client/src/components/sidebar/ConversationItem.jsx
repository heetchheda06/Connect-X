import React from 'react';
import Avatar from '../ui/Avatar.jsx';
import { formatConversationTimestamp } from '../../utils/date.js';
import { Check, CheckCheck } from 'lucide-react';

export default function ConversationItem({ conversation, isActive, currentUserId, onSelect }) {
  const isDirect = conversation.type === 'direct';

  // For direct chats, the other participant is the contact
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
    } else if (lastMessage.type === 'file') {
      previewText = `📄 ${lastMessage.attachment?.name || 'File'}`;
    } else if (lastMessage.type === 'system') {
      previewText = lastMessage.content;
    }
  }

  const timestamp = lastMessage?.createdAt
    ? formatConversationTimestamp(lastMessage.createdAt)
    : formatConversationTimestamp(conversation.updatedAt);

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
            <h4
              className={`text-xs sm:text-sm font-semibold truncate ${
                isActive ? 'text-brand-900 font-bold' : 'text-text-primary'
              }`}
            >
              {title}
            </h4>
            <span className="text-[11px] text-text-muted flex-shrink-0 font-medium">
              {timestamp}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate">
            {/* Ticks on sender's own preview: grey for sent/delivered, brand-500 for read */}
            {isSender && lastMessage && !lastMessage.isDeletedForEveryone && (
              <span className="flex-shrink-0">
                {isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-brand-500" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-text-muted" />
                )}
              </span>
            )}
            <p className="truncate text-[11px] sm:text-xs text-text-secondary">
              {previewText}
            </p>
          </div>
        </div>
      </div>

      {/* Unread message count badge */}
      {conversation.unreadCount > 0 && (
        <span className="ml-2.5 px-2 py-0.5 rounded-full bg-accent-coral text-white text-[10px] font-bold shadow-sm flex-shrink-0 animate-scale-in">
          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
        </span>
      )}
    </div>
  );
}

