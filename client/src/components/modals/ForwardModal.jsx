import React, { useState } from 'react';
import { X, Search, Send, Check } from 'lucide-react';
import { useChatStore } from '../../store/chatStore.js';
import { forwardMessagesApi } from '../../api/chat.api.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function ForwardModal({ isOpen, onClose, messageIds = [] }) {
  const { conversations, clearSelection } = useChatStore();
  const [search, setSearch] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState([]);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) => {
    const name = c.type === 'direct' ? c.members?.[0]?.user?.name || '' : c.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (convId) => {
    if (selectedConvIds.includes(convId)) {
      setSelectedConvIds(selectedConvIds.filter((id) => id !== convId));
    } else {
      if (selectedConvIds.length >= 5) {
        toast.error('You can only forward to up to 5 chats at once');
        return;
      }
      setSelectedConvIds([...selectedConvIds, convId]);
    }
  };

  const handleForward = async () => {
    if (selectedConvIds.length === 0) return;
    if (messageIds.length === 0) return;

    try {
      setSending(true);
      const res = await forwardMessagesApi(selectedConvIds, messageIds);
      if (res.success) {
        toast.success(`Forwarded to ${selectedConvIds.length} chat${selectedConvIds.length > 1 ? 's' : ''} ↗️`);
        clearSelection();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to forward messages');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-2xl border border-border-main flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-main">
          <div>
            <h3 className="text-base font-bold text-text-primary">Forward Message</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Select up to 5 chats ({selectedConvIds.length}/5 selected)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-3">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-alt rounded-xl border border-border-main text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px]">
          {filteredConversations.map((conv) => {
            const isSelected = selectedConvIds.includes(conv._id);
            const isDirect = conv.type === 'direct';
            const title = isDirect ? conv.members?.[0]?.user?.name || 'User' : conv.name;
            const avatar = isDirect ? conv.members?.[0]?.user?.avatar : conv.avatar;

            return (
              <div
                key={conv._id}
                onClick={() => toggleSelect(conv._id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-50 border border-brand-200'
                    : 'hover:bg-surface-alt border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar src={avatar} name={title} id={conv._id} size="sm" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-text-primary truncate">{title}</p>
                    <span className="text-[11px] text-text-muted">
                      {isDirect ? 'Direct chat' : `${conv.members?.length || 0} members`}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'border-2 border-border-main hover:border-brand-400'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="text-center py-8 text-xs text-text-muted">
              No conversations found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-main">
          <span className="text-xs font-semibold text-text-secondary">
            {selectedConvIds.length} recipient{selectedConvIds.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedConvIds.length === 0 || sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-semibold bg-brand-gradient text-white shadow-brand hover:opacity-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
