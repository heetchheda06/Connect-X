import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Shield, 
  Users, 
  UserPlus, 
  UserMinus, 
  ShieldCheck, 
  LogOut, 
  Edit3, 
  Check, 
  Loader2 
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { 
  updateConversationApi, 
  addMembersApi, 
  removeMemberApi, 
  promoteMemberApi, 
  leaveConversationApi 
} from '../../api/chat.api.js';
import { toast } from 'react-hot-toast';

export default function InfoDrawer({ conversation, currentUserId, onOpenAddMembers }) {
  const { infoDrawerOpen, setInfoDrawerOpen, fetchConversations, setActiveConversation } = useChatStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(conversation?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  if (!infoDrawerOpen || !conversation) return null;

  const isDirect = conversation.type === 'direct';
  const otherMember = isDirect
    ? conversation.members.find((m) => m.user?._id?.toString() !== currentUserId?.toString())?.user
    : null;

  const title = isDirect ? otherMember?.name || 'User' : conversation.name;
  const avatarSrc = isDirect ? otherMember?.avatar : conversation.avatar;
  const avatarId = isDirect ? otherMember?._id : conversation._id;
  const isOnline = isDirect ? otherMember?.isOnline : false;
  const bio = isDirect ? otherMember?.bio : conversation.description;
  const status = isDirect ? otherMember?.status : null;

  // Check if current user is an admin of this conversation
  const currentUserMember = conversation.members?.find(
    (m) => m.user?._id?.toString() === currentUserId?.toString()
  );
  const isAdmin = currentUserMember?.role === 'admin';
  const isCreator = conversation.createdBy?._id?.toString() === currentUserId?.toString();

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    try {
      setIsSavingName(true);
      const res = await updateConversationApi(conversation._id, { name: editedName.trim() });
      if (res.success) {
        toast.success('Channel name updated');
        setIsEditingName(false);
        fetchConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update channel name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePromoteMember = async (targetUserId, memberName) => {
    try {
      const res = await promoteMemberApi(conversation._id, targetUserId);
      if (res.success) {
        toast.success(`${memberName} is now an Admin! 🛡️`);
        fetchConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to promote member');
    }
  };

  const handleRemoveMember = async (targetUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this channel?`)) {
      return;
    }
    try {
      const res = await removeMemberApi(conversation._id, targetUserId);
      if (res.success) {
        toast.success(`${memberName} removed from channel`);
        fetchConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveChannel = async () => {
    if (!window.confirm('Are you sure you want to leave this conversation?')) {
      return;
    }
    try {
      const res = await leaveConversationApi(conversation._id);
      if (res.success) {
        toast.success('You have left the conversation');
        setInfoDrawerOpen(false);
        setActiveConversation(null);
        fetchConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave conversation');
    }
  };

  return (
    <aside className="w-full sm:w-[320px] lg:w-[340px] h-[100dvh] bg-surface border-l border-border-main flex flex-col z-20 flex-shrink-0 animate-fade-in shadow-card overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface-alt/40">
        <h3 className="font-heading font-bold text-sm text-text-primary">
          {isDirect ? 'Contact Details' : conversation.type === 'room' ? 'Room Info' : 'Group Info'}
        </h3>
        <button
          onClick={() => setInfoDrawerOpen(false)}
          className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Overview */}
      <div className="p-6 flex flex-col items-center text-center border-b border-border-main">
        <Avatar
          src={avatarSrc}
          name={title}
          id={avatarId}
          size="2xl"
          showOnline={isDirect}
          isOnline={isOnline}
        />

        {isEditingName ? (
          <div className="flex items-center gap-2 mt-3 w-full">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-bold bg-surface-alt border border-brand-300 rounded-lg text-text-primary focus:outline-none"
            />
            <button
              onClick={handleSaveName}
              disabled={isSavingName}
              className="p-1.5 rounded-lg bg-brand-500 text-white"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <h4 className="font-heading font-bold text-base text-text-primary">
              {title}
            </h4>
            {!isDirect && isAdmin && (
              <button
                onClick={() => {
                  setEditedName(conversation.name);
                  setIsEditingName(true);
                }}
                className="text-text-muted hover:text-brand-600 p-1"
                title="Rename channel"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {isDirect && (
          <p className="text-xs text-brand-600 font-semibold mt-0.5">
            @{otherMember?.username}
          </p>
        )}

        <p className="text-xs text-text-muted mt-1">
          {isDirect
            ? isOnline ? 'Active Now' : 'Offline'
            : `${conversation.members?.length || 0} members • ${conversation.isPublic ? 'Public Room' : 'Private Group'}`}
        </p>

        {status && (
          <p className="mt-3 p-2.5 rounded-xl bg-surface-alt text-xs text-text-secondary italic border border-border-main w-full">
            "{status}"
          </p>
        )}
      </div>

      {/* Description */}
      {bio && (
        <div className="p-4 border-b border-border-main">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
            Description
          </span>
          <p className="text-xs text-text-secondary leading-relaxed bg-surface-alt/50 p-2.5 rounded-xl border border-border-main">
            {bio}
          </p>
        </div>
      )}

      {/* Group Members List */}
      {!isDirect && (
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Members ({conversation.members?.length || 0})
            </span>

            {isAdmin && (
              <button
                onClick={onOpenAddMembers}
                className="inline-flex items-center gap-1 text-xs text-brand-600 font-bold hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {conversation.members?.map((m) => {
              const u = m.user;
              if (!u) return null;
              const isSelf = u._id?.toString() === currentUserId?.toString();
              const isMemberAdmin = m.role === 'admin';

              return (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-alt group transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <Avatar
                      src={u.avatar}
                      name={u.name}
                      id={u._id}
                      size="sm"
                      showOnline={true}
                      isOnline={u.isOnline}
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {u.name} {isSelf && '(You)'}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isMemberAdmin ? (
                      <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[9px] font-bold">
                        Admin
                      </span>
                    ) : (
                      /* Admin Actions for normal member */
                      isAdmin && !isSelf && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handlePromoteMember(u._id, u.name)}
                            className="p-1 rounded text-text-muted hover:text-brand-600 hover:bg-surface"
                            title="Promote to Admin"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(u._id, u.name)}
                            className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-surface"
                            title="Remove from group"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leave Channel Option */}
          <div className="mt-6 pt-4 border-t border-border-main">
            <button
              onClick={handleLeaveChannel}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-button text-xs font-semibold text-status-danger hover:bg-status-danger/10 border border-status-danger/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Channel</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
