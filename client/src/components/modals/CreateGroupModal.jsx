import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Compass, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Search, 
  Lock, 
  Globe,
  Loader2 
} from 'lucide-react';
import { searchUsersApi } from '../../api/user.api.js';
import { createGroupApi } from '../../api/chat.api.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [step, setStep] = useState(1); // 1: Select members, 2: Group details
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Group Details
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedUsers([]);
      setGroupName('');
      setDescription('');
      setIsPublic(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Search users for member selection
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        setLoadingSearch(true);
        const res = await searchUsersApi(searchQuery);
        if (res.success && res.data?.users) {
          setSearchResults(res.data.users);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoadingSearch(false);
      }
    };

    const delay = setTimeout(fetchUsers, 250);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  if (!isOpen) return null;

  const toggleSelectUser = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createGroupApi({
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedUsers.map((u) => u._id),
        isPublic,
        type: isPublic ? 'room' : 'group',
      });

      if (res.success && res.data?.conversation) {
        toast.success(`${isPublic ? 'Public Room' : 'Group'} created successfully! 🎉`);
        onGroupCreated(res.data.conversation);
        onClose();
      }
    } catch (err) {
      console.error('Create group error:', err);
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border-main flex items-center justify-between bg-surface-alt/40">
          <div className="flex items-center gap-2.5">
            {isPublic ? (
              <Compass className="w-5 h-5 text-brand-500" />
            ) : (
              <Users className="w-5 h-5 text-brand-500" />
            )}
            <div>
              <h3 className="font-heading font-bold text-base text-text-primary">
                {step === 1 ? 'Add Members' : 'Group Information'}
              </h3>
              <p className="text-xs text-text-muted">
                Step {step} of 2 • {isPublic ? 'Public Room' : 'Private Group'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: SELECT MEMBERS */}
        {step === 1 && (
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-3 mb-3 border-b border-border-main max-h-24 overflow-y-auto">
                {selectedUsers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-200 text-xs font-semibold"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectUser(u)}
                      className="hover:text-status-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts to add..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface"
              />
            </div>

            {/* Member search list */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {loadingSearch ? (
                <div className="flex items-center justify-center py-8 text-xs text-text-muted gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  <span>Searching contacts...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((u) => {
                  const isSelected = selectedUsers.some((sel) => sel._id === u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleSelectUser(u)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50 border-brand-300'
                          : 'bg-surface hover:bg-surface-alt border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.avatar}
                          name={u.name}
                          id={u._id}
                          size="md"
                          showOnline={true}
                          isOnline={u.isOnline}
                        />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-text-primary">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            @{u.username}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'border-border-main bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-text-muted text-xs">
                  {searchQuery ? 'No members found' : 'Type a name above to add members (or proceed to create a public room)'}
                </div>
              )}
            </div>

            {/* Footer Next Button */}
            <div className="pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">
                {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button bg-brand-gradient text-white text-xs sm:text-sm font-semibold shadow-brand hover:shadow-brand-lg transition-all"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: GROUP DETAILS & PRIVACY */}
        {step === 2 && (
          <form onSubmit={handleCreate} className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Group / Room Name *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Design Enthusiasts, Project Ocean"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                className="w-full p-3 text-xs sm:text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface resize-none"
              />
            </div>

            {/* Privacy Setting Toggle */}
            <div className="p-3.5 rounded-xl bg-surface-alt border border-border-main space-y-2">
              <span className="text-xs font-semibold text-text-primary block">
                Channel Visibility
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`p-3 rounded-xl border flex flex-col items-start text-left transition-all ${
                    !isPublic
                      ? 'bg-surface border-brand-500 shadow-subtle ring-1 ring-brand-400'
                      : 'bg-surface-alt/70 border-border-main text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary mb-1">
                    <Lock className="w-3.5 h-3.5 text-brand-600" />
                    Private Group
                  </div>
                  <span className="text-[11px] text-text-secondary leading-tight">
                    Invite or admin-add only. Hidden from discovery.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`p-3 rounded-xl border flex flex-col items-start text-left transition-all ${
                    isPublic
                      ? 'bg-surface border-brand-500 shadow-subtle ring-1 ring-brand-400'
                      : 'bg-surface-alt/70 border-border-main text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary mb-1">
                    <Globe className="w-3.5 h-3.5 text-brand-600" />
                    Public Room
                  </div>
                  <span className="text-[11px] text-text-secondary leading-tight">
                    Listed in Room Discovery for anyone to join.
                  </span>
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-border-main flex items-center justify-between mt-auto">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !groupName.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-button bg-brand-gradient text-white text-xs sm:text-sm font-semibold shadow-brand hover:shadow-brand-lg transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Create {isPublic ? 'Room' : 'Group'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

