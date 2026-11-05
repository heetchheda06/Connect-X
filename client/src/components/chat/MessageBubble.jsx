import React, { useState } from 'react';
import { formatMessageTime } from '../../utils/date.js';
import { formatFileSize, isImageFile, getMediaUrl } from '../../utils/file.js';
import { useAiStore } from '../../store/aiStore.js';
import { useTranslationStore } from '../../store/translationStore.js';
import { useChatStore } from '../../store/chatStore.js';
import VoicePlayer from './VoicePlayer.jsx';
import { 
  Check, 
  CheckCheck, 
  Reply, 
  Trash2, 
  Ban, 
  Download, 
  FileText, 
  FileArchive, 
  FileSpreadsheet, 
  FileCode,
  Info,
  Languages,
  Sparkles, 
  Loader2, 
  RotateCw, 
  Bell, 
  Star,
  Forward,
  Pin,
  Edit2,
  Copy,
  Smile,
  Phone,
  Video,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  ExternalLink,
  Globe,
  BarChart2
} from 'lucide-react';
import { 
  starMessageApi, 
  unstarMessageApi, 
  reactToMessageApi, 
  votePollApi, 
  pinMessageApi, 
  unpinMessageApi 
} from '../../api/chat.api.js';
import { toast } from 'react-hot-toast';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

const safeText = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '[object Object]' || t === '{}' || t === 'null' || t === 'undefined') return '';
    return val;
  }
  if (typeof val === 'object') {
    const extracted = val.text || val.content || val.message || '';
    if (typeof extracted === 'string' && extracted.trim() !== '[object Object]') return extracted;
    return '';
  }
  return String(val);
};

export default function MessageBubble({
  message,
  isOwn,
  showSenderName = false,
  currentUserId,
  onReply,
  onDelete,
  onImageClick,
  onInfo,
  onRemind,
  onAnalyzeDoc,
  onEdit,
  onForward,
}) {
  const { isMultiSelect, selectedMessageIds, toggleSelectMessage } = useChatStore();
  const isDeleted = message.isDeletedForEveryone;
  const isRead = message.readBy && message.readBy.length > 1;
  const isDelivered = message.deliveredTo && message.deliveredTo.length > 1;

  const [isReactPickerOpen, setIsReactPickerOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const attachment = message.attachment;
  const isVoice = message.type === 'voice' || (attachment && attachment.mimeType?.startsWith('audio/'));
  const isVideo = message.type === 'video' || (attachment && attachment.mimeType?.startsWith('video/'));
  const isSticker = message.type === 'sticker';
  const isGif = message.type === 'gif';
  const isPoll = message.type === 'poll';
  const isCall = message.type === 'call';
  const isAiCard = message.type === 'ai_card';
  const hasImage = !isVoice && !isVideo && !isSticker && !isGif && attachment && isImageFile(attachment.mimeType, attachment.name);
  const hasFile = !isVoice && !isVideo && !isSticker && !isGif && attachment && !hasImage;

  const isStarred = (message.starredBy || []).some(
    (id) => (id?._id || id)?.toString() === currentUserId?.toString()
  );

  const isSelected = selectedMessageIds.includes(message._id);

  // Translation store
  const { settings: aiSettings, languages } = useAiStore();
  const { 
    getTranslation, 
    isTranslating, 
    getError, 
    toggleShowOriginal, 
    translateMessage 
  } = useTranslationStore();

  const translation = getTranslation(message._id);
  const isTranslatingMessage = isTranslating(message._id);
  const translationError = getError(message._id);
  const preferredLang = aiSettings?.preferredLanguage || 'en';
  const targetLangObj = (languages || []).find((l) => l.code === preferredLang);
  const targetLangLabel = targetLangObj?.name || 'English';
  const canTranslate = !isDeleted && message.content && aiSettings?.enabled;

  const handleManualTranslate = () => {
    if (translation) {
      toggleShowOriginal(message._id);
      return;
    }
    translateMessage({
      messageId: message._id,
      targetLang: preferredLang,
    });
  };

  // Reactions handling
  const handleToggleReaction = async (emoji) => {
    try {
      setIsReactPickerOpen(false);
      await reactToMessageApi(message._id, emoji);
    } catch {
      toast.error('Failed to update reaction');
    }
  };

  // Star handling
  const handleToggleStar = async () => {
    try {
      if (isStarred) {
        await unstarMessageApi(message._id);
        toast.success('Message unstarred');
      } else {
        await starMessageApi(message._id);
        toast.success('Message starred ⭐');
      }
    } catch {
      toast.error('Failed to star message');
    }
  };

  // Pin message in conversation
  const handleTogglePin = async () => {
    try {
      const convId = message.conversation?._id || message.conversation;
      await pinMessageApi(convId, message._id);
      toast.success('Message pinned in chat 📌');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pin message');
    }
  };

  // Poll voting
  const handleVotePoll = async (optionId) => {
    try {
      await votePollApi(message._id, optionId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit vote');
    }
  };

  // Copy text
  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success('Copied to clipboard 📋');
    }
  };

  // Check if within 15 minutes for editing
  const canEdit = isOwn && !isDeleted && Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;

  // Poll calculation
  const poll = message.poll;
  let totalVotes = 0;
  if (poll && Array.isArray(poll.options)) {
    totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voters?.length || 0), 0);
  }

  // Reactions grouped
  const reactionGroups = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const getFileIcon = (filename = '', mime = '') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['zip', 'rar', 'tar', 'gz'].includes(ext) || mime.includes('zip')) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (['js', 'jsx', 'html', 'css', 'json', 'py', 'ts'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-indigo-500" />;
    }
    return <FileText className="w-5 h-5 text-brand-500" />;
  };

  return (
    <div
      className={`group relative flex items-start gap-2 mb-2.5 max-w-[88%] sm:max-w-[78%] md:max-w-[68%] ${
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'
      }`}
    >
      {/* Multi-Select Checkbox */}
      {isMultiSelect && (
        <div
          onClick={() => toggleSelectMessage(message._id)}
          className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all mt-2.5 flex-shrink-0 ${
            isSelected
              ? 'bg-brand-500 text-white shadow-sm'
              : 'border-2 border-border-main hover:border-brand-400 bg-surface'
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-full`}>
        {/* Sender name for group chats if incoming */}
        {showSenderName && !isOwn && (
          <span className="text-[11px] font-semibold text-brand-700 mb-1 pl-1">
            {message.sender?.name || message.sender?.username}
          </span>
        )}

        {/* Forwarded Banner */}
        {message.forwarded && (
          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted italic mb-0.5 px-1">
            <Forward className="w-3 h-3 text-text-muted" />
            Forwarded
          </span>
        )}

        {/* ================= STICKER MESSAGE ================= */}
        {isSticker && attachment ? (
          <div className="relative select-none p-1">
            <img
              src={getMediaUrl(attachment.url)}
              alt="Sticker"
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain hover:scale-105 transition-transform"
              loading="lazy"
            />
            <div className="text-[10px] text-text-muted text-right mt-0.5">
              {formatMessageTime(message.createdAt)}
            </div>
          </div>
        ) : isCall ? (
          /* ================= CALL EVENT MESSAGE ================= */
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface border border-border-main text-xs shadow-xs text-text-secondary">
            {message.callDetails?.status === 'missed' ? (
              <PhoneMissed className="w-4 h-4 text-status-danger" />
            ) : message.callDetails?.type === 'video' ? (
              <Video className="w-4 h-4 text-brand-500" />
            ) : (
              <Phone className="w-4 h-4 text-brand-500" />
            )}
            <span>{message.content}</span>
            <span className="text-[10px] text-text-muted ml-1">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        ) : (
          /* ================= STANDARD BUBBLE CONTAINER ================= */
          <div
            className={`relative px-4 py-2.5 rounded-bubble select-text transition-shadow ${
              isOwn
                ? 'bg-brand-gradient text-white rounded-tr-bubble-tail shadow-brand'
                : 'bg-surface text-text-primary rounded-tl-bubble-tail border border-border-main shadow-subtle'
            }`}
          >
            {/* Reply Quoted Context */}
            {message.replyTo && (
              <div
                className={`mb-2 p-2 rounded-xl text-xs border-l-4 overflow-hidden select-none ${
                  isOwn
                    ? 'bg-white/15 border-white/80 text-white'
                    : 'bg-surface-alt border-brand-500 text-text-secondary'
                }`}
              >
                <span className="font-bold text-[11px] block truncate">
                  {message.replyTo.sender?.name || 'Reply'}
                </span>
                <p className="truncate text-[11px] opacity-90">
                  {message.replyTo.isDeletedForEveryone
                    ? '🚫 This message was deleted'
                    : safeText(message.replyTo.content) || 'Attachment'}
                </p>
              </div>
            )}

            {/* Deleted Message Placeholder */}
            {isDeleted ? (
              <div className="flex items-center gap-1.5 italic opacity-75 text-xs py-0.5">
                <Ban className="w-3.5 h-3.5" />
                <span>This message was deleted</span>
              </div>
            ) : (
              <>
                {/* Voice Note Player */}
                {isVoice && <VoicePlayer message={message} isOwn={isOwn} />}

                {/* Video Player */}
                {isVideo && attachment && (
                  <div className="mb-2 overflow-hidden rounded-xl bg-black border border-black/10">
                    <video
                      controls
                      src={getMediaUrl(attachment.url)}
                      className="max-h-72 w-full rounded-xl"
                    />
                  </div>
                )}

                {/* GIF Player */}
                {isGif && attachment && (
                  <div className="mb-2 overflow-hidden rounded-xl border border-border-main/50 relative">
                    <img
                      src={attachment.url}
                      alt={attachment.name || 'GIF'}
                      className="max-h-72 w-full object-cover rounded-xl"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white font-bold text-[9px]">
                      GIF
                    </span>
                  </div>
                )}

                {/* Poll Card */}
                {isPoll && poll && (
                  <div className="mb-2 p-3 rounded-2xl bg-surface-alt/70 border border-border-main space-y-2.5 min-w-[240px]">
                    <div className="flex items-center gap-2 font-bold text-xs text-text-primary">
                      <BarChart2 className="w-4 h-4 text-brand-600" />
                      <span>{poll.question}</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {poll.options.map((opt) => {
                        const voterCount = opt.voters?.length || 0;
                        const percent = totalVotes > 0 ? Math.round((voterCount / totalVotes) * 100) : 0;
                        const hasVoted = opt.voters?.some(
                          (v) => (v?._id || v)?.toString() === currentUserId?.toString()
                        );

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleVotePoll(opt.id)}
                            className="relative overflow-hidden p-2 rounded-xl border border-border-main bg-surface cursor-pointer hover:border-brand-300 transition-all text-xs"
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-brand-500/15 rounded-xl transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                            <div className="relative flex items-center justify-between z-10">
                              <span className={`font-medium ${hasVoted ? 'text-brand-700 font-bold' : 'text-text-primary'}`}>
                                {opt.text}
                              </span>
                              <span className="text-[10px] font-semibold text-text-muted">
                                {percent}% ({voterCount})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-text-muted block text-right">
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* AI Generated Card */}
                {isAiCard && (
                  <div
                    className={`mb-2 p-3 rounded-xl border space-y-2 select-text ${
                      isOwn ? 'bg-white/15 border-white/20 text-white' : 'bg-brand-50/70 border-brand-200 text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                      <span>{message.aiCard?.title || 'ConnectX AI Insight'}</span>
                    </div>
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                )}

                {/* Image Attachment Preview */}
                {hasImage && !imageFailed && (
                  <div className="mb-2 overflow-hidden rounded-xl bg-deep-900/10 border border-black/5">
                    <img
                      src={getMediaUrl(attachment.url)}
                      alt={attachment.name || 'Shared image'}
                      onError={() => setImageFailed(true)}
                      onClick={() => onImageClick && onImageClick({ ...attachment, url: getMediaUrl(attachment.url) })}
                      className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Document / File Attachment Card */}
                {hasFile && (
                  <div
                    className={`mb-2 p-2.5 rounded-xl border flex flex-col gap-2 ${
                      isOwn ? 'bg-white/15 border-white/20 text-white' : 'bg-surface-alt border-border-main text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-2 rounded-lg bg-white shadow-subtle flex-shrink-0">
                          {getFileIcon(attachment.name, attachment.mimeType)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate">{attachment.name}</p>
                          <span className={`text-[10px] ${isOwn ? 'text-white/80' : 'text-text-muted'}`}>
                            {formatFileSize(attachment.size)}
                          </span>
                        </div>
                      </div>

                      <a
                        href={getMediaUrl(attachment.url)}
                        download={attachment.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                          isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-surface hover:bg-surface-alt text-brand-600 border border-border-main'
                        }`}
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Link Preview Card */}
                {message.linkPreview && (
                  <a
                    href={message.linkPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mb-2 block p-2 rounded-xl border text-left transition-opacity hover:opacity-95 ${
                      isOwn ? 'bg-white/15 border-white/20 text-white' : 'bg-surface-alt border-border-main text-text-primary'
                    }`}
                  >
                    {message.linkPreview.image && (
                      <img
                        src={message.linkPreview.image}
                        alt="Link preview"
                        className="w-full h-32 object-cover rounded-lg mb-1.5"
                      />
                    )}
                    <span className="text-[10px] uppercase font-bold opacity-75 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {message.linkPreview.siteName || 'Link'}
                    </span>
                    <p className="text-xs font-bold truncate mt-0.5">{message.linkPreview.title}</p>
                    {message.linkPreview.description && (
                      <p className="text-[11px] opacity-80 line-clamp-2 mt-0.5">
                        {message.linkPreview.description}
                      </p>
                    )}
                  </a>
                )}

                {/* Message Text */}
                {!isAiCard && !isPoll && !isVoice && (
                  (() => {
                    const displayContent = safeText(message.content);
                    if (!displayContent) return null;
                    return (
                      <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {displayContent}
                      </p>
                    );
                  })()
                )}

                {/* Translation Tinted Block */}
                {(translation || isTranslatingMessage || translationError) && (
                  <div className="mt-2.5 pt-2 border-t border-brand-200/40 text-left">
                    <div
                      className={`rounded-xl p-2.5 shadow-subtle text-xs space-y-1.5 ${
                        isOwn ? 'bg-white/15 text-white border border-white/25' : 'bg-brand-50/90 text-text-primary border border-brand-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${
                            isOwn ? 'bg-white/20 text-white border-white/30' : 'bg-white text-brand-700 border-brand-200'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500" />
                          AI Translated · {targetLangLabel}
                        </span>

                        {translation && !isTranslatingMessage && (
                          <button
                            type="button"
                            onClick={() => toggleShowOriginal(message._id)}
                            className={`text-[10px] font-semibold underline transition-opacity hover:opacity-80 ${
                              isOwn ? 'text-white' : 'text-brand-600'
                            }`}
                          >
                            {translation.showOriginal ? 'Show translation' : 'Show original'}
                          </button>
                        )}
                      </div>

                      {isTranslatingMessage ? (
                        <div className="flex items-center gap-1.5 py-1 text-[11px] animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                          <span>Translating to {targetLangLabel}...</span>
                        </div>
                      ) : translationError ? (
                        <div className="flex items-center justify-between text-[11px] py-0.5">
                          <span className={isOwn ? 'text-white/80' : 'text-status-danger'}>
                            {translationError}
                          </span>
                          <button
                            type="button"
                            onClick={handleManualTranslate}
                            className="inline-flex items-center gap-1 font-semibold underline ml-2"
                          >
                            <RotateCw className="w-3 h-3" /> Retry
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                            {translation.showOriginal ? safeText(message.content) : safeText(translation.translatedText)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Footer: Timestamp, Edited badge, Star, Read Ticks & Translate Button */}
            <div
              className={`flex items-center justify-end gap-1.5 mt-1 select-none text-[10px] ${
                isOwn ? 'text-white/85' : 'text-text-muted'
              }`}
            >
              {/* Quick Translate Button for Mobile / Instant Touch */}
              {safeText(message.content) && !isDeleted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualTranslate();
                  }}
                  className={`inline-flex items-center gap-1 mr-auto px-1.5 py-0.5 rounded-md transition-colors ${
                    isOwn
                      ? 'text-white/85 hover:text-white hover:bg-white/10'
                      : 'text-brand-600 hover:text-brand-700 hover:bg-brand-50'
                  }`}
                  title={translation ? 'Toggle translation' : `Translate to ${targetLangLabel}`}
                >
                  <Languages className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">
                    {translation ? (translation.showOriginal ? 'Translate' : 'Original') : 'Translate'}
                  </span>
                </button>
              )}

              {message.edited?.at && <span className="italic opacity-75">(edited)</span>}
              {isStarred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />}
              <span>{formatMessageTime(message.createdAt)}</span>

              {isOwn && !isDeleted && (
                <span className="inline-flex items-center">
                  {isRead ? (
                    <span title="Read by recipient" className="text-white tick-read-glow inline-flex">
                      <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  ) : isDelivered ? (
                    <span title="Delivered" className="text-white/60 inline-flex">
                      <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
                    </span>
                  ) : (
                    <span title="Sent" className="text-white/60 inline-flex">
                      <Check className="w-3.5 h-3.5 stroke-[2]" />
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reaction Badges Container */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex items-center gap-1 mt-1 px-1 flex-wrap">
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border-main shadow-xs text-xs hover:scale-105 transition-all"
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-bold text-text-secondary">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Menu on Hover */}
      {!isDeleted && (
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 p-1 rounded-full bg-surface/90 backdrop-blur-sm border border-border-main shadow-subtle z-10 self-center`}
        >
          {/* Reaction Quick Picker */}
          <div className="relative">
            <button
              onClick={() => setIsReactPickerOpen(!isReactPickerOpen)}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {isReactPickerOpen && (
              <div className="absolute bottom-8 left-0 flex items-center gap-1 p-1 bg-surface rounded-full border border-border-main shadow-brand-lg z-30 animate-fade-in">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleToggleReaction(emoji)}
                    className="p-1 hover:scale-125 transition-transform text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Star / Unstar */}
          <button
            onClick={handleToggleStar}
            className={`p-1 rounded-full hover:bg-surface-alt transition-colors ${
              isStarred ? 'text-amber-500' : 'text-text-muted hover:text-amber-500'
            }`}
            title={isStarred ? 'Unstar' : 'Star message'}
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Forward */}
          {onForward && (
            <button
              onClick={() => onForward(message)}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="Forward"
            >
              <Forward className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Pin in chat */}
          <button
            onClick={handleTogglePin}
            className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
            title="Pin in chat"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Copy Text */}
          {message.content && (
            <button
              onClick={handleCopyText}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="Copy text"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Translate to Selected Language */}
          {message.content && !isDeleted && (
            <button
              type="button"
              onClick={handleManualTranslate}
              disabled={isTranslatingMessage}
              className={`p-1 rounded-full hover:bg-surface-alt transition-colors ${
                translation ? 'text-brand-600 bg-brand-50' : 'text-text-muted hover:text-brand-600'
              }`}
              title={
                translation
                  ? translation.showOriginal
                    ? `Show translation (${targetLangLabel})`
                    : 'Show original message'
                  : `Translate to ${targetLangLabel}`
              }
            >
              {isTranslatingMessage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
              ) : (
                <Languages className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Edit (if within 15 mins and is own) */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(message)}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="Edit message (15m window)"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reply */}
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => onDelete(message)}
              className="p-1 rounded-full hover:bg-status-danger/10 text-text-muted hover:text-status-danger transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
