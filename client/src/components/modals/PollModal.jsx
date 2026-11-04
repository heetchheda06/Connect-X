import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';

export default function PollModal({ isOpen, onClose, onCreatePoll }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 12) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      return setError('Please enter a poll question');
    }

    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      return setError('Poll must have at least 2 non-empty options');
    }

    onCreatePoll({
      question: question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        voters: [],
      })),
      allowMultiple,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-2xl border border-border-main flex flex-col space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-main">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Create a Poll</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-status-danger/10 text-status-danger text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setError('');
              }}
              placeholder="Ask a question..."
              maxLength={300}
              className="w-full px-3.5 py-2 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              Options
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={100}
                  className="flex-1 px-3 py-1.5 text-xs bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1.5 text-text-muted hover:text-status-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {options.length < 12 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          {/* Multiple answers */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allowMultiple"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
            />
            <label htmlFor="allowMultiple" className="text-xs font-medium text-text-secondary cursor-pointer">
              Allow multiple answers
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-main">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-button bg-brand-gradient text-white text-xs font-bold shadow-brand hover:shadow-brand-lg active:scale-95 transition-all"
            >
              Create Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
