import React from 'react';

export default function DateDivider({ dateText }) {
  return (
    <div className="sticky top-2 z-10 flex items-center justify-center my-3 pointer-events-none">
      <div className="px-3.5 py-1 rounded-full bg-surface-alt/90 backdrop-blur-md border border-border-main shadow-subtle text-[11px] font-semibold text-text-secondary select-none">
        {dateText}
      </div>
    </div>
  );
}

