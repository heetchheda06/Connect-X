import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  MessageSquare,
  Shield,
  LifeBuoy
} from 'lucide-react';
import axiosInstance from '../api/axios.js';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';

export default function SupportPage() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      q: 'How do I enable Two-Step Verification (2FA)?',
      a: 'Go to Settings → Account & Security → Two-Step Verification (2FA). Click "Enable 2FA" and scan the generated QR code with any standard authenticator app (Google Authenticator, Authy, Microsoft Authenticator) and verify with a 6-digit code.',
    },
    {
      q: 'How does account deletion work?',
      a: 'You can schedule account deletion from Settings → Account. ConnectX gives you a 14-day grace period. If you change your mind, simply log in before the 14 days elapse to cancel the deletion request.',
    },
    {
      q: 'How do I download a copy of my personal data?',
      a: 'Navigate to Settings → Account & Security → Download My Data. Click "Request Export" to instantly receive a complete ZIP archive containing your profile, chats metadata, contacts, and message history.',
    },
    {
      q: 'Are my audio and video calls private?',
      a: 'Yes, ConnectX peer-to-peer calls use WebRTC with end-to-end media encryption. Audio and video streams are transmitted directly between participants.',
    },
    {
      q: 'Can I use ConnectX in Hindi?',
      a: 'Yes! ConnectX supports full English and Hindi internationalization. Change your language preference in Settings → Language.',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !subject || !message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axiosInstance.post('/api/support/tickets', {
        email,
        subject,
        category,
        message,
      });

      if (res.data?.success) {
        setSubmitted(true);
        toast.success('Your support ticket has been submitted!');
      } else {
        toast.error(res.data?.message || 'Failed to submit ticket');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to ConnectX</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Help & Support Center</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
            <LifeBuoy className="w-3.5 h-3.5" />
            24/7 ConnectX Help Desk
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How can we help you?
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Find quick answers in our FAQ or submit a ticket to our engineering and support team.
          </p>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-600" />
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-slate-100">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-semibold text-slate-900 hover:text-teal-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed pr-6 animate-fadeIn">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-600" />
            Submit a Support Ticket
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Have an issue, bug report, or feature suggestion? Let us know and we&apos;ll get back to you promptly.
          </p>

          {submitted ? (
            <div className="p-6 rounded-xl bg-teal-50 border border-teal-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
              <h3 className="text-lg font-bold text-teal-900">Ticket Received!</h3>
              <p className="text-sm text-teal-700 max-w-md mx-auto">
                Thank you for contacting us. We have received your inquiry and sent a confirmation to{' '}
                <strong>{email}</strong>. Our team will review and respond shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSubject('');
                  setMessage('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white font-medium text-xs hover:bg-teal-700 transition-colors"
              >
                Submit another ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="account">Account & Security</option>
                    <option value="bug">Bug Report</option>
                    <option value="safety">Safety & Moderation</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your question or issue"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Details *
                </label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue or question in detail..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
          <Link to="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/guidelines" className="hover:text-teal-600 transition-colors">Community Guidelines</Link>
          <span>•</span>
          <Link to="/data-storage" className="hover:text-teal-600 transition-colors">Private Storage Notice</Link>
        </div>
      </main>
    </div>
  );
}

