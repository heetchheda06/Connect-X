import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useSocketStore } from '../store/socketStore.js';
import useSocket from '../hooks/useSocket.js';
import Avatar from '../components/ui/Avatar.jsx';
import EditProfileModal from '../components/modals/EditProfileModal.jsx';
import UserProfileModal from '../components/modals/UserProfileModal.jsx';
import UserSearchBar from '../components/users/UserSearchBar.jsx';
import TypingIndicator from '../components/chat/TypingIndicator.jsx';
import ReconnectingBanner from '../components/layout/ReconnectingBanner.jsx';
import { 
  getConversationsApi, 
  createOrGetDirectConversationApi, 
  getMessagesApi, 
  sendMessageApi,
  markMessagesAsReadApi 
} from '../api/chat.api.js';
import { 
  LogOut, 
  Mail, 
  AtSign, 
  Calendar, 
  Edit3, 
  Send, 
  CheckCircle2, 
  Users, 
  MessageSquare,
  Sparkles,
  Waves,
  Zap,
  Check,
  CheckCheck,
  Radio
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function HomePage() {
  const { user, logout } = useAuthStore();
  const { isConnected, socket } = useSocket();
  const { 
    typingUsers, 
    emitTypingStart, 
    emitTypingStop, 
    emitMessageRead,
    joinConversation 
  } = useSocketStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  // Conversations & active chat state
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConversationRef = useRef(activeConversation);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await getConversationsApi();
      if (res.success && res.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Set up real-time Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    // 1. Instant incoming message listener
    const handleNewMessage = ({ conversationId, message }) => {
      const currentActive = activeConversationRef.current;

      // If this message belongs to the currently opened conversation
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) => {
          // Prevent duplicates if already added by sender's optimistic UI
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });

        // If message is from someone else, mark as read immediately
        if (message.sender?._id !== user?._id) {
          emitMessageRead(conversationId);
        }
      }

      // Update the conversation list previews and unread badges in real time
      setConversations((prevConvs) => {
        const existingIdx = prevConvs.findIndex((c) => c._id === conversationId);
        if (existingIdx === -1) {
          // If a new conversation, refresh list
          loadConversations();
          return prevConvs;
        }

        const updatedConv = { ...prevConvs[existingIdx] };
        updatedConv.lastMessage = message;
        updatedConv.updatedAt = message.createdAt;

        // If not in this active conversation and message is from another user, increment unread count
        if ((!currentActive || currentActive._id !== conversationId) && message.sender?._id !== user?._id) {
          updatedConv.unreadCount = (updatedConv.unreadCount || 0) + 1;
        }

        // Move to the top of the conversation list
        const filtered = prevConvs.filter((c) => c._id !== conversationId);
        return [updatedConv, ...filtered];
      });
    };

    // 2. Real-time read receipts listener
    const handleMessageRead = ({ conversationId, userId: readerId, readAt }) => {
      const currentActive = activeConversationRef.current;
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.sender?._id === user?._id) {
              const alreadyRead = msg.readBy?.some((r) => r.user === readerId);
              if (!alreadyRead) {
                return {
                  ...msg,
                  readBy: [...(msg.readBy || []), { user: readerId, readAt }],
                };
              }
            }
            return msg;
          })
        );
      }
    };

    // 3. Real-time delete sync listener
    const handleMessageDeleted = ({ conversationId, messageId }) => {
      const currentActive = activeConversationRef.current;
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, content: '🚫 This message was deleted', attachment: null, isDeletedForEveryone: true }
              : msg
          )
        );
      }
    };

    // 4. Presence updates (online/offline)
    const handlePresenceUpdate = ({ userId: targetUserId, isOnline }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          const updatedMembers = conv.members?.map((m) => {
            if (m.user?._id === targetUserId) {
              return { ...m, user: { ...m.user, isOnline } };
            }
            return m;
          });
          return { ...conv, members: updatedMembers };
        })
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleMessageRead);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [socket, user?._id, emitMessageRead]);

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const res = await createOrGetDirectConversationApi(targetUser._id);
      if (res.success && res.data?.conversation) {
        const conv = res.data.conversation;
        setActiveConversation(conv);
        joinConversation(conv._id);
        loadMessages(conv._id);
        loadConversations();
        toast.success(`Chat opened with ${targetUser.name} 💬`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open conversation');
    }
  };

  const loadMessages = async (convId) => {
    try {
      setLoadingMessages(true);
      const res = await getMessagesApi(convId);
      if (res.success && res.data?.messages) {
        setMessages(res.data.messages);
        // Mark as read via socket and REST
        emitMessageRead(convId);
        await markMessagesAsReadApi(convId).catch(() => {});
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (!activeConversation) return;

    if (text.trim()) {
      emitTypingStart(activeConversation._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop(activeConversation._id);
      }, 2500);
    } else {
      emitTypingStop(activeConversation._id);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const messageContent = inputText.trim();
    emitTypingStop(activeConversation._id);

    try {
      setSendingMessage(true);

      // Send via socket if connected, or fallback to REST
      if (socket && socket.connected) {
        socket.emit(
          'message:send',
          {
            conversationId: activeConversation._id,
            content: messageContent,
          },
          (response) => {
            if (response && !response.success) {
              toast.error(response.error || 'Failed to send message');
            }
          }
        );
      } else {
        // Fallback REST call
        const res = await sendMessageApi(activeConversation._id, {
          content: messageContent,
        });
        if (res.success && res.data?.message) {
          setMessages((prev) => [...prev, res.data.message]);
        }
      }

      setInputText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully. Come back soon! 👋');
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const activeTypingMap = activeConversation ? typingUsers[activeConversation._id] || {} : {};

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-start p-4 sm:p-8 font-sans">
      <ReconnectingBanner />

      {/* Decorative ocean ambient orbs */}
      <div className="fixed top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-100px] right-[-100px] w-96 h-96 rounded-full bg-brand-300/30 blur-3xl pointer-events-none" />

      {/* Main Top Navbar */}
      <header className="w-full max-w-5xl flex items-center justify-between pb-6 border-b border-border-main z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-brand text-white font-bold text-xl tracking-tight">
            CX
          </div>
          <div>
            <h1 className="text-xl font-heading font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              ConnectX
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-online animate-pulse' : 'bg-status-danger'}`} />
                {isConnected ? 'Real-Time Socket Connected' : 'Connecting...'}
              </span>
            </h1>
            <p className="text-xs text-text-secondary">
              Logged in as <span className="font-semibold text-brand-600">@{user?.username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-brand-gradient text-white text-xs sm:text-sm font-semibold shadow-brand hover:shadow-brand-lg transition-all duration-200 active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-surface border border-border-main text-text-secondary hover:text-status-danger hover:border-status-danger/30 hover:bg-status-danger/5 text-xs sm:text-sm font-semibold shadow-subtle transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full max-w-5xl my-8 flex flex-col gap-6 z-10">
        {/* User Profile Banner */}
        <div className="bg-surface rounded-card p-6 border border-border-main shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={user?.avatar}
              name={user?.name}
              id={user?._id}
              size="xl"
              showOnline={true}
              isOnline={user?.isOnline !== false}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading font-bold text-text-primary">
                  {user?.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-status-online/15 text-status-online border border-status-online/20 text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-online" />
                  Live Presence Active
                </span>
              </div>
              <p className="text-xs text-text-secondary">@{user?.username} • {user?.email}</p>
              <p className="text-xs text-text-muted italic mt-0.5">"{user?.status}"</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-button font-medium flex items-center gap-1.5 shadow-subtle">
              <Zap className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
              Socket.IO WebSockets Active
            </span>
          </div>
        </div>

        {/* Step 5 Live Conversations & Instant Chat Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Conversations List & Search */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* User Search with "Message" button */}
            <div className="bg-surface rounded-card p-5 border border-border-main shadow-card">
              <h3 className="text-sm font-heading font-bold text-text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-500" />
                Find Member to Chat
              </h3>
              <UserSearchBar
                onSelectUser={(u) => handleStartChatWithUser(u)}
              />
            </div>

            {/* Live Conversation List */}
            <div className="bg-surface rounded-card p-5 border border-border-main shadow-card flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-main">
                <h3 className="text-sm font-heading font-bold text-text-primary flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-500" />
                  Live Conversations
                </h3>
                <span className="text-xs text-text-muted font-medium">
                  {conversations.length} Active
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">
                    No conversations yet. Search for a member above to start chatting!
                  </p>
                ) : (
                  conversations.map((conv) => {
                    const otherMember = conv.type === 'direct'
                      ? conv.members.find((m) => m.user?._id?.toString() !== user?._id?.toString())?.user
                      : null;

                    const title = conv.type === 'direct' ? otherMember?.name || 'Direct Chat' : conv.name;
                    const isSelected = activeConversation?._id === conv._id;

                    return (
                      <div
                        key={conv._id}
                        onClick={() => {
                          setActiveConversation(conv);
                          joinConversation(conv._id);
                          loadMessages(conv._id);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-brand-50/80 border-brand-300 shadow-subtle'
                            : 'bg-surface-alt/50 border-border-main hover:bg-surface-alt'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Avatar
                            src={conv.type === 'direct' ? otherMember?.avatar : conv.avatar}
                            name={title}
                            id={conv.type === 'direct' ? otherMember?._id : conv._id}
                            size="md"
                            showOnline={conv.type === 'direct'}
                            isOnline={otherMember?.isOnline}
                          />
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-text-primary truncate">
                              {title}
                            </h4>
                            <p className="text-[11px] text-text-secondary truncate mt-0.5">
                              {conv.lastMessage?.content || 'No messages yet'}
                            </p>
                          </div>
                        </div>

                        {conv.unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-accent-coral text-white text-[10px] font-bold shadow-sm flex-shrink-0 animate-pulse">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Active Conversation Messages, Typing & Composer */}
          <div className="lg:col-span-7 bg-surface rounded-card p-5 border border-border-main shadow-card flex flex-col justify-between min-h-[480px]">
            {activeConversation ? (
              <>
                {/* Active Chat Header with Live Status */}
                <div className="pb-3 border-b border-border-main flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={
                        activeConversation.type === 'direct'
                          ? activeConversation.members.find((m) => m.user?._id?.toString() !== user?._id?.toString())?.user?.name || 'Chat'
                          : activeConversation.name
                      }
                      size="sm"
                      showOnline={activeConversation.type === 'direct'}
                      isOnline={
                        activeConversation.members.find((m) => m.user?._id?.toString() !== user?._id?.toString())?.user?.isOnline
                      }
                    />
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {activeConversation.type === 'direct'
                          ? activeConversation.members.find((m) => m.user?._id?.toString() !== user?._id?.toString())?.user?.name
                          : activeConversation.name}
                      </h4>
                      <span className="text-[10px] text-brand-600 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-pulse" />
                        Instant WebSocket Stream Active • {messages.length} messages
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 my-4 space-y-3 overflow-y-auto max-h-[320px] p-3 bg-chat-pattern rounded-xl border border-border-main/50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-xs text-text-muted">
                      Loading real-time message stream...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-text-muted text-center p-4">
                      No messages yet. Send a message to see instant real-time delivery! 🌊
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender?._id?.toString() === user?._id?.toString();
                      const isRead = msg.readBy && msg.readBy.length > 1;

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-fade-in`}
                        >
                          <div
                            className={`px-3.5 py-2 text-xs max-w-[80%] rounded-bubble ${
                              isOwn
                                ? 'bg-brand-gradient text-white rounded-tr-bubble-tail shadow-brand'
                                : 'bg-surface text-text-primary rounded-tl-bubble-tail border border-border-main shadow-subtle'
                            }`}
                          >
                            <p className="font-medium break-words">{msg.content}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isOwn ? 'text-white/80' : 'text-text-muted'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isOwn && (
                                isRead ? (
                                  <span title="Read by recipient" className="text-white tick-read-glow inline-flex">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span title="Delivered" className="text-white/70 inline-flex">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Live Typing Indicator */}
                <div className="min-h-[26px] mb-1">
                  <TypingIndicator
                    typingUsersMap={activeTypingMap}
                    currentUserId={user?._id}
                  />
                </div>

                {/* Instant Composer Form */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-border-main">
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type a message (instant delivery)..."
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sendingMessage}
                    className="p-2.5 rounded-button bg-brand-gradient text-white shadow-brand hover:shadow-brand-lg transition-all disabled:opacity-50 active:scale-95"
                    title="Send (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted">
                <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-500 mb-3 shadow-subtle">
                  <Zap className="w-7 h-7 text-brand-500 animate-bounce" />
                </div>
                <h4 className="text-sm font-bold text-text-primary">
                  Instant Real-Time Chat Ready
                </h4>
                <p className="text-xs text-text-secondary mt-1 max-w-xs">
                  Select a conversation from the left or search a member. Messages, typing status, and read receipts will now update instantly without refreshing!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Step 5 Technical Capabilities Verification Card */}
        <div className="bg-surface rounded-card p-6 border border-border-main shadow-card">
          <h4 className="font-heading font-bold text-base text-text-primary mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-status-online" />
            Step 5 Real-Time Socket.IO Features Implemented
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-text-secondary">
            <div className="p-3 rounded-xl bg-surface-alt border border-border-main">
              <span className="font-bold text-text-primary block mb-1">JWT Socket Handshake</span>
              <code className="text-brand-600 bg-brand-50 px-1 py-0.5 rounded text-[11px] block mb-1">
                io.use(socketAuthMiddleware)
              </code>
              Secure socket connection authenticated via client token on connection.
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main">
              <span className="font-bold text-text-primary block mb-1">Instant Message Delivery</span>
              <code className="text-brand-600 bg-brand-50 px-1 py-0.5 rounded text-[11px] block mb-1">
                message:send → message:new
              </code>
              Messages stream live into open conversation windows with zero page reloads.
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main">
              <span className="font-bold text-text-primary block mb-1">Live Typing Indicator</span>
              <code className="text-brand-600 bg-brand-50 px-1 py-0.5 rounded text-[11px] block mb-1">
                typing:start / typing:stop
              </code>
              Animated 3-dot indicators with auto-clear after 3s of inactivity.
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main">
              <span className="font-bold text-text-primary block mb-1">Multi-Tab Presence</span>
              <code className="text-brand-600 bg-brand-50 px-1 py-0.5 rounded text-[11px] block mb-1">
                presenceService
              </code>
              Presence counter ensures offline status is only broadcast when all user tabs close.
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl text-center pt-4 border-t border-border-main text-xs text-text-muted z-10">
        ConnectX Platform • Step 5: Real-Time Socket.IO Layer (Live Messages, Presence, Typing & Read Receipts)
      </footer>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedProfileUser}
        isOpen={Boolean(selectedProfileUser)}
        onClose={() => setSelectedProfileUser(null)}
        onStartChat={handleStartChatWithUser}
      />
    </div>
  );
}
