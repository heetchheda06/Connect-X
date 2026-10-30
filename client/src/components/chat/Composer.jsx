import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  X, 
  FileText, 
  Loader2 
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { uploadFileApi } from '../../api/upload.api.js';
import { formatFileSize } from '../../utils/file.js';
import EmojiPickerPopover from './EmojiPickerPopover.jsx';
import { toast } from 'react-hot-toast';

export default function Composer({ onSendMessage, disabled }) {
  const { activeConversationId, replyingTo, setReplyingTo } = useChatStore();
  const { emitTypingStart, emitTypingStop } = useSocketStore();

  const [text, setText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

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
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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

      // 3. Reset form
      setText('');
      handleRemoveFile();
      setReplyingTo(null);
      setIsEmojiOpen(false);
    } catch (err) {
      console.error('Send error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to send message');
    } finally {
      setUploadProgress(null);
    }
  };

  const isUploading = uploadProgress !== null;

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
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
