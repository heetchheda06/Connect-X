import React from 'react';
import { X, MessageSquare, Search } from 'lucide-react';
import UserSearchBar from '../users/UserSearchBar.jsx';

export default function NewChatModal({ isOpen, onClose, onSelectUser }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-md overflow-hidden flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface-alt/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-500" />
            <h3 className="font-heading font-bold text-base text-text-primary">
              Start a Conversation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <UserSearchBar
            onSelectUser={(u) => {
              onSelectUser(u);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

