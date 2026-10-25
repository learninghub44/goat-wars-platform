import React, { useEffect } from 'react';
import { X, CheckCircle, Share2, Sparkles, ShieldCheck, Calendar, Info } from 'lucide-react';
import type { Candidate, Debate } from '../types';
import { CandidateImage } from './CandidateImage';
import { ResultsBar } from './ResultsBar';
import { isVotable, pctLabel, pct, priceLabel, statusLabel } from '../lib/format';
import { debateUrl, shareOrCopy } from '../lib/share';
import { useSite } from '../lib/SiteContext';
import { useToast } from '../lib/Toast';

interface Props {
  debate: Debate;
  allDebates: Debate[];
  onClose: () => void;
  onVoteClick: (d: Debate, c: Candidate) => void;
  onGenerateFanCard: (d: Debate, c: Candidate) => void;
  onSelectRelatedDebate: (d: Debate) => void;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : null);

export const DebateDetailModal: React.FC<Props> = ({ debate, allDebates, onClose, onVoteClick, onGenerateFanCard, onSelectRelatedDebate }) => {
  const { siteUrl } = useSite();
  const toast = useToast();
  const votable = isVotable(debate);
  const related = allDebates.filter((d) => d.id !== debate.id).slice(0, 3);

  useEffect(() => {
    const prevTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') ?? '';
    document.title = `${debate.title} — GOAT Wars`;
    meta?.setAttribute('content', debate.description.slice(0, 155));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.title = prevTitle;
      meta?.setAttribute('content', prevDesc);
      window.removeEventListener('keydown', onKey);
    };
  }, [debate, onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="dd-title">
      <div className="w-full max-w-4xl rounded-2xl bg-[#111512] border border-[#29312B] shadow-2xl my-6">
        <div className="p-6 border-b border-[#29312B] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
              <span className="font-bold uppercase tracking-widest text-[#39E477]">{debate.categoryLabel}</span>
              <span className="px-2 py-0.5 rounded font-semibold bg-[#080A09] border border-[#29312B] text-[#A4AEA7]">{statusLabel(debate)}</span>
              <span className="font-semibold text-[#F6F8F6]">{priceLabel(debate).toUpperCase()}</span>
            </div>
            <h2 id="dd-title" className="font-display font-black text-2xl sm:text-4xl text-[#F6F8F6] uppercase break-words">{debate.title}</h2>
            <p className="mt-1 text-sm text-[#A4AEA7]">{debate.question}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              aria-label="Share debate"
              onClick={async () => {
                const r = await shareOrCopy({ title: debate.title, text: `${debate.question} Pick your side on GOAT Wars.`, url: debateUrl(siteUrl, debate.slug) });
                if (r === 'copied') toast('Link copied');
              }}
              className="p-2.5 rounded-lg border border-[#29312B] text-[#A4AEA7] hover:text-[#F6F8F6]"
            ><Share2 className="w-5 h-5" /></button>
            <button onClick={onClose} aria-label="Close" className="p-2.5 rounded-lg border border-[#29312B] text-[#A4AEA7] hover:text-[#F6F8F6]"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div className="rounded-xl bg-[#080A09] border border-[#29312B] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#39E477] flex items-center gap-1.5"><Info className="w-4 h-4" /> Overview</h3>
            <p className="text-sm text-[#F6F8F6] leading-relaxed">{debate.description}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-xs text-[#A4AEA7] border-t border-[#29312B]">
              {debate.season && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#39E477]" /> Season <strong className="text-[#F6F8F6]">{debate.season}</strong></span>}
              {fmt(debate.startDate) && <span>Opens <strong className="text-[#F6F8F6]">{fmt(debate.startDate)}</strong></span>}
              {fmt(debate.endDate) && <span>Closes <strong className="text-[#F6F8F6]">{fmt(debate.endDate)}</strong></span>}
              <span>Verified votes <strong className="text-[#F6F8F6]">{debate.totalVotes.toLocaleString()}</strong></span>
              <span>Updated <strong className="text-[#F6F8F6]">{fmt(debate.lastUpdated)}</strong></span>
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg text-[#F6F8F6] mb-3">Candidates & verified results</h3>
            <ResultsBar debate={debate} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[...debate.candidates].sort((a, b) => b.verifiedVotes - a.verifiedVotes || a.displayOrder - b.displayOrder).map((c) => (
                <div key={c.id} className="rounded-xl bg-[#080A09] border border-[#29312B] p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <CandidateImage candidate={c} className="w-16 h-16 rounded-xl border border-[#29312B] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display font-bold text-base text-[#F6F8F6] truncate">{c.name}</h4>
                      {c.subtitle && <span className="text-xs text-[#A4AEA7] block truncate">{c.subtitle}</span>}
                      <div className="mt-1 text-xs"><span className="font-bold" style={{ color: c.highlightColor }}>{pctLabel(c, debate)}</span> <span className="text-[#A4AEA7]">({c.verifiedVotes.toLocaleString()} votes)</span></div>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-[#111512] rounded-full overflow-hidden mb-3" aria-hidden><div style={{ width: `${pct(c, debate)}%`, background: c.highlightColor }} className="h-full" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onVoteClick(debate, c)} disabled={!votable} className="min-h-11 rounded-lg text-xs font-bold uppercase bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> {votable ? 'Vote' : 'Closed'}</button>
                    <button onClick={() => onGenerateFanCard(debate, c)} className="min-h-11 rounded-lg text-xs font-semibold text-[#A4AEA7] hover:text-[#F6F8F6] bg-[#111512] border border-[#29312B] flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#39E477]" /> Fan card</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {debate.rules.length > 0 && (
            <div className="rounded-xl bg-[#080A09] border border-[#29312B] p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#39E477] mb-3 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Rules</h3>
              <ul className="space-y-2 text-xs text-[#A4AEA7]">
                {debate.rules.map((r, i) => <li key={i} className="flex gap-2"><span className="text-[#39E477] font-bold">•</span><span>{r}</span></li>)}
              </ul>
            </div>
          )}

          {related.length > 0 && (
            <div className="pt-4 border-t border-[#29312B]">
              <h3 className="font-display font-bold text-sm text-[#F6F8F6] uppercase tracking-wider mb-3">Related debates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {related.map((r) => (
                  <button key={r.id} onClick={() => onSelectRelatedDebate(r)} className="text-left p-3 rounded-xl bg-[#080A09] border border-[#29312B] hover:border-[#39E477]/50">
                    <span className="text-[10px] uppercase font-bold text-[#39E477] block">{r.categoryLabel}</span>
                    <span className="font-display font-bold text-xs text-[#F6F8F6] block truncate mt-0.5">{r.question}</span>
                    <span className="text-[10px] text-[#A4AEA7] block mt-1">{r.totalVotes.toLocaleString()} verified votes</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
