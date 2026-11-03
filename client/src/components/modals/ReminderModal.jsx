import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  X, 
  Calendar, 
  Check, 
  Trash2, 
  RotateCw, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Bell
} from 'lucide-react';
import { 
  parseReminderApi, 
  createReminderApi, 
  listRemindersApi, 
  updateReminderApi, 
  deleteReminderApi 
} from '../../api/ai.api.js';
import { toast } from 'react-hot-toast';

const QUICK_CHIPS = [
  { label: 'In 1 hour', query: 'in 1 hour' },
  { label: 'This evening', query: 'this evening at 6pm' },
  { label: 'Tomorrow morning', query: 'tomorrow morning at 9am' },
  { label: 'Next week', query: 'next monday morning at 9am' },
];

export default function ReminderModal({ isOpen, onClose, targetMessage = null, conversationId = null }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'list'
  const [queryText, setQueryText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedProposal, setParsedProposal] = useState(null); // { remindAt, humanReadable, confidence, question, needsClarification }
  const [customDateTime, setCustomDateTime] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // List of reminders
  const [reminders, setReminders] = useState([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (targetMessage) {
        setNote(targetMessage.content?.slice(0, 100) || 'Message reminder');
        setQueryText('tomorrow morning at 9am');
      } else {
        setNote('');
        setQueryText('');
      }
      setParsedProposal(null);
      fetchReminders();
    }
  }, [isOpen, targetMessage]);

  const fetchReminders = async () => {
    try {
      setIsLoadingReminders(true);
      const res = await listRemindersApi();
      if (res.success && res.data) {
        setReminders(res.data.reminders || []);
      }
    } catch (err) {
      // Quiet background failure
    } finally {
      setIsLoadingReminders(false);
    }
  };

  if (!isOpen) return null;

  const handleParse = async (textToParse) => {
    const text = textToParse || queryText;
    if (!text.trim()) return;

    try {
      setIsParsing(true);
      const res = await parseReminderApi({
        text: text.trim(),
        messageId: targetMessage?._id || null,
      });

      if (res.success && res.data) {
        setParsedProposal(res.data);
        if (res.data.remindAt) {
          const dt = new Date(res.data.remindAt);
          setCustomDateTime(dt.toISOString().slice(0, 16));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not parse reminder time');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmCreate = async () => {
    const finalRemindAt = customDateTime ? new Date(customDateTime) : parsedProposal?.remindAt;
    if (!finalRemindAt) {
      toast.error('Please specify a valid future date and time');
      return;
    }

    try {
      setIsSaving(true);
      const res = await createReminderApi({
        conversationId: conversationId || targetMessage?.conversation || null,
        messageId: targetMessage?._id || null,
        note: note.trim() || 'Reminder',
        remindAt: finalRemindAt,
      });

      if (res.success) {
        toast.success('Reminder scheduled! ⏰');
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create reminder');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSnooze = async (reminderId, minutes = 10) => {
    try {
      await updateReminderApi(reminderId, { action: 'snooze', minutes });
      toast.success(`Snoozed for ${minutes} minutes`);
      fetchReminders();
    } catch (err) {
      toast.error('Failed to snooze reminder');
    }
  };

  const handleMarkDone = async (reminderId) => {
    try {
      await updateReminderApi(reminderId, { action: 'done' });
      toast.success('Reminder marked as completed');
      fetchReminders();
    } catch (err) {
      toast.error('Failed to update reminder');
    }
  };

  const handleDelete = async (reminderId) => {
    try {
      await deleteReminderApi(reminderId);
      toast.success('Reminder deleted');
      fetchReminders();
    } catch (err) {
      toast.error('Failed to delete reminder');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border-main rounded-2xl shadow-brand-lg w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-main bg-surface-alt">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Smart Reminders</h3>
              <p className="text-[11px] text-text-muted">AI-powered scheduling & alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-border-main bg-surface px-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Schedule Reminder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            My Reminders
            {reminders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
                {reminders.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'create' ? (
            <>
              {/* Quick Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text-primary">Quick presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQueryText(chip.query);
                        handleParse(chip.query);
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-alt hover:bg-brand-50 hover:text-brand-700 border border-border-main transition-colors shadow-xs"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Natural Language Prompt Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">When should ConnectX remind you?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                    placeholder="e.g. tomorrow at 4pm, Friday evening, in 2 hours"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-alt border border-border-main text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button
                    type="button"
                    disabled={isParsing || !queryText.trim()}
                    onClick={() => handleParse()}
                    className="px-3 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold shadow-subtle hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Parse
                  </button>
                </div>
              </div>

              {/* Confirmation Card */}
              {parsedProposal && (
                <div className="p-3.5 rounded-xl bg-brand-50/80 border border-brand-200 space-y-3 animate-fade-in text-xs">
                  {parsedProposal.needsClarification ? (
                    <div className="flex items-start gap-2 text-amber-800">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Need clarification</span>
                        <p>{parsedProposal.question || 'Please provide a clear future time.'}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-brand-700 block mb-0.5">
                        AI Proposed Time
                      </span>
                      <p className="text-sm font-bold text-text-primary">
                        🔔 Remind you on {parsedProposal.humanReadable}
                      </p>
                    </div>
                  )}

                  {/* Date & Time Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted font-medium">Fine-tune Date & Time:</label>
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border-main text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>

                  {/* Reminder Note */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted font-medium">Reminder note:</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Note for this reminder..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border-main text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setParsedProposal(null)}
                      className="px-3 py-1.5 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleConfirmCreate}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-button text-xs font-bold text-white bg-brand-gradient hover:shadow-brand shadow-subtle active:scale-95"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Confirm Reminder
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* List Tab */
            <div className="space-y-2">
              {isLoadingReminders ? (
                <div className="flex items-center justify-center py-8 text-text-muted text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  <span>Loading reminders...</span>
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs space-y-1">
                  <Bell className="w-6 h-6 mx-auto opacity-40" />
                  <p className="font-semibold">No active reminders</p>
                  <p className="text-[11px]">Click "Schedule Reminder" above to set your first reminder!</p>
                </div>
              ) : (
                reminders.map((r) => (
                  <div
                    key={r._id}
                    className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-text-primary truncate">{r.note || 'Reminder'}</p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-brand-700">
                          <Calendar className="w-3 h-3" />
                          {new Date(r.remindAt).toLocaleString()}
                        </span>
                        <span className={`capitalize px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          r.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-50 text-brand-700'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {r.status !== 'done' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSnooze(r._id, 10)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface"
                            title="Snooze 10m"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkDone(r._id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-emerald-600 hover:bg-surface"
                            title="Mark Done"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(r._id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-surface"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
