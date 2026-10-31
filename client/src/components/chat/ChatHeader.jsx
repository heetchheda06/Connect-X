import React from 'react';
import { ArrowLeft, PanelRight, MoreVertical, Search, Languages, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Avatar from '../ui/Avatar.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { useAiStore } from '../../store/aiStore.js';
import { useTranslationStore } from '../../store/translationStore.js';

export default function ChatHeader({
  conversation,
  currentUserId,
  onBack,
}) {
  const { toggleInfoDrawer, infoDrawerOpen } = useChatStore();
  const { typingUsers } = useSocketStore();
  const { settings: aiSettings, updateSettings: updateAiSettings, languages } = useAiStore();
  const { translateBatch } = useTranslationStore();
  const messages = useChatStore((state) => state.messages[conversation._id] || []);

  const autoTranslateList = aiSettings?.autoTranslateConversations || [];
  const isAutoTranslateOn = autoTranslateList.some(
    (id) => (id?._id || id)?.toString() === conversation._id?.toString()
  );

  const preferredLangObj = languages.find((l) => l.code === (aiSettings?.preferredLanguage || 'en'));
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

