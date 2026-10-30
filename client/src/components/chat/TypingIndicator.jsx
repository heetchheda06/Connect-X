import React from 'react';

export default function TypingIndicator({ typingUsersMap = {}, currentUserId = '' }) {
  // Extract other users currently typing (exclude self)
  const typingUsers = Object.entries(typingUsersMap)
    .filter(([uId]) => uId !== currentUserId)
    .map(([_, user]) => user.name || user.username || 'Someone');

  if (typingUsers.length === 0) return null;

  let typingText = '';
  if (typingUsers.length === 1) {
    typingText = `${typingUsers[0]} is typing`;
  } else if (typingUsers.length === 2) {
    typingText = `${typingUsers[0]} and ${typingUsers[1]} are typing`;
  } else {
    typingText = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-brand-600 bg-surface/90 backdrop-blur-sm border border-brand-200/60 rounded-full shadow-subtle inline-flex animate-fade-in w-fit">
      {/* Animated Bouncing Dots */}
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
      </div>
      <span className="font-medium text-[11px]">{typingText}...</span>
    </div>
  );
}

