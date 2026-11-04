import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Video,
  MessageSquare,
  Star,
  MoreVertical,
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import {
  getContactsApi,
  addContactApi,
  updateContactApi,
  deleteContactApi,
  createOrGetDirectConversationApi,
} from '../../api/chat.api.js';
import { useChatStore } from '../../store/chatStore.js';
import { useCallStore } from '../../store/callStore.js';

export default function ContactsView({ onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addNickname, setAddNickname] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [editNickname, setEditNickname] = useState('');

  const { setActiveConversation } = useChatStore();
  const { startCall } = useCallStore();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await getContactsApi();
      if (res.success && res.data?.contacts) {
        setContacts(res.data.contacts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!addUserId.trim()) return;
    try {
      const res = await addContactApi(addUserId.trim(), addNickname.trim());
      if (res.success) {
        setShowAddModal(false);
        setAddUserId('');
        setAddNickname('');
        loadContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = async (contact) => {
    try {
      await updateContactApi(contact._id, { favorite: !contact.favorite });
      setContacts((prev) =>
        prev.map((c) => (c._id === contact._id ? { ...c, favorite: !c.favorite } : c))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNickname = async () => {
    if (!editingContact) return;
    try {
      await updateContactApi(editingContact._id, { nickname: editNickname.trim() });
      setContacts((prev) =>
        prev.map((c) => (c._id === editingContact._id ? { ...c, nickname: editNickname.trim() } : c))
      );
      setEditingContact(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Remove this user from your contacts?')) return;
    try {
      await deleteContactApi(contactId);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartChat = async (targetUserId) => {
    try {
      const res = await createOrGetDirectConversationApi(targetUserId);
      if (res.success && res.data?.conversation?._id) {
        setActiveConversation(res.data.conversation._id);
        if (onClose) onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartVoiceCall = async (targetUser) => {
    try {
      const res = await createOrGetDirectConversationApi(targetUser._id);
      if (res.success && res.data?.conversation?._id) {
        startCall(res.data.conversation._id, targetUser, 'voice');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartVideoCall = async (targetUser) => {
    try {
      const res = await createOrGetDirectConversationApi(targetUser._id);
      if (res.success && res.data?.conversation?._id) {
        startCall(res.data.conversation._id, targetUser, 'video');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = contacts.filter((c) => {
    const name = c.nickname || c.contactUser?.name || '';
    const username = c.contactUser?.username || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
  });

  const favorites = filtered.filter((c) => c.favorite);
  const regular = filtered.filter((c) => !c.favorite);

  return (
    <div className="flex-1 h-full bg-surface-alt/30 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-surface border-b border-border-main flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-text-primary">
              Contacts
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {contacts.length} saved contacts
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-button bg-brand-gradient text-white text-xs font-bold shadow-brand hover:shadow-brand-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 sm:px-6 py-3 bg-surface border-b border-border-main/50">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name or username..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="text-center py-12 text-xs text-text-muted">Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-xs">
            No contacts found. Click "+ Add Contact" to add friends!
          </div>
        ) : (
          <>
            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Favorites</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {favorites.map((c) => (
                    <ContactCard
                      key={c._id}
                      contact={c}
                      onChat={() => handleStartChat(c.contactUser?._id)}
                      onVoiceCall={() => handleStartVoiceCall(c.contactUser)}
                      onVideoCall={() => handleStartVideoCall(c.contactUser)}
                      onToggleFavorite={() => handleToggleFavorite(c)}
                      onEdit={() => {
                        setEditingContact(c);
                        setEditNickname(c.nickname || '');
                      }}
                      onDelete={() => handleDeleteContact(c._id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Contacts Section */}
            <div>
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">
                All Contacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {regular.map((c) => (
                  <ContactCard
                    key={c._id}
                    contact={c}
                    onChat={() => handleStartChat(c.contactUser?._id)}
                    onVoiceCall={() => handleStartVoiceCall(c.contactUser)}
                    onVideoCall={() => handleStartVideoCall(c.contactUser)}
                    onToggleFavorite={() => handleToggleFavorite(c)}
                    onEdit={() => {
                      setEditingContact(c);
                      setEditNickname(c.nickname || '');
                    }}
                    onDelete={() => handleDeleteContact(c._id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-border-main space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-main">
              <h3 className="text-lg font-bold text-text-primary">Add New Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  User ID or Username
                </label>
                <input
                  type="text"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  placeholder="Paste User ID or username"
                  required
                  className="w-full px-3 py-2 text-xs bg-surface-alt border border-border-main rounded-button focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Private Nickname (optional)
                </label>
                <input
                  type="text"
                  value={addNickname}
                  onChange={(e) => setAddNickname(e.target.value)}
                  placeholder="e.g. Alex (Design Lead)"
                  maxLength={60}
                  className="w-full px-3 py-2 text-xs bg-surface-alt border border-border-main rounded-button focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-button bg-brand-gradient text-white text-xs font-bold shadow-brand"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Nickname Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-border-main space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Edit Contact Nickname</h3>
            <div>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder="Enter private nickname"
                maxLength={60}
                className="w-full px-3 py-2 text-xs bg-surface-alt border border-border-main rounded-button focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="px-3.5 py-1.5 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNickname}
                className="px-4 py-1.5 rounded-button bg-brand-gradient text-white text-xs font-bold shadow-brand"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
  onChat,
  onVoiceCall,
  onVideoCall,
  onToggleFavorite,
  onEdit,
  onDelete,
}) {
  const u = contact.contactUser || {};
  const displayName = contact.nickname || u.name || u.username;

  return (
    <div className="p-3.5 rounded-2xl bg-surface border border-border-main hover:border-brand-300 shadow-sm transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar
          src={u.avatar}
          name={displayName}
          id={u._id}
          size="md"
          showOnline={true}
          isOnline={u.isOnline}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-text-primary truncate">
              {displayName}
            </h4>
            {contact.nickname && (
              <span className="text-[10px] text-text-muted truncate">
                ({u.name})
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">@{u.username}</p>
        </div>
      </div>

      {/* Quick Action Icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggleFavorite}
          className="p-1.5 rounded-xl hover:bg-surface-alt text-text-muted transition-colors"
          title={contact.favorite ? 'Unfavorite' : 'Favorite'}
        >
          <Star
            className={`w-4 h-4 ${
              contact.favorite ? 'text-amber-500 fill-amber-500' : 'text-text-muted'
            }`}
          />
        </button>

        <button
          onClick={onChat}
          className="p-1.5 rounded-xl hover:bg-brand-50 text-brand-600 transition-colors"
          title="Message"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          onClick={onVoiceCall}
          className="p-1.5 rounded-xl hover:bg-brand-50 text-brand-600 transition-colors"
          title="Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={onVideoCall}
          className="p-1.5 rounded-xl hover:bg-brand-50 text-brand-600 transition-colors"
          title="Video Call"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          onClick={onEdit}
          className="p-1.5 rounded-xl hover:bg-surface-alt text-text-muted transition-colors"
          title="Edit Nickname"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-xl hover:bg-status-danger/10 text-status-danger transition-colors"
          title="Delete Contact"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

