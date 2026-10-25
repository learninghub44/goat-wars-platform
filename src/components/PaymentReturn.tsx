import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { rememberConfirmedVote } from '../lib/voted';
import { formatKes } from '../lib/format';
import type { Candidate, Debate, PublicPaymentStatus } from '../types';

interface Props {
  reference: string;
  debates: Debate[] | null;
  onDone: () => void;
  onVerified: () => void;
  onFanCard: (d: Debate, c: Candidate) => void;
}

const MAX_TRIES = 10;

/**
 * Landing page after Paystack. A redirect proves nothing: we ask the server, which asks Paystack.
 * Safe to refresh: crediting is idempotent server-side.
 */
export const PaymentReturn: React.FC<Props> = ({ reference, debates, onDone, onVerified, onFanCard }) => {
  const [status, setStatus] = useState<PublicPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const notified = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      try {
        const s = await api.paymentStatus(reference);
        if (cancelled) return;
        setStatus(s);
        setError(null);
        if (s.status === 'success') {
          if (!notified.current && s.candidate && s.debate) {
            notified.current = true;
            rememberConfirmedVote({ reference: s.reference, candidateId: s.candidate.id, debateId: s.debate.id });
            onVerified();
          }
          return;
        }
        if (s.status !== 'pending') return;
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      }
      if (++tries >= MAX_TRIES) return setGaveUp(true);
      window.setTimeout(tick, 3000);
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const debate = debates?.find((d) => d.id === status?.debate?.id);
  const candidate = debate?.candidates.find((c) => c.id === status?.candidate?.id);
  const box = 'w-full max-w-md rounded-2xl bg-[#111512] border border-[#29312B] p-8 text-center space-y-4 shadow-2xl';

  let content: React.ReactNode;
  if (status?.status === 'success') {
    content = (
      <>
        <CheckCircle className="w-14 h-14 text-[#39E477] mx-auto" />
        <h2 className="font-display font-black text-2xl text-[#F6F8F6] uppercase">Payment confirmed</h2>
        <p className="text-sm text-[#A4AEA7]">{status.quantity} verified vote{status.quantity === 1 ? '' : 's'} counted for <strong className="text-[#F6F8F6]">{status.candidate?.name}</strong>.</p>
        <p className="text-xs font-mono text-[#A4AEA7]">{status.reference} · {formatKes(status.amountKes)}</p>
        {debate && candidate && (
          <button onClick={() => onFanCard(debate, candidate)} className="w-full min-h-12 rounded-xl font-display font-bold text-sm uppercase bg-[#39E477] text-[#080A09] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Create my fan card</button>
        )}
      </>
    );
  } else if (status && ['failed', 'abandoned'].includes(status.status)) {
    content = (
      <>
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto" />
        <h2 className="font-display font-black text-2xl text-[#F6F8F6] uppercase">{status.status === 'failed' ? 'Payment failed' : 'Payment not completed'}</h2>
        <p className="text-sm text-[#A4AEA7]">No votes were counted and you were not charged for this attempt. You can try again from the debate.</p>
      </>
    );
  } else if (status?.status === 'reconciliation_required') {
    content = (
      <>
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto" />
        <h2 className="font-display font-black text-2xl text-[#F6F8F6] uppercase">Under review</h2>
        <p className="text-sm text-[#A4AEA7]">We received your payment but could not count the votes automatically (for example the debate closed meanwhile). Contact support with this reference and we’ll resolve it or refund you.</p>
        <p className="text-xs font-mono text-[#F6F8F6]">{status.reference}</p>
      </>
    );
  } else if (gaveUp || (error && !status)) {
    content = (
      <>
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto" />
        <h2 className="font-display font-black text-2xl text-[#F6F8F6] uppercase">Still checking</h2>
        <p className="text-sm text-[#A4AEA7]">{error || 'We haven’t received confirmation from Paystack yet.'} If you completed the payment, your votes will appear once it is confirmed. You can safely reload this page.</p>
        <p className="text-xs font-mono text-[#F6F8F6]">{reference}</p>
      </>
    );
  } else {
    content = (
      <div role="status">
        <Loader2 className="w-10 h-10 text-[#39E477] mx-auto animate-spin motion-reduce:animate-none" />
        <h2 className="mt-4 font-display font-bold text-xl text-[#F6F8F6]">Confirming your payment with Paystack…</h2>
        <p className="text-xs text-[#A4AEA7] mt-2">This usually takes a few seconds. M-Pesa can take longer.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080A09] flex items-center justify-center p-4">
      <div className={box}>
        {content}
        <button onClick={onDone} className="w-full min-h-11 rounded-xl text-xs font-bold uppercase border border-[#29312B] text-[#A4AEA7] hover:text-[#F6F8F6]">Back to GOAT Wars</button>
      </div>
    </div>
  );
};
