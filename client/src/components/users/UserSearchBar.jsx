import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, UserCheck, MessageSquare, Sparkles } from 'lucide-react';
import { searchUsersApi } from '../../api/user.api.js';
import useDebounce from '../../hooks/useDebounce.js';
import Avatar from '../ui/Avatar.jsx';

export default function UserSearchBar({ onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchUsers = async () => {
      const query = debouncedSearch.trim();
      if (!query) {
        setResults([]);
        setIsLoading(false);
        setHasSearched(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasSearched(true);
        const res = await searchUsersApi(query);
        if (res.success && res.data?.users) {
          setResults(res.data.users);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedSearch]);

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search people by name or @username..."
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all shadow-subtle"
        />
        {isLoading ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : searchTerm ? (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Results Container */}
      <div className="min-h-[160px] max-h-[340px] overflow-y-auto rounded-xl border border-border-main bg-surface p-2 shadow-inner">
        {isLoading && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-border-main" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-28 h-3.5 bg-border-main rounded" />
                  <div className="w-20 h-2.5 bg-border-main rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-3 py-1 block">
              Found {results.length} member{results.length > 1 ? 's' : ''}
            </span>
            {results.map((user) => (
              <div
                key={user._id}
                onClick={() => onSelectUser && onSelectUser(user)}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-alt border border-transparent hover:border-border-main transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    id={user._id}
                    size="md"
                    showOnline={true}
                    isOnline={user.isOnline}
                  />
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-text-primary group-hover:text-brand-600 transition-colors truncate">
                      {user.name}
                    </h4>
                    <p className="text-xs text-text-muted truncate">
                      @{user.username} {user.status ? `• ${user.status}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 group-hover:bg-brand-500 group-hover:text-white transition-all flex items-center gap-1 shadow-subtle">
                    <UserCheck className="w-3.5 h-3.5" />
                    View
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
            <div className="w-12 h-12 rounded-full bg-surface-alt border border-border-main flex items-center justify-center text-text-muted mb-2">
              <Search className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-xs font-semibold text-text-primary">No users found</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              No ConnectX member matches "{debouncedSearch}"
            </p>
          </div>
        )}

        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
            <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-500 mb-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
            </div>
            <p className="text-xs font-semibold text-text-primary">Explore Members</p>
            <p className="text-[11px] text-text-secondary mt-0.5 max-w-xs">
              Type a name or username above to find other members in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

