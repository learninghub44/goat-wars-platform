import { ApiError } from './http';
import { eq, DbError, type DbLike } from './db';
import * as v from './validate';
import { settlePayment, toPublicStatus, type Deps } from './payments';
import type { AdminIdentity } from './auth';

const STATUSES = ['upcoming', 'open', 'paused', 'closed', 'archived'] as const;
const CATEGORIES = ['players', 'clubs', 'predictions', 'managers'] as const;
const VOTING = ['free', 'paid'] as const;
const PAYMENT_STATUSES = ['pending', 'success', 'failed', 'abandoned', 'reconciliation_required'] as const;

export async function audit(db: DbLike, admin: AdminIdentity, ip: string, action: string, target: string, details: string) {
  try {
    await db.insert('admin_audit_logs', { action, target: target.slice(0, 200), details: details.slice(0, 2000), admin_user: admin.email, admin_user_id: admin.userId, ip_address: ip });
  } catch (e) {
    // The change already happened; surface loudly in logs rather than failing the request mid-way.
    console.error('AUDIT_WRITE_FAILED', action, target, (e as Error).message);
  }
}

/* ---------------------------- debates ---------------------------- */

function debatePatch(b: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = (k: string) => b[k] !== undefined;
  const need = (k: string) => {
    if (!partial && !has(k)) throw new ApiError(400, 'invalid_request', `${k} is required.`);
    return has(k);
  };

  if (need('title')) out.title = v.reqStr(b.title, 'title', 3, 200);
  if (need('slug')) out.slug = v.slug(b.slug);
  if (need('category')) out.category = v.oneOf(b.category, 'category', CATEGORIES);
  if (need('categoryLabel')) out.category_label = v.reqStr(b.categoryLabel, 'categoryLabel', 2, 60);
  if (need('question')) out.question = v.reqStr(b.question, 'question', 3, 200);
  if (need('description')) out.description = v.reqStr(b.description, 'description', 1, 2000);
  if (need('supportingText')) out.supporting_text = v.reqStr(b.supportingText, 'supportingText', 1, 500);
  if (has('status')) out.status = v.oneOf(b.status, 'status', STATUSES);
  if (has('votingType')) out.voting_type = v.oneOf(b.votingType, 'votingType', VOTING);
  if (has('pricePerVoteKes')) out.price_per_vote_kes = Math.round(v.numIn(b.pricePerVoteKes, 'pricePerVoteKes', 0, 100000) * 100) / 100;
  if (has('maxVotesPerTransaction')) out.max_votes_per_transaction = v.intIn(b.maxVotesPerTransaction, 'maxVotesPerTransaction', 1, 1000);
  if (has('isFlagship')) out.is_flagship = b.isFlagship === true;
  if (has('isPublic')) out.is_public = b.isPublic === true;
  if (has('sortOrder')) out.sort_order = v.intIn(b.sortOrder, 'sortOrder', 0, 10000);
  if (has('season')) out.season = v.str(b.season, 'season', { max: 60, optional: true }) ?? null;
  if (has('startDate')) out.start_date = v.isoDate(b.startDate, 'startDate');
  if (has('endDate')) out.end_date = v.isoDate(b.endDate, 'endDate');
  if (has('rules')) out.rules = v.stringArray(b.rules, 'rules');

  if (out.voting_type === 'paid' && has('pricePerVoteKes') && !(Number(out.price_per_vote_kes) > 0)) {
    throw new ApiError(400, 'invalid_request', 'Paid debates need a price above zero.');
  }
  return out;
}

/* --------------------------- candidates -------------------------- */

function candidatePatch(b: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = (k: string) => b[k] !== undefined;
  if (!partial && !has('name')) throw new ApiError(400, 'invalid_request', 'name is required.');
  if (has('name')) out.name = v.reqStr(b.name, 'name', 1, 150);
  if (has('shortName')) out.short_name = v.str(b.shortName, 'shortName', { max: 60, optional: true }) ?? null;
  if (has('subtitle')) out.subtitle = v.str(b.subtitle, 'subtitle', { max: 300, optional: true }) ?? null;
  if (has('clubAffiliation')) out.club_affiliation = v.str(b.clubAffiliation, 'clubAffiliation', { max: 150, optional: true }) ?? null;
  if (has('imageUrl')) out.image_url = v.imageUrl(b.imageUrl);
  if (has('imageAlt')) out.image_alt = v.str(b.imageAlt, 'imageAlt', { max: 300, optional: true }) ?? null;
  if (has('imageAttribution')) out.image_attribution = v.str(b.imageAttribution, 'imageAttribution', { max: 300, optional: true }) ?? null;
  if (has('imageLicense')) out.image_license = v.str(b.imageLicense, 'imageLicense', { max: 200, optional: true }) ?? null;
  if (has('imageSourceUrl')) out.image_source_url = v.imageUrl(b.imageSourceUrl, 'imageSourceUrl');
  if (has('highlightColor')) out.highlight_color = v.hexColor(b.highlightColor) ?? '#39E477';
  if (has('stats')) out.stats = v.stats(b.stats);
  return out;
}

/** Spec §4: record the source and licence of every photograph. Refuse an image without them. */
function assertImageProvenance(row: Record<string, unknown>) {
  if (row.image_url) {
    if (!row.image_attribution || !row.image_license) {
      throw new ApiError(400, 'image_provenance_required', 'Add the photographer/credit and licence before setting an image.');
    }
    if (!row.image_alt) throw new ApiError(400, 'image_provenance_required', 'Add alt text for the image.');
  }
}

/* ----------------------------- routes ---------------------------- */

export interface AdminCtx {
  deps: Deps;
  admin: AdminIdentity;
  ip: string;
  request: Request;
  body: () => Promise<Record<string, unknown>>;
  params: string[];
  query: URLSearchParams;
}

export const adminHandlers = {
  async overview({ deps }: AdminCtx) {
    const [overview, recent] = await Promise.all([
      deps.db.rpc('admin_overview'),
      deps.db.select('admin_audit_logs', 'select=id,action,target,details,admin_user,timestamp&order=timestamp.desc&limit=10')
    ]);
    return { overview, recentEvents: recent };
  },

  async listDebates({ deps }: AdminCtx) {
    return { debates: await deps.db.rpc('api_list_debates', { p_include_hidden: true }) };
  },

  async createDebate(c: AdminCtx) {
    const patch = debatePatch(await c.body(), false);
    patch.status = patch.status ?? 'upcoming';
    patch.voting_type = patch.voting_type ?? 'paid';
    if (patch.voting_type === 'paid' && !(Number(patch.price_per_vote_kes) > 0)) {
      throw new ApiError(400, 'invalid_request', 'Paid debates need a price above zero.');
    }
    if (patch.is_flagship) await c.deps.db.update('matchups', 'is_flagship=eq.true', { is_flagship: false });
    const row = await c.deps.db.insert<{ id: string; title: string }>('matchups', patch);
    await audit(c.deps.db, c.admin, c.ip, 'CREATE_DEBATE', row.title, `Created debate /${patch.slug}`);
    return { id: row.id };
  },

  async updateDebate(c: AdminCtx) {
    const id = v.uuid(c.params[0], 'id');
    const patch = debatePatch(await c.body(), true);
    if (Object.keys(patch).length === 0) throw new ApiError(400, 'invalid_request', 'Nothing to update.');
    if (patch.is_flagship) await c.deps.db.update('matchups', `is_flagship=eq.true&id=neq.${id}`, { is_flagship: false });
    const rows = await c.deps.db.update<{ title: string }>('matchups', eq('id', id), patch);
    if (!rows[0]) throw new ApiError(404, 'not_found', 'Debate not found.');
    await audit(c.deps.db, c.admin, c.ip, 'UPDATE_DEBATE', rows[0].title, `Changed: ${Object.entries(patch).map(([k, val]) => `${k}=${JSON.stringify(val)}`).join(', ').slice(0, 1500)}`);
    return { ok: true };
  },

  async listCandidates({ deps }: AdminCtx) {
    const rows = await deps.db.select('candidates', 'select=*&order=name.asc&limit=500');
    return { candidates: rows };
  },

  async createCandidate(c: AdminCtx) {
    const patch = candidatePatch(await c.body(), false);
    assertImageProvenance(patch);
    const row = await c.deps.db.insert<{ id: string; name: string }>('candidates', patch);
    await audit(c.deps.db, c.admin, c.ip, 'CREATE_CANDIDATE', row.name, 'Created candidate');
    return { id: row.id };
  },

  async updateCandidate(c: AdminCtx) {
    const id = v.uuid(c.params[0], 'id');
    const patch = candidatePatch(await c.body(), true);
    if (Object.keys(patch).length === 0) throw new ApiError(400, 'invalid_request', 'Nothing to update.');
    const [existing] = await c.deps.db.select<Record<string, unknown>>('candidates', `select=*&${eq('id', id)}`);
    if (!existing) throw new ApiError(404, 'not_found', 'Candidate not found.');
    assertImageProvenance({ ...existing, ...patch });
    const rows = await c.deps.db.update<{ name: string }>('candidates', eq('id', id), patch);
    await audit(c.deps.db, c.admin, c.ip, 'UPDATE_CANDIDATE', rows[0]?.name ?? id, `Changed: ${Object.keys(patch).join(', ')}`);
    return { ok: true };
  },

  async attachCandidate(c: AdminCtx) {
    const matchupId = v.uuid(c.params[0], 'id');
    const b = await c.body();
    const candidateId = v.uuid(b.candidateId, 'candidateId');
    const displayOrder = b.displayOrder === undefined ? 0 : v.intIn(b.displayOrder, 'displayOrder', 0, 1000);
    await c.deps.db.insert('matchup_candidates', { matchup_id: matchupId, candidate_id: candidateId, display_order: displayOrder });
    await audit(c.deps.db, c.admin, c.ip, 'ATTACH_CANDIDATE', matchupId, `Added candidate ${candidateId}`);
    return { ok: true };
  },

  async detachCandidate(c: AdminCtx) {
    const matchupId = v.uuid(c.params[0], 'id');
    const candidateId = v.uuid(c.params[1], 'candidateId');
    // The database refuses this (FK RESTRICT) once payments or votes reference the pairing.
    try {
      await c.deps.db.remove('matchup_candidates', `${eq('matchup_id', matchupId)}&${eq('candidate_id', candidateId)}`);
    } catch (e) {
      if (e instanceof DbError && e.pgCode === '23503') {
        throw new ApiError(409, 'candidate_has_votes', 'This candidate already has payments or votes in this debate and cannot be removed.');
      }
      throw e;
    }
    await audit(c.deps.db, c.admin, c.ip, 'DETACH_CANDIDATE', matchupId, `Removed candidate ${candidateId}`);
    return { ok: true };
  },

  async listPayments({ deps, query }: AdminCtx) {
    const status = query.get('status');
    const filter = status ? `&${eq('status', v.oneOf(status, 'status', PAYMENT_STATUSES))}` : '';
    const rows = await deps.db.select(
      'payments',
      `select=reference,status,quantity,amount_kes,currency,customer_email,failure_reason,matchup_id,candidate_id,created_at,verified_at${filter}&order=created_at.desc&limit=200`
    );
    return { payments: rows };
  },

  async reconcilePayment(c: AdminCtx) {
    const reference = v.reference(c.params[0]);
    const p = await settlePayment(c.deps, reference, { force: true });
    if (!p) throw new ApiError(404, 'not_found', 'Payment not found.');
    await audit(c.deps.db, c.admin, c.ip, 'RECONCILE_PAYMENT', reference, `Result: ${p.status}${p.failure_reason ? ` (${p.failure_reason})` : ''}`);
    return { payment: await toPublicStatus(c.deps.db, p), failureReason: p.failure_reason };
  },

  async listAudit({ deps }: AdminCtx) {
    return { logs: await deps.db.select('admin_audit_logs', 'select=id,action,target,details,admin_user,ip_address,timestamp&order=timestamp.desc&limit=200') };
  }
};
