/**
 * Remembers payment references that the SERVER confirmed as successful, so we can say
 * "I've voted" on a fan card. A reference is stored only after /api/payments/:ref/status returns success,
 * and is re-confirmed with the server before a card says "I'VE VOTED".
 */
const KEY = 'gw_confirmed_votes_v2';

interface Entry { reference: string; candidateId: string; debateId: string }

function read(): Entry[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((e) => e && typeof e.reference === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberConfirmedVote(e: Entry) {
  try {
    const all = read().filter((x) => x.reference !== e.reference);
    all.push(e);
    localStorage.setItem(KEY, JSON.stringify(all.slice(-50)));
  } catch {
    /* storage unavailable: card simply won't claim a vote */
  }
}

export const referencesFor = (candidateId: string, debateId: string) =>
  read().filter((e) => e.candidateId === candidateId && e.debateId === debateId).map((e) => e.reference);
