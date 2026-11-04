import React, { useState, useEffect } from 'react';
import { Star, Search, MessageSquare, ArrowRight, Loader2, X } from 'lucide-react';
import { getStarredMessagesApi } from '../../api/chat.api.js';
import { useChatStore } from '../../store/chatStore.js';
import Avatar from '../ui/Avatar.jsx';
import { formatMessageDate, formatMessageTime } from '../../utils/date.js';

export default function StarredMessagesView({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { setActiveConversation } = useChatStore();

  useEffect(() => {
    loadStarred();
  }, []);

  const loadStarred = async () => {
    try {
      setLoading(true);
      const res = await getStarredMessagesApi();
      if (res.success && res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = messages.filter((m) =>
    (m.content || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.sender?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenConversation = (convId) => {
    if (convId) {
      setActiveConversation(convId);
      if (onClose) onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border-main select-none">
      {/* Header */}
      <div className="p-4 border-b border-border-main flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-amber-50 text-amber-500">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-text-primary">Starred Messages</h2>
            <p className="text-xs text-text-muted">Important messages you saved</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-text-muted hover:text-text-primary md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border-main">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search starred messages..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-alt rounded-xl border border-border-main text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-text-muted gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Loading starred messages...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 fill-amber-500" />
            </div>
            <p className="text-sm font-semibold text-text-primary">No starred messages</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
              Star important messages in any chat to find them easily here.
            </p>
          </div>
        ) : (
          filtered.map((msg) => {
            const sender = msg.sender || {};
            const conv = msg.conversation || {};

            return (
              <div
                key={msg._id}
                onClick={() => handleOpenConversation(conv._id || conv)}
                className="p-3 rounded-2xl bg-surface-alt/70 hover:bg-surface-alt border border-border-main cursor-pointer transition-all hover:border-brand-300 group"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-border-main/50 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={sender.avatar} name={sender.name || 'User'} id={sender._id} size="xs" />
                    <span className="text-xs font-semibold text-text-primary">
                      {sender.name || sender.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span>{formatMessageDate(msg.createdAt)}</span>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                  {msg.content || (msg.attachment ? `[Attachment: ${msg.attachment.name || 'File'}]` : 'Message')}
                </p>

                <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-brand-600 font-medium">
                  <span className="truncate text-text-muted max-w-[200px]">
                    in {conv.name || 'Direct Chat'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Jump to chat</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

