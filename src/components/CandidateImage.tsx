import React, { useState } from 'react';
import type { Candidate } from '../types';
import { initials } from '../lib/format';

/** Real photo when the owner has supplied one (with licence recorded), otherwise an honest monogram. Never a stock stand-in. */
export const CandidateImage: React.FC<{ candidate: Candidate; className?: string; eager?: boolean }> = ({ candidate, className = '', eager }) => {
  const [failed, setFailed] = useState(false);
  if (candidate.imageUrl && !failed) {
    return (
      <img
        src={candidate.imageUrl}
        alt={candidate.imageAlt || candidate.name}
        className={`object-cover object-top ${className}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={candidate.name}
      className={`flex items-center justify-center font-display font-black select-none ${className}`}
      style={{ background: `linear-gradient(135deg, ${candidate.highlightColor}22, #111512)`, color: candidate.highlightColor }}
    >
      <span className="text-4xl">{initials(candidate.name)}</span>
    </div>
  );
};
