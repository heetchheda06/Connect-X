import React, { useState, useEffect } from 'react';
import { ArrowLeft, PanelRight, MoreVertical, Search, Languages, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Avatar from '../ui/Avatar.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { useAiStore } from '../../store/aiStore.js';
import { useTranslationStore } from '../../store/translationStore.js';
import { updateConversationAiModeApi } from '../../api/ai.api.js';

export default function ChatHeader({
  conversation,
  currentUserId,
  onBack,
  onToggleAiDrawer,
  aiDrawerOpen,
}) {
  const { toggleInfoDrawer, infoDrawerOpen } = useChatStore();
  const { typingUsers } = useSocketStore();
  const { settings: aiSettings, updateSettings: updateAiSettings, languages } = useAiStore();
  const { translateBatch } = useTranslationStore();
  const messages = useChatStore((state) => (conversation?._id && state.messagesByConv ? state.messagesByConv[conversation._id] : []) || []);

  const [currentAiMode, setCurrentAiMode] = useState(conversation?.ai?.mode || 'on_demand');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

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

      // Translate currently visible text messages
      const textMessageIds = messages
        .filter((m) => m.content && !m.isDeletedForEveryone && m.type !== 'system')
        .map((m) => m._id);
      if (textMessageIds.length > 0) {
        translateBatch({ messageIds: textMessageIds, targetLang: aiSettings?.preferredLanguage || 'en' });
      }
    }

    await updateAiSettings({ autoTranslateConversations: nextList });
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
      <div className="flex items-center gap-2 text-text-secondary">
        {/* AI Mode Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsModeMenuOpen((prev) => !prev)}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
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
            title="Open ConnectX AI Workspace (Catch-Up, Tasks, Ask AI, Meetings, Study)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiDrawerOpen ? 'text-white' : 'text-brand-500 fill-brand-500'}`} />
            <span className="hidden sm:inline">AI Insights</span>
          </button>
        )}

        {/* Auto-Translate Toggle Button if AI is enabled */}
        {aiSettings?.enabled && (
          <button
            type="button"
            onClick={handleToggleAutoTranslate}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all border ${
              isAutoTranslateOn
                ? 'bg-brand-50 text-brand-700 border-brand-300 font-semibold shadow-xs'
                : 'bg-surface text-text-muted hover:text-text-primary border-border-main hover:border-brand-200'
            }`}
            title={
              isAutoTranslateOn
                ? `Auto-translate is ON (${preferredLangName}). Click to turn off.`
                : `Turn on auto-translate to ${preferredLangName}`
            }
          >
            <Languages className={`w-3.5 h-3.5 ${isAutoTranslateOn ? 'text-brand-500' : 'text-text-muted'}`} />
            <span className="text-[11px]">
              {isAutoTranslateOn ? `Translating → ${preferredLangName}` : `Translate → ${preferredLangName}`}
            </span>
          </button>
        )}

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

