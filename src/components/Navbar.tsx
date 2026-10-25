import React, { useState } from 'react';
import { Trophy, Menu, X } from 'lucide-react';
import type { Debate } from '../types';
import { isVotable } from '../lib/format';

interface Props {
  onNavigate: (id: string) => void;
  onSelectDebate: (d: Debate) => void;
  debates: Debate[];
}

const LINKS = [
  { id: 'hero', label: 'Home' },
  { id: 'debates', label: 'Debates' },
  { id: 'results', label: 'Results' },
  { id: 'how-it-works', label: 'How It Works' }
];

export const Navbar: React.FC<Props> = ({ onNavigate, onSelectDebate, debates }) => {
  const [open, setOpen] = useState(false);
  const live = debates.find((d) => d.isFlagship && isVotable(d)) || debates.find((d) => isVotable(d));
  const go = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080A09]/90 backdrop-blur-md border-b border-[#29312B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
        <button onClick={() => go('hero')} className="flex items-center gap-2.5 group" aria-label="GOAT Wars home">
          <span className="w-9 h-9 rounded bg-[#111512] border border-[#39E477]/40 flex items-center justify-center text-[#39E477]">
            <Trophy className="w-5 h-5" />
          </span>
          <span className="font-display font-extrabold text-xl tracking-wider text-[#F6F8F6]">
            GOAT <span className="text-[#39E477]">WARS</span>
          </span>
        </button>

        {live && (
          <button
            onClick={() => onSelectDebate(live)}
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-[#111512] border border-[#29312B] hover:border-[#39E477]/50 text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-[#39E477] animate-pulse motion-reduce:animate-none" aria-hidden />
            <span className="text-[#A4AEA7]">LIVE</span>
            <span className="text-[#F6F8F6] font-semibold truncate max-w-[16rem]">{live.candidates.map((c) => c.shortName || c.name).join(' vs ').slice(0, 40)}</span>
          </button>
        )}

        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="text-sm font-medium text-[#A4AEA7] hover:text-[#39E477] transition-colors">
              {l.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2.5 rounded text-[#A4AEA7] hover:text-[#F6F8F6] bg-[#111512] border border-[#29312B]"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-[#29312B] bg-[#080A09] px-4 py-3 space-y-1" aria-label="Mobile">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="w-full text-left py-3 px-3 rounded text-sm font-medium text-[#F6F8F6] hover:bg-[#111512]">
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
