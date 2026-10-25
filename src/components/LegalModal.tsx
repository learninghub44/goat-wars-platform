import React, { useState } from 'react';
import { X, Shield } from 'lucide-react';
import type { Debate } from '../types';
import type { LegalTab } from './Footer';
import { useSite } from '../lib/SiteContext';

const TABS: { id: LegalTab; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'contact', label: 'Support' },
  { id: 'images', label: 'Image credits' }
];

/**
 * DRAFT copy describing what the software actually does. It is not legal advice:
 * have it reviewed against Kenyan data-protection, consumer-protection and tax requirements before launch.
 */
export const LegalModal: React.FC<{ initialTab: LegalTab; debates: Debate[]; onClose: () => void }> = ({ initialTab, debates, onClose }) => {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const { supportEmail } = useSite();
  const credited = debates.flatMap((d) => d.candidates).filter((c) => c.imageUrl);
  const seen = new Set<string>();
  const unique = credited.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  const p = 'space-y-3';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Legal information">
      <div className="w-full max-w-3xl rounded-2xl bg-[#111512] border border-[#29312B] shadow-2xl my-4 max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-[#29312B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#39E477]" /><h3 className="font-display font-bold text-lg text-[#F6F8F6]">Information</h3></div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg border border-[#29312B] text-[#A4AEA7] hover:text-[#F6F8F6]"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 px-5 pt-3 border-b border-[#29312B] overflow-x-auto shrink-0" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap ${tab === t.id ? 'border-[#39E477] text-[#39E477]' : 'border-transparent text-[#A4AEA7] hover:text-[#F6F8F6]'}`}>{t.label}</button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto text-xs text-[#A4AEA7] leading-relaxed">
          {tab === 'about' && (
            <div className={p}>
              <h4 className="font-display font-bold text-base text-[#F6F8F6]">About GOAT Wars</h4>
              <p>GOAT Wars is a football debate and fan-poll site. Results are opinion polls of the people who chose to take part; they are not official rankings and do not show who is actually “best”.</p>
              <p><strong className="text-[#F6F8F6]">Independence.</strong> GOAT Wars is not affiliated with, endorsed by or sponsored by FIFA, UEFA, the Premier League, any club, player or manager. Names and marks belong to their owners and are used only to identify poll options.</p>
            </div>
          )}
          {tab === 'terms' && (
            <div className={p}>
              <h4 className="font-display font-bold text-base text-[#F6F8F6]">Terms of participation</h4>
              <p><strong className="text-[#F6F8F6]">Polls, not wagers.</strong> Votes express an opinion. There are no prizes, no odds and no payouts, including for prediction polls.</p>
              <p><strong className="text-[#F6F8F6]">Paid debates.</strong> Each paid debate shows its price per vote in Kenya Shillings (KES). The price is set by GOAT Wars on the server. Payment is taken by Paystack. Your votes are added only after Paystack confirms the payment.</p>
              <p><strong className="text-[#F6F8F6]">Finality.</strong> Credited votes are final. If a payment succeeds but the votes cannot be counted (for example the debate closed while you were paying), the payment is held for review and you can ask support about a refund.</p>
              <p><strong className="text-[#F6F8F6]">Fair use.</strong> Do not attempt to manipulate results, replay payment notifications or abuse the service. Access may be blocked.</p>
            </div>
          )}
          {tab === 'privacy' && (
            <div className={p}>
              <h4 className="font-display font-bold text-base text-[#F6F8F6]">Privacy</h4>
              <p>You do not need an account. For paid votes we collect your <strong className="text-[#F6F8F6]">email address</strong> (required by Paystack for receipts) and store it with the payment record, together with the amount, reference and status. Phone numbers and card or M-Pesa details are entered on Paystack and never reach GOAT Wars.</p>
              <p>For free polls we store a one-way hash derived from your network address and browser, only to limit repeat voting. We do not store the raw IP address. This reduces abuse but cannot prove one person, one vote.</p>
              <p>We store a small record in your own browser listing payment references we confirmed for you, so your fan card can say you voted. Payment records are kept for accounting and dispute purposes. Contact support to ask about your data.</p>
            </div>
          )}
          {tab === 'contact' && (
            <div className={p}>
              <h4 className="font-display font-bold text-base text-[#F6F8F6]">Support</h4>
              <p>Payments are processed by Paystack using M-Pesa or card where enabled on the checkout. If you paid but do not see your vote, keep your payment reference (it starts with “GW-”) and your Paystack receipt.</p>
              {supportEmail ? (
                <p>Email: <a className="text-[#39E477] underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
              ) : (
                <p>Support contact details have not been published yet.</p>
              )}
            </div>
          )}
          {tab === 'images' && (
            <div className={p}>
              <h4 className="font-display font-bold text-base text-[#F6F8F6]">Image credits</h4>
              {unique.length === 0 ? (
                <p>No photographs are currently displayed. Where a candidate has no licensed photo, a neutral monogram is shown instead.</p>
              ) : (
                unique.map((c) => (
                  <div key={c.id} className="p-2.5 rounded bg-[#080A09] border border-[#29312B]">
                    <span className="font-bold text-[#F6F8F6]">{c.name}</span>: {c.imageAttribution} — {c.imageLicense}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
