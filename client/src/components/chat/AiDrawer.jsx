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
  AlertCircle
} from 'lucide-react';
import { 
  generateSummaryApi, 
  shareSummaryApi, 
  extractInsightsApi, 
  listTasksApi, 
  updateTaskApi, 
  createTaskApi,
  listDeadlinesApi,
  acceptDeadlineApi,
  listDecisionsApi, 
  updateDecisionApi, 
  askThisChatApi,
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

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Decisions state
  const [decisions, setDecisions] = useState([]);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(false);

  // Ask AI state
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResult, setAskResult] = useState(null);

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
  const [aiMode, setAiMode] = useState(conversation?.ai?.mode || 'off');
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (isOpen && conversationId) {
      setAiMode(conversation?.ai?.mode || 'off');
      loadInitialData();
    }
  }, [isOpen, conversationId, activeTab]);

  const loadInitialData = () => {
    if (activeTab === 'tasks') fetchTasks();
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

  const handleAsk = async () => {
    if (!askQuery.trim()) return;
    try {
      setIsAsking(true);
      const res = await askThisChatApi({
        conversationId,
        question: askQuery.trim(),
      });
      if (res.success) setAskResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not find answer');
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
        toast.success('Meeting ended! Minutes generated.');
      }
    } catch (err) {
      toast.error('Failed to end meeting');
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
      toast.error('Failed to generate cards');
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
            <p className="text-[10px] text-text-muted capitalize">Mode: {aiMode}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Actionable Tasks</span>
              <button
                onClick={handleScanInsights}
                disabled={isExtracting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-button bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200 hover:bg-brand-100"
              >
                {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Scan Chat
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs space-y-1">
                <CheckSquare className="w-6 h-6 mx-auto opacity-40" />
                <p>No tasks detected yet</p>
                <p className="text-[11px]">Click "Scan Chat" to automatically extract commitments.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task._id}
                  className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <button
                      onClick={() => handleToggleTaskDone(task)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${
                        task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border-main bg-surface'
                      }`}
                    >
                      {task.status === 'done' && <Check className="w-3 h-3" />}
                    </button>
                    <div>
                      <p className={`font-semibold text-text-primary ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </p>
                      {task.dueAt && (
                        <span className="text-[10px] text-brand-600 block mt-0.5">
                          Due: {new Date(task.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {task.status === 'suggested' && (
                    <button
                      onClick={() => handleAcceptTask(task._id)}
                      className="px-2 py-1 rounded bg-brand-500 text-white text-[10px] font-bold"
                    >
                      Accept
                    </button>
                  )}
                </div>
              ))
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

        {/* 4. Ask AI Tab */}
        {activeTab === 'ask' && (
          <div className="space-y-3 text-xs">
            <span className="text-xs font-bold text-text-primary">Ask This Chat</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="What did Riya suggest? Who is doing what?"
                className="flex-1 px-3 py-2 rounded-xl bg-surface-alt border border-border-main text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                onClick={handleAsk}
                disabled={isAsking || !askQuery.trim()}
                className="px-3 py-2 rounded-xl bg-brand-gradient text-white font-bold shadow-xs disabled:opacity-50"
              >
                {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
              </button>
            </div>

            {askResult && (
              <div className="p-3 rounded-xl bg-brand-50/80 border border-brand-200 space-y-2 animate-fade-in">
                <span className="text-[10px] uppercase font-bold text-brand-700 block">Answer</span>
                <p className="text-text-primary leading-relaxed">{askResult.answer}</p>
                {askResult.citations?.length > 0 && (
                  <div className="pt-1 border-t border-brand-200/60">
                    <span className="text-[10px] font-bold text-text-muted block mb-1">Citations</span>
                    <div className="flex flex-wrap gap-1">
                      {askResult.citations.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white border border-brand-200 text-[10px] text-brand-700 font-medium">
                          {c.sender ? `[${c.sender}]` : 'Message citation'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
