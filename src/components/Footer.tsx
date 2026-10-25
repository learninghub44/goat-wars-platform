import React from 'react';
import { Trophy } from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'about' | 'contact' | 'images';

interface Props {
  onNavigate: (id: string) => void;
  onOpenLegal: (tab: LegalTab) => void;
}

export const Footer: React.FC<Props> = ({ onNavigate, onOpenLegal }) => {
  const link = 'hover:text-[#39E477] transition-colors text-left';
  return (
    <footer className="bg-[#050706] border-t border-[#29312B] text-xs text-[#A4AEA7] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-[#111512] border border-[#39E477]/40 flex items-center justify-center text-[#39E477]">
                <Trophy className="w-4 h-4" />
              </span>
              <span className="font-display font-extrabold text-lg tracking-wider text-[#F6F8F6]">
                GOAT <span className="text-[#39E477]">WARS</span>
              </span>
            </div>
            <p className="text-[11px]">ONE DEBATE. TWO LEGENDS. YOUR VOTE.</p>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase tracking-wider text-[#F6F8F6] mb-3">Explore</h4>
            <ul className="space-y-2">
              <li><button className={link} onClick={() => onNavigate('hero')}>Flagship matchup</button></li>
              <li><button className={link} onClick={() => onNavigate('debates')}>Football Debate Arena</button></li>
              <li><button className={link} onClick={() => onNavigate('how-it-works')}>How voting works</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold uppercase tracking-wider text-[#F6F8F6] mb-3">Information</h4>
            <ul className="space-y-2">
              <li><button className={link} onClick={() => onOpenLegal('terms')}>Terms</button></li>
              <li><button className={link} onClick={() => onOpenLegal('privacy')}>Privacy</button></li>
              <li><button className={link} onClick={() => onOpenLegal('about')}>About & disclaimer</button></li>
              <li><button className={link} onClick={() => onOpenLegal('images')}>Image credits</button></li>
              <li><button className={link} onClick={() => onOpenLegal('contact')}>Support</button></li>
            </ul>
          </div>
        </div>
        <p className="pt-8 border-t border-[#29312B] text-[10px] text-[#A4AEA7]/80">
          © {new Date().getFullYear()} GOAT Wars. An independent fan opinion platform. Not affiliated with or endorsed by FIFA, the Premier League, any club, player or manager. Payments processed by Paystack.
        </p>
      </div>
    </footer>
  );
};
