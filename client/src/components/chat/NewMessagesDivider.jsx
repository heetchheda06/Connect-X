import React from 'react';

export default function NewMessagesDivider() {
  return (
    <div className="flex items-center gap-3 my-4 py-1 select-none pointer-events-none animate-fade-in">
      <div className="flex-1 h-[1px] bg-accent-coral/40" />
      <span className="px-3 py-0.5 rounded-full bg-accent-coral/10 border border-accent-coral/30 text-[10px] font-bold tracking-wider uppercase text-accent-coral shadow-subtle">
        New Messages
      </span>
      <div className="flex-1 h-[1px] bg-accent-coral/40" />
    </div>
  );
}

