import React, { useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function PasswordStrengthMeter({ password = '' }) {
  const analysis = useMemo(() => {
    if (!password) {
      return { score: 0, label: '', color: 'bg-slate-200', text: 'text-text-muted', percent: 0 };
    }

    let score = 0;
    const len = password.length;

    if (len >= 8) score += 1;
    if (len >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Byte length check for 72-byte bcrypt max
    const byteLength = new TextEncoder().encode(password).length;
    const isTooLong = byteLength > 72;

    if (isTooLong) {
      return {
        score: 0,
        label: 'Too long (exceeds 72 bytes)',
        color: 'bg-status-danger',
        text: 'text-status-danger',
        percent: 100,
        isTooLong: true,
      };
    }

    if (score <= 1) {
      return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500', percent: 25 };
    }
    if (score === 2) {
      return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500', percent: 50 };
    }
    if (score === 3) {
      return { score: 3, label: 'Good', color: 'bg-teal-500', text: 'text-teal-600', percent: 75 };
    }
    return { score: 4, label: 'Strong', color: 'bg-brand-500', text: 'text-brand-600', percent: 100 };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-text-muted flex items-center gap-1">
          {analysis.score >= 3 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-text-muted" />
          )}
          Password strength:
        </span>
        <span className={analysis.text}>{analysis.label}</span>
      </div>

      {/* 4 Segmented Strength Bars */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`rounded-full transition-all duration-300 ${
              analysis.score >= step
                ? analysis.color
                : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

