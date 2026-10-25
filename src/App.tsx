import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { FlagshipHero } from './components/FlagshipHero';
import { DebateArena } from './components/DebateArena';
import { HowItWorks } from './components/HowItWorks';
import { FanCardShowcase } from './components/FanCardShowcase';
import { Footer, type LegalTab } from './components/Footer';
import { VoteModal } from './components/VoteModal';
import { FanCardModal } from './components/FanCardModal';
import { DebateDetailModal } from './components/DebateDetailModal';
import { LegalModal } from './components/LegalModal';
import { PaymentReturn } from './components/PaymentReturn';
import { useDebates } from './lib/useDebates';
import { SiteContext } from './lib/SiteContext';
import { ToastProvider } from './lib/Toast';
import { api } from './lib/api';
import type { AppConfig, Candidate, Debate } from './types';

type Target = { debate: Debate; candidate: Candidate };

const readReturnReference = (): string | null => {
  if (window.location.pathname.replace(/\/+$/, '') !== '/payment/return') return null;
  const q = new URLSearchParams(window.location.search);
  return q.get('reference') || q.get('trxref');
};

export default function App() {
  const { debates, error, reload } = useDebates();
  const [config, setConfig] = useState<AppConfig>({ siteUrl: window.location.origin, supportEmail: null, currency: 'KES' });
  const [voteTarget, setVoteTarget] = useState<Target | null>(null);
  const [cardTarget, setCardTarget] = useState<Target | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);
  const [returnRef, setReturnRef] = useState<string | null>(readReturnReference);

  useEffect(() => {
    api.config().then(setConfig).catch(() => {/* falls back to the current origin */});
  }, []);

  // /#slug opens a debate. Re-evaluated when debates load or the hash changes.
  useEffect(() => {
    const apply = () => {
      const slug = window.location.hash.replace(/^#\/?/, '');
      const hit = slug && debates?.find((d) => d.slug === slug);
      if (hit) setDetailId(hit.id);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [debates]);

  const navigate = useCallback((id: string) => {
    if (id === 'hero') return window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const closeDetail = () => {
    setDetailId(null);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };
  const leaveReturnPage = () => {
    window.history.replaceState(null, '', '/');
    setReturnRef(null);
    reload();
  };

  const list = debates ?? [];
  const flagship = list.find((d) => d.isFlagship) ?? list[0];
  const detail = list.find((d) => d.id === detailId) ?? null;
  // Always show live numbers inside open modals.
  const live = <T extends Target>(t: T | null): T | null => {
    if (!t) return null;
    const d = list.find((x) => x.id === t.debate.id) ?? t.debate;
    return { ...t, debate: d, candidate: d.candidates.find((c) => c.id === t.candidate.id) ?? t.candidate };
  };
  const vote = live(voteTarget);
  const card = live(cardTarget);
  const openVote = (debate: Debate, candidate: Candidate) => setVoteTarget({ debate, candidate });
  const openCard = (debate: Debate, candidate: Candidate) => setCardTarget({ debate, candidate });

  return (
    <SiteContext.Provider value={config}>
      <ToastProvider>
        <div className="min-h-screen bg-[#080A09] text-[#F6F8F6] flex flex-col font-sans">
          <Navbar onNavigate={navigate} onSelectDebate={(d) => setDetailId(d.id)} debates={list} />
          <main className="flex-1">
            <FlagshipHero debate={flagship} loading={debates === null && !error} error={debates === null ? error : null} onRetry={reload} onVoteClick={openVote} onGenerateFanCard={openCard} />
            <DebateArena debates={debates} error={error} onRetry={reload} onSelectDebate={(d) => setDetailId(d.id)} onVoteClick={openVote} onGenerateFanCard={openCard} />
            <HowItWorks />
            <FanCardShowcase debates={list} onGenerateFanCard={openCard} />
          </main>
          <Footer onNavigate={navigate} onOpenLegal={setLegalTab} />

          {detail && (
            <DebateDetailModal debate={detail} allDebates={list} onClose={closeDetail} onVoteClick={openVote} onGenerateFanCard={openCard} onSelectRelatedDebate={(d) => setDetailId(d.id)} />
          )}
          {vote && <VoteModal debate={vote.debate} candidate={vote.candidate} onClose={() => setVoteTarget(null)} onFreeVoteDone={() => reload()} />}
          {card && <FanCardModal debate={card.debate} candidate={card.candidate} onClose={() => setCardTarget(null)} />}
          {legalTab && <LegalModal initialTab={legalTab} debates={list} onClose={() => setLegalTab(null)} />}
          {returnRef && (
            <PaymentReturn reference={returnRef} debates={debates} onDone={leaveReturnPage} onVerified={reload} onFanCard={(d, c) => { leaveReturnPage(); openCard(d, c); }} />
          )}
        </div>
      </ToastProvider>
    </SiteContext.Provider>
  );
}
