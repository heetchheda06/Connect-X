import React, { useState } from 'react';
import { X, Trash2, Ban, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteMessageApi } from '../../api/chat.api.js';
import { useChatStore } from '../../store/chatStore.js';
import { toast } from 'react-hot-toast';

export default function DeleteMessageModal({ message, currentUserId, isOpen, onClose }) {
  const { handleMessageDeleted } = useChatStore();
  const [scope, setScope] = useState('me'); // 'me' | 'everyone'
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !message) return null;

  const isOwn = message.sender?._id?.toString() === currentUserId?.toString();
  const ONE_HOUR = 60 * 60 * 1000;
  const isWithinOneHour = Date.now() - new Date(message.createdAt).getTime() <= ONE_HOUR;
  const canDeleteForEveryone = isOwn && isWithinOneHour;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteMessageApi(message._id, scope);
      if (res.success) {
        if (scope === 'everyone') {
          handleMessageDeleted(message.conversation, message._id);
          toast.success('Message deleted for everyone');
        } else {
          // Remove locally for "me"
          useChatStore.setState((state) => ({
            messagesByConv: {
              ...state.messagesByConv,
              [message.conversation]: (state.messagesByConv[message.conversation] || []).filter(
                (m) => m._id !== message._id
              ),
            },
          }));
          toast.success('Message deleted for you');
        }
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-sm overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-text-primary">
              Delete Message?
            </h3>
            <p className="text-xs text-text-secondary">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Scope Options */}
        <div className="space-y-2 mb-6">
          <label
            onClick={() => setScope('me')}
            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              scope === 'me'
                ? 'bg-brand-50/70 border-brand-400 ring-1 ring-brand-400'
                : 'bg-surface-alt border-border-main hover:bg-surface-alt/70'
            }`}
          >
            <input
              type="radio"
              name="scope"
              checked={scope === 'me'}
              onChange={() => setScope('me')}
              className="accent-brand-500"
            />
            <div>
              <span className="text-xs font-bold text-text-primary block">
                Delete for me
              </span>
              <span className="text-[11px] text-text-muted">
                Removes this message only from your view.
              </span>
            </div>
          </label>

          {canDeleteForEveryone && (
            <label
              onClick={() => setScope('everyone')}
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                scope === 'everyone'
                  ? 'bg-status-danger/5 border-status-danger ring-1 ring-status-danger'
                  : 'bg-surface-alt border-border-main hover:bg-surface-alt/70'
              }`}
            >
              <input
                type="radio"
                name="scope"
                checked={scope === 'everyone'}
                onChange={() => setScope('everyone')}
                className="accent-status-danger"
              />
              <div>
                <span className="text-xs font-bold text-status-danger block">
                  Delete for everyone
                </span>
                <span className="text-[11px] text-text-muted">
                  Replaces with a deletion placeholder for all members.
                </span>
              </div>
            </label>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-button bg-surface border border-border-main text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button bg-status-danger text-white text-xs font-semibold shadow-subtle hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

