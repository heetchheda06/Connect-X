import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  MessageSquare, 
  ShieldAlert, 
  Sparkles,
  Phone,
  ExternalLink
} from 'lucide-react';
import axiosInstance from '../../api/axios.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function NotificationsView({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/notifications');
      if (res.data?.success && res.data.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await axiosInstance.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'call':
        return <Phone className="w-4 h-4 text-emerald-500" />;
      case 'reply':
      case 'mention':
        return <MessageSquare className="w-4 h-4 text-brand-500" />;
      default:
        return <Bell className="w-4 h-4 text-brand-500" />;
    }
  };

  return (
    <aside className="w-full md:w-[340px] lg:w-[360px] h-[100dvh] bg-surface border-r border-border-main flex flex-col flex-shrink-0 z-10 select-none">
      {/* Top Header */}
      <div className="p-4 pb-3 border-b border-border-main/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-full hover:bg-surface-alt text-text-secondary"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-1.5 rounded-xl bg-brand-50 text-brand-600">
            <Bell className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-heading font-extrabold text-text-primary tracking-tight">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white shadow-xs">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
            title="Mark all as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-main/40 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full font-semibold transition-all ${
            filter === 'all'
              ? 'bg-brand-500 text-white shadow-brand'
              : 'bg-surface-alt text-text-secondary hover:text-text-primary'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 rounded-full font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-brand-500 text-white shadow-brand'
              : 'bg-surface-alt text-text-secondary hover:text-text-primary'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-main/40">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-text-muted gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Loading notifications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-text-muted space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-surface-alt flex items-center justify-center text-text-muted mb-2">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-text-primary">No notifications yet</p>
            <p className="text-xs">You&apos;re all caught up with your mentions, calls, and security alerts.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n._id}
              onClick={() => handleMarkAsRead(n._id)}
              className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                n.isRead ? 'bg-surface hover:bg-surface-alt/60' : 'bg-brand-50/50 hover:bg-brand-50'
              }`}
            >
              <div className="relative flex-shrink-0 mt-0.5">
                {n.sender ? (
                  <Avatar
                    src={n.sender.avatar}
                    name={n.sender.name}
                    id={n.sender._id}
                    size="sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-alt border border-border-main flex items-center justify-center">
                    {getNotificationIcon(n.type)}
                  </div>
                )}
                {!n.isRead && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-text-primary truncate">{n.title}</h4>
                  <span className="text-[10px] text-text-muted flex-shrink-0">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">
                  {n.body}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(n._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-all flex-shrink-0"
                title="Delete notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
