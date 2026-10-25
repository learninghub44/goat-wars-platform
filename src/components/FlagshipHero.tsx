import React from 'react';
import { Flame, CheckCircle, Share2, Sparkles, AlertCircle, Clock, Loader2 } from 'lucide-react';
import type { Candidate, Debate } from '../types';
import { CandidateImage } from './CandidateImage';
import { ResultsBar } from './ResultsBar';
import { isVotable, pctLabel, priceLabel, formatKes } from '../lib/format';
import { debateUrl, shareOrCopy } from '../lib/share';
import { useSite } from '../lib/SiteContext';
import { useToast } from '../lib/Toast';

interface Props {
  debate: Debate | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onVoteClick: (d: Debate, c: Candidate) => void;
  onGenerateFanCard: (d: Debate, c: Candidate) => void;
}

export const FlagshipHero: React.FC<Props> = ({ debate, loading, error, onRetry, onVoteClick, onGenerateFanCard }) => {
  const { siteUrl } = useSite();
  const toast = useToast();

  const header = (
    <div className="text-center max-w-3xl mx-auto mb-10">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111512] border border-[#39E477]/30 text-xs font-semibold text-[#39E477] mb-4">
        <Flame className="w-3.5 h-3.5" />
        {debate ? `${debate.categoryLabel} • ${priceLabel(debate).toUpperCase()}` : 'FLAGSHIP BATTLE'}
      </div>
      <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight text-[#F6F8F6] uppercase leading-[1.05]">
        {debate ? debate.title : 'THE GREATEST OF ALL TIME?'}
      </h1>
      <p className="mt-4 text-base sm:text-lg text-[#A4AEA7] max-w-2xl mx-auto">
        {debate ? debate.supportingText : 'Two legends. Millions of opinions. Choose your GOAT and join the battle.'}
      </p>
    </div>
  );

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#A4AEA7]" role="status">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading the matchup…
      </div>
    );
  } else if (error || !debate) {
    body = (
      <div className="max-w-xl mx-auto text-center p-8 rounded-2xl bg-[#111512] border border-red-900/60" role="alert">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="font-semibold text-[#F6F8F6]">{error ? 'We couldn’t load the matchup.' : 'No flagship matchup is published yet.'}</p>
        {error && <p className="text-xs text-[#A4AEA7] mt-1">{error}</p>}
        <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-[#39E477] text-[#080A09]">Try again</button>
      </div>
    );
  } else {
    const votable = isVotable(debate);
    const cols = debate.candidates.length === 2 ? 'md:grid-cols-2 max-w-5xl' : 'md:grid-cols-2 lg:grid-cols-3 max-w-6xl';
    body = (
      <>
        <div className={`grid grid-cols-1 ${cols} gap-6 lg:gap-8 mx-auto items-stretch`}>
          {debate.candidates.map((c, idx) => (
            <article key={c.id} className="rounded-2xl bg-[#111512] border border-[#29312B] flex flex-col overflow-hidden shadow-2xl" style={{ borderTopColor: c.highlightColor, borderTopWidth: 3 }}>
              <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[#0c100e]">
                <CandidateImage candidate={c} className="w-full h-full" eager />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#111512] to-transparent pointer-events-none" />
                {c.imageUrl && c.imageAttribution && (
                  <div className="absolute top-3 right-3 text-[9px] text-[#A4AEA7]/80 bg-[#080A09]/70 px-2 py-0.5 rounded max-w-[60%] truncate">Photo: {c.imageAttribution}</div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#A4AEA7]">Candidate {String(idx + 1).padStart(2, '0')}</span>
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-[#F6F8F6] break-words">{c.name}</h2>
                    {c.subtitle && <p className="text-xs text-[#A4AEA7]">{c.subtitle}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-display font-black" style={{ color: c.highlightColor }}>{pctLabel(c, debate)}</div>
                    <div className="text-[11px] text-[#A4AEA7]">{c.verifiedVotes.toLocaleString()} verified</div>
                  </div>
                </div>
                {c.stats.length > 0 && (
                  <dl className="grid grid-cols-2 gap-2 text-center">
                    {c.stats.map((s) => (
                      <div key={s.label} className="bg-[#080A09] border border-[#29312B]/70 rounded-lg p-2">
                        <dt className="text-[10px] uppercase tracking-wider text-[#A4AEA7]">{s.label}</dt>
                        <dd className="text-sm font-bold text-[#F6F8F6]">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-auto space-y-2">
                  <button
                    onClick={() => onVoteClick(debate, c)}
                    disabled={!votable}
                    className="w-full min-h-12 py-3 px-4 rounded-xl font-display font-bold text-sm uppercase bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {votable ? `Vote ${c.shortName || c.name}${debate.votingType === 'paid' ? ` (${formatKes(debate.pricePerVoteKes)})` : ''}` : 'Voting closed'}
                  </button>
                  <button onClick={() => onGenerateFanCard(debate, c)} className="w-full min-h-11 py-2.5 px-3 rounded-lg text-xs font-semibold text-[#A4AEA7] hover:text-[#F6F8F6] bg-[#080A09] border border-[#29312B] hover:border-[#39E477]/40 flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#39E477]" /> Create fan card
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div id="results" className="mt-10 max-w-4xl mx-auto rounded-2xl bg-[#111512] border border-[#29312B] p-6 shadow-xl scroll-mt-24">
          <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-[#29312B]">
            <div>
              <h3 className="font-display font-bold text-lg text-[#F6F8F6]">Verified results</h3>
              <p className="text-xs text-[#A4AEA7] mt-0.5">Counted from confirmed payments{debate.votingType === 'free' ? ' and recorded free votes' : ''} only.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-[#A4AEA7] block">Total verified votes</span>
                <span className="font-display font-bold text-xl text-[#F6F8F6]">{debate.totalVotes.toLocaleString()}</span>
              </div>
              <button
                onClick={async () => {
                  const r = await shareOrCopy({ title: `GOAT Wars: ${debate.title}`, text: `${debate.question} Pick your side on GOAT Wars.`, url: debateUrl(siteUrl, debate.slug) });
                  if (r === 'copied') toast('Link copied');
                }}
                aria-label="Share this debate"
                className="p-2.5 rounded-lg bg-[#080A09] border border-[#29312B] hover:border-[#39E477]/40 text-[#A4AEA7] hover:text-[#F6F8F6]"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {debate.totalVotes === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-[#080A09] border border-dashed border-[#29312B]">
              <p className="font-semibold text-sm text-[#F6F8F6]">No verified votes yet</p>
              <p className="text-xs text-[#A4AEA7] mt-1">Results appear here after the first confirmed vote.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ResultsBar debate={debate} />
              <ul className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold">
                {debate.candidates.map((c) => (
                  <li key={c.id} className="flex items-center gap-1.5" style={{ color: c.highlightColor }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.highlightColor }} aria-hidden />
                    {c.name}: {c.verifiedVotes.toLocaleString()} ({pctLabel(c, debate)})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-[#29312B]/50 flex items-center gap-1 text-[11px] text-[#A4AEA7]">
            <Clock className="w-3.5 h-3.5" /> Last updated {new Date(debate.lastUpdated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </>
    );
  }

  return (
    <section id="hero" className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 stadium-glow border-b border-[#29312B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {header}
        {body}
      </div>
    </section>
  );
};
