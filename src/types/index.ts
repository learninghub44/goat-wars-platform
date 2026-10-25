export type DebateCategory = 'all' | 'players' | 'clubs' | 'predictions' | 'managers';
export type DebateStatus = 'upcoming' | 'open' | 'paused' | 'closed' | 'archived';
export type VotingType = 'free' | 'paid';

export interface Candidate {
  id: string;
  name: string;
  shortName: string | null;
  subtitle: string | null;
  clubAffiliation: string | null;
  /** null until the owner supplies a photo they have rights to. */
  imageUrl: string | null;
  imageAlt: string | null;
  imageAttribution: string | null;
  imageLicense: string | null;
  highlightColor: string;
  stats: { label: string; value: string }[];
  displayOrder: number;
  verifiedVotes: number;
}

export interface Debate {
  id: string;
  slug: string;
  title: string;
  category: Exclude<DebateCategory, 'all'>;
  categoryLabel: string;
  question: string;
  description: string;
  supportingText: string;
  status: DebateStatus;
  votingType: VotingType;
  pricePerVoteKes: number;
  maxVotesPerTransaction: number;
  isFlagship: boolean;
  isPublic: boolean;
  sortOrder: number;
  season: string | null;
  startDate: string | null;
  endDate: string | null;
  rules: string[];
  candidates: Candidate[];
  totalVotes: number;
  lastUpdated: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned' | 'reconciliation_required';

export interface PublicPaymentStatus {
  reference: string;
  status: PaymentStatus;
  quantity: number;
  amountKes: number;
  candidate: { id: string; name: string } | null;
  debate: { id: string; slug: string; title: string } | null;
}

export interface AppConfig {
  siteUrl: string;
  supportEmail: string | null;
  currency: 'KES';
}

export interface FanCardConfig {
  debateTitle: string;
  candidateName: string;
  candidateSubtitle: string;
  candidateImageUrl: string | null;
  hasVerifiedVote: boolean;
  siteHost: string;
  format: 'vertical' | 'square';
}
