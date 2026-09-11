'use client';

import React from 'react';
import { useSession } from 'next-auth/react';

interface WatermarkOverlayProps {
  customText?: string;
}

export function WatermarkOverlay({ customText }: WatermarkOverlayProps) {
  const { data: session } = useSession();
  const email = customText || session?.user?.email || 'authenticated-viewer@company.org';
  const timestamp = new Date().toISOString().split('T')[0];

  const watermarkString = `${email} • CONFIDENTIAL • ${timestamp}`;

  // Generate an array of repeated tiles to cover the viewport
  const rows = Array.from({ length: 8 });
  const cols = Array.from({ length: 4 });

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-around opacity-15"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {rows.map((_, rIdx) => (
        <div
          key={rIdx}
          className="flex justify-around items-center whitespace-nowrap -rotate-12 transform scale-110"
        >
          {cols.map((_, cIdx) => (
            <span
              key={cIdx}
              className="text-xs sm:text-sm font-mono font-semibold tracking-widest text-slate-400/80 px-6 py-2"
            >
              {watermarkString}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
