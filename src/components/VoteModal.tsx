import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, CreditCard, Lock } from 'lucide-react';
import type { Candidate, Debate } from '../types';
import { api } from '../lib/api';
import { formatKes, isVotable } from '../lib/format';
import { CandidateImage } from './CandidateImage';

interface Props {
  debate: Debate;
  candidate: Candidate;
  onClose: () => void;
  onFreeVoteDone: (d: Debate, c: Candidate) => void;
}

export const VoteModal: React.FC<Props> = ({ debate, candidate, onClose, onFreeVoteDone }) => {
  const paid = debate.votingType === 'paid';
  const max = debate.maxVotesPerTransaction;
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeDone, setFreeDone] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const votable = isVotable(debate);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Display-only estimate. The server recomputes the real total from its own price.
  const estimate = debate.pricePerVoteKes * quantity;
  const presets = [1, 5, 10, 25, 50].filter((q) => q <= max);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (paid && (!Number.isInteger(quantity) || quantity < 1 || quantity > max)) return setError(`Choose between 1 and ${max} votes.`);
    setBusy(true);
    try {
      if (paid) {
        const r = await api.initializePayment({ matchupId: debate.id, candidateId: candidate.id, quantity, email: email.trim() });
        // Hand off to Paystack's hosted checkout. We count nothing until the server verifies the payment.
        window.location.assign(r.authorizationUrl);
        return;
      }
      await api.freeVote({ matchupId: debate.id, candidateId: candidate.id });
      setFreeDone(true);
      onFreeVoteDone(debate, candidate);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const field = 'w-full min-h-11 bg-[#080A09] border border-[#29312B] focus:border-[#39E477] rounded-xl px-4 py-2.5 text-sm text-[#F6F8F6] outline-none focus-visible:ring-2 focus-visible:ring-[#39E477]/50';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="vote-title">
      <div className="w-full max-w-lg rounded-2xl bg-[#111512] border border-[#29312B] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#29312B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#39E477]/10 border border-[#39E477]/30 flex items-center justify-center text-[#39E477]"><Lock className="w-4 h-4" /></span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#39E477] block">{paid ? 'Secure checkout by Paystack' : 'Free vote'}</span>
              <h3 id="vote-title" className="font-display font-bold text-base text-[#F6F8F6]">{debate.title}</h3>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg border border-[#29312B] text-[#A4AEA7] hover:text-[#F6F8F6]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 bg-[#080A09] border-b border-[#29312B] flex items-center gap-4">
          <CandidateImage candidate={candidate} className="w-16 h-16 rounded-xl border border-[#39E477]/40 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-wider text-[#A4AEA7] block">Your pick</span>
            <h4 className="font-display font-extrabold text-xl text-[#F6F8F6] truncate">{candidate.name}</h4>
            {candidate.subtitle && <p className="text-xs text-[#A4AEA7] truncate">{candidate.subtitle}</p>}
          </div>
          <div className="text-right">
            <span className="text-xs text-[#A4AEA7] block">Price</span>
            <span className="font-display font-black text-sm text-[#39E477]">{paid ? `${formatKes(debate.pricePerVoteKes)} / vote` : 'Free'}</span>
          </div>
        </div>

        {freeDone ? (
          <div className="p-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-[#39E477] mx-auto" />
            <h4 className="font-display font-black text-2xl text-[#F6F8F6] uppercase">Vote recorded</h4>
            <button onClick={onClose} className="w-full min-h-12 rounded-xl font-display font-bold text-sm uppercase bg-[#39E477] text-[#080A09]">Close</button>
          </div>
        ) : !votable ? (
          <div className="p-6 text-sm text-[#A4AEA7]" role="alert">Voting is not open for this debate right now.</div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-5">
            {error && (
              <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}
            {paid && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="qty" className="text-xs font-bold uppercase tracking-wider text-[#A4AEA7]">Number of votes</label>
                    <span className="text-xs text-[#39E477] font-semibold">Max {max} per payment</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {presets.map((q) => (
                      <button key={q} type="button" onClick={() => setQuantity(q)} aria-pressed={quantity === q} className={`min-h-11 rounded-lg text-xs font-bold ${quantity === q ? 'bg-[#39E477] text-[#080A09]' : 'bg-[#080A09] text-[#A4AEA7] border border-[#29312B] hover:text-[#F6F8F6]'}`}>{q}</button>
                    ))}
                  </div>
                  <input id="qty" type="number" inputMode="numeric" min={1} max={max} value={quantity} onChange={(e) => setQuantity(Math.floor(Number(e.target.value)) || 1)} className={field} />
                </div>
                <div>
                  <label htmlFor="email" className="text-xs font-semibold text-[#A4AEA7] block mb-1">Email (Paystack sends your receipt here)</label>
                  <input ref={first} id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
                  <p className="text-[10px] text-[#A4AEA7]/80 mt-1">You’ll enter your phone number or card details on Paystack, not here.</p>
                </div>
                <div className="rounded-xl bg-[#080A09] border border-[#29312B] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#A4AEA7] block">Estimated total</span>
                    <span className="text-xs text-[#A4AEA7]">{quantity} × {formatKes(debate.pricePerVoteKes)} — confirmed at checkout</span>
                  </div>
                  <div className="font-display font-black text-2xl text-[#39E477]">{formatKes(estimate)}</div>
                </div>
                <p className="text-[10px] text-[#A4AEA7]/80 text-center">Votes are added only after Paystack confirms your payment, and are final once counted.</p>
              </>
            )}
            <button type="submit" disabled={busy} className="w-full min-h-12 py-3 px-4 rounded-xl font-display font-bold text-sm uppercase bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {paid ? 'Opening Paystack…' : 'Recording…'}</> : paid ? <><CreditCard className="w-4 h-4" /> Continue to Paystack</> : 'Cast free vote'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
