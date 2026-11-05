import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HeartHandshake, ShieldAlert, AlertTriangle, Users } from 'lucide-react';

export default function GuidelinesPage() {
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
          <span>Standards & Safety</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-3">
            <HeartHandshake className="w-3.5 h-3.5" />
            Safe & Respectful Community
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Community Guidelines
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            ConnectX brings people together through real-time communication. To keep our platform welcoming and safe for everyone, all members must abide by these rules.
          </p>
        </div>

        <section className="space-y-6 leading-relaxed text-sm sm:text-base text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Respect and Civility</h2>
            <p>
              Treat other users with courtesy and respect. Healthy discussions and diverse opinions are welcomed, but
              personal insults, derogatory slurs, harassment, stalking, and bullying are strictly prohibited.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Zero Tolerance for Hate Speech & Violence</h2>
            <p>
              We do not tolerate content that promotes hatred, discrimination, violence, or harm against individuals or
              groups based on race, ethnicity, religion, disability, gender, age, nationality, or sexual orientation.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Spam, Scams & Automated Abuse</h2>
            <p>
              Do not use automated bots, scripts, or rapid flooding to clutter chats. Any attempts to phish credentials,
              distribute malicious software, run financial scams, or harvest member details will result in an immediate
              account ban.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Reporting Violations</h2>
            <p>
              If you encounter abusive behavior or spam, use the in-app &quot;Report&quot; feature available on any message or user profile.
              Our moderation team reviews reports promptly and takes decisive action, including warning issuance, message removal,
              or permanent suspension.
            </p>
          </div>
        </section>

        <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
          <Link to="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/support" className="hover:text-teal-600 transition-colors">Support Desk</Link>
        </div>
      </main>
    </div>
  );
}

