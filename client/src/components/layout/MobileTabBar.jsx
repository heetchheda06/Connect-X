import React from 'react';
import { MessageSquare, Compass, Users, User } from 'lucide-react';
import { useChatStore } from '../../store/chatStore.js';

export default function MobileTabBar({ activeTab, onSelectTab, onOpenProfile }) {
  const { conversations } = useChatStore();

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-main flex items-center justify-around z-30 px-2 pb-[env(safe-area-inset-bottom)] shadow-lg">
      <button
        onClick={() => onSelectTab('chats')}
        className={`relative flex flex-col items-center justify-center w-14 h-full transition-colors ${
          activeTab === 'chats' ? 'text-brand-600' : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-1">Chats</span>
        {totalUnread > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent-coral text-white text-[9px] font-bold flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectTab('rooms')}
        className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
          activeTab === 'rooms' ? 'text-brand-600' : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-1">Rooms</span>
      </button>

      <button
        onClick={() => onSelectTab('contacts')}
        className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
          activeTab === 'contacts' ? 'text-brand-600' : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-1">Contacts</span>
      </button>

      <button
        onClick={onOpenProfile}
        className="flex flex-col items-center justify-center w-14 h-full text-text-muted hover:text-text-secondary transition-colors"
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-1">Profile</span>
      </button>
    </nav>
  );
}

