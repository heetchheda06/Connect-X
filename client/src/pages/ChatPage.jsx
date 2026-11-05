import React, { useState, useEffect } from 'react';
import IconRail from '../components/layout/IconRail.jsx';
import MobileTabBar from '../components/layout/MobileTabBar.jsx';
import Sidebar from '../components/sidebar/Sidebar.jsx';
import ContactsView from '../components/chat/ContactsView.jsx';
import CallsView from '../components/chat/CallsView.jsx';
import StarredMessagesView from '../components/chat/StarredMessagesView.jsx';
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
import ReminderModal from '../components/modals/ReminderModal.jsx';
import CallModal from '../components/modals/CallModal.jsx';
import SettingsModal from '../components/modals/SettingsModal.jsx';
import AiDrawer from '../components/chat/AiDrawer.jsx';
import ReconnectingBanner from '../components/layout/ReconnectingBanner.jsx';
import UnverifiedEmailBanner from '../components/layout/UnverifiedEmailBanner.jsx';
import ErrorBoundary from '../components/ui/ErrorBoundary.jsx';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { useAiStore } from '../store/aiStore.js';
import { useTranslationStore } from '../store/translationStore.js';
import { useSmartReplyStore } from '../store/smartReplyStore.js';
import { useVoiceStore } from '../store/voiceStore.js';
import useSocket from '../hooks/useSocket.js';
import { createOrGetDirectConversationApi, sendMessageApi } from '../api/chat.api.js';
import { updateReminderApi } from '../api/ai.api.js';
import { Waves, Sparkles, Bell } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls' | 'contacts' | 'starred' | 'rooms' | 'settings'
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isDiscoverRoomsOpen, setIsDiscoverRoomsOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  const [infoTargetMessage, setInfoTargetMessage] = useState(null);

  // ConnectX AI Workspace states
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiDrawerInitialTab, setAiDrawerInitialTab] = useState('catchup');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTargetMessage, setReminderTargetMessage] = useState(null);
  const [dismissedCatchUpConvId, setDismissedCatchUpConvId] = useState(null);
  const [selectedDirectConv, setSelectedDirectConv] = useState(null);

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

  // Fetch smart replies when switching active conversation
  useEffect(() => {
    if (!activeConversationId) {
      useSmartReplyStore.getState().clearSuggestions();
      return;
    }
    const currentConv = conversations.find((c) => c._id === activeConversationId);
    const aiSettings = useAiStore.getState().settings;
    if (currentConv?.type === 'direct' && aiSettings?.enabled && aiSettings?.smartReplies) {
      useSmartReplyStore.getState().fetchSmartReplies(activeConversationId);
    } else {
      useSmartReplyStore.getState().clearSuggestions();
    }
  }, [activeConversationId, conversations]);

  // Set up real-time Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ conversationId, message }) => {
      handleIncomingMessage(conversationId, message, user?._id);
      if (activeConversationId === conversationId && message.sender?._id !== user?._id) {
        emitMessageRead(conversationId);
      }

      // Live Translation
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

      // Smart Replies
      if (
        activeConversationId === conversationId &&
        message?.sender?._id !== user?._id &&
        aiSettings?.enabled &&
        aiSettings?.smartReplies
      ) {
        useSmartReplyStore.getState().fetchSmartReplies(conversationId);
      }
    };

    const onRead = ({ conversationId, userId: readerId, readAt }) => {
      handleMessageRead(conversationId, readerId, readAt);
    };

    const onDeleted = ({ conversationId, messageId }) => {
      handleMessageDeleted(conversationId, messageId);
      useTranslationStore.getState().clearTranslation(messageId);
    };

    const onTranscriptReady = ({ messageId, transcript }) => {
      useVoiceStore.getState().setTranscript(messageId, transcript);
    };

    const onReminderDue = ({ reminder }) => {
      if (!reminder) return;
      toast(
        (t) => (
          <div className="flex flex-col gap-2 p-1 max-w-sm">
            <div className="flex items-center gap-2 font-bold text-xs text-text-primary">
              <Bell className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>ConnectX Reminder</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              {reminder.title || reminder.text}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-main/50">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateReminderApi(reminder._id, { status: 'snoozed', snoozeMinutes: 15 });
                    toast.dismiss(t.id);
                    toast.success('Snoozed for 15 minutes');
                  } catch {
                    toast.dismiss(t.id);
                  }
                }}
                className="px-2.5 py-1 rounded-button bg-surface-alt hover:bg-surface text-[11px] font-semibold text-text-secondary border border-border-main transition-colors"
              >
                Snooze 15m
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateReminderApi(reminder._id, { status: 'done' });
                    toast.dismiss(t.id);
                    toast.success('Reminder marked as done! ✅');
                  } catch {
                    toast.dismiss(t.id);
                  }
                }}
                className="px-3 py-1 rounded-button bg-brand-500 hover:bg-brand-600 text-[11px] font-semibold text-white shadow-subtle transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ),
        {
          duration: 12000,
          id: `reminder-${reminder._id}`,
          icon: '⏰',
        }
      );
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:read', onRead);
    socket.on('message:deleted', onDeleted);
    socket.on('transcript:ready', onTranscriptReady);
    socket.on('reminder:due', onReminderDue);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:read', onRead);
      socket.off('message:deleted', onDeleted);
      socket.off('transcript:ready', onTranscriptReady);
      socket.off('reminder:due', onReminderDue);
    };
  }, [socket, activeConversationId, user?._id, handleIncomingMessage, handleMessageRead, handleMessageDeleted, emitMessageRead]);

  // Handle starting a conversation from search modal
  const handleSelectUserToChat = async (targetUser) => {
    try {
      const res = await createOrGetDirectConversationApi(targetUser._id);
      if (res.success && res.data?.conversation) {
        const conv = res.data.conversation;
        setSelectedDirectConv(conv);
        useChatStore.getState().upsertConversation(conv);
        setActiveConversation(conv._id);
        joinConversation(conv._id);
        setActiveTab('chats');
        fetchConversations();
        toast.success(`Chat opened with ${targetUser.name} 💬`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open conversation');
    }
  };

  const activeConversation = 
    conversations.find((c) => c._id?.toString() === activeConversationId?.toString()) ||
    (selectedDirectConv && selectedDirectConv._id?.toString() === activeConversationId?.toString() ? selectedDirectConv : null);
  const activeMessages = activeConversationId ? messagesByConv[activeConversationId] || [] : [];

  // Send message handler (supports text, attachments, replies, stickers, gifs, polls, links)
  const handleSendMessage = async (messagePayload) => {
    if (!activeConversationId) return;

    const { content, attachment, replyTo, type, aiCard, poll, linkPreview } = messagePayload;

    if (socket && socket.connected) {
      socket.emit('message:send', {
        conversationId: activeConversationId,
        content,
        attachment,
        replyTo,
        type,
        aiCard,
        poll,
        linkPreview,
      });
    } else {
      try {
        await sendMessageApi(activeConversationId, {
          content,
          attachment,
          replyTo,
          type,
          aiCard,
          poll,
          linkPreview,
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to send message');
      }
    }
  };

  const handleTabSelect = (tab) => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
      return;
    }
    setActiveTab(tab);
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

      {/* Column 2: Secondary Panel (Chats Sidebar, Contacts, Calls, Starred) */}
      <div
        className={`w-full md:w-[340px] lg:w-[360px] h-full ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeTab === 'chats' && (
          <Sidebar
            onOpenNewChat={() => setIsNewChatOpen(true)}
            onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsView onClose={() => setActiveTab('chats')} />
        )}

        {activeTab === 'calls' && (
          <CallsView onClose={() => setActiveTab('chats')} />
        )}

        {activeTab === 'starred' && (
          <StarredMessagesView onClose={() => setActiveTab('chats')} />
        )}
      </div>

      {/* Column 3: Active Chat Area (Visible when active chat on mobile, or full flex on desktop) */}
      <main
        className={`flex-1 h-[100dvh] flex flex-col bg-surface overflow-hidden ${
          !activeConversationId && activeTab === 'chats' ? 'hidden md:flex' : activeTab !== 'chats' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <ErrorBoundary onReset={() => setActiveConversation(null)}>
            <ChatHeader
              conversation={activeConversation}
              currentUserId={user?._id}
              onBack={() => setActiveConversation(null)}
              onToggleAiDrawer={() => setIsAiDrawerOpen((prev) => !prev)}
              aiDrawerOpen={isAiDrawerOpen}
            />

            {/* Catch-Up AI Banner when conversation has unread messages */}
            {activeConversation?.unreadCount > 0 && dismissedCatchUpConvId !== activeConversation._id && (
              <div className="px-4 py-2 bg-gradient-to-r from-brand-50 via-brand-100/40 to-teal-50 border-b border-brand-200/80 flex items-center justify-between animate-fade-in select-none">
                <div className="flex items-center gap-2 text-xs text-text-primary">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600 fill-brand-600 animate-pulse" />
                  <span>
                    You have <strong className="text-brand-700">{activeConversation.unreadCount} unread messages</strong> in this chat.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiDrawerInitialTab('catchup');
                      setIsAiDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gradient text-white text-xs font-semibold shadow-brand hover:shadow-brand-lg transition-all scale-100 active:scale-95"
                  >
                    <Sparkles className="w-3 h-3" />
                    Catch-Up ✨
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedCatchUpConvId(activeConversation._id)}
                    className="text-text-muted hover:text-text-primary text-xs px-1.5 py-0.5 rounded transition-colors"
                    title="Dismiss banner"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <MessageList
              conversation={activeConversation}
              messages={activeMessages}
              currentUserId={user?._id}
              onReply={(msg) => setReplyingTo(msg)}
              onDelete={(msg) => setDeleteTargetMessage(msg)}
              onInfo={(msg) => setInfoTargetMessage(msg)}
              onImageClick={(att) => setLightboxImage(att)}
              onRemind={(msg) => {
                setReminderTargetMessage(msg);
                setIsReminderModalOpen(true);
              }}
              onAnalyzeDoc={() => {
                setAiDrawerInitialTab('study');
                setIsAiDrawerOpen(true);
              }}
            />

            <Composer
              onSendMessage={handleSendMessage}
              disabled={false}
            />
          </ErrorBoundary>
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

      {/* Global 1:1 WebRTC Voice & Video Call Modal */}
      <CallModal />

      {/* Settings Modal (Privacy, Notifications, Chats & Blocked) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

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
          setActiveTab('chats');
        }}
      />

      <DiscoverRoomsModal
        isOpen={isDiscoverRoomsOpen}
        onClose={() => setIsDiscoverRoomsOpen(false)}
        onSelectRoom={(conv) => {
          fetchConversations();
          setActiveConversation(conv._id);
          joinConversation(conv._id);
          setActiveTab('chats');
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

      {/* ConnectX AI Insights Workspace Drawer */}
      <AiDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        conversationId={activeConversationId}
        conversation={activeConversation}
        initialTab={aiDrawerInitialTab}
      />

      {/* Smart Reminder Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setReminderTargetMessage(null);
        }}
        targetMessage={reminderTargetMessage}
        conversationId={activeConversationId}
      />
    </div>
  );
}
