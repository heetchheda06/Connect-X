import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HardDrive, ShieldCheck, Server, RefreshCw } from 'lucide-react';

export default function StorageNoticePage() {
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
          <span>Infrastructure & Storage</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-3">
            <HardDrive className="w-3.5 h-3.5" />
            Storage Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Private Storage Notice
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Detailed information on how ConnectX handles media storage, caching, retention, and file security.
          </p>
        </div>

        <section className="space-y-6 leading-relaxed text-sm sm:text-base text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Resilient Dual-Layer Storage</h2>
            <p>
              ConnectX utilizes a dual-layer media architecture. Files uploaded to chats (photos, videos, audio notes, and documents)
              are committed to MongoDB GridFS for durable, multi-replica distributed persistence. For lightning-fast access, active media
              is cached directly on the ephemeral container disk.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Private File Protection & Signed URLs</h2>
            <p>
              Media links generated within chat conversations use unique, cryptographically random identifiers. Access to sensitive
              assets is validated against active user session tokens or signed URL signatures to prevent unauthorized directory scraping.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Storage Limits & File Sizes</h2>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Images & Photos: Up to 10 MB per item.</li>
              <li>Voice Notes: Recorded in WebM/Opus audio format, compressed client-side.</li>
              <li>Documents & Archives: Up to 25 MB per attachment.</li>
              <li>Vector Stickers: Hosted locally with zero external CDN dependency.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Data Deletion Lifecycle</h2>
            <p>
              When a message is deleted for everyone or an account deletion grace period finishes, associated file records are dereferenced
              and deleted from GridFS during automated maintenance sweeps.
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
