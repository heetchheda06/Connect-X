import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Bell, 
  MessageSquare, 
  UserX, 
  Trash2, 
  Archive, 
  Check, 
  Loader2, 
  AlertTriangle,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import api from '../../api/axios.js';
import { 
  getSettingsApi, 
  updatePrivacySettingsApi, 
  updateNotificationSettingsApi, 
  updateChatPreferencesApi, 
  getBlockedUsersApi, 
  unblockUserApi,
  clearAllChatsApi,
  deleteAllChatsApi,
  archiveAllChatsApi
} from '../../api/chat.api.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'notifications' | 'chats' | 'blocked'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [privacy, setPrivacy] = useState({
    lastSeen: 'everyone',
    online: 'everyone',
    profilePhoto: 'everyone',
    about: 'everyone',
    readReceipts: true,
    addToGroups: 'everyone',
  });

  const [notifications, setNotifications] = useState({
    sound: true,
    messagePreview: true,
    desktop: true,
  });

  const [chatPrefs, setChatPrefs] = useState({
    enterIsSend: true,
    keepChatsArchived: true,
    linkPreviews: true,
    defaultWallpaper: 'default',
  });

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await api.get('/auth/sessions');
      if (res.data?.success && res.data.data?.sessions) {
        setSessions(res.data.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'devices') {
      loadSessions();
    }
  }, [isOpen, activeTab]);

  const handleRevokeSession = async (sid) => {
    try {
      await api.delete(`/auth/sessions/${sid}`);
      setSessions((prev) => prev.filter((s) => s.sid !== sid));
      toast.success('Session logged out');
    } catch (err) {
      toast.error('Failed to log out session');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!window.confirm('Log out from all other devices?')) return;
    try {
      await api.post('/auth/sessions/revoke-others');
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success('All other devices have been logged out');
    } catch (err) {
      toast.error('Failed to log out other devices');
    }
  };


  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettingsApi();
      if (res.success && res.data) {
        if (res.data.privacy) setPrivacy((prev) => ({ ...prev, ...res.data.privacy }));
        if (res.data.notifications) setNotifications((prev) => ({ ...prev, ...res.data.notifications }));
        if (res.data.chatPreferences) setChatPrefs((prev) => ({ ...prev, ...res.data.chatPreferences }));
      }
      const blockRes = await getBlockedUsersApi();
      if (blockRes.success && blockRes.data?.blocks) {
        setBlockedUsers(blockRes.data.blocks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSavePrivacy = async (updated) => {
    setPrivacy(updated);
    try {
      await updatePrivacySettingsApi(updated);
      toast.success('Privacy settings saved ✨');
    } catch (err) {
      toast.error('Failed to update privacy settings');
    }
  };

  const handleSaveNotifications = async (updated) => {
    setNotifications(updated);
    try {
      await updateNotificationSettingsApi(updated);
      toast.success('Notification settings saved 🔔');
    } catch (err) {
      toast.error('Failed to update notification settings');
    }
  };

  const handleSaveChatPrefs = async (updated) => {
    setChatPrefs(updated);
    try {
      await updateChatPreferencesApi(updated);
      toast.success('Chat preferences saved 💬');
    } catch (err) {
      toast.error('Failed to update chat preferences');
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await unblockUserApi(userId);
      setBlockedUsers((prev) => prev.filter((b) => (b.blocked?._id || b.blocked) !== userId));
      toast.success('User unblocked');
    } catch (err) {
      toast.error('Failed to unblock user');
    }
  };

  const handleClearAllChats = async () => {
    const confirmation = window.prompt('Type CLEAR to confirm clearing messages in all chats:');
    if (confirmation !== 'CLEAR') return;
    try {
      await clearAllChatsApi();
      toast.success('All chat messages cleared from your view');
      window.location.reload();
    } catch (err) {
      toast.error('Failed to clear all chats');
    }
  };

  const handleDeleteAllChats = async () => {
    const confirmation = window.prompt('Type DELETE to confirm deleting all direct chats from your list:');
    if (confirmation !== 'DELETE') return;
    try {
      await deleteAllChatsApi();
      toast.success('All direct chats deleted from your list');
      window.location.reload();
    } catch (err) {
      toast.error('Failed to delete chats');
    }
  };

  const handleArchiveAllChats = async () => {
    if (!window.confirm('Archive all active chats?')) return;
    try {
      await archiveAllChatsApi();
      toast.success('All chats archived');
      window.location.reload();
    } catch (err) {
      toast.error('Failed to archive chats');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-surface rounded-3xl shadow-2xl border border-border-main flex flex-col max-h-[85vh] animate-scale-in overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-border-main">
          <h2 className="text-lg font-heading font-bold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Settings Navigation Tabs */}
          <div className="w-48 bg-surface-alt/40 border-r border-border-main p-2 space-y-1">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-text-secondary hover:bg-surface-alt'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-text-secondary hover:bg-surface-alt'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => setActiveTab('chats')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'chats'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-text-secondary hover:bg-surface-alt'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chats & Wallpapers</span>
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'devices'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-text-secondary hover:bg-surface-alt'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Devices & Sessions</span>
            </button>


            <button
              onClick={() => setActiveTab('blocked')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'blocked'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-text-secondary hover:bg-surface-alt'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Blocked Contacts</span>
              {blockedUsers.length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-status-danger/10 text-status-danger text-[10px] font-bold">
                  {blockedUsers.length}
                </span>
              )}
            </button>
          </div>

          {/* Settings Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-xs text-text-muted gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                <span>Loading preferences...</span>
              </div>
            ) : (
              <>
                {/* 1. PRIVACY TAB */}
                {activeTab === 'privacy' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Who can see my personal info</h4>
                      <p className="text-xs text-text-muted">Control your visibility across the ConnectX directory</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Last seen</p>
                          <span className="text-[11px] text-text-muted">Who can see when you were last active</span>
                        </div>
                        <select
                          value={privacy.lastSeen}
                          onChange={(e) => handleSavePrivacy({ ...privacy, lastSeen: e.target.value })}
                          className="text-xs bg-surface border border-border-main rounded-xl px-2.5 py-1.5 text-text-primary font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="contacts">My Contacts</option>
                          <option value="nobody">Nobody</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Online status</p>
                          <span className="text-[11px] text-text-muted">Who can see when you're online</span>
                        </div>
                        <select
                          value={privacy.online}
                          onChange={(e) => handleSavePrivacy({ ...privacy, online: e.target.value })}
                          className="text-xs bg-surface border border-border-main rounded-xl px-2.5 py-1.5 text-text-primary font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="sameAsLastSeen">Same as last seen</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Profile photo</p>
                          <span className="text-[11px] text-text-muted">Who can see your avatar</span>
                        </div>
                        <select
                          value={privacy.profilePhoto}
                          onChange={(e) => handleSavePrivacy({ ...privacy, profilePhoto: e.target.value })}
                          className="text-xs bg-surface border border-border-main rounded-xl px-2.5 py-1.5 text-text-primary font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="contacts">My Contacts</option>
                          <option value="nobody">Nobody</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Read receipts</p>
                          <span className="text-[11px] text-text-muted">If turned off, you won't send or see read receipts</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.readReceipts}
                          onChange={(e) => handleSavePrivacy({ ...privacy, readReceipts: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Notifications & Sounds</h4>
                      <p className="text-xs text-text-muted">Manage incoming alerts and message previews</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Message sounds</p>
                          <span className="text-[11px] text-text-muted">Play sound effects for incoming chats</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.sound}
                          onChange={(e) => handleSaveNotifications({ ...notifications, sound: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Message previews</p>
                          <span className="text-[11px] text-text-muted">Show sender and preview text in desktop alerts</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.messagePreview}
                          onChange={(e) => handleSaveNotifications({ ...notifications, messagePreview: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Desktop notifications</p>
                          <span className="text-[11px] text-text-muted">Receive push notifications when app is in background</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.desktop}
                          onChange={(e) => handleSaveNotifications({ ...notifications, desktop: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CHATS TAB */}
                {activeTab === 'chats' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Chat Preferences</h4>
                      <p className="text-xs text-text-muted">Composer behavior and account-wide chat actions</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Enter is send</p>
                          <span className="text-[11px] text-text-muted">Pressing Enter will send message instead of new line</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={chatPrefs.enterIsSend}
                          onChange={(e) => handleSaveChatPrefs({ ...chatPrefs, enterIsSend: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Keep chats archived</p>
                          <span className="text-[11px] text-text-muted">Archived chats remain archived when a new message arrives</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={chatPrefs.keepChatsArchived}
                          onChange={(e) => handleSaveChatPrefs({ ...chatPrefs, keepChatsArchived: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Rich link previews</p>
                          <span className="text-[11px] text-text-muted">Show preview cards for web links you send and receive</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={chatPrefs.linkPreviews}
                          onChange={(e) => handleSaveChatPrefs({ ...chatPrefs, linkPreviews: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Chat Management Actions */}
                    <div className="pt-4 border-t border-border-main space-y-2">
                      <h5 className="text-xs font-bold text-text-muted uppercase">Chat Management</h5>

                      <div className="flex items-center justify-between p-3 rounded-2xl border border-border-main hover:bg-surface-alt transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">Archive all chats</p>
                          <span className="text-[11px] text-text-muted">Move all active conversations to your archived list</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleArchiveAllChats}
                          className="px-3 py-1.5 rounded-xl border border-border-main text-xs font-semibold text-text-secondary hover:bg-surface"
                        >
                          Archive all
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl border border-status-danger/30 bg-status-danger/5">
                        <div>
                          <p className="text-xs font-semibold text-status-danger">Clear all messages</p>
                          <span className="text-[11px] text-text-muted">Clear all messages across all chats for your view</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearAllChats}
                          className="px-3 py-1.5 rounded-xl bg-status-danger/10 hover:bg-status-danger/20 text-xs font-semibold text-status-danger"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl border border-status-danger/30 bg-status-danger/5">
                        <div>
                          <p className="text-xs font-semibold text-status-danger">Delete all chats</p>
                          <span className="text-[11px] text-text-muted">Remove all direct chats from your conversations list</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDeleteAllChats}
                          className="px-3 py-1.5 rounded-xl bg-status-danger text-white text-xs font-semibold hover:opacity-95"
                        >
                          Delete all
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. BLOCKED CONTACTS TAB */}
                {activeTab === 'blocked' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Blocked Contacts</h4>
                      <p className="text-xs text-text-muted">
                        Blocked contacts cannot call you or send you messages. They won't see your presence or status.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {blockedUsers.length === 0 ? (
                        <div className="text-center py-12 text-xs text-text-muted">
                          No blocked contacts.
                        </div>
                      ) : (
                        blockedUsers.map((b) => {
                          const u = b.blocked || {};
                          return (
                            <div
                              key={b._id}
                              className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar src={u.avatar} name={u.name || 'User'} id={u._id} size="sm" />
                                <div>
                                  <p className="text-xs font-semibold text-text-primary">{u.name || u.username}</p>
                                  <span className="text-[10px] text-text-muted">@{u.username}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleUnblock(u._id)}
                                className="px-3 py-1 rounded-xl bg-surface border border-border-main text-xs font-semibold text-brand-600 hover:bg-brand-50"
                              >
                                Unblock
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                {/* 5. DEVICES & ACTIVE SESSIONS TAB */}
                {activeTab === 'devices' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-500" />
                        <span>Active Devices & Sessions</span>
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Manage all browsers and devices currently signed in to your ConnectX account. You can log out from any unfamiliar device instantly.
                      </p>
                    </div>

                    {loadingSessions ? (
                      <div className="py-12 flex flex-col items-center justify-center text-xs text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-500 mb-2" />
                        <span>Loading active sessions...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Current Device Session */}
                        {(() => {
                          const currentSession = sessions.find((s) => s.isCurrent);
                          return (
                            <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 shadow-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-700 uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-100/80 border border-brand-200">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  This Device (Current Session)
                                </span>
                                <span className="text-[11px] font-medium text-emerald-600">Active Now</span>
                              </div>

                              <div className="flex items-center gap-3 pt-1">
                                <div className="p-2.5 rounded-xl bg-white shadow-subtle text-brand-600 border border-brand-100">
                                  {currentSession?.deviceLabel?.toLowerCase().includes('mobile') ||
                                  currentSession?.deviceLabel?.toLowerCase().includes('android') ||
                                  currentSession?.deviceLabel?.toLowerCase().includes('iphone') ? (
                                    <Smartphone className="w-5 h-5" />
                                  ) : (
                                    <Laptop className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-text-primary truncate">
                                    {currentSession?.deviceLabel || 'Current Browser'}
                                  </p>
                                  <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-text-muted" />
                                    <span>Approx. IP: {currentSession?.ipTruncated || '127.0.0.0/24'}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Other Sessions Section */}
                        {(() => {
                          const otherSessions = sessions.filter((s) => !s.isCurrent);
                          return (
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-text-primary">
                                  Other Active Devices ({otherSessions.length})
                                </h5>

                                {otherSessions.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={handleRevokeAllOtherSessions}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-danger hover:underline"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>Log out all others</span>
                                  </button>
                                )}
                              </div>

                              {otherSessions.length === 0 ? (
                                <div className="p-6 rounded-2xl bg-surface-alt/40 border border-border-main text-center text-xs text-text-muted">
                                  No other devices signed in. Your account is only active on this device.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {otherSessions.map((s) => (
                                    <div
                                      key={s.sid}
                                      className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-border-main hover:border-brand-200 transition-all"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-surface shadow-subtle text-text-secondary border border-border-main">
                                          {s.deviceLabel?.toLowerCase().includes('mobile') ||
                                          s.deviceLabel?.toLowerCase().includes('android') ||
                                          s.deviceLabel?.toLowerCase().includes('iphone') ? (
                                            <Smartphone className="w-4 h-4" />
                                          ) : (
                                            <Laptop className="w-4 h-4" />
                                          )}
                                        </div>

                                        <div className="truncate">
                                          <p className="text-xs font-semibold text-text-primary truncate">
                                            {s.deviceLabel || 'Unknown Browser'}
                                          </p>
                                          <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                                            <span>IP: {s.ipTruncated || 'Unknown'}</span>
                                            <span>•</span>
                                            <span>
                                              Active{' '}
                                              {s.lastActiveAt
                                                ? new Date(s.lastActiveAt).toLocaleDateString()
                                                : 'Recently'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRevokeSession(s.sid)}
                                        className="ml-2 px-3 py-1.5 rounded-xl bg-status-danger/10 hover:bg-status-danger/20 text-xs font-semibold text-status-danger transition-colors flex-shrink-0"
                                      >
                                        Log out
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

