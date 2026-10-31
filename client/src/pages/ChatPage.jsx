import React, { useState, useEffect } from 'react';
import IconRail from '../components/layout/IconRail.jsx';
import MobileTabBar from '../components/layout/MobileTabBar.jsx';
import Sidebar from '../components/sidebar/Sidebar.jsx';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import MessageList from '../components/chat/MessageList.jsx';
import Composer from '../components/chat/Composer.jsx';
import InfoDrawer from '../components/chat/InfoDrawer.jsx';
import Lightbox from '../components/chat/Lightbox.jsx';
import EditProfileModal from '../components/modals/EditProfileModal.jsx';
import CompleteProfileModal from '../components/modals/CompleteProfileModal.jsx';
import NewChatModal from '../components/modals/NewChatModal.jsx';
import CreateGroupModal from '../components/modals/CreateGroupModal.jsx';
import DiscoverRoomsModal from '../components/modals/DiscoverRoomsModal.jsx';
import DeleteMessageModal from '../components/modals/DeleteMessageModal.jsx';
import MessageInfoModal from '../components/modals/MessageInfoModal.jsx';
import AddMembersModal from '../components/modals/AddMembersModal.jsx';
import ReconnectingBanner from '../components/layout/ReconnectingBanner.jsx';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { useAiStore } from '../store/aiStore.js';
import { useTranslationStore } from '../store/translationStore.js';
import useSocket from '../hooks/useSocket.js';
import { createOrGetDirectConversationApi, sendMessageApi } from '../api/chat.api.js';
import { Waves, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChatPage() {
  const { user, justSignedUpWithGoogle, setJustSignedUpWithGoogle } = useAuthStore();
  const { socket } = useSocket();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    fetchConversations,
    messagesByConv,
    handleIncomingMessage,
    handleMessageRead,
    handleMessageDeleted,
    setReplyingTo,
  } = useChatStore();
  const { emitMessageRead, joinConversation } = useSocketStore();

  const [activeTab, setActiveTab] = useState('chats');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isDiscoverRoomsOpen, setIsDiscoverRoomsOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  const [infoTargetMessage, setInfoTargetMessage] = useState(null);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Dynamic Browser Tab Title with Unread Count: "(3) ConnectX"
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ConnectX`;
    } else {
      document.title = 'ConnectX • Real-time Chat';
    }
  }, [totalUnread]);

  // Set up real-time Socket.IO listeners for chat events
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ conversationId, message }) => {
      handleIncomingMessage(conversationId, message, user?._id);
      if (activeConversationId === conversationId && message.sender?._id !== user?._id) {
        emitMessageRead(conversationId);
      }

      // Live Translation: Check if auto-translate is on for this conversation
      const aiSettings = useAiStore.getState().settings;
      if (
        aiSettings?.enabled &&
        message?.content &&
        message?.sender?._id !== user?._id &&
        !message?.isDeletedForEveryone &&
        message?.type !== 'system'
      ) {
        const autoTranslateList = (aiSettings.autoTranslateConversations || []).map((id) => (id?._id || id)?.toString());
        if (autoTranslateList.includes(conversationId?.toString())) {
          useTranslationStore.getState().translateMessage({
            messageId: message._id,
            targetLang: aiSettings.preferredLanguage || 'en',
          });
        }
      }
    };

    const onRead = ({ conversationId, userId: readerId, readAt }) => {
      handleMessageRead(conversationId, readerId, readAt);
    };

    const onDeleted = ({ conversationId, messageId }) => {
      handleMessageDeleted(conversationId, messageId);
      useTranslationStore.getState().clearTranslation(messageId);
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:read', onRead);
    socket.on('message:deleted', onDeleted);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:read', onRead);
      socket.off('message:deleted', onDeleted);
    };
  }, [socket, activeConversationId, user?._id, handleIncomingMessage, handleMessageRead, handleMessageDeleted, emitMessageRead]);

  // When active conversation opens, auto-translate visible text messages if auto-translate is on
  useEffect(() => {
    if (!activeConversationId) return;
    const aiSettings = useAiStore.getState().settings;
    if (!aiSettings?.enabled) return;

    const autoTranslateList = (aiSettings.autoTranslateConversations || []).map((id) => (id?._id || id)?.toString());
    if (autoTranslateList.includes(activeConversationId.toString())) {
      const convMessages = messagesByConv[activeConversationId] || [];
      const textIds = convMessages
        .filter((m) => m.content && !m.isDeletedForEveryone && m.type !== 'system')
        .map((m) => m._id);
      if (textIds.length > 0) {
        useTranslationStore.getState().translateBatch({
          messageIds: textIds,
          targetLang: aiSettings.preferredLanguage || 'en',
        });
      }
    }
  }, [activeConversationId, messagesByConv]);

  // Handle starting a conversation from search modal
  const handleSelectUserToChat = async (targetUser) => {
    try {
      const res = await createOrGetDirectConversationApi(targetUser._id);
      if (res.success && res.data?.conversation) {
        const conv = res.data.conversation;
        await fetchConversations();
        setActiveConversation(conv._id);
        joinConversation(conv._id);
        toast.success(`Chat opened with ${targetUser.name} 💬`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open conversation');
    }
  };

  // Find active conversation object
  const activeConversation = conversations.find((c) => c._id === activeConversationId);
  const activeMessages = activeConversationId ? messagesByConv[activeConversationId] || [] : [];

  // Send message handler (supports text, attachments, replies)
  const handleSendMessage = async (messagePayload) => {
    if (!activeConversationId) return;

    const { content, attachment, replyTo } = messagePayload;

    if (socket && socket.connected) {
      socket.emit('message:send', {
        conversationId: activeConversationId,
        content,
        attachment,
        replyTo,
      });
    } else {
      // Fallback to REST API
      try {
        await sendMessageApi(activeConversationId, {
          content,
          attachment,
          replyTo,
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to send message');
      }
    }
  };

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    if (tab === 'contacts') setIsNewChatOpen(true);
    if (tab === 'rooms') setIsDiscoverRoomsOpen(true);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-app overflow-hidden font-sans">
      <ReconnectingBanner />

      {/* Column 1: Slim Icon Rail (Desktop/Tablet) */}
      <IconRail
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        onOpenProfile={() => setIsEditProfileOpen(true)}
      />

      {/* Column 2: Sidebar Conversation List (Visible when no active chat on mobile) */}
      <div
        className={`w-full md:w-auto h-full ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <Sidebar
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        />
      </div>

      {/* Column 3: Active Chat Area (Visible when active chat on mobile, or full flex on desktop) */}
      <main
        className={`flex-1 h-[100dvh] flex flex-col bg-surface overflow-hidden ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              currentUserId={user?._id}
              onBack={() => setActiveConversation(null)}
            />

            <MessageList
              conversation={activeConversation}
              messages={activeMessages}
              currentUserId={user?._id}
              onReply={(msg) => setReplyingTo(msg)}
              onDelete={(msg) => setDeleteTargetMessage(msg)}
              onInfo={(msg) => setInfoTargetMessage(msg)}
              onImageClick={(att) => setLightboxImage(att)}
            />

            <Composer
              onSendMessage={handleSendMessage}
              disabled={false}
            />
          </>
        ) : (
          /* Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-chat-pattern select-none">
            <div className="w-20 h-20 rounded-3xl bg-brand-50 border border-brand-200/80 flex items-center justify-center shadow-card text-brand-500 mb-4 animate-float">
              <Waves className="w-10 h-10 text-brand-500" />
            </div>
            <h3 className="font-heading font-bold text-xl text-text-primary">
              Welcome to ConnectX
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-sm mt-1.5 leading-relaxed">
              Select a conversation from the sidebar or click <span className="font-semibold text-brand-600">+ New</span> to discover members and start chatting.
            </p>
          </div>
        )}
      </main>

      {/* Column 4: Info Drawer */}
      {activeConversation && (
        <InfoDrawer
          conversation={activeConversation}
          currentUserId={user?._id}
          onOpenAddMembers={() => setIsAddMembersOpen(true)}
        />
      )}

      {/* Mobile Bottom Tab Bar */}
      {!activeConversationId && (
        <MobileTabBar
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
          onOpenProfile={() => setIsEditProfileOpen(true)}
        />
      )}

      {/* Modals & Lightbox */}
      <Lightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <CompleteProfileModal
        isOpen={justSignedUpWithGoogle}
        onClose={() => setJustSignedUpWithGoogle(false)}
      />

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectUser={handleSelectUserToChat}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(conv) => {
          fetchConversations();
          setActiveConversation(conv._id);
          joinConversation(conv._id);
        }}
      />

      <DiscoverRoomsModal
        isOpen={isDiscoverRoomsOpen}
        onClose={() => setIsDiscoverRoomsOpen(false)}
        onSelectRoom={(conv) => {
          fetchConversations();
          setActiveConversation(conv._id);
          joinConversation(conv._id);
        }}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />

      <DeleteMessageModal
        isOpen={Boolean(deleteTargetMessage)}
        message={deleteTargetMessage}
        currentUserId={user?._id}
        onClose={() => setDeleteTargetMessage(null)}
      />

      <MessageInfoModal
        isOpen={Boolean(infoTargetMessage)}
        message={infoTargetMessage}
        conversation={activeConversation}
        onClose={() => setInfoTargetMessage(null)}
      />

      <AddMembersModal
        isOpen={isAddMembersOpen}
        onClose={() => setIsAddMembersOpen(false)}
        conversation={activeConversation}
        onMembersAdded={() => fetchConversations()}
      />
    </div>
  );
}
