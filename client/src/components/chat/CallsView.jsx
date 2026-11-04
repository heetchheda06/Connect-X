import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Search, 
  Clock, 
  Loader2, 
  X 
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { getCallHistoryApi } from '../../api/chat.api.js';
import { useCallStore } from '../../store/callStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from 'react-hot-toast';

export default function CallsView({ onClose }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { startCall } = useCallStore();
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const res = await getCallHistoryApi(50);
      if (res.success && res.data?.calls) {
        setCalls(res.data.calls);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredCalls = calls.filter((call) => {
    const isCaller = (call.caller?._id || call.caller) === currentUser?._id;
    const otherUser = isCaller ? call.callee : call.caller;
    const name = otherUser?.name || otherUser?.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleCallBack = (call, type) => {
    const isCaller = (call.caller?._id || call.caller) === currentUser?._id;
    const otherUser = isCaller ? call.callee : call.caller;
    if (!otherUser) return;
    startCall(call.conversation?._id || call.conversation, otherUser, type || call.type);
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border-main select-none">
      {/* Header */}
      <div className="p-4 border-b border-border-main flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-brand-50 text-brand-600">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-text-primary">Calls</h2>
            <p className="text-xs text-text-muted">Recent voice & video calls</p>
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
            placeholder="Search call history..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-alt rounded-xl border border-border-main text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-text-muted gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Loading calls...</span>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">No recent calls</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
              Start a 1:1 voice or video call with any contact from their chat window.
            </p>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const isCaller = (call.caller?._id || call.caller) === currentUser?._id;
            const otherUser = isCaller ? call.callee : call.caller;
            const isMissed = call.status === 'missed' || call.status === 'rejected';

            return (
              <div
                key={call._id}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-surface-alt transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={otherUser?.avatar}
                    name={otherUser?.name || 'User'}
                    id={otherUser?._id}
                    size="md"
                  />

                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-text-primary">
                      {otherUser?.name || otherUser?.username || 'Unknown'}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
                      {isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-status-danger" />
                      ) : isCaller ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-brand-500" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                      )}

                      <span className={isMissed ? 'text-status-danger font-medium' : ''}>
                        {isMissed ? 'Missed' : isCaller ? 'Outgoing' : 'Incoming'}
                      </span>

                      <span>•</span>
                      <span>{formatDate(call.startedAt || call.createdAt)}</span>

                      {call.durationSec > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(call.durationSec)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Callback Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCallBack(call, 'voice')}
                    className="p-2 rounded-xl text-text-muted hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCallBack(call, 'video')}
                    className="p-2 rounded-xl text-text-muted hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

