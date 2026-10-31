import React from 'react';
import { formatMessageTime } from '../../utils/date.js';
import { formatFileSize, isImageFile, getMediaUrl } from '../../utils/file.js';
import { useAiStore } from '../../store/aiStore.js';
import { useTranslationStore } from '../../store/translationStore.js';
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
  RotateCw
} from 'lucide-react';

export default function MessageBubble({
  message,
  isOwn,
  showSenderName = false,
  onReply,
  onDelete,
  onImageClick,
  onInfo,
}) {
  const isDeleted = message.isDeletedForEveryone;
  const isRead = message.readBy && message.readBy.length > 1;
  const isDelivered = message.deliveredTo && message.deliveredTo.length > 1;

  const attachment = message.attachment;
  const hasImage = attachment && isImageFile(attachment.mimeType, attachment.name);
  const hasFile = attachment && !hasImage;
  const [imageFailed, setImageFailed] = React.useState(false);

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
  const targetLangObj = languages.find((l) => l.code === preferredLang);
  const targetLangLabel = targetLangObj?.name || 'English';

  const canTranslate = !isDeleted && message.content && aiSettings?.enabled;

  const handleManualTranslate = () => {
    translateMessage({
      messageId: message._id,
      targetLang: preferredLang,
    });
  };

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
      className={`group relative flex flex-col mb-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${
        isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
      }`}
    >
      {/* Sender name for group chats if incoming */}
      {showSenderName && !isOwn && (
        <span className="text-[11px] font-semibold text-brand-700 mb-1 pl-1">
          {message.sender?.name || message.sender?.username}
        </span>
      )}

      {/* Main Bubble Container */}
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
                : message.replyTo.content || 'Attachment'}
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

            {/* Document / File Attachment Card or Image Preview Fallback */}
            {(hasFile || (hasImage && imageFailed)) && (
              <div
                className={`mb-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isOwn
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-surface-alt border-border-main text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 rounded-lg bg-white shadow-subtle flex-shrink-0">
                    {getFileIcon(attachment.name, attachment.mimeType)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold truncate">
                      {attachment.name}
                    </p>
                    <span className={`text-[10px] ${isOwn ? 'text-white/80' : 'text-text-muted'}`}>
                      {formatFileSize(attachment.size)} {imageFailed ? '· (Preview unavailable)' : ''}
                    </span>
                  </div>
                </div>

                <a
                  href={getMediaUrl(attachment.url)}
                  download={attachment.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isOwn
                      ? 'bg-white/20 hover:bg-white/30 text-white'
                      : 'bg-surface hover:bg-surface-alt text-brand-600 border border-border-main'
                  }`}
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Message Text / Caption */}
            {message.content && (
              <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}

            {/* AI Live Translation Tinted Block */}
            {(translation || isTranslatingMessage || translationError) && (
              <div className="mt-2.5 pt-2 border-t border-brand-200/40 text-left">
                <div
                  className={`rounded-xl p-2.5 shadow-subtle text-xs space-y-1.5 ${
                    isOwn
                      ? 'bg-white/15 text-white border border-white/25'
                      : 'bg-brand-50/90 text-text-primary border border-brand-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${
                        isOwn
                          ? 'bg-white/20 text-white border-white/30'
                          : 'bg-white text-brand-700 border-brand-200'
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
                        {translation.showOriginal ? message.content : translation.translatedText}
                      </p>
                      {translation.alreadyInTargetLang && !translation.showOriginal && (
                        <span className="text-[10px] opacity-75 italic block mt-1">
                          (Message is already in {targetLangLabel})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer: Timestamp and Contrast Read/Delivered Ticks */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 select-none text-[10px] ${
            isOwn ? 'text-white/85' : 'text-text-muted'
          }`}
        >
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

      {/* Floating Action Menu (Reply, Info, Delete) on Hover */}
      {!isDeleted && (
        <div
          className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 rounded-full bg-surface/90 backdrop-blur-sm border border-border-main shadow-subtle z-10 ${
            isOwn ? '-left-28' : '-right-28'
          }`}
        >
          {canTranslate && (
            <button
              onClick={handleManualTranslate}
              className="p-1 rounded-full hover:bg-brand-50 text-text-muted hover:text-brand-600 transition-colors"
              title={`Translate to ${targetLangLabel}`}
            >
              <Languages className="w-3.5 h-3.5 text-brand-500" />
            </button>
          )}
          {onInfo && (
            <button
              onClick={() => onInfo(message)}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="Message Info / Read by"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}

          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded-full hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}

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
