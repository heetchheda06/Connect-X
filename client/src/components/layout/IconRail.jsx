import React from 'react';
import { 
  Waves, 
  MessageSquare, 
  Compass, 
  Users, 
  User, 
  LogOut,
  Settings
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { useAuthStore } from '../../store/authStore.js';

export default function IconRail({ activeTab = 'chats', onSelectTab, onOpenProfile }) {
  const { user, logout } = useAuthStore();

  const navItems = [
    { id: 'chats', label: 'Chats', icon: MessageSquare },
    { id: 'rooms', label: 'Public Rooms', icon: Compass },
    { id: 'contacts', label: 'Contacts', icon: Users },
  ];

  return (
    <aside className="hidden md:flex flex-col items-center justify-between w-[72px] h-[100dvh] bg-deep-900 text-white py-5 z-20 flex-shrink-0 select-none border-r border-deep-800">
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6">
        <div 
          onClick={() => onSelectTab('chats')}
          className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-brand cursor-pointer hover:scale-105 transition-transform"
          title="ConnectX Home"
        >
          <Waves className="w-6 h-6 text-white" />
        </div>

        {/* Navigation Item Icons */}
        <nav className="flex flex-col items-center gap-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-brand'
                    : 'text-brand-100/60 hover:text-white hover:bg-white/10'
                }`}
                title={item.label}
              >
                {isActive && (
                  <span className="absolute -left-3 w-1.5 h-6 rounded-r-full bg-white shadow-sm" />
                )}
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Actions */}
      <div className="flex flex-col items-center gap-4">
        {/* Profile Avatar trigger */}
        <button
          onClick={onOpenProfile}
          className="relative group p-0.5 rounded-full hover:ring-2 hover:ring-brand-400 transition-all"
          title={`${user?.name} (@${user?.username})`}
        >
          <Avatar
            src={user?.avatar}
            name={user?.name}
            id={user?._id}
            size="md"
            showOnline={true}
            isOnline={user?.isOnline !== false}
          />
        </button>

        {/* Sign Out */}
        <button
          onClick={logout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-100/50 hover:text-status-danger hover:bg-status-danger/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

