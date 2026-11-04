import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  CheckSquare, 
  HelpCircle, 
  FileText, 
  Video, 
  GraduationCap, 
  BarChart2, 
  ShieldCheck, 
  Share2, 
  Calendar, 
  Download, 
  Check, 
  Trash2, 
  Pin, 
  RotateCw, 
  Loader2, 
  ArrowRight,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Plus,
  Send,
  Copy,
  Bot,
  User as UserIcon,
  Globe,
  Search,
  History
} from 'lucide-react';
import useSocket from '../../hooks/useSocket.js';
import { 
  generateSummaryApi, 
  shareSummaryApi, 
  extractInsightsApi, 
  listTasksApi, 
  updateTaskApi, 
  createTaskApi,
  deleteTaskApi,
  listDeadlinesApi,
  acceptDeadlineApi,
  listDecisionsApi, 
  updateDecisionApi, 
  askThisChatApi,
  getAskThreadApi,
  clearAskThreadApi,
  startMeetingApi,
  endMeetingApi,
  generateFlashcardsApi,
  submitCardReviewApi,
  generateQuizApi,
  explainConceptApi,
  getAnalyticsApi,
  getWeeklyInsightApi,
  updateConversationAiModeApi,
  toggleConversationOptOutApi,
  getConversationActivityApi,
  purgeAiDataApi
} from '../../api/ai.api.js';
import { toast } from 'react-hot-toast';

export default function AiDrawer({ isOpen, onClose, conversationId, conversation, initialTab = 'catchup' }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'catchup');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Catch-Up state
  const [summary, setSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryStyle, setSummaryStyle] = useState('brief');

  const { socket } = useSocket();

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueAt, setNewTaskDueAt] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Decisions state
  const [decisions, setDecisions] = useState([]);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(false);

  // Ask AI Chatbot state
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askMessages, setAskMessages] = useState([]);
  const [askThreadId, setAskThreadId] = useState(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [showQuestionsHistory, setShowQuestionsHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const chatBottomRef = React.useRef(null);

  // Meeting Mode state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isMeetingLoading, setIsMeetingLoading] = useState(false);

  // Study Mode state
  const [studyDeck, setStudyDeck] = useState(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isGeneratingStudy, setIsGeneratingStudy] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Privacy state
  const [aiMode, setAiMode] = useState(conversation?.ai?.mode || 'on_demand');
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (isOpen && conversationId) {
      setAiMode(conversation?.ai?.mode || 'on_demand');
      loadInitialData();
    }
  }, [isOpen, conversationId, activeTab]);

  useEffect(() => {
    if (activeTab === 'ask' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [askMessages, isAsking, activeTab]);

  // Real-time task synchronization across participants
  useEffect(() => {
    if (!socket || !conversationId) return;

    const convIdStr = (conversationId?._id || conversationId)?.toString();

    const onTaskCreated = ({ task }) => {
      const taskConv = (task?.conversation?._id || task?.conversation)?.toString();
      if (taskConv === convIdStr) {
        setTasks((prev) => {
          if (prev.some((t) => t._id === task._id)) return prev;
          return [task, ...prev];
        });
      }
    };

    const onTaskUpdated = ({ task }) => {
      const taskConv = (task?.conversation?._id || task?.conversation)?.toString();
      if (taskConv === convIdStr) {
        setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
      }
    };

    const onTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };

    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);

    return () => {
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
    };
  }, [socket, conversationId]);

  const loadInitialData = () => {
    if (activeTab === 'tasks') fetchTasks();
    if (activeTab === 'ask') fetchAskThread();
    if (activeTab === 'decisions') fetchDecisions();
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'privacy') fetchPrivacyActivity();
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const res = await generateSummaryApi({
        conversationId,
        style: summaryStyle,
        range: 60,
      });
      if (res.success && res.data) {
        setSummary(res.data);
        toast.success('Catch-Up summary ready! ✨');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleShareSummary = async () => {
    if (!summary?.id) return;
    try {
      await shareSummaryApi(summary.id);
      toast.success('Summary shared to chat!');
      onClose();
    } catch (err) {
      toast.error('Failed to share summary');
    }
  };

  const fetchTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const res = await listTasksApi({ conversationId });
      if (res.success) setTasks(res.data.tasks || []);
    } catch (err) {
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleScanInsights = async () => {
    try {
      setIsExtracting(true);
      const res = await extractInsightsApi({ conversationId, range: 60 });
      if (res.success) {
        toast.success('Insights scanned from chat history! 📋');
        fetchTasks();
        fetchDecisions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to scan chat');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      await updateTaskApi(taskId, { status: 'open' });
      toast.success('Task confirmed! Added to open tasks.');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to accept task');
    }
  };

  const handleToggleTaskDone = async (task) => {
    const nextStatus = task.status === 'done' ? 'open' : 'done';
    try {
      await updateTaskApi(task._id, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const fetchDecisions = async () => {
    try {
      setIsLoadingDecisions(true);
      const res = await listDecisionsApi(conversationId);
      if (res.success) setDecisions(res.data.decisions || []);
    } catch (err) {
    } finally {
      setIsLoadingDecisions(false);
    }
  };

  const handleConfirmDecision = async (id) => {
    try {
      await updateDecisionApi(id, { status: 'confirmed' });
      toast.success('Decision confirmed!');
      fetchDecisions();
    } catch (err) {
      toast.error('Failed to confirm decision');
    }
  };

  const handleCreateTask = async (e) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim() || isCreatingTask) return;
    try {
      setIsCreatingTask(true);
      const convIdStr = (conversationId?._id || conversationId)?.toString();
      const res = await createTaskApi({
        conversationId: convIdStr,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        assignee: newTaskAssignee || null,
        dueAt: newTaskDueAt || null,
      });
      if (res.success) {
        toast.success('Task created! 🎯');
        setNewTaskTitle('');
        setNewTaskAssignee('');
        setNewTaskDueAt('');
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTaskApi(taskId);
      toast.success('Task removed');
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const fetchAskThread = async () => {
    if (!conversationId) return;
    try {
      setIsLoadingThread(true);
      const res = await getAskThreadApi(conversationId);
      if (res.success && res.data) {
        setAskThreadId(res.data.threadId || null);
        if (Array.isArray(res.data.messages) && res.data.messages.length > 0) {
          setAskMessages(
            res.data.messages.map((m, idx) => ({
              id: m._id || idx,
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
              citations: m.citations || [],
              timestamp: m.timestamp || new Date(),
            }))
          );
        }
      }
    } catch (err) {
      // silently ignore thread init error
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleClearThread = async () => {
    try {
      await clearAskThreadApi(conversationId);
      setAskMessages([]);
      setAskThreadId(null);
      toast.success('Chat history cleared');
    } catch (err) {
      toast.error('Failed to clear chat history');
    }
  };

  const handleAsk = async (presetQuestion) => {
    const q = (presetQuestion || askQuery).trim();
    if (!q || isAsking) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    };

    setAskMessages((prev) => [...prev, userMsg]);
    setAskQuery('');
    setIsAsking(true);

    try {
      const res = await askThisChatApi({
        conversationId,
        question: q,
        threadId: askThreadId,
      });

      if (res.success && res.data) {
        if (res.data.threadId) setAskThreadId(res.data.threadId);
        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: res.data.answer || "I processed your request.",
          citations: res.data.citations || [],
          isFromChat: res.data.isFromChat,
          notFound: res.data.notFound,
          timestamp: new Date(),
        };
        setAskMessages((prev) => [...prev, aiMsg]);
      } else {
        toast.error('Could not get response from AI');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'AI request failed');
      setAskMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "Sorry, I ran into an error processing that question. Please try again.",
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleStartMeeting = async () => {
    if (!meetingTitle.trim()) return;
    try {
      setIsMeetingLoading(true);
      const res = await startMeetingApi({
        conversationId,
        title: meetingTitle.trim(),
        mode: 'chat',
      });
      if (res.success) {
        setActiveMeeting(res.data.meeting);
        setMeetingTitle('');
        toast.success('Meeting started!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start meeting');
    } finally {
      setIsMeetingLoading(false);
    }
  };

  const handleEndMeeting = async () => {
    if (!activeMeeting?._id) return;
    try {
      setIsMeetingLoading(true);
      const res = await endMeetingApi(activeMeeting._id);
      if (res.success) {
        setActiveMeeting(res.data.meeting);
        toast.success('Meeting ended! Minutes generated ✨');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to end meeting');
    } finally {
      setIsMeetingLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    try {
      setIsGeneratingStudy(true);
      const res = await generateFlashcardsApi({
        conversationId,
        sourceText: summary?.keyPoints?.join('\n') || 'ConnectX Real-time Architecture',
        title: `${conversation?.name || 'Chat'} Study Deck`,
      });
      if (res.success) {
        setStudyDeck(res.data.deck);
        setCurrentCardIdx(0);
        setIsCardFlipped(false);
        toast.success('Flashcards ready! 🎓');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate cards');
    } finally {
      setIsGeneratingStudy(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoadingAnalytics(true);
      const res = await getWeeklyInsightApi(conversationId);
      if (res.success) setAnalytics(res.data);
    } catch (err) {
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const fetchPrivacyActivity = async () => {
    try {
      const res = await getConversationActivityApi(conversationId);
      if (res.success) setActivities(res.data.activities || []);
    } catch (err) {}
  };

  const handleChangeAiMode = async (mode) => {
    try {
      const res = await updateConversationAiModeApi(conversationId, mode);
      if (res.success) {
        setAiMode(mode);
        toast.success(`Chat AI set to ${mode}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update mode');
    }
  };

  const handleToggleOptOut = async () => {
    const nextVal = !isOptedOut;
    try {
      const res = await toggleConversationOptOutApi(conversationId, nextVal);
      if (res.success) {
        setIsOptedOut(nextVal);
        toast.success(res.message);
      }
    } catch (err) {
      toast.error('Failed to update opt-out');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] z-50 bg-surface border-l border-border-main shadow-brand-xl flex flex-col animate-slide-left select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface-alt">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-brand">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">ConnectX AI Insights</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${aiMode === 'off' ? 'bg-gray-400' : 'bg-emerald-500'}`} />
              <button
                type="button"
                onClick={async () => {
                  const next = aiMode === 'off' ? 'on_demand' : (aiMode === 'on_demand' ? 'auto' : 'off');
                  try {
                    await updateConversationAiModeApi(conversationId, next);
                    setAiMode(next);
                    toast.success(`Chat AI Mode: ${next.replace('_', ' ')} ✨`);
                  } catch (e) {
                    toast.error('Failed to change mode');
                  }
                }}
                className="text-[10px] font-semibold text-text-muted hover:text-brand-600 transition-colors uppercase tracking-wider underline cursor-pointer"
                title="Click to toggle mode"
              >
                Mode: {aiMode.replace('_', ' ')}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* AI Off Warning Banner with One-Click Turn On */}
      {aiMode === 'off' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>AI is currently set to Off for this chat.</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await updateConversationAiModeApi(conversationId, 'on_demand');
                setAiMode('on_demand');
                toast.success('Chat AI set to On-Demand ✨');
              } catch {
                toast.error('Failed to enable AI');
              }
            }}
            className="px-2.5 py-1 rounded bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shadow-xs"
          >
            Turn On
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border-main bg-surface px-2 overflow-x-auto scrollbar-none text-xs">
        {[
          { id: 'catchup', label: 'Catch-Up', icon: Clock },
          { id: 'tasks', label: 'Tasks', icon: CheckSquare },
          { id: 'decisions', label: 'Decisions', icon: Pin },
          { id: 'ask', label: 'Ask AI', icon: HelpCircle },
          { id: 'meeting', label: 'Meeting', icon: Video },
          { id: 'study', label: 'Study', icon: GraduationCap },
          { id: 'analytics', label: 'Analytics', icon: BarChart2 },
          { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 font-semibold whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* 1. Catch-Up Tab */}
        {activeTab === 'catchup' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">AI Catch-Up Summary</span>
              <div className="flex items-center gap-1 bg-surface-alt p-0.5 rounded-lg border border-border-main text-[10px]">
                <button
                  onClick={() => setSummaryStyle('brief')}
                  className={`px-2 py-0.5 rounded ${summaryStyle === 'brief' ? 'bg-surface font-bold text-brand-700 shadow-xs' : 'text-text-muted'}`}
                >
                  Brief
                </button>
                <button
                  onClick={() => setSummaryStyle('detailed')}
                  className={`px-2 py-0.5 rounded ${summaryStyle === 'detailed' ? 'bg-surface font-bold text-brand-700 shadow-xs' : 'text-text-muted'}`}
                >
                  Detailed
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-gradient text-white text-xs font-bold flex items-center justify-center gap-2 shadow-brand hover:shadow-brand-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGeneratingSummary ? 'Summarizing Chat...' : 'Generate Catch-Up Summary'}
            </button>

            {summary && (
              <div className="p-3.5 rounded-2xl bg-brand-50/80 border border-brand-200 text-xs space-y-3 animate-fade-in text-text-primary">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-700 block mb-0.5">Headline</span>
                  <p className="font-bold text-sm text-text-primary">{summary.headline}</p>
                </div>

                {summary.keyPoints?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-700 block mb-1">Key Points</span>
                    <ul className="space-y-1 text-text-secondary list-disc pl-4">
                      {summary.keyPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.tasksForMe?.length > 0 && (
                  <div className="p-2 rounded-xl bg-surface border border-brand-200">
                    <span className="text-[10px] uppercase font-bold text-brand-700 block mb-1">Tasks for You</span>
                    {summary.tasksForMe.map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-text-primary">
                        <CheckSquare className="w-3.5 h-3.5 text-brand-500" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleShareSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-bold text-brand-700 bg-white border border-brand-200 shadow-xs hover:bg-brand-50"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share to Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Tasks & Deadlines Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {/* Header with Quick Add & Scan buttons */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text-primary">Actionable Tasks</span>
                <span className="text-[10px] text-text-muted block">Track, assign, and scan commitments</span>
              </div>
              <button
                onClick={handleScanInsights}
                disabled={isExtracting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-button bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200 hover:bg-brand-100 transition-colors"
                title="Scan recent chat messages for commitments with AI"
              >
                {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-brand-500" />}
                Scan Chat
              </button>
            </div>

            {/* Quick Add Task Input */}
            <form onSubmit={handleCreateTask} className="p-2.5 rounded-xl bg-surface-alt border border-border-main space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new task (e.g. Review the documentation)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-border-main text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  type="submit"
                  disabled={isCreatingTask || !newTaskTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  {isCreatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-main/50">
                <div>
                  <label className="text-[10px] text-text-muted font-bold block mb-0.5">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-surface border border-border-main text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="">Unassigned</option>
                    {(conversation?.members || []).map((m) => {
                      const u = m.user;
                      if (!u) return null;
                      return (
                        <option key={u._id} value={u._id}>
                          {u.name || u.username}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted font-bold block mb-0.5">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueAt}
                    onChange={(e) => setNewTaskDueAt(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-surface border border-border-main text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-muted px-0.5">
                <span>Priority:</span>
                <div className="flex gap-1">
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-colors ${
                        newTaskPriority === p
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface border border-border-main text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-border-main pb-1">
              {[
                { id: 'all', label: `All (${tasks.length})` },
                { id: 'pending', label: `Pending (${tasks.filter((t) => t.status !== 'done').length})` },
                { id: 'done', label: `Done (${tasks.filter((t) => t.status === 'done').length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTaskFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    taskFilter === tab.id
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Task List */}
            {isLoadingTasks ? (
              <div className="text-center py-8 text-text-muted text-xs">
                <Loader2 className="w-5 h-5 mx-auto animate-spin mb-1 text-brand-500" />
                <p>Loading tasks...</p>
              </div>
            ) : tasks.filter((t) => {
                if (taskFilter === 'pending') return t.status !== 'done';
                if (taskFilter === 'done') return t.status === 'done';
                return true;
              }).length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs space-y-1">
                <CheckSquare className="w-6 h-6 mx-auto opacity-40" />
                <p>No tasks found in this view</p>
                <p className="text-[11px]">Type a task above or click "Scan Chat" to detect action items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks
                  .filter((t) => {
                    if (taskFilter === 'pending') return t.status !== 'done';
                    if (taskFilter === 'done') return t.status === 'done';
                    return true;
                  })
                  .map((task) => (
                    <div
                      key={task._id}
                      className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-start justify-between gap-2 text-xs hover:border-brand-300 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTaskDone(task)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            task.status === 'done'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-border-main bg-surface hover:border-brand-400'
                          }`}
                        >
                          {task.status === 'done' && <Check className="w-3 h-3" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-text-primary break-words ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-text-muted mt-0.5 break-words line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {task.priority && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  task.priority === 'urgent'
                                    ? 'bg-red-100 text-red-700'
                                    : task.priority === 'high'
                                    ? 'bg-amber-100 text-amber-700'
                                    : task.priority === 'low'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}
                            {task.origin === 'ai' && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[9px] font-bold inline-flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> AI
                              </span>
                            )}
                            {task.assignee?.name && (
                              <span className="px-1.5 py-0.5 rounded bg-surface border border-border-main text-text-secondary text-[9px] font-medium inline-flex items-center gap-1">
                                👤 {task.assignee.name}
                              </span>
                            )}
                            {task.dueAt && (
                              <span className="text-[10px] text-brand-600 font-medium">
                                Due {new Date(task.dueAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.status === 'suggested' && (
                          <button
                            onClick={() => handleAcceptTask(task._id)}
                            className="px-2 py-1 rounded bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold transition-colors"
                          >
                            Accept
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Decisions Tab */}
        {activeTab === 'decisions' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-text-primary">Decision Log</span>
            {decisions.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs">
                <Pin className="w-6 h-6 mx-auto opacity-40 mb-1" />
                <p>No decisions logged yet.</p>
              </div>
            ) : (
              decisions.map((dec) => (
                <div key={dec._id} className="p-3 rounded-xl bg-surface-alt border border-border-main text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      dec.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-50 text-brand-700'
                    }`}>
                      {dec.status}
                    </span>
                    {dec.status === 'proposed' && (
                      <button
                        onClick={() => handleConfirmDecision(dec._id)}
                        className="text-[10px] font-bold text-brand-600 hover:underline"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                  <p className="font-semibold text-text-primary">{dec.text}</p>
                  {dec.context && <p className="text-[11px] text-text-muted">{dec.context}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. Ask AI Tab (Interactive Chatbot) */}
        {activeTab === 'ask' && (
          <div className="flex flex-col h-[520px] text-xs">
            {/* Chatbot Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-main">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text-primary text-xs">ConnectX AI Assistant</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  </div>
                  <span className="text-[10px] text-text-muted block">Answers chat history & general questions</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowQuestionsHistory((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    showQuestionsHistory
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'bg-surface-alt hover:bg-brand-50 text-text-primary border border-border-main'
                  }`}
                  title="View all questions you've asked"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Questions ({askMessages.filter((m) => m.role === 'user').length})</span>
                </button>
                {askMessages.length > 0 && (
                  <button
                    onClick={handleClearThread}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Questions History Panel */}
            {showQuestionsHistory && (
              <div className="mb-2 p-2.5 rounded-xl bg-surface border border-border-main shadow-subtle space-y-2 animate-fade-in flex-shrink-0">
                <div className="flex items-center justify-between pb-1 border-b border-border-main/50">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Questions Asked
                  </span>
                  <span className="text-[10px] text-brand-600 font-semibold">Click to re-ask or inspect</span>
                </div>

                {askMessages.filter((m) => m.role === 'user').length > 3 && (
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-text-muted" />
                    <input
                      type="text"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      placeholder="Filter asked questions..."
                      className="w-full pl-7 pr-2 py-1 rounded-md bg-surface-alt border border-border-main text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                )}

                <div className="max-h-36 overflow-y-auto space-y-1">
                  {askMessages.filter((m) => m.role === 'user').length === 0 ? (
                    <p className="text-[11px] text-text-muted text-center py-2">
                      No questions asked yet. Ask any question below!
                    </p>
                  ) : (
                    askMessages
                      .filter((m) => m.role === 'user')
                      .filter((m) => !historySearchTerm || m.content.toLowerCase().includes(historySearchTerm.toLowerCase()))
                      .map((userQ, idx) => (
                        <button
                          key={userQ.id || idx}
                          type="button"
                          onClick={() => {
                            setAskQuery(userQ.content);
                            setShowQuestionsHistory(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg bg-surface-alt hover:bg-brand-50 hover:text-brand-700 text-text-primary text-[11px] flex items-center justify-between group transition-colors border border-transparent hover:border-brand-200"
                        >
                          <span className="truncate pr-2">{idx + 1}. {userQ.content}</span>
                          <span className="text-[9px] text-text-muted group-hover:text-brand-600 flex-shrink-0">
                            {new Date(userQ.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Chatbot Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {askMessages.length === 0 ? (
                <div className="py-6 space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/40 border border-brand-200/80 space-y-2 text-center">
                    <Sparkles className="w-7 h-7 mx-auto text-brand-600" />
                    <h4 className="font-bold text-text-primary text-xs">Hello! How can I help you today?</h4>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Ask anything about this chat (decisions, tasks, member remarks) or ask any general question (e.g. concepts, technology, explanations).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Suggested Questions</span>
                    <div className="flex flex-col gap-1.5">
                      {[
                        '⚡ What is the role of fiber optic cable?',
                        '📋 What tasks or commitments are pending?',
                        '💡 Summarize the latest key points from this chat',
                        '🎯 What decisions were made in this room?'
                      ].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleAsk(chip.replace(/^[^\s]+\s*/, ''))}
                          className="text-left px-3 py-2 rounded-xl bg-surface-alt border border-border-main text-[11px] text-text-primary hover:border-brand-400 hover:bg-brand-50/50 transition-colors flex items-center justify-between group"
                        >
                          <span>{chip}</span>
                          <ArrowRight className="w-3 h-3 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                askMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-3.5 py-2 bg-brand-gradient text-white text-xs shadow-xs break-words">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%] space-y-2">
                        <div className="p-3 rounded-2xl rounded-tl-xs bg-surface-alt border border-border-main space-y-2 shadow-xs">
                          {/* Badge: Chat citation vs General Knowledge */}
                          <div className="flex items-center justify-between gap-2 border-b border-border-main/50 pb-1.5">
                            {msg.citations?.length > 0 || msg.isFromChat ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                                <Sparkles className="w-2.5 h-2.5" /> Cited from this chat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                <Globe className="w-2.5 h-2.5" /> General Knowledge
                              </span>
                            )}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success('Answer copied to clipboard!');
                              }}
                              className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
                              title="Copy answer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-text-primary text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>

                          {/* Citations if any */}
                          {msg.citations?.length > 0 && (
                            <div className="pt-2 border-t border-border-main/60 space-y-1">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                                Chat Citations ({msg.citations.length})
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {msg.citations.map((c, i) => (
                                  <div
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-white border border-brand-200 text-[10px] text-brand-700 font-medium max-w-full truncate"
                                    title={c.textSnippet || ''}
                                  >
                                    {c.sender ? `[${c.sender}]` : 'Message citation'}
                                    {c.textSnippet && `: "${c.textSnippet.slice(0, 30)}..."`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <span className="text-[9px] text-text-muted mt-0.5 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}

              {isAsking && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-alt border border-border-main text-xs text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  <span>ConnectX AI is thinking...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chatbot Input Box */}
            <div className="pt-2 border-t border-border-main">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={askQuery}
                  onChange={(e) => setAskQuery(e.target.value)}
                  placeholder="Ask a question about this chat or any topic..."
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-alt border border-border-main text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  type="submit"
                  disabled={isAsking || !askQuery.trim()}
                  className="p-2 rounded-xl bg-brand-gradient text-white font-bold shadow-xs disabled:opacity-40 hover:opacity-90 transition-opacity"
                  title="Send question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 5. Meeting Mode Tab */}
        {activeTab === 'meeting' && (
          <div className="space-y-3 text-xs">
            <span className="text-xs font-bold text-text-primary">Meeting Mode</span>
            {!activeMeeting ? (
              <div className="p-3.5 rounded-2xl bg-surface-alt border border-border-main space-y-3">
                <p className="text-text-muted text-[11px]">Start a live meeting in this chat. ConnectX will record attendees and generate comprehensive minutes with action items.</p>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Meeting Title (e.g. Weekly Standup)"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-main text-xs"
                />
                <button
                  onClick={handleStartMeeting}
                  disabled={isMeetingLoading || !meetingTitle.trim()}
                  className="w-full py-2 rounded-xl bg-brand-gradient text-white font-bold shadow-subtle disabled:opacity-50"
                >
                  {isMeetingLoading ? 'Starting...' : 'Start Live Meeting 🎙️'}
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-brand-50 border border-brand-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-status-danger animate-pulse" />
                    Meeting: {activeMeeting.title}
                  </span>
                </div>
                <button
                  onClick={handleEndMeeting}
                  disabled={isMeetingLoading}
                  className="w-full py-2 rounded-xl bg-status-danger text-white font-bold"
                >
                  {isMeetingLoading ? 'Generating Minutes...' : 'End Meeting & Generate Minutes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. Study Mode Tab */}
        {activeTab === 'study' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Study Deck & Spaced Repetition</span>
              <button
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingStudy}
                className="px-2.5 py-1 rounded bg-brand-50 text-brand-700 font-bold border border-brand-200"
              >
                {isGeneratingStudy ? 'Generating...' : 'Create Deck 🎓'}
              </button>
            </div>

            {studyDeck && studyDeck.cards?.length > 0 && (
              <div className="space-y-3">
                <div
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className="p-6 rounded-2xl bg-surface-alt border border-brand-300 min-h-[140px] flex items-center justify-center text-center cursor-pointer shadow-subtle hover:bg-brand-50/50 transition-all"
                >
                  <p className="font-bold text-sm text-text-primary">
                    {isCardFlipped
                      ? studyDeck.cards[currentCardIdx]?.back
                      : studyDeck.cards[currentCardIdx]?.front}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Card {currentCardIdx + 1} of {studyDeck.cards.length}</span>
                  <div className="flex gap-1">
                    {['again', 'hard', 'good', 'easy'].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          submitCardReviewApi(studyDeck.cards[currentCardIdx]?._id, {
                            deckId: studyDeck._id,
                            rating,
                          });
                          setIsCardFlipped(false);
                          setCurrentCardIdx((prev) => (prev + 1) % studyDeck.cards.length);
                        }}
                        className="px-2 py-0.5 rounded capitalize bg-surface border border-border-main text-[10px] font-bold"
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-3 text-xs">
            <span className="text-xs font-bold text-text-primary">Team Productivity Metrics</span>
            {analytics ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-surface-alt border border-border-main">
                    <span className="text-[10px] text-text-muted block">Messages (7d)</span>
                    <span className="text-base font-bold text-text-primary">{analytics.totalMessages}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-alt border border-border-main">
                    <span className="text-[10px] text-text-muted block">Active Members</span>
                    <span className="text-base font-bold text-brand-600">{analytics.activeMembersCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-alt border border-border-main">
                    <span className="text-[10px] text-text-muted block">Task Completion</span>
                    <span className="text-base font-bold text-emerald-600">{analytics.completionRate}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-alt border border-border-main">
                    <span className="text-[10px] text-text-muted block">Decisions Made</span>
                    <span className="text-base font-bold text-text-primary">{analytics.decisionsCount}</span>
                  </div>
                </div>

                {analytics.aiInsight && (
                  <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-brand-700 block">Weekly Coach Insight</span>
                    <p className="text-text-primary leading-normal">{analytics.aiInsight}</p>
                    <p className="text-brand-700 font-medium pt-1">💡 {analytics.aiSuggestion}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">Loading metrics...</div>
            )}
          </div>
        )}

        {/* 8. Privacy & Activity Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-xs font-bold text-text-primary block mb-1">Conversation AI Mode</span>
              <div className="grid grid-cols-3 gap-1.5">
                {['off', 'on_demand', 'auto'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleChangeAiMode(mode)}
                    className={`py-1.5 rounded-xl capitalize font-bold border transition-colors ${
                      aiMode === mode ? 'bg-brand-500 text-white border-brand-500 shadow-xs' : 'bg-surface-alt border-border-main text-text-muted'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">Exclude my messages from AI</p>
                <p className="text-[10px] text-text-muted">Omits all your messages from AI contexts</p>
              </div>
              <input
                type="checkbox"
                checked={isOptedOut}
                onChange={handleToggleOptOut}
                className="w-4 h-4 accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <span className="text-xs font-bold text-text-primary block mb-1">Audit Activity Log</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border-main rounded-xl p-2 bg-surface-alt">
                {activities.length === 0 ? (
                  <p className="text-[10px] text-text-muted text-center py-2">No AI activity recorded yet.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act._id} className="text-[10px] flex items-center justify-between p-1 border-b border-border-main/50">
                      <span className="capitalize font-bold text-brand-700">{act.feature.replace('_', ' ')}</span>
                      <span className="text-text-muted">{act.messageCount} msgs · {new Date(act.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
