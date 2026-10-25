import React from 'react';
import { Sparkles, Download, MessageCircle } from 'lucide-react';
import type { Candidate, Debate } from '../types';
import { CandidateImage } from './CandidateImage';
import { useSite } from '../lib/SiteContext';
import { debateUrl, whatsappUrl } from '../lib/share';

export const FanCardShowcase: React.FC<{ debates: Debate[]; onGenerateFanCard: (d: Debate, c: Candidate) => void }> = ({ debates, onGenerateFanCard }) => {
  const { siteUrl } = useSite();
  // First two candidates of each of the first two debates (flagship first). Nothing hardcoded by name.
  const picks = debates.slice(0, 2).flatMap((d) => d.candidates.slice(0, 2).map((c) => ({ d, c })));
  if (picks.length === 0) return null;

  return (
    <section id="fan-cards" className="py-16 sm:py-24 bg-[#050706] border-t border-[#29312B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111512] border border-[#39E477]/30 text-xs font-semibold text-[#39E477] mb-3"><Sparkles className="w-3.5 h-3.5" /> SHARE YOUR PICK</div>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F6F8F6] uppercase tracking-tight">Downloadable fan cards</h2>
          <p className="mt-3 text-[#A4AEA7] text-sm sm:text-base">Free for everyone. Make a 1080p card for WhatsApp Status or your feed. It says “I’ve voted” only after a confirmed vote.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {picks.map(({ d, c }) => (
            <div key={`${d.id}-${c.id}`} className="rounded-2xl bg-[#111512] border border-[#29312B] p-5 flex flex-col gap-4">
              <div className="relative h-52 rounded-xl overflow-hidden bg-[#080A09] border border-[#29312B]">
                <CandidateImage candidate={c} className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#111512] to-transparent">
                  <h4 className="font-display font-black text-base text-[#F6F8F6] truncate">{c.name}</h4>
                </div>
              </div>
              <div className="space-y-2 mt-auto">
                <button onClick={() => onGenerateFanCard(d, c)} className="w-full min-h-11 rounded-xl font-display font-bold text-xs uppercase bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" /> Make my card</button>
                <a href={whatsappUrl(`I'm backing ${c.name} on GOAT Wars! 🐐 Pick your side: ${debateUrl(siteUrl, d.slug)}`)} target="_blank" rel="noopener noreferrer" className="w-full min-h-10 rounded-lg text-xs font-semibold text-[#A4AEA7] hover:text-[#25D366] bg-[#080A09] border border-[#29312B] hover:border-[#25D366]/40 flex items-center justify-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Share on WhatsApp</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
