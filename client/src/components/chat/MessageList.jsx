import React, { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble.jsx';
import DateDivider from './DateDivider.jsx';
import NewMessagesDivider from './NewMessagesDivider.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import ForwardModal from '../modals/ForwardModal.jsx';
import EditMessageModal from '../modals/EditMessageModal.jsx';
import { formatMessageDate } from '../../utils/date.js';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { unpinMessageApi, starMessageApi } from '../../api/chat.api.js';
import { getMediaUrl } from '../../utils/file.js';
import { Loader2, Pin, X, Forward, Star, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

const WALLPAPER_CLASSES = {
  default: 'bg-chat-pattern',
  'aqua-breeze': 'bg-gradient-to-b from-[#e0f7fa] to-[#b2ebf2]',
  seafoam: 'bg-gradient-to-b from-[#e8f5e9] to-[#c8e6c9]',
  'deep-lagoon': 'bg-gradient-to-b from-[#e0f2f1] to-[#80cbc4]',
  'sky-ocean': 'bg-gradient-to-b from-[#e1f5fe] to-[#b3e5fc]',
  'coral-tint': 'bg-gradient-to-b from-[#fff3e0] to-[#ffe0b2]',
  'clean-slate': 'bg-[#ffffff]',
  'soft-graphite': 'bg-[#f8fafc]',
};

export default function MessageList({
  conversation,
  messages = [],
  currentUserId,
  onReply,
  onDelete,
  onImageClick,
  onInfo,
  onRemind,
  onAnalyzeDoc,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const {
    fetchMoreMessages,
    loadingMore,
    hasMoreByConv,
    isMultiSelect,
    selectedMessageIds,
    clearSelection,
    handleMessageEdited,
  } = useChatStore();
  const { typingUsers } = useSocketStore();

  const [forwardTargetIds, setForwardTargetIds] = useState([]);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [editingTargetMessage, setEditingTargetMessage] = useState(null);

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

  useEffect(() => {
    const el = containerRef.current;
    if (el && prevScrollHeightRef.current > 0) {
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [conversationId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const activeTypingMap = conversationId ? typingUsers[conversationId] || {} : {};

  // First unread message id
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

  // Pinned messages in this conversation
  const pinnedList = conversation?.pinnedMessages || [];

  const handleUnpin = async (messageId) => {
    try {
      await unpinMessageApi(conversationId, messageId);
      toast.success('Message unpinned');
    } catch {
      toast.error('Failed to unpin message');
    }
  };

  const handleScrollToMessage = (messageId) => {
    const targetEl = document.getElementById(`msg-${messageId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('ring-2', 'ring-brand-400', 'rounded-2xl');
      setTimeout(() => {
        targetEl.classList.remove('ring-2', 'ring-brand-400', 'rounded-2xl');
      }, 2000);
    }
  };

  // Group messages by date
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

  // Wallpaper styling
  const wallpaperKey = conversation?.wallpaper || 'default';
  const isCustomUrl =
    typeof wallpaperKey === 'string' &&
    (wallpaperKey.startsWith('http') ||
      wallpaperKey.startsWith('/') ||
      wallpaperKey.startsWith('uploads') ||
      wallpaperKey.startsWith('data:') ||
      wallpaperKey.startsWith('blob:'));
  const wallpaperClass = !isCustomUrl ? WALLPAPER_CLASSES[wallpaperKey] || WALLPAPER_CLASSES.default : '';
  const customBgStyle = isCustomUrl
    ? { backgroundImage: `url(${getMediaUrl(wallpaperKey)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={customBgStyle}
      className={`flex-1 overflow-y-auto px-4 py-3 relative ${wallpaperClass}`}
    >
      {/* Pinned Messages Banner at the top */}
      {pinnedList.length > 0 && (
        <div className="sticky top-0 z-20 mb-3 p-2.5 rounded-2xl bg-surface/95 backdrop-blur-md border border-brand-200/90 shadow-brand flex items-center justify-between animate-fade-in select-none">
          <div
            onClick={() => handleScrollToMessage(pinnedList[0].message?._id || pinnedList[0].message)}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1"
          >
            <div className="p-1.5 rounded-xl bg-brand-50 text-brand-600">
              <Pin className="w-4 h-4 fill-brand-600" />
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase text-brand-700 tracking-wider block">
                Pinned Message {pinnedList.length > 1 ? `(1 of ${pinnedList.length})` : ''}
              </span>
              <p className="text-xs text-text-primary truncate font-medium">
                {pinnedList[0].message?.content || 'Attachment / Media'}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleUnpin(pinnedList[0].message?._id || pinnedList[0].message)}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors ml-2"
            title="Unpin message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-Select Floating Toolbar */}
      {isMultiSelect && (
        <div className="sticky top-2 z-30 mb-3 p-3 rounded-2xl bg-surface border border-brand-300 shadow-brand-lg flex items-center justify-between animate-fade-in select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-primary">
              {selectedMessageIds.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForwardTargetIds(selectedMessageIds);
                setIsForwardModalOpen(true);
              }}
              disabled={selectedMessageIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold border border-brand-200 transition-colors disabled:opacity-50"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>

            <button
              onClick={clearSelection}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading older messages indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-2 text-xs text-text-muted gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          <span>Loading earlier messages...</span>
        </div>
      )}

      {/* Message Timeline */}
      {groupedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-text-muted p-8 select-none">
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
            <div key={msg._id} id={`msg-${msg._id}`}>
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                showSenderName={conversation.type !== 'direct'}
                currentUserId={currentUserId}
                onReply={onReply}
                onDelete={onDelete}
                onImageClick={onImageClick}
                onInfo={onInfo}
                onRemind={onRemind}
                onAnalyzeDoc={onAnalyzeDoc}
                onEdit={(m) => setEditingTargetMessage(m)}
                onForward={(m) => {
                  setForwardTargetIds([m._id]);
                  setIsForwardModalOpen(true);
                }}
              />
            </div>
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

      {/* Forward Modal */}
      <ForwardModal
        isOpen={isForwardModalOpen}
        onClose={() => {
          setIsForwardModalOpen(false);
          setForwardTargetIds([]);
        }}
        messageIds={forwardTargetIds}
      />

      {/* Edit Message Modal */}
      <EditMessageModal
        isOpen={Boolean(editingTargetMessage)}
        message={editingTargetMessage}
        onClose={() => setEditingTargetMessage(null)}
        onSave={(updated) => {
          handleMessageEdited(conversationId, updated);
          setEditingTargetMessage(null);
        }}
      />
    </div>
  );
}
