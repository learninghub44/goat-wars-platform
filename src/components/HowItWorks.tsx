import React from 'react';
import { ShieldCheck, Vote, CreditCard, Share2, Sparkles } from 'lucide-react';

const STEPS = [
  { n: '01', t: 'Explore the debates', d: 'Start with the flagship clash, then browse players, clubs, title predictions and managers. No account needed.', i: Vote },
  { n: '02', t: 'Pick your side', d: 'Choose a candidate. Each debate shows its own rules, deadline and price (or that it is free).', i: Sparkles },
  { n: '03', t: 'Vote securely', d: 'Paid debates open Paystack checkout (M-Pesa or card where enabled). The server sets the price and counts your votes only after Paystack confirms the payment.', i: CreditCard },
  { n: '04', t: 'Share your fan card', d: 'Download a 1080×1920 or 1080×1080 PNG and share it on WhatsApp. “I’ve voted” appears only after a confirmed vote.', i: Share2 }
];

export const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="py-16 sm:py-24 bg-[#080A09] border-t border-[#29312B]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111512] border border-[#39E477]/30 text-xs font-semibold text-[#39E477] mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> HOW IT WORKS
        </div>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F6F8F6] uppercase tracking-tight">How GOAT Wars works</h2>
        <p className="mt-3 text-sm sm:text-base text-[#A4AEA7]">A fan opinion platform. Results show verified votes only, and totals start at zero.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map(({ n, t, d, i: Icon }) => (
          <div key={n} className="rounded-2xl bg-[#111512] border border-[#29312B] p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl bg-[#080A09] border border-[#29312B] flex items-center justify-center"><Icon className="w-5 h-5 text-[#39E477]" /></span>
              <span className="font-display font-black text-2xl text-[#29312B]">{n}</span>
            </div>
            <h3 className="font-display font-bold text-lg text-[#F6F8F6] mb-2">{t}</h3>
            <p className="text-xs text-[#A4AEA7] leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
