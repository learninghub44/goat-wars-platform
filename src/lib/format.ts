import type { Candidate, Debate } from '../types';

export const formatKes = (n: number) => `KES ${n.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
export const priceLabel = (d: Debate) => (d.votingType === 'free' ? 'FREE' : `${formatKes(d.pricePerVoteKes)} / vote`);
export const pct = (c: Candidate, d: Debate) => (d.totalVotes > 0 ? (c.verifiedVotes / d.totalVotes) * 100 : 0);
export const pctLabel = (c: Candidate, d: Debate) => (d.totalVotes > 0 ? `${pct(c, d).toFixed(1)}%` : '—');
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Voting is only offered while the server would accept it. The server re-checks regardless. */
export function isVotable(d: Debate, now = Date.now()): boolean {
  if (d.status !== 'open') return false;
  if (d.startDate && now < Date.parse(d.startDate)) return false;
  if (d.endDate && now > Date.parse(d.endDate)) return false;
  return true;
}

export const statusLabel = (d: Debate) => (isVotable(d) ? 'OPEN' : d.status === 'open' ? 'CLOSED' : d.status.toUpperCase());
