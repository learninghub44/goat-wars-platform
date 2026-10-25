-- ============================================================================
-- GOAT WARS — Supabase / PostgreSQL schema
--
-- SECURITY MODEL
--   * Every table has Row Level Security ENABLED and NO policies for anon/authenticated.
--     Browsers never talk to the database. All access goes through the Cloudflare
--     Pages Function (/api/*) using the service-role key, which bypasses RLS.
--   * anon/authenticated also have all table & function privileges REVOKED (defence in depth).
--   * Votes can only be created by credit_paid_votes_atomic() / cast_free_vote_atomic(),
--     which only the service role may execute.
--
-- Run this once in Supabase → SQL Editor on a FRESH project (or after `drop schema public cascade;
-- create schema public;` on a throw-away dev project). Then run supabase/seed.sql.
-- ============================================================================

-- 1. ENUMS ------------------------------------------------------------------
do $$ begin create type debate_category_enum as enum ('players', 'clubs', 'predictions', 'managers');
exception when duplicate_object then null; end $$;

do $$ begin create type debate_status_enum as enum ('upcoming', 'open', 'paused', 'closed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin create type voting_type_enum as enum ('free', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin create type payment_status_enum as enum ('pending', 'success', 'failed', 'abandoned', 'reconciliation_required');
exception when duplicate_object then null; end $$;

-- 2. HELPERS ----------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 3. MATCHUPS (debates) ------------------------------------------------------
create table if not exists matchups (
  id                        uuid primary key default gen_random_uuid(),
  slug                      varchar(120) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                     varchar(255) not null,
  category                  debate_category_enum not null,
  category_label            varchar(60)  not null,
  question                  text not null,
  description               text not null,
  supporting_text           text not null,
  status                    debate_status_enum not null default 'upcoming',
  voting_type               voting_type_enum   not null default 'paid',
  price_per_vote_kes        numeric(10,2) not null default 10.00 check (price_per_vote_kes >= 0),
  max_votes_per_transaction integer not null default 100 check (max_votes_per_transaction between 1 and 1000),
  is_flagship               boolean not null default false,
  is_public                 boolean not null default true,
  sort_order                integer not null default 0,
  season                    varchar(60),
  start_date                timestamptz not null default now(),
  end_date                  timestamptz,
  rules                     jsonb not null default '[]'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- a paid debate must have a price; the API also enforces a configurable minimum
  constraint paid_requires_price check (voting_type = 'free' or price_per_vote_kes > 0),
  constraint end_after_start check (end_date is null or end_date > start_date)
);
create unique index if not exists matchups_single_flagship on matchups (is_flagship) where is_flagship;
create index if not exists idx_matchups_status   on matchups (status);
create index if not exists idx_matchups_category on matchups (category);
drop trigger if exists trg_matchups_updated on matchups;
create trigger trg_matchups_updated before update on matchups for each row execute function set_updated_at();

-- 4. CANDIDATES (players, clubs, managers) -------------------------------------
-- image_url is NULLABLE on purpose: no photo until you hold the rights, and then we record who/what licence.
create table if not exists candidates (
  id                uuid primary key default gen_random_uuid(),
  name              varchar(150) not null,
  short_name        varchar(60),
  subtitle          text,
  club_affiliation  varchar(150),
  image_url         text check (image_url is null or image_url ~ '^(https://|/assets/)'),
  image_alt         text,
  image_attribution text,
  image_license     text,
  image_source_url  text check (image_source_url is null or image_source_url ~ '^(https://|/assets/)'),
  highlight_color   varchar(9) not null default '#39E477' check (highlight_color ~ '^#[0-9a-fA-F]{6}$'),
  stats             jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint image_has_provenance check (image_url is null or (image_attribution is not null and image_license is not null and image_alt is not null))
);
drop trigger if exists trg_candidates_updated on candidates;
create trigger trg_candidates_updated before update on candidates for each row execute function set_updated_at();

-- 5. MATCHUP_CANDIDATES --------------------------------------------------------
create table if not exists matchup_candidates (
  matchup_id    uuid not null references matchups(id)   on delete cascade,
  candidate_id  uuid not null references candidates(id) on delete restrict,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  primary key (matchup_id, candidate_id)
);
create index if not exists idx_mc_candidate on matchup_candidates (candidate_id);

-- 6. PAYMENTS ------------------------------------------------------------------
create table if not exists payments (
  id                    uuid primary key default gen_random_uuid(),
  reference             varchar(120) not null unique,
  provider_reference    varchar(120),
  matchup_id            uuid not null,
  candidate_id          uuid not null,
  amount_kes            numeric(12,2) not null check (amount_kes > 0),
  unit_price_kes        numeric(10,2) not null check (unit_price_kes > 0),
  quantity              integer not null check (quantity > 0),
  currency              varchar(3) not null default 'KES' check (currency = 'KES'),
  status                payment_status_enum not null default 'pending',
  customer_email        varchar(320) not null,
  paystack_access_code  varchar(120),
  failure_reason        text,
  raw_provider_payload  jsonb,
  created_at            timestamptz not null default now(),
  verified_at           timestamptz,
  updated_at            timestamptz not null default now(),
  constraint amount_matches check (amount_kes = unit_price_kes * quantity),
  -- the chosen candidate MUST belong to the chosen debate
  constraint payments_candidate_in_matchup foreign key (matchup_id, candidate_id)
    references matchup_candidates (matchup_id, candidate_id) on delete restrict
);
create index if not exists idx_payments_status  on payments (status, created_at desc);
create index if not exists idx_payments_matchup on payments (matchup_id);
drop trigger if exists trg_payments_updated on payments;
create trigger trg_payments_updated before update on payments for each row execute function set_updated_at();

-- 7. VOTE CREDITS (verified paid ballots) ---------------------------------------
create table if not exists vote_credits (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null unique references payments(id) on delete restrict,  -- UNIQUE = a payment can be credited once
  matchup_id   uuid not null,
  candidate_id uuid not null,
  quantity     integer not null check (quantity > 0),
  credited_at  timestamptz not null default now(),
  constraint vote_credits_candidate_in_matchup foreign key (matchup_id, candidate_id)
    references matchup_candidates (matchup_id, candidate_id) on delete restrict
);
create index if not exists idx_vote_credits_tally on vote_credits (matchup_id, candidate_id);

-- 8. FREE VOTES -------------------------------------------------------------------
-- voter_hash is an HMAC of (debate, IP, user-agent). Raw IPs are never stored.
-- It reduces abuse; it does NOT prove one-person-one-vote.
create table if not exists free_votes (
  id           uuid primary key default gen_random_uuid(),
  matchup_id   uuid not null,
  candidate_id uuid not null,
  voter_hash   varchar(128) not null,
  ip_hash      varchar(128),
  created_at   timestamptz not null default now(),
  unique (matchup_id, voter_hash),
  constraint free_votes_candidate_in_matchup foreign key (matchup_id, candidate_id)
    references matchup_candidates (matchup_id, candidate_id) on delete restrict
);
create index if not exists idx_free_votes_tally on free_votes (matchup_id, candidate_id);

-- 9. ADMIN ALLOWLIST + AUDIT LOG ------------------------------------------------------
-- Being a Supabase Auth user is NOT enough to be an admin. You must also be listed here.
create table if not exists admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id            uuid primary key default gen_random_uuid(),
  action        varchar(100) not null,
  target        varchar(200) not null,
  details       text not null,
  admin_user    varchar(320) not null,
  admin_user_id uuid,
  ip_address    varchar(64),
  timestamp     timestamptz not null default now()
);
create index if not exists idx_audit_time on admin_audit_logs (timestamp desc);

create or replace function forbid_audit_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'admin_audit_logs is append-only';
end $$;
drop trigger if exists trg_audit_immutable on admin_audit_logs;
create trigger trg_audit_immutable before update or delete on admin_audit_logs for each row execute function forbid_audit_mutation();

-- 10. RATE LIMITS (shared across all edge isolates) -------------------------------------
create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);

create or replace function rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql set search_path = public as $$
declare v_hits integer;
begin
  insert into rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits         = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  -- opportunistic housekeeping
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end $$;

-- 11. VOTE-CREDITING FUNCTIONS (service role only) -----------------------------------------
-- Idempotent and atomic: row-locks the payment, so concurrent webhooks / return-page hits
-- serialise, and vote_credits.payment_id UNIQUE is the final backstop.
create or replace function credit_paid_votes_atomic(
  p_reference          text,
  p_provider_reference text,
  p_verified_amount_kes numeric,
  p_currency           text,
  p_raw                jsonb default null
) returns jsonb language plpgsql set search_path = public as $$
declare
  v_payment payments%rowtype;
  v_matchup matchups%rowtype;
begin
  select * into v_payment from payments where reference = p_reference for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  -- Already credited: replayed webhook / refreshed return page. Do nothing.
  if v_payment.status = 'success' then
    return jsonb_build_object('ok', true, 'status', 'success', 'alreadyProcessed', true, 'quantity', v_payment.quantity);
  end if;

  -- Provider-confirmed amount/currency must equal what WE stored when the checkout was created.
  if p_currency is distinct from v_payment.currency or p_verified_amount_kes is distinct from v_payment.amount_kes then
    update payments
       set status = 'reconciliation_required', failure_reason = 'amount_or_currency_mismatch',
           provider_reference = coalesce(p_provider_reference, provider_reference),
           raw_provider_payload = coalesce(p_raw, raw_provider_payload)
     where id = v_payment.id;
    return jsonb_build_object('ok', false, 'status', 'reconciliation_required', 'reason', 'amount_or_currency_mismatch');
  end if;

  select * into v_matchup from matchups where id = v_payment.matchup_id for share;

  -- Money was taken but the poll is no longer open (paused/closed/archived, or deadline passed
  -- before the checkout was even created). Do NOT silently change results after close, and do NOT lose
  -- the payment: park it for an admin to review (refund or reopen + reconcile).
  if v_matchup.status <> 'open'
     or (v_matchup.end_date is not null and v_payment.created_at > v_matchup.end_date) then
    update payments
       set status = 'reconciliation_required', failure_reason = 'poll_not_open_at_settlement',
           provider_reference = coalesce(p_provider_reference, provider_reference),
           raw_provider_payload = coalesce(p_raw, raw_provider_payload)
     where id = v_payment.id;
    return jsonb_build_object('ok', false, 'status', 'reconciliation_required', 'reason', 'poll_not_open_at_settlement');
  end if;

  update payments
     set status = 'success', failure_reason = null, verified_at = now(),
         provider_reference = coalesce(p_provider_reference, provider_reference),
         raw_provider_payload = coalesce(p_raw, raw_provider_payload)
   where id = v_payment.id;

  insert into vote_credits (payment_id, matchup_id, candidate_id, quantity)
  values (v_payment.id, v_payment.matchup_id, v_payment.candidate_id, v_payment.quantity);

  insert into admin_audit_logs (action, target, details, admin_user)
  values ('PAYMENT_VERIFIED', v_matchup.title,
          format('Credited %s vote(s). Ref %s, KES %s', v_payment.quantity, p_reference, v_payment.amount_kes),
          'system:paystack');

  return jsonb_build_object('ok', true, 'status', 'success', 'quantity', v_payment.quantity);
end $$;

-- Records a non-success outcome. A credited payment is final and is never downgraded.
create or replace function mark_payment_outcome(p_reference text, p_status text, p_reason text, p_raw jsonb default null)
returns jsonb language plpgsql set search_path = public as $$
declare v_payment payments%rowtype;
begin
  if p_status not in ('failed', 'abandoned', 'reconciliation_required') then
    raise exception 'invalid outcome status: %', p_status;
  end if;
  select * into v_payment from payments where reference = p_reference for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;
  if v_payment.status = 'success' then
    return jsonb_build_object('ok', true, 'status', 'success');
  end if;
  update payments
     set status = p_status::payment_status_enum, failure_reason = p_reason,
         raw_provider_payload = coalesce(p_raw, raw_provider_payload)
   where id = v_payment.id;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;

create or replace function cast_free_vote_atomic(p_matchup_id uuid, p_candidate_id uuid, p_voter_hash text, p_ip_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare v_m matchups%rowtype;
begin
  select * into v_m from matchups where id = p_matchup_id and is_public;
  if not found then return jsonb_build_object('ok', false, 'status', 'not_found'); end if;
  if v_m.voting_type <> 'free' then return jsonb_build_object('ok', false, 'status', 'not_free'); end if;
  if v_m.status <> 'open'
     or (v_m.start_date is not null and now() < v_m.start_date)
     or (v_m.end_date   is not null and now() > v_m.end_date) then
    return jsonb_build_object('ok', false, 'status', 'not_open');
  end if;
  if not exists (select 1 from matchup_candidates where matchup_id = p_matchup_id and candidate_id = p_candidate_id) then
    return jsonb_build_object('ok', false, 'status', 'invalid_candidate');
  end if;

  insert into free_votes (matchup_id, candidate_id, voter_hash, ip_hash)
  values (p_matchup_id, p_candidate_id, p_voter_hash, p_ip_hash)
  on conflict (matchup_id, voter_hash) do nothing;

  if not found then return jsonb_build_object('ok', false, 'status', 'already_voted'); end if;
  return jsonb_build_object('ok', true, 'status', 'recorded');
end $$;

-- 12. READ MODELS (called by the API with the service role) ----------------------------------
-- Tallies are computed from verified records only (vote_credits + free_votes). Using correlated
-- subqueries avoids the join fan-out that double-counted votes in the previous view.
create or replace function api_list_debates(p_include_hidden boolean default false)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'slug', m.slug,
      'title', m.title,
      'category', m.category,
      'categoryLabel', m.category_label,
      'question', m.question,
      'description', m.description,
      'supportingText', m.supporting_text,
      'status', m.status,
      'votingType', m.voting_type,
      'pricePerVoteKes', m.price_per_vote_kes,
      'maxVotesPerTransaction', m.max_votes_per_transaction,
      'isFlagship', m.is_flagship,
      'isPublic', m.is_public,
      'sortOrder', m.sort_order,
      'season', m.season,
      'startDate', m.start_date,
      'endDate', m.end_date,
      'rules', m.rules,
      'totalVotes', t.total,
      'lastUpdated', greatest(
          m.updated_at,
          coalesce((select max(vc.credited_at) from vote_credits vc where vc.matchup_id = m.id), m.updated_at),
          coalesce((select max(fv.created_at)  from free_votes  fv where fv.matchup_id = m.id), m.updated_at)),
      'candidates', cands.j
    )
    order by m.is_flagship desc, m.sort_order, m.created_at
  ), '[]'::jsonb)
  from matchups m
  cross join lateral (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'shortName', c.short_name,
        'subtitle', c.subtitle,
        'clubAffiliation', c.club_affiliation,
        'imageUrl', c.image_url,
        'imageAlt', c.image_alt,
        'imageAttribution', c.image_attribution,
        'imageLicense', c.image_license,
        'highlightColor', c.highlight_color,
        'stats', c.stats,
        'displayOrder', mc.display_order,
        'verifiedVotes',
          coalesce((select sum(vc.quantity) from vote_credits vc where vc.matchup_id = m.id and vc.candidate_id = c.id), 0)
          + coalesce((select count(*)       from free_votes  fv where fv.matchup_id = m.id and fv.candidate_id = c.id), 0)
      )
      order by mc.display_order, c.name
    ), '[]'::jsonb) as j
    from matchup_candidates mc
    join candidates c on c.id = mc.candidate_id
    where mc.matchup_id = m.id
  ) cands
  cross join lateral (
    select coalesce(sum((x ->> 'verifiedVotes')::bigint), 0) as total from jsonb_array_elements(cands.j) x
  ) t
  where p_include_hidden or m.is_public;
$$;

create or replace function admin_overview() returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'verifiedVotes',          coalesce((select sum(quantity) from vote_credits), 0) + (select count(*) from free_votes),
    'activeDebates',          (select count(*) from matchups where status = 'open'),
    'pausedOrUpcomingDebates',(select count(*) from matchups where status in ('paused', 'upcoming')),
    'closedDebates',          (select count(*) from matchups where status in ('closed', 'archived')),
    'verifiedPaymentsKes',    coalesce((select sum(amount_kes) from payments where status = 'success'), 0),
    'verifiedPaymentsCount',  (select count(*) from payments where status = 'success'),
    'pendingPayments',        (select count(*) from payments where status = 'pending'),
    'failedPayments',         (select count(*) from payments where status = 'failed'),
    'abandonedPayments',      (select count(*) from payments where status = 'abandoned'),
    'reconciliationRequired', (select count(*) from payments where status = 'reconciliation_required')
  );
$$;

-- 13. LOCK DOWN ---------------------------------------------------------------------------------------
alter table matchups           enable row level security;
alter table candidates         enable row level security;
alter table matchup_candidates enable row level security;
alter table payments           enable row level security;
alter table vote_credits       enable row level security;
alter table free_votes         enable row level security;
alter table admin_users        enable row level security;
alter table admin_audit_logs   enable row level security;
alter table rate_limits        enable row level security;
-- (intentionally NO policies: anon and authenticated can read/write nothing. The service role bypasses RLS.)

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
