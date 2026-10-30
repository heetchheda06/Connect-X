import React from 'react';
import { X, Calendar, MessageSquare, AtSign, Mail, Waves } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';

export default function UserProfileModal({ user, isOpen, onClose, onStartChat }) {
  if (!isOpen || !user) return null;

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-md overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ocean decorative header banner */}
        <div className="h-28 bg-deep-ocean relative flex items-start justify-end p-4 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Waves className="w-40 h-40 text-brand-300" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-6 pt-0 relative">
          {/* Avatar overlapping banner */}
          <div className="-mt-14 mb-4 flex items-end justify-between">
            <div className="ring-4 ring-white rounded-full inline-block shadow-card">
              <Avatar
                src={user.avatar}
                name={user.name}
                id={user._id}
                size="2xl"
                showOnline={true}
                isOnline={user.isOnline}
              />
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                user.isOnline
                  ? 'bg-status-online/15 text-status-online border border-status-online/30'
                  : 'bg-status-offline/15 text-text-muted border border-border-main'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  user.isOnline ? 'bg-status-online' : 'bg-status-offline'
                }`}
              />
              {user.isOnline ? 'Active Now' : 'Offline'}
            </span>
          </div>

          {/* Names and status */}
          <div className="mb-4">
            <h3 className="text-xl font-heading font-bold text-text-primary">
              {user.name}
            </h3>
            <p className="text-xs text-brand-600 font-semibold mt-0.5">
              @{user.username}
            </p>
            {user.status && (
              <p className="text-xs text-text-secondary italic mt-2 p-2 rounded-lg bg-surface-alt border border-border-main">
                "{user.status}"
              </p>
            )}
          </div>

          {/* Bio */}
          {user.bio ? (
            <div className="mb-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                About
              </span>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed bg-surface-alt/50 p-3 rounded-xl border border-border-main">
                {user.bio}
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-muted italic mb-4">No bio provided yet.</p>
          )}

          {/* Meta details */}
          <div className="flex items-center gap-2 text-xs text-text-muted pb-5 border-b border-border-main">
            <Calendar className="w-4 h-4 text-brand-500" />
            <span>Joined ConnectX {formattedDate}</span>
          </div>

          {/* Footer action */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-button bg-surface border border-border-main text-text-secondary hover:text-text-primary hover:bg-surface-alt text-xs font-semibold transition-all"
            >
              Close
            </button>
            {onStartChat && (
              <button
                onClick={() => {
                  onStartChat(user);
                  onClose();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-button bg-brand-gradient text-white text-xs font-semibold shadow-brand hover:shadow-brand-lg transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Message User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

