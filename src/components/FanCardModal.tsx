import React, { useEffect, useState } from 'react';
import { X, Download, Sparkles, CheckCircle2, MessageCircle, Copy, Check, Loader2 } from 'lucide-react';
import type { Candidate, Debate } from '../types';
import { CanvasFanCardGenerator } from '../utils/canvasFanCard';
import { api } from '../lib/api';
import { referencesFor } from '../lib/voted';
import { useSite } from '../lib/SiteContext';
import { debateUrl, whatsappUrl } from '../lib/share';

interface Props {
  debate: Debate;
  candidate: Candidate;
  onClose: () => void;
}

export const FanCardModal: React.FC<Props> = ({ debate, candidate, onClose }) => {
  const { siteUrl } = useSite();
  const [format, setFormat] = useState<'vertical' | 'square'>('vertical');
  const [verified, setVerified] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // "I've voted" is claimed only if the SERVER confirms a successful payment for this candidate in this debate.
  useEffect(() => {
    let live = true;
    (async () => {
      for (const ref of referencesFor(candidate.id, debate.id)) {
        try {
          const s = await api.paymentStatus(ref);
          if (s.status === 'success' && s.candidate?.id === candidate.id && s.debate?.id === debate.id) {
            if (live) setVerified(true);
            return;
          }
        } catch { /* treat as unverified */ }
      }
      if (live) setVerified(false);
    })();
    return () => {
      live = false;
    };
  }, [candidate.id, debate.id]);

  const siteHost = (() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return siteUrl;
    }
  })();
  const cfg = (f: 'vertical' | 'square') => ({
    debateTitle: debate.title,
    candidateName: candidate.name,
    candidateSubtitle: candidate.subtitle || candidate.clubAffiliation || '',
    candidateImageUrl: candidate.imageUrl,
    hasVerifiedVote: verified === true,
    siteHost,
    format: f
  });

  useEffect(() => {
    if (verified === null) return;
    let live = true;
    setPreview(null);
    setFailed(false);
    CanvasFanCardGenerator.generateCard(cfg(format)).then((u) => live && setPreview(u)).catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, verified, candidate.id, debate.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fileName = (f: string) => `goat-wars-${candidate.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${f}.png`;
  const download = async (f: 'vertical' | 'square') => {
    const url = f === format && preview ? preview : await CanvasFanCardGenerator.generateCard(cfg(f));
    CanvasFanCardGenerator.downloadImage(url, fileName(f));
  };

  const link = debateUrl(siteUrl, debate.slug);
  const claim = verified ? "I've voted for my GOAT!" : "I'm backing my GOAT!";
  const message = `${claim} 🐐 ${candidate.name} on GOAT Wars. Now it's your turn. Pick your side at ${link}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="fc-title">
      <div className="w-full max-w-2xl rounded-2xl bg-[#111512] border border-[#29312B] shadow-2xl overflow-hidden my-4">
        <div className="p-5 border-b border-[#29312B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#39E477]" />
            <div>
              <h3 id="fc-title" className="font-display font-bold text-lg text-[#F6F8F6]">Fan card</h3>
              <p className="text-xs text-[#A4AEA7]">PNG for WhatsApp Status, Instagram and X</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg border border-[#29312B] text-[#A4AEA7] hover:text-[#F6F8F6]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 bg-[#080A09] border-b border-[#29312B] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-[#111512] p-1 border border-[#29312B]" role="group" aria-label="Card format">
            {(['vertical', 'square'] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} aria-pressed={format === f} className={`px-3 min-h-9 text-xs font-bold rounded-md ${format === f ? 'bg-[#39E477] text-[#080A09]' : 'text-[#A4AEA7] hover:text-[#F6F8F6]'}`}>
                {f === 'vertical' ? 'Story 1080×1920' : 'Square 1080×1080'}
              </button>
            ))}
          </div>
          <span className="text-xs">
            {verified ? <span className="text-[#39E477] font-semibold inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified vote</span> : <span className="text-[#A4AEA7]">No verified vote yet: card says “I’m backing”</span>}
          </span>
        </div>

        <div className="p-6 flex items-center justify-center bg-[#050706] min-h-[380px]">
          {failed ? (
            <p className="text-xs text-red-400" role="alert">Couldn’t render the card in this browser.</p>
          ) : !preview ? (
            <div className="text-center space-y-3" role="status"><Loader2 className="w-8 h-8 text-[#39E477] animate-spin mx-auto" /><p className="text-xs text-[#A4AEA7]">Rendering card…</p></div>
          ) : (
            <img src={preview} alt={`Fan card for ${candidate.name}`} className={`rounded-xl border border-[#29312B] ${format === 'vertical' ? 'h-[440px] w-auto' : 'w-[360px] h-[360px]'}`} />
          )}
        </div>

        <div className="p-5 bg-[#0c100e] border-t border-[#29312B] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button onClick={() => download('vertical')} disabled={verified === null} className="min-h-12 px-4 rounded-xl font-display font-bold text-xs uppercase bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] disabled:opacity-50 flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download vertical</button>
            <button onClick={() => download('square')} disabled={verified === null} className="min-h-12 px-4 rounded-xl font-display font-bold text-xs uppercase bg-[#111512] text-[#F6F8F6] border border-[#29312B] hover:border-[#39E477] disabled:opacity-50 flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download square</button>
          </div>
          <div className="flex gap-2">
            <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-11 rounded-lg text-xs font-bold text-[#F6F8F6] bg-[#25D366]/20 border border-[#25D366]/40 hover:bg-[#25D366]/30 flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4 text-[#25D366]" /> Share on WhatsApp</a>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
              }}
              className="min-h-11 px-4 rounded-lg text-xs font-semibold text-[#A4AEA7] hover:text-[#F6F8F6] bg-[#111512] border border-[#29312B] flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-[#39E477]" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <p className="text-[10px] text-[#A4AEA7]/70">WhatsApp can’t be sent an image automatically: download the card, then attach it to your message or Status.</p>
        </div>
      </div>
    </div>
  );
};
