import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble.jsx';
import DateDivider from './DateDivider.jsx';
import NewMessagesDivider from './NewMessagesDivider.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import { formatMessageDate } from '../../utils/date.js';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { Loader2 } from 'lucide-react';

export default function MessageList({
  conversation,
  messages = [],
  currentUserId,
  onReply,
  onDelete,
  onImageClick,
  onInfo,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const { fetchMoreMessages, loadingMore, hasMoreByConv } = useChatStore();
  const { typingUsers } = useSocketStore();

  const conversationId = conversation?._id;
  const hasMore = hasMoreByConv[conversationId];

  // Infinite scroll upward handler
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop < 50 && hasMore && !loadingMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      fetchMoreMessages(conversationId);
    }
  };

  // Preserve scroll position when older messages are prepended
  useEffect(() => {
    const el = containerRef.current;
    if (el && prevScrollHeightRef.current > 0) {
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  // Initial scroll to bottom on conversation open
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [conversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const activeTypingMap = conversationId ? typingUsers[conversationId] || {} : {};

  // Find the ID of the first unread message for current user
  let firstUnreadMessageId = null;
  for (const m of messages) {
    if (m.sender?._id?.toString() !== currentUserId?.toString()) {
      const isReadByMe = m.readBy?.some(
        (r) => (r.user?._id || r.user)?.toString() === currentUserId?.toString()
      );
      if (!isReadByMe) {
        firstUnreadMessageId = m._id;
        break;
      }
    }
  }

  // Group messages by formatted date string
  const groupedItems = [];
  let currentDate = null;

  messages.forEach((msg) => {
    const msgDate = formatMessageDate(msg.createdAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedItems.push({ type: 'date', text: msgDate, id: `date-${msg.createdAt}` });
    }

    if (firstUnreadMessageId && msg._id === firstUnreadMessageId) {
      groupedItems.push({ type: 'new-messages-divider', id: `new-divider-${msg._id}` });
    }

    groupedItems.push({ type: 'message', data: msg, id: msg._id });
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 bg-chat-pattern relative"
    >
      {/* Loading older messages indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-2 text-xs text-text-muted gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          <span>Loading earlier messages...</span>
        </div>
      )}

      {/* Message Timeline */}
      {groupedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-text-muted p-8">
          <p className="text-sm font-semibold text-text-primary">No messages yet</p>
          <p className="text-xs text-text-secondary mt-1">
            Say hello to begin the conversation! 🌊
          </p>
        </div>
      ) : (
        groupedItems.map((item) => {
          if (item.type === 'date') {
            return <DateDivider key={item.id} dateText={item.text} />;
          }

          if (item.type === 'new-messages-divider') {
            return <NewMessagesDivider key={item.id} />;
          }

          const msg = item.data;
          const isOwn = msg.sender?._id?.toString() === currentUserId?.toString();

          return (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={isOwn}
              showSenderName={conversation.type !== 'direct'}
              onReply={onReply}
              onDelete={onDelete}
              onImageClick={onImageClick}
              onInfo={onInfo}
            />
          );
        })
      )}

      {/* Typing Indicator */}
      <div className="min-h-[28px] mt-1">
        <TypingIndicator
          typingUsersMap={activeTypingMap}
          currentUserId={currentUserId}
        />
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
