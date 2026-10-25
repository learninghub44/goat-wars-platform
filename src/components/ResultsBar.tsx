import React from 'react';
import type { Debate } from '../types';
import { pct } from '../lib/format';

export const ResultsBar: React.FC<{ debate: Debate }> = ({ debate }) => {
  if (debate.totalVotes === 0) return null;
  return (
    <div
      className="h-4 w-full rounded-full bg-[#080A09] overflow-hidden flex border border-[#29312B]"
      role="img"
      aria-label={debate.candidates.map((c) => `${c.name} ${pct(c, debate).toFixed(1)} percent`).join(', ')}
    >
      {debate.candidates.map((c) => (
        <div key={c.id} style={{ width: `${pct(c, debate)}%`, background: c.highlightColor }} className="h-full transition-all duration-700 motion-reduce:transition-none" />
      ))}
    </div>
  );
};
