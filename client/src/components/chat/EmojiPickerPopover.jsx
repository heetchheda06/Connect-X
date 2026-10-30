import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

export default function EmojiPickerPopover({ isOpen, onClose, onEmojiClick }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-14 left-4 z-40 shadow-2xl rounded-2xl overflow-hidden border border-border-main animate-fade-in bg-surface"
    >
      <Suspense
        fallback={
          <div className="w-[320px] h-[350px] flex flex-col items-center justify-center bg-surface text-brand-600 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <span className="text-xs font-semibold">Loading Emojis...</span>
          </div>
        }
      >
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onEmojiClick(emojiData.emoji);
          }}
          autoFocusSearch={false}
          theme="light"
          previewConfig={{ showPreview: false }}
          width={320}
          height={380}
        />
      </Suspense>
    </div>
  );
}

