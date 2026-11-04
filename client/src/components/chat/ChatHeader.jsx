import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  PanelRight, 
  MoreVertical, 
  Search, 
  Languages, 
  Sparkles, 
  Phone, 
  Video, 
  Clock, 
  Trash2, 
  Eraser, 
  Download, 
  Image as ImageIcon, 
  BellOff, 
  Bell 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Avatar from '../ui/Avatar.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { useAiStore } from '../../store/aiStore.js';
import { useTranslationStore } from '../../store/translationStore.js';
import { useCallStore } from '../../store/callStore.js';
import { updateConversationAiModeApi } from '../../api/ai.api.js';
import { 
  clearChatApi, 
  deleteChatApi, 
  muteChatApi, 
  exportChatApi 
} from '../../api/chat.api.js';
import ClearChatModal from '../modals/ClearChatModal.jsx';
import DeleteChatModal from '../modals/DeleteChatModal.jsx';
import DisappearingModal from '../modals/DisappearingModal.jsx';
import WallpaperModal from '../modals/WallpaperModal.jsx';

export default function ChatHeader({
  conversation,
  currentUserId,
  onBack,
  onToggleAiDrawer,
  aiDrawerOpen,
  onToggleSearch,
}) {
  const { toggleInfoDrawer, infoDrawerOpen, setActiveConversation } = useChatStore();
  const { typingUsers } = useSocketStore();
  const { settings: aiSettings, updateSettings: updateAiSettings, languages } = useAiStore();
  const { translateBatch } = useTranslationStore();
  const { startCall } = useCallStore();
  const messages = useChatStore((state) => (conversation?._id && state.messagesByConv ? state.messagesByConv[conversation._id] : []) || []);

  const [currentAiMode, setCurrentAiMode] = useState(conversation?.ai?.mode || 'on_demand');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);

  // Modals
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  useEffect(() => {
    setCurrentAiMode(conversation?.ai?.mode || 'on_demand');
  }, [conversation?.ai?.mode, conversation?._id]);

  const handleSelectAiMode = async (mode) => {
    if (!conversation?._id) return;
    try {
      setIsModeMenuOpen(false);
      setCurrentAiMode(mode);
      await updateConversationAiModeApi(conversation._id, mode);
      toast.success(`Conversation AI set to ${mode.replace('_', ' ')} ✨`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update AI mode');
    }
  };

  const autoTranslateList = aiSettings?.autoTranslateConversations || [];
  const isAutoTranslateOn = autoTranslateList.some(
    (id) => (id?._id || id)?.toString() === conversation?._id?.toString()
  );

  const preferredLangObj = (languages || []).find((l) => l.code === (aiSettings?.preferredLanguage || 'en'));
  const preferredLangName = preferredLangObj?.name || 'English';

  const handleToggleAutoTranslate = async () => {
    if (!aiSettings?.enabled) {
      toast.error('Please enable ConnectX AI in Settings first.');
      return;
    }

    const currentList = (aiSettings?.autoTranslateConversations || []).map((id) => (id?._id || id)?.toString());
    const convIdStr = conversation._id?.toString();

    let nextList;
    if (isAutoTranslateOn) {
      nextList = currentList.filter((id) => id !== convIdStr);
      toast('Auto-translation disabled for this chat');
    } else {
      nextList = [...currentList, convIdStr];
      toast.success(`Auto-translating incoming messages to ${preferredLangName} ✨`);

      const textMessageIds = messages
        .filter((m) => m.content && !m.isDeletedForEveryone && m.type !== 'system')
        .map((m) => m._id);
      if (textMessageIds.length > 0) {
        translateBatch({ messageIds: textMessageIds, targetLang: aiSettings?.preferredLanguage || 'en' });
      }
    }

    await updateAiSettings({ autoTranslateConversations: nextList });
  };

  const handleTranslateAll = async () => {
    const lang = aiSettings?.preferredLanguage || 'en';
    const textMessageIds = messages
      .filter((m) => m.content && !m.isDeletedForEveryone && m.type !== 'system')
      .map((m) => m._id);
    if (textMessageIds.length === 0) {
      toast('No text messages to translate');
      return;
    }
    toast.success(`Translating conversation messages to ${preferredLangName}... 🌐`);
    await translateBatch({ messageIds: textMessageIds, targetLang: lang });
  };

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

  // Handle Calls
  const handleStartCall = (type) => {
    if (!isDirect || !otherMember) return;
    startCall(conversation._id, otherMember, type);
  };

  // Handle Clear Chat
  const handleConfirmClear = async (keepStarred) => {
    try {
      await clearChatApi(conversation._id, keepStarred);
      toast.success('Chat cleared from your view');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear chat');
    }
  };

  // Handle Delete Chat
  const handleConfirmDelete = async () => {
    try {
      await deleteChatApi(conversation._id);
      toast.success('Chat removed from your list');
      setActiveConversation(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete chat');
    }
  };

  // Handle Mute
  const handleMute = async (duration) => {
    setIsMoreMenuOpen(false);
    try {
      const res = await muteChatApi(conversation._id, duration);
      if (res.success) {
        toast.success(duration ? `Muted notifications for ${duration}` : 'Unmuted notifications 🔔');
      }
    } catch (err) {
      toast.error('Failed to change notification settings');
    }
  };

  // Handle Export Chat (.txt)
  const handleExportChat = async () => {
    setIsMoreMenuOpen(false);
    try {
      toast.loading('Generating chat export...', { id: 'export-chat' });
      const res = await exportChatApi(conversation._id);
      toast.dismiss('export-chat');
      if (res.success && res.data?.text) {
        const blob = new Blob([res.data.text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `connectx_chat_${conversation.name || 'direct'}_${Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Chat exported successfully! 📄');
      }
    } catch (err) {
      toast.dismiss('export-chat');
      toast.error('Failed to export chat');
    }
  };

  const hasDisappearing = Boolean(conversation.disappearing?.durationSec);

  return (
    <>
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
            <div className="flex items-center gap-1.5 truncate">
              <h3 className="text-sm sm:text-base font-heading font-bold text-text-primary truncate">
                {title}
              </h3>
              {hasDisappearing && (
                <span title="Disappearing messages enabled" className="inline-flex text-brand-500">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                </span>
              )}
            </div>
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
        <div className="flex items-center gap-1.5 sm:gap-2 text-text-secondary">
          {/* 1:1 Voice & Video Call Buttons */}
          {isDirect && (
            <>
              <button
                type="button"
                onClick={() => handleStartCall('voice')}
                className="p-2 rounded-xl text-text-secondary hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Start Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleStartCall('video')}
                className="p-2 rounded-xl text-text-secondary hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Start Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Translate Conversation Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTranslateMenuOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-colors ${
                isAutoTranslateOn
                  ? 'text-brand-600 bg-brand-50 shadow-xs'
                  : 'text-text-secondary hover:text-brand-600 hover:bg-surface-alt'
              }`}
              title={`Translate chat to ${preferredLangName}`}
            >
              <Languages className="w-4 h-4" />
            </button>

            {isTranslateMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-surface rounded-2xl border border-border-main shadow-2xl p-2 z-40 animate-fade-in text-xs space-y-1.5">
                <div className="flex items-center justify-between px-2 py-1 border-b border-border-main pb-1.5">
                  <span className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                    AI Translation
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                    {preferredLangName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsTranslateMenuOpen(false);
                    handleTranslateAll();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-brand-50 text-text-primary hover:text-brand-700 transition-colors flex items-center gap-2"
                >
                  <Languages className="w-3.5 h-3.5 text-brand-500" />
                  <span>Translate all messages now</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsTranslateMenuOpen(false);
                    handleToggleAutoTranslate();
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between ${
                    isAutoTranslateOn
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'hover:bg-surface-alt text-text-secondary'
                  }`}
                >
                  <span>Auto-translate incoming messages</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                    isAutoTranslateOn ? 'bg-emerald-500 text-white' : 'bg-surface-alt text-text-muted'
                  }`}>
                    {isAutoTranslateOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* In-Chat Search Button */}
          {onToggleSearch && (
            <button
              type="button"
              onClick={onToggleSearch}
              className="p-2 rounded-xl text-text-secondary hover:text-brand-600 hover:bg-surface-alt transition-colors"
              title="Search in chat"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* AI Mode Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsModeMenuOpen((prev) => !prev)}
              className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                currentAiMode === 'auto'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : currentAiMode === 'off'
                  ? 'bg-gray-100 text-gray-600 border-gray-300'
                  : 'bg-brand-50 text-brand-700 border-brand-200'
              }`}
              title="Conversation AI Mode"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentAiMode === 'auto'
                    ? 'bg-emerald-500'
                    : currentAiMode === 'off'
                    ? 'bg-gray-400'
                    : 'bg-brand-500'
                }`}
              />
              <span>AI: {currentAiMode === 'auto' ? 'Auto' : currentAiMode === 'off' ? 'Off' : 'On-Demand'}</span>
            </button>

            {isModeMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl border border-border-main shadow-brand-lg p-1.5 z-30 animate-fade-in text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase">
                  Chat AI Mode
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAiMode('on_demand')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    currentAiMode === 'on_demand'
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'hover:bg-surface-alt'
                  }`}
                >
                  <span>On-Demand</span>
                  {currentAiMode === 'on_demand' && <span className="text-[10px] text-brand-600">Active</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAiMode('auto')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    currentAiMode === 'auto'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'hover:bg-surface-alt'
                  }`}
                >
                  <span>Auto-Extract</span>
                  {currentAiMode === 'auto' && <span className="text-[10px] text-emerald-600">Active</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAiMode('off')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    currentAiMode === 'off'
                      ? 'bg-gray-100 text-gray-700 font-bold'
                      : 'hover:bg-surface-alt'
                  }`}
                >
                  <span>AI Off</span>
                  {currentAiMode === 'off' && <span className="text-[10px] text-gray-600">Active</span>}
                </button>
              </div>
            )}
          </div>

          {/* AI Insights Workspace Button */}
          {onToggleAiDrawer && (
            <button
              type="button"
              onClick={onToggleAiDrawer}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs ${
                aiDrawerOpen
                  ? 'bg-brand-gradient text-white border-transparent shadow-brand'
                  : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200'
              }`}
              title="Open ConnectX AI Workspace"
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiDrawerOpen ? 'text-white' : 'text-brand-500 fill-brand-500'}`} />
              <span className="hidden sm:inline">AI Insights</span>
            </button>
          )}

          {/* More Options ⋮ Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl hover:bg-surface-alt transition-colors"
              title="Chat Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl border border-border-main shadow-2xl p-1.5 z-40 animate-fade-in text-xs space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsDisappearingModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-surface-alt text-text-primary transition-colors"
                >
                  <Clock className="w-4 h-4 text-brand-500" />
                  <span>Disappearing messages</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsWallpaperModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-surface-alt text-text-primary transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-brand-500" />
                  <span>Chat wallpaper</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportChat}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-surface-alt text-text-primary transition-colors"
                >
                  <Download className="w-4 h-4 text-brand-500" />
                  <span>Export chat (.txt)</span>
                </button>

                <div className="my-1 border-t border-border-main" />

                {/* Mute Submenu */}
                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase">
                  Mute Notifications
                </div>
                <div className="grid grid-cols-3 gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => handleMute('8 hours')}
                    className="px-2 py-1 rounded-lg bg-surface-alt hover:bg-brand-50 text-[11px] font-medium text-center"
                  >
                    8h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMute('1 week')}
                    className="px-2 py-1 rounded-lg bg-surface-alt hover:bg-brand-50 text-[11px] font-medium text-center"
                  >
                    1w
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMute('forever')}
                    className="px-2 py-1 rounded-lg bg-surface-alt hover:bg-brand-50 text-[11px] font-medium text-center"
                  >
                    Always
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleMute(null)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-text-muted hover:text-text-primary hover:bg-surface-alt"
                >
                  Unmute notifications
                </button>

                <div className="my-1 border-t border-border-main" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsClearModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-status-danger/10 text-status-danger transition-colors font-medium"
                >
                  <Eraser className="w-4 h-4" />
                  <span>Clear chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-status-danger/10 text-status-danger transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete chat</span>
                </button>
              </div>
            )}
          </div>

          {/* Details Drawer Toggle */}
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

      {/* Clear Chat Confirmation Modal */}
      <ClearChatModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
      />

      {/* Delete Chat Confirmation Modal */}
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        conversation={conversation}
        onConfirm={handleConfirmDelete}
      />

      {/* Disappearing Messages Modal */}
      <DisappearingModal
        isOpen={isDisappearingModalOpen}
        onClose={() => setIsDisappearingModalOpen(false)}
        conversationId={conversation._id}
        currentDurationSec={conversation.disappearing?.durationSec}
        onUpdated={() => {}}
      />

      {/* Wallpaper Picker Modal */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        conversationId={conversation._id}
        currentWallpaper={conversation.wallpaper}
        onWallpaperChange={(newWallpaper) => {
          useChatStore.getState().upsertConversation({
            _id: conversation._id,
            wallpaper: newWallpaper,
          });
        }}
      />
    </>
  );
}
