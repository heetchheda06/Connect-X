import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  ShieldAlert, 
  LifeBuoy, 
  BarChart3, 
  Search, 
  Loader2, 
  ArrowLeft, 
  Ban, 
  CheckCircle2, 
  AlertTriangle,
  MessageSquare,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import axiosInstance from '../../api/axios.js';
import Avatar from '../ui/Avatar.jsx';
import { toast } from 'react-hot-toast';

export default function AdminDashboardView({ onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'reports' | 'tickets'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Users tab
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Reports tab
  const [reports, setReports] = useState([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('');

  // Tickets tab
  const [tickets, setTickets] = useState([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/admin/overview');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;
      const res = await axiosInstance.get('/api/admin/users', { params });
      if (res.data?.success) {
        setUsers(res.data.data.users || []);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (reportStatusFilter) params.status = reportStatusFilter;
      const res = await axiosInstance.get('/api/admin/reports', { params });
      if (res.data?.success) {
        setReports(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (ticketStatusFilter) params.status = ticketStatusFilter;
      const res = await axiosInstance.get('/api/admin/tickets', { params });
      if (res.data?.success) {
        setTickets(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'tickets') loadTickets();
  }, [activeTab]);

  const handleToggleBan = async (user) => {
    const action = user.isBanned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} @${user.username}?`)) return;

    try {
      const res = await axiosInstance.patch(`/api/admin/users/${user._id}/ban`, {
        ban: !user.isBanned,
        reason: 'Violated Community Standards',
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isBanned: !user.isBanned } : u))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const res = await axiosInstance.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        toast.success(res.data.message);
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleResolveReport = async (reportId, status, action = null) => {
    try {
      const res = await axiosInstance.patch(`/api/admin/reports/${reportId}`, { status, action });
      if (res.data?.success) {
        toast.success(res.data.message);
        setReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, status } : r))
        );
      }
    } catch (err) {
      toast.error('Failed to update report');
    }
  };

  const handleUpdateTicket = async (ticketId, status) => {
    try {
      const res = await axiosInstance.patch(`/api/admin/tickets/${ticketId}`, { status });
      if (res.data?.success) {
        toast.success(`Ticket marked as ${status}`);
        setTickets((prev) =>
          prev.map((t) => (t._id === ticketId ? { ...t, status } : t))
        );
      }
    } catch (err) {
      toast.error('Failed to update ticket');
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-surface flex flex-col flex-1 overflow-hidden select-none">
      {/* Top Header */}
      <header className="p-4 border-b border-border-main flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-surface-alt text-text-secondary"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-extrabold text-text-primary tracking-tight">
              ConnectX Control Panel
            </h2>
            <p className="text-xs text-text-muted">Moderation, System Metrics & User Governance</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-alt border border-border-main text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-white text-teal-700 shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-white text-teal-700 shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'reports' ? 'bg-white text-teal-700 shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'tickets' ? 'bg-white text-teal-700 shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Support Desk</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span>Loading admin data...</span>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-surface-alt border border-border-main space-y-1">
                    <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Accounts</span>
                    <p className="text-2xl font-black text-text-primary">{stats.totalUsers}</p>
                    <span className="text-[11px] text-teal-600 font-medium">{stats.activeSessions} active sessions</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-alt border border-border-main space-y-1">
                    <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Conversations</span>
                    <p className="text-2xl font-black text-text-primary">{stats.totalConversations}</p>
                    <span className="text-[11px] text-text-muted">{stats.totalMessages} messages sent</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Pending Reports</span>
                    <p className="text-2xl font-black text-amber-900">{stats.pendingReports}</p>
                    <span className="text-[11px] text-amber-700 font-medium">Awaiting moderator review</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
                    <span className="text-xs text-teal-800 font-semibold uppercase tracking-wider">Open Tickets</span>
                    <p className="text-2xl font-black text-teal-900">{stats.openTickets}</p>
                    <span className="text-[11px] text-teal-700 font-medium">Support inquiries</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-surface-alt border border-border-main space-y-3">
                  <h3 className="text-sm font-bold text-text-primary">System Status & Security</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-border-main flex items-center justify-between">
                      <span className="text-text-secondary">MongoDB GridFS</span>
                      <span className="font-bold text-emerald-600">Operational</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-border-main flex items-center justify-between">
                      <span className="text-text-secondary">Gemini AI Engine</span>
                      <span className="font-bold text-emerald-600">Connected</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-border-main flex items-center justify-between">
                      <span className="text-text-secondary">Web Push Service</span>
                      <span className="font-bold text-emerald-600">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search users by name, username..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-main text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                      setTimeout(loadUsers, 50);
                    }}
                    className="px-3 py-2 rounded-xl border border-border-main text-xs bg-white focus:outline-none"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="border border-border-main rounded-2xl overflow-hidden divide-y divide-border-main/60 bg-white shadow-xs">
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-xs text-text-muted">No users found.</div>
                  ) : (
                    users.map((u) => (
                      <div key={u._id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={u.avatar} name={u.name} id={u._id} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-text-primary truncate">{u.name}</p>
                              <span className="text-[10px] font-mono text-text-muted">@{u.username}</span>
                              {u.isBanned && (
                                <span className="px-1.5 py-0.5 rounded bg-status-danger/10 text-status-danger text-[9px] font-bold">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-border-main text-xs bg-surface-alt font-semibold"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleBan(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              u.isBanned
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-status-danger/10 text-status-danger hover:bg-status-danger/20'
                            }`}
                          >
                            {u.isBanned ? 'Unban' : 'Suspend'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Community Safety Reports ({reports.length})
                  </h3>
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => {
                      setReportStatusFilter(e.target.value);
                      setTimeout(loadReports, 50);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border-main text-xs bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="p-12 text-center text-xs text-text-muted bg-surface-alt rounded-2xl border border-border-main">
                      No reports found.
                    </div>
                  ) : (
                    reports.map((r) => (
                      <div key={r._id} className="p-4 rounded-2xl bg-white border border-border-main space-y-3 shadow-xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-teal-800">Reason: {r.reason.toUpperCase()}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        {r.details && <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">{r.details}</p>}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-text-muted text-[11px]">
                            Reported by @{r.reporter?.username || 'user'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleResolveReport(r._id, 'dismissed')}
                              className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary"
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolveReport(r._id, 'resolved', 'ban')}
                              className="px-3 py-1 rounded-lg bg-status-danger text-white text-xs font-semibold hover:bg-red-600"
                            >
                              Ban User & Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. TICKETS TAB */}
            {activeTab === 'tickets' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Customer Support Tickets ({tickets.length})
                  </h3>
                  <select
                    value={ticketStatusFilter}
                    onChange={(e) => {
                      setTicketStatusFilter(e.target.value);
                      setTimeout(loadTickets, 50);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border-main text-xs bg-white"
                  >
                    <option value="">All Tickets</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {tickets.length === 0 ? (
                    <div className="p-12 text-center text-xs text-text-muted bg-surface-alt rounded-2xl border border-border-main">
                      No support tickets.
                    </div>
                  ) : (
                    tickets.map((t) => (
                      <div key={t._id} className="p-4 rounded-2xl bg-white border border-border-main space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary">{t.subject}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">{t.message}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-[11px] text-text-muted">{t.email}</span>
                          <div className="flex items-center gap-1.5">
                            {['open', 'in_progress', 'resolved', 'closed'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateTicket(t._id, st)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  t.status === st ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

