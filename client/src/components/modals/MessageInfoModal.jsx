import React from 'react';
import { X, CheckCheck, Clock, Eye } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatMessageTime, formatMessageDate } from '../../utils/date.js';

export default function MessageInfoModal({ message, conversation, isOpen, onClose }) {
  if (!isOpen || !message) return null;

  const readByList = message.readBy || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-sm overflow-hidden flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface-alt/40">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-500" />
            <h3 className="font-heading font-bold text-sm text-text-primary">
              Message Info
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-4 border-b border-border-main bg-brand-50/40">
          <p className="text-xs text-text-primary font-medium italic line-clamp-3">
            "{message.content || (message.attachment ? 'Attachment' : 'Message')}"
          </p>
          <span className="text-[10px] text-text-muted mt-1 block">
            Sent {formatMessageDate(message.createdAt)} at {formatMessageTime(message.createdAt)}
          </span>
        </div>

        {/* Read by section */}
        <div className="p-4 flex-1 overflow-y-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-3">
            Read by ({readByList.length})
          </span>

          {readByList.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">
              Not read by anyone yet
            </p>
          ) : (
            <div className="space-y-2.5">
              {readByList.map((entry, idx) => {
                // If entry.user is populated object or ID, find in conversation members
                const userId = entry.user?._id || entry.user;
                const memberObj = conversation?.members?.find(
                  (m) => m.user?._id?.toString() === userId?.toString()
                );
                const userObj = entry.user?.name ? entry.user : memberObj?.user;

                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-surface-alt/50 border border-border-main">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Avatar
                        src={userObj?.avatar}
                        name={userObj?.name || 'Member'}
                        id={userId}
                        size="sm"
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {userObj?.name || 'Member'}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">
                          @{userObj?.username || 'user'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-brand-600 font-medium">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{entry.readAt ? formatMessageTime(entry.readAt) : 'Read'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

