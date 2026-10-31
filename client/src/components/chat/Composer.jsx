import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  X, 
  FileText, 
  Loader2,
  Sparkles,
  Check,
  RotateCw,
  Wand2,
  ArrowRight
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { useAiStore } from '../../store/aiStore.js';
import { useSmartReplyStore } from '../../store/smartReplyStore.js';
import { uploadFileApi } from '../../api/upload.api.js';
import { formatFileSize } from '../../utils/file.js';
import EmojiPickerPopover from './EmojiPickerPopover.jsx';
import { toast } from 'react-hot-toast';

const TONE_OPTIONS = [
  { id: 'polite', label: 'Polite', icon: '🤝', desc: 'Warm, respectful & courteous' },
  { id: 'shorter', label: 'Shorter', icon: '⚡', desc: 'Concise, essential points only' },
  { id: 'friendlier', label: 'Friendlier', icon: '😊', desc: 'Warm, upbeat & approachable' },
  { id: 'professional', label: 'Professional', icon: '💼', desc: 'Crisp & business-appropriate' },
  { id: 'grammar', label: 'Fix Grammar', icon: '✍️', desc: 'Fix typos, punctuation & errors' },
  { id: 'clearer', label: 'Make Clearer', icon: '🔍', desc: 'Simplify ambiguous phrasing' },
];

export default function Composer({ onSendMessage, disabled }) {
  const { activeConversationId, replyingTo, setReplyingTo } = useChatStore();
  const { emitTypingStart, emitTypingStop } = useSocketStore();
  const { settings: aiSettings } = useAiStore();
  const {
    suggestions,
    isLoadingSuggestions,
    clearSuggestions,
    tonePreview,
    isRewriting,
    rewriteDraft,
    clearTonePreview,
  } = useSmartReplyStore();

  const [text, setText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isToneMenuOpen, setIsToneMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const toneMenuRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

  // Click outside to close tone menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toneMenuRef.current && !toneMenuRef.current.contains(e.target)) {
        setIsToneMenuOpen(false);
      }
    };
    if (isToneMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToneMenuOpen]);

  // Keyboard shortcut for Tone Preview: Esc to cancel, Ctrl/Cmd+Enter to accept
  useEffect(() => {
    const handlePreviewKeyDown = (e) => {
      if (!tonePreview) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        clearTonePreview();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleApplyTone();
      }
    };

    window.addEventListener('keydown', handlePreviewKeyDown);
    return () => window.removeEventListener('keydown', handlePreviewKeyDown);
  }, [tonePreview]);

  // Handle file selection (from input, drag-and-drop, or clipboard paste)
  const processSelectedFile = (file) => {
    if (!file) return;

    // Check size limit: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size exceeds the 10MB limit');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const objUrl = URL.createObjectURL(file);
      setFilePreviewUrl(objUrl);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processSelectedFile(file);
          toast.success('Pasted image ready to send! 📷');
          break;
        }
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadProgress(null);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Rule: Hide smart reply suggestions as soon as user starts typing
    if (suggestions.length > 0) {
      clearSuggestions();
    }

    if (!activeConversationId) return;

    if (val.trim()) {
      emitTypingStart(activeConversationId);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        emitTypingStop(activeConversationId);
      }, 2500);
    } else {
      emitTypingStop(activeConversationId);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji);
    if (suggestions.length > 0) clearSuggestions();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Apply a smart reply suggestion to the draft input
  const handleApplySuggestion = (suggestionText) => {
    setText(suggestionText);
    clearSuggestions();
    inputRef.current?.focus();
  };

  // Toggle or open tone menu
  const handleToggleToneMenu = () => {
    if (!aiSettings?.enabled) {
      toast('Enable AI Features in Settings to use Tone Assist ✨', { icon: '✨' });
      return;
    }
    if (!text.trim()) {
      toast('Type a draft message first to refine its tone ✨', { icon: '✍️' });
      return;
    }
    setIsToneMenuOpen((prev) => !prev);
  };

  // Request tone assist rewrite
  const handleSelectTone = async (toneId) => {
    setIsToneMenuOpen(false);
    await rewriteDraft({ text: text.trim(), tone: toneId });
  };

  // Accept rewritten tone
  const handleApplyTone = () => {
    if (tonePreview?.rewritten) {
      setText(tonePreview.rewritten);
      clearTonePreview();
      inputRef.current?.focus();
      toast.success(`Updated with ${tonePreview.tone} tone! ✨`);
    }
  };

  // Retry tone assist with higher temperature
  const handleRetryTone = async () => {
    if (tonePreview) {
      await rewriteDraft({
        text: tonePreview.original,
        tone: tonePreview.tone,
        isRetry: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmedText = text.trim();
    if ((!trimmedText && !selectedFile) || disabled) return;

    if (activeConversationId) {
      emitTypingStop(activeConversationId);
    }

    try {
      let attachmentMetadata = null;

      // 1. Upload file if attached
      if (selectedFile) {
        setUploadProgress(10);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await uploadFileApi(formData, (percent) => {
          setUploadProgress(percent);
        });

        if (uploadRes.success && uploadRes.data) {
          attachmentMetadata = uploadRes.data;
        } else {
          throw new Error(uploadRes.message || 'File upload failed');
        }
      }

      // 2. Dispatch message
      onSendMessage({
        content: trimmedText,
        attachment: attachmentMetadata,
        replyTo: replyingTo?._id || null,
      });

      // 3. Reset form & AI state
      setText('');
      handleRemoveFile();
      setReplyingTo(null);
      setIsEmojiOpen(false);
      clearSuggestions();
      clearTonePreview();
    } catch (err) {
      console.error('Send error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to send message');
    } finally {
      setUploadProgress(null);
    }
  };

  const isUploading = uploadProgress !== null;
  const showSmartReplies = suggestions && suggestions.length > 0 && !text.trim() && !selectedFile;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3 sm:p-4 bg-surface border-t transition-all z-10 flex flex-col gap-2 relative ${
        isDragging
          ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-400 ring-inset'
          : 'border-border-main'
      }`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
      />

      {/* Lazy-loaded Emoji Picker */}
      <EmojiPickerPopover
        isOpen={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onEmojiClick={handleEmojiSelect}
      />

      {/* Smart Replies Chips Bar */}
      {showSmartReplies && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none animate-fade-in">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200 shadow-xs flex-shrink-0 select-none">
            <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500" />
            AI suggestions
          </span>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySuggestion(suggestion)}
              className="inline-flex items-center text-xs font-medium text-brand-800 bg-surface border border-brand-200/90 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-900 px-3 py-1 rounded-full shadow-subtle transition-all flex-shrink-0 active:scale-95"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Tone Assist Preview Card */}
      {tonePreview && (
        <div className="p-3.5 rounded-2xl bg-surface border border-brand-300 shadow-brand-lg animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-gradient text-white shadow-xs capitalize">
                <Sparkles className="w-3 h-3" />
                {tonePreview.tone} Tone
              </span>
              <span className="text-xs text-text-muted">
                {tonePreview.explanation}
              </span>
            </div>
            <button
              type="button"
              onClick={clearTonePreview}
              className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-alt"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-alt border border-border-main">
              <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                Original Draft
              </span>
              <p className="text-text-secondary whitespace-pre-wrap break-words">
                {tonePreview.original}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-50/80 border border-brand-200">
              <span className="text-[10px] uppercase font-bold text-brand-700 block mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500" />
                Rewritten Version
              </span>
              <p className="text-text-primary font-medium whitespace-pre-wrap break-words">
                {tonePreview.rewritten}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-text-muted hidden sm:inline">
              Press <kbd className="px-1 py-0.5 rounded bg-surface-alt border font-mono">Esc</kbd> to cancel, <kbd className="px-1 py-0.5 rounded bg-surface-alt border font-mono">Ctrl+Enter</kbd> to accept
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={clearTonePreview}
                className="px-3 py-1.5 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRewriting}
                onClick={handleRetryTone}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-button text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRewriting ? 'animate-spin' : ''}`} />
                Try again
              </button>
              <button
                type="button"
                onClick={handleApplyTone}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-button text-xs font-bold text-white bg-brand-gradient hover:shadow-brand transition-all shadow-subtle active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Use this
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Quote Preview */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-alt border border-brand-200 text-xs animate-fade-in">
          <div className="flex flex-col truncate pr-2">
            <span className="font-bold text-brand-700">
              Replying to {replyingTo.sender?.name || 'Message'}
            </span>
            <p className="text-text-secondary truncate mt-0.5">
              {replyingTo.isDeletedForEveryone ? '🚫 This message was deleted' : replyingTo.content}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Card */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-alt border border-border-main animate-fade-in relative overflow-hidden">
          {filePreviewUrl ? (
            <img
              src={filePreviewUrl}
              alt="Attachment"
              className="w-12 h-12 object-cover rounded-lg border border-border-main shadow-subtle flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-surface border border-border-main flex items-center justify-center text-brand-600 shadow-subtle flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0 pr-8">
            <p className="text-xs font-semibold text-text-primary truncate">
              {selectedFile.name}
            </p>
            <span className="text-[10px] text-text-muted">
              {formatFileSize(selectedFile.size)}
            </span>

            {/* Live Upload Progress Bar */}
            {isUploading && (
              <div className="w-full bg-border-main rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {!isUploading && (
            <button
              type="button"
              onClick={handleRemoveFile}
              className="absolute top-2 right-2 p-1 rounded-full text-text-muted hover:text-status-danger hover:bg-surface"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Main Composer Row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
        {/* Attachment & Emoji Trigger Buttons */}
        <div className="flex items-center gap-0.5 text-text-muted">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || disabled}
            className="p-2 rounded-full hover:bg-surface-alt hover:text-brand-600 transition-colors disabled:opacity-50"
            title="Attach Image or Document (max 10MB)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsEmojiOpen(!isEmojiOpen)}
            disabled={disabled}
            className={`p-2 rounded-full transition-colors ${
              isEmojiOpen
                ? 'bg-brand-50 text-brand-600'
                : 'hover:bg-surface-alt hover:text-brand-600'
            }`}
            title="Choose Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Tone Assist Trigger Button */}
          <div className="relative" ref={toneMenuRef}>
            <button
              type="button"
              onClick={handleToggleToneMenu}
              disabled={disabled || isRewriting}
              className={`p-2 rounded-full transition-all ${
                isToneMenuOpen
                  ? 'bg-brand-gradient text-white shadow-brand'
                  : text.trim() && aiSettings?.enabled
                  ? 'text-brand-600 hover:bg-brand-50 hover:text-brand-700'
                  : 'hover:bg-surface-alt text-text-muted opacity-80'
              }`}
              title="Tone Assist ✨ (Rewrite in polite, shorter, professional & more)"
            >
              {isRewriting ? (
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>

            {/* Tone Assist Popover Menu */}
            {isToneMenuOpen && (
              <div className="absolute bottom-12 left-0 w-64 bg-surface rounded-2xl border border-brand-200 shadow-brand-lg p-2 z-30 animate-fade-in space-y-1">
                <div className="px-2.5 py-1.5 border-b border-border-main mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                    Tone Assist
                  </div>
                  <p className="text-[10px] text-text-muted">
                    Refine your draft before sending
                  </p>
                </div>

                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => handleSelectTone(tone.id)}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-brand-50/80 transition-colors flex items-center gap-2.5 group"
                  >
                    <span className="text-base flex-shrink-0">{tone.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary group-hover:text-brand-700">
                        {tone.label}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {tone.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isUploading || disabled}
            placeholder={
              selectedFile
                ? 'Add an optional caption...'
                : 'Type a message (or paste an image)...'
            }
            className="w-full px-4 py-2.5 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all shadow-subtle"
          />
        </div>

        {/* Send / Upload Button */}
        <button
          type="submit"
          disabled={(!text.trim() && !selectedFile) || isUploading || disabled}
          className={`p-2.5 rounded-button font-medium text-white shadow-brand transition-all duration-200 flex items-center justify-center ${
            text.trim() || selectedFile
              ? 'bg-brand-gradient hover:shadow-brand-lg scale-100 active:scale-95'
              : 'bg-brand-300 opacity-60 cursor-not-allowed'
          }`}
          title="Send message"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
