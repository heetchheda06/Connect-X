import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navigation */}
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

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-3">
            <FileText className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Please read these Terms of Service carefully before creating an account or using ConnectX.
          </p>
        </div>

        <section className="space-y-6 leading-relaxed text-sm sm:text-base text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or using ConnectX (including our web applications, desktop wrappers, or mobile PWAs),
              you signify that you have read, understood, and agree to be bound by these Terms of Service and our
              accompanying Privacy Policy. If you do not agree to all terms, do not register or use the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Eligibility and Age Requirements</h2>
            <p>
              ConnectX is designed for users who are at least <strong>13 years of age</strong> (or 16 years of age in
              certain European jurisdictions). By registering, you affirm that you meet this minimum age requirement.
              Accounts found to be created by underage individuals will be promptly suspended.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. User Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials (passwords, two-factor
              authentication codes, and session tokens). You agree to notify ConnectX immediately if you suspect any
              unauthorized access or compromise of your account. ConnectX is not liable for losses caused by stolen credentials.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Acceptable Use Policy</h2>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>No spamming, flooding, automated messaging, or denial-of-service attempts.</li>
              <li>No harassment, abusive conduct, hate speech, or defamatory attacks against other members.</li>
              <li>No dissemination of malware, spyware, phishing links, or unauthorized files.</li>
              <li>Respect intellectual property rights and copyrights of others.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. AI Features & Data Processing</h2>
            <p>
              ConnectX provides opt-in AI tools (including smart replies, voice transcription, and translation).
              When you use AI capabilities, message snippets are processed strictly to fulfill your requested action in
              accordance with our Privacy Policy and never used to train third-party public foundation models without consent.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">6. Termination and Account Deletion</h2>
            <p>
              You may request deletion of your account at any time via Settings. A 14-day grace period is provided during
              which you can cancel the request by signing back in. After 14 days, your profile and associated data will be
              permanently purged from active databases.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">7. Disclaimers and Limitation of Liability</h2>
            <p>
              ConnectX is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind.
              We are not responsible for any indirect, incidental, or punitive damages arising from your use of the platform.
            </p>
          </div>
        </section>

        {/* Footer links */}
        <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
          <Link to="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/guidelines" className="hover:text-teal-600 transition-colors">Community Guidelines</Link>
          <span>•</span>
          <Link to="/support" className="hover:text-teal-600 transition-colors">Support Desk</Link>
        </div>
      </main>
    </div>
  );
}

