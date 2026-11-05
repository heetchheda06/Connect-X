import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Database, UserCheck, Shield } from 'lucide-react';

export default function PrivacyPage() {
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
          <span>Version 1.0</span>
          <span>•</span>
          <span>Effective: November 2026</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            Your Privacy & Data Rights
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            How ConnectX collects, protects, uses, and respects your personal communications and files.
          </p>
        </div>

        <section className="space-y-6 leading-relaxed text-sm sm:text-base text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Account Credentials:</strong> Username, email address, password hash, and avatar.</li>
              <li><strong>Communications:</strong> Real-time messages, voice recordings, video calls signaling, and shared attachments.</li>
              <li><strong>Technical Logs:</strong> Truncated IP addresses (/24 or /48) for brute-force defense, user agents for session management, and push notification tokens.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. How We Store Your Files</h2>
            <p>
              Uploaded attachments, stickers, and voice notes are stored securely using MongoDB GridFS with local server
              disk caching. ConnectX uses authenticated or signed access for protected assets. We never sell your shared
              files or communication history to advertisers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Artificial Intelligence (AI) Features</h2>
            <p>
              ConnectX integrates assistive AI capabilities powered by Google Gemini API. When you engage features such
              as voice note transcription, smart replies, or instant message translation, the relevant text or audio
              chunk is processed strictly to provide the requested response. We do not use your private communications to
              train public LLMs. You can disable AI features anytime in Settings.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Two-Step Verification & Sessions</h2>
            <p>
              You can protect your account using Time-based One-Time Passwords (TOTP) through standard authenticator apps.
              You have full visibility into your active login sessions and can remotely revoke any device at any time.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Your Rights: Export & Account Deletion</h2>
            <p>
              Under global data privacy standards (GDPR, CCPA), you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Download Your Data:</strong> Request a complete ZIP export of your profile, chats metadata, contacts, and messages.</li>
              <li><strong>Delete Your Account:</strong> Schedule permanent account deletion with a 14-day grace period. During this period, logging back in cancels the deletion. After 14 days, all associated database records and uploads are permanently deleted.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">6. Contacting Privacy Team</h2>
            <p>
              For privacy inquiries or compliance questions, submit a ticket via our{' '}
              <Link to="/support" className="text-teal-600 font-semibold underline">
                Support Desk
              </Link>{' '}
              or email us at <code>privacy@connectx.local</code>.
            </p>
          </div>
        </section>

        <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
          <Link to="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link to="/guidelines" className="hover:text-teal-600 transition-colors">Community Guidelines</Link>
          <span>•</span>
          <Link to="/support" className="hover:text-teal-600 transition-colors">Support Desk</Link>
        </div>
      </main>
    </div>
  );
}

