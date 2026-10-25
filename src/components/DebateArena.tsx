import React, { useState } from 'react';
import { Users, Trophy, Award, Crown, Share2, Sparkles, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import type { Candidate, Debate, DebateCategory } from '../types';
import { CandidateImage } from './CandidateImage';
import { isVotable, pctLabel, pct, priceLabel, statusLabel } from '../lib/format';
import { debateUrl, shareOrCopy } from '../lib/share';
import { useSite } from '../lib/SiteContext';
import { useToast } from '../lib/Toast';

interface Props {
  debates: Debate[] | null;
  error: string | null;
  onRetry: () => void;
  onSelectDebate: (d: Debate) => void;
  onVoteClick: (d: Debate, c: Candidate) => void;
  onGenerateFanCard: (d: Debate, c: Candidate) => void;
}

const CATS: { id: DebateCategory; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Debates', Icon: Trophy },
  { id: 'players', label: 'Players', Icon: Users },
  { id: 'clubs', label: 'Clubs', Icon: Crown },
  { id: 'predictions', label: 'Title Predictions', Icon: Trophy },
  { id: 'managers', label: 'Managers', Icon: Award }
];
const VISIBLE_ROWS = 5;

export const DebateArena: React.FC<Props> = ({ debates, error, onRetry, onSelectDebate, onVoteClick, onGenerateFanCard }) => {
  const [cat, setCat] = useState<DebateCategory>('all');
  const { siteUrl } = useSite();
  const toast = useToast();
  const list = (debates ?? []).filter((d) => !d.isFlagship && (cat === 'all' || d.category === cat));

  const share = async (d: Debate) => {
    const r = await shareOrCopy({ title: d.title, text: `${d.question} Pick your side on GOAT Wars.`, url: debateUrl(siteUrl, d.slug) });
    if (r === 'copied') toast('Link copied');
  };

  return (
    <section id="debates" className="py-16 sm:py-24 bg-[#080A09] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-10">
          <div className="text-xs font-bold uppercase tracking-widest text-[#39E477] mb-2">THE DEBATE DOESN'T END HERE</div>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F6F8F6] tracking-tight uppercase">THE FOOTBALL DEBATE ARENA</h2>
          <p className="mt-3 text-[#A4AEA7] text-base leading-relaxed">From the best players to the biggest clubs, make your voice heard. Pick your side, join the debate, and see what football fans think.</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8" role="tablist" aria-label="Debate categories">
          {CATS.map(({ id, label, Icon }) => (
            <button key={id} role="tab" aria-selected={cat === id} onClick={() => setCat(id)} className={`flex items-center gap-2 px-4 min-h-11 rounded-xl text-xs font-bold uppercase whitespace-nowrap ${cat === id ? 'bg-[#39E477] text-[#080A09]' : 'bg-[#111512] text-[#A4AEA7] hover:text-[#F6F8F6] border border-[#29312B]'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {debates === null && !error && <div className="flex justify-center gap-2 py-12 text-sm text-[#A4AEA7]" role="status"><Loader2 className="w-5 h-5 animate-spin" /> Loading debates…</div>}
        {error && debates === null && (
          <div className="text-center p-8 rounded-2xl bg-[#111512] border border-red-900/60" role="alert">
            <AlertCircle className="w-7 h-7 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-[#F6F8F6]">We couldn’t load the debates.</p>
            <button onClick={onRetry} className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-[#39E477] text-[#080A09]">Try again</button>
          </div>
        )}
        {debates !== null && list.length === 0 && <div className="text-center py-12 rounded-2xl border border-dashed border-[#29312B] text-sm text-[#A4AEA7]">No debates in this category yet.</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {list.map((d) => {
            const votable = isVotable(d);
            const multi = d.candidates.length > 2;
            const rows = multi ? [...d.candidates].sort((a, b) => b.verifiedVotes - a.verifiedVotes || a.displayOrder - b.displayOrder).slice(0, VISIBLE_ROWS) : d.candidates;
            return (
              <article key={d.id} className="rounded-2xl bg-[#111512] border border-[#29312B] hover:border-[#39E477]/40 transition-colors flex flex-col overflow-hidden">
                <header className="p-6 border-b border-[#29312B]">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#39E477]">{d.categoryLabel} • {priceLabel(d)}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#080A09] border border-[#29312B] text-[#A4AEA7]">{statusLabel(d)}</span>
                      <button onClick={() => share(d)} aria-label={`Share ${d.title}`} className="p-2 rounded bg-[#080A09] border border-[#29312B] hover:border-[#39E477] text-[#A4AEA7]"><Share2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-[#F6F8F6]">{d.question}</h3>
                  <p className="mt-1 text-xs text-[#A4AEA7] line-clamp-2">{d.supportingText}</p>
                </header>

                <div className="p-6 space-y-2.5">
                  {rows.map((c) => (
                    <div key={c.id} className="bg-[#080A09] border border-[#29312B] rounded-xl p-3 flex items-center gap-3">
                      <CandidateImage candidate={c} className="w-11 h-11 rounded-lg shrink-0 border border-[#29312B]" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-bold text-sm text-[#F6F8F6] truncate">{c.name}</h4>
                        <div className="h-1.5 w-full bg-[#111512] rounded-full overflow-hidden mt-1.5" aria-hidden>
                          <div style={{ width: `${pct(c, d)}%`, background: c.highlightColor }} className="h-full transition-all duration-500 motion-reduce:transition-none" />
                        </div>
                        <span className="text-[10px] text-[#A4AEA7]">{pctLabel(c, d)} · {c.verifiedVotes.toLocaleString()} votes</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onVoteClick(d, c)} disabled={!votable} className="min-h-10 px-3 rounded-lg text-xs font-bold uppercase bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] disabled:opacity-40 disabled:cursor-not-allowed">Vote</button>
                        <button onClick={() => onGenerateFanCard(d, c)} aria-label={`Fan card for ${c.name}`} className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-[#A4AEA7] hover:text-[#39E477] bg-[#111512] border border-[#29312B]"><Sparkles className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {multi && d.candidates.length > VISIBLE_ROWS && (
                    <button onClick={() => onSelectDebate(d)} className="w-full text-xs font-semibold text-[#39E477] py-2">+ {d.candidates.length - VISIBLE_ROWS} more candidates</button>
                  )}
                  {d.totalVotes === 0 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-[11px] text-[#A4AEA7] border border-dashed border-[#29312B]">
                      <AlertCircle className="w-3.5 h-3.5 text-[#39E477] shrink-0" /> No verified votes yet.
                    </div>
                  )}
                </div>

                <footer className="mt-auto p-4 bg-[#0c100e] border-t border-[#29312B] flex items-center justify-between text-xs">
                  <span className="text-[#A4AEA7]">Verified votes: <strong className="text-[#F6F8F6]">{d.totalVotes.toLocaleString()}</strong></span>
                  <button onClick={() => onSelectDebate(d)} className="font-bold text-[#39E477] hover:text-[#2ec966] flex items-center gap-1">View debate <ArrowUpRight className="w-3.5 h-3.5" /></button>
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
