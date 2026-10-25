import React, { useCallback, useEffect, useState } from 'react';
import { adminApi, type AuditRow } from './adminApi';

type Tab = 'overview' | 'debates' | 'candidates' | 'payments' | 'audit';
const input = 'w-full min-h-10 bg-[#111512] border border-[#29312B] focus:border-[#39E477] rounded-lg px-3 py-2 text-sm text-[#F6F8F6] outline-none';
const btn = 'min-h-10 px-4 rounded-lg text-xs font-bold uppercase';
const primary = `${btn} bg-[#39E477] text-[#080A09] hover:bg-[#2ec966] disabled:opacity-50`;
const ghost = `${btn} bg-[#111512] border border-[#29312B] text-[#F6F8F6] hover:border-[#39E477]/50`;
const card = 'bg-[#0c100e] border border-[#29312B] rounded-xl p-4';
const kes = (n: number) => `KES ${Number(n).toLocaleString('en-KE')}`;

function useNotice() {
  const [n, setN] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  return { n, ok: (text: string) => setN({ kind: 'ok', text }), err: (e: unknown) => setN({ kind: 'err', text: (e as Error).message }), clear: () => setN(null) };
}

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block text-xs font-semibold text-[#A4AEA7] space-y-1">
    <span>{label}</span>
    {children}
    {hint && <span className="block text-[10px] font-normal">{hint}</span>}
  </label>
);

/* ------------------------------ Login ------------------------------ */
function Login({ onDone }: { onDone: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone((await adminApi.login(email.trim(), password)).email);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#111512] border border-[#29312B] rounded-2xl p-8 space-y-4">
        <h1 className="font-display font-black text-2xl text-[#F6F8F6]">GOAT Wars · Admin</h1>
        <p className="text-xs text-[#A4AEA7]">Authorised staff only. Activity is logged.</p>
        {error && <div role="alert" className="text-xs text-red-300 bg-red-950/50 border border-red-900 rounded-lg p-2.5">{error}</div>}
        <Field label="Email"><input className={input} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className={input} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className={`${primary} w-full`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

/* ----------------------------- Overview ----------------------------- */
function Overview() {
  const [d, setD] = useState<{ overview: Record<string, number>; recentEvents: AuditRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { adminApi.overview().then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="text-red-300 text-sm">{err}</p>;
  if (!d) return <p className="text-sm text-[#A4AEA7]">Loading…</p>;
  const o = d.overview;
  const tiles: [string, string, string?][] = [
    ['Verified votes', Number(o.verifiedVotes).toLocaleString()],
    ['Open debates', String(o.activeDebates), `${o.pausedOrUpcomingDebates} paused/upcoming · ${o.closedDebates} closed`],
    ['Gross verified payments', kes(o.verifiedPaymentsKes), `${o.verifiedPaymentsCount} successful. Gross volume, not profit (Paystack fees, tax, refunds not deducted)`],
    ['Pending payments', String(o.pendingPayments), `${o.failedPayments} failed · ${o.abandonedPayments} abandoned`],
    ['Needs reconciliation', String(o.reconciliationRequired), o.reconciliationRequired > 0 ? 'Review in Payments tab' : 'None']
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(([k, v, s]) => (
          <div key={k} className={card}>
            <div className="text-[10px] uppercase font-bold text-[#A4AEA7]">{k}</div>
            <div className="font-display font-black text-2xl text-[#F6F8F6] mt-1">{v}</div>
            {s && <div className="text-[10px] text-[#A4AEA7] mt-1">{s}</div>}
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-display font-bold text-sm text-[#F6F8F6] mb-2">Recent events</h3>
        <AuditList rows={d.recentEvents} />
      </div>
    </div>
  );
}

function AuditList({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) return <p className="text-xs text-[#A4AEA7]">Nothing yet.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((l) => (
        <li key={l.id} className="p-2.5 rounded-lg bg-[#0c100e] border border-[#29312B] text-xs">
          <div className="flex flex-wrap justify-between gap-2"><span><span className="font-mono font-bold text-[#39E477]">{l.action}</span> · {l.target}</span><span className="text-[#A4AEA7] font-mono">{new Date(l.timestamp).toLocaleString()}</span></div>
          <div className="text-[#A4AEA7] break-words">{l.details} <span className="opacity-60">— {l.admin_user}</span></div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Debates ------------------------------ */
const EMPTY_DEBATE = { title: '', slug: '', category: 'players', categoryLabel: '', question: '', description: '', supportingText: '', status: 'upcoming', votingType: 'paid', pricePerVoteKes: 10, maxVotesPerTransaction: 100, season: '', startDate: '', endDate: '', rulesText: '', isFlagship: false, isPublic: true, sortOrder: 100 };
const toLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

function Debates() {
  const [debates, setDebates] = useState<any[]>([]);
  const [cands, setCands] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null); // form state; id present = editing
  const [attachId, setAttachId] = useState('');
  const notice = useNotice();
  const load = useCallback(() => { adminApi.debates().then((r) => setDebates(r.debates)).catch(notice.err); adminApi.candidates().then((r) => setCands(r.candidates)).catch(notice.err); }, []); // eslint-disable-line
  useEffect(load, [load]);

  const open = (d?: any) => setEdit(d ? { ...d, rulesText: (d.rules || []).join('\n'), startDate: toLocal(d.startDate), endDate: toLocal(d.endDate), season: d.season ?? '' } : { ...EMPTY_DEBATE });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = edit;
    const body: any = {
      title: f.title, slug: f.slug, category: f.category, categoryLabel: f.categoryLabel, question: f.question, description: f.description, supportingText: f.supportingText,
      status: f.status, votingType: f.votingType, pricePerVoteKes: Number(f.pricePerVoteKes), maxVotesPerTransaction: Number(f.maxVotesPerTransaction),
      season: f.season || null, startDate: f.startDate ? new Date(f.startDate).toISOString() : undefined, endDate: f.endDate ? new Date(f.endDate).toISOString() : null,
      rules: f.rulesText.split('\n').map((s: string) => s.trim()).filter(Boolean), isFlagship: !!f.isFlagship, isPublic: !!f.isPublic, sortOrder: Number(f.sortOrder)
    };
    try {
      if (f.id) await adminApi.updateDebate(f.id, body); else await adminApi.createDebate(body);
      notice.ok('Saved'); setEdit(null); load();
    } catch (err) { notice.err(err); }
  };
  const setStatus = async (d: any, status: string) => {
    if (!window.confirm(`Set “${d.title}” to ${status.toUpperCase()}?`)) return;
    try { await adminApi.updateDebate(d.id, { status }); notice.ok(`Status → ${status}`); load(); } catch (e) { notice.err(e); }
  };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="space-y-4">
      <Notice n={notice} />
      {!edit && <button className={primary} onClick={() => open()}>+ New debate</button>}
      {edit && (
        <form onSubmit={save} className={`${card} space-y-4`}>
          <h3 className="font-display font-bold text-[#F6F8F6]">{edit.id ? `Edit: ${edit.title}` : 'New debate'}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title"><input required className={input} value={edit.title} onChange={set('title')} /></Field>
            <Field label="Slug" hint="lowercase-with-hyphens"><input required className={input} value={edit.slug} onChange={set('slug')} /></Field>
            <Field label="Category"><select className={input} value={edit.category} onChange={set('category')}>{['players', 'clubs', 'predictions', 'managers'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Category label"><input required className={input} value={edit.categoryLabel} onChange={set('categoryLabel')} /></Field>
            <Field label="Question"><input required className={input} value={edit.question} onChange={set('question')} /></Field>
            <Field label="Season"><input className={input} value={edit.season} onChange={set('season')} /></Field>
            <Field label="Status"><select className={input} value={edit.status} onChange={set('status')}>{['upcoming', 'open', 'paused', 'closed', 'archived'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Voting"><select className={input} value={edit.votingType} onChange={set('votingType')}><option>paid</option><option>free</option></select></Field>
            <Field label="Price per vote (KES)" hint="Verify the amount works on your Paystack account first"><input type="number" min={0} step="0.01" className={input} value={edit.pricePerVoteKes} onChange={set('pricePerVoteKes')} /></Field>
            <Field label="Max votes per payment"><input type="number" min={1} max={1000} className={input} value={edit.maxVotesPerTransaction} onChange={set('maxVotesPerTransaction')} /></Field>
            <Field label="Opens"><input type="datetime-local" className={input} value={edit.startDate} onChange={set('startDate')} /></Field>
            <Field label="Voting deadline" hint="Leave blank for none"><input type="datetime-local" className={input} value={edit.endDate} onChange={set('endDate')} /></Field>
            <Field label="Sort order"><input type="number" min={0} className={input} value={edit.sortOrder} onChange={set('sortOrder')} /></Field>
            <div className="flex items-end gap-5 text-xs text-[#A4AEA7]">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.isFlagship} onChange={set('isFlagship')} /> Flagship</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.isPublic} onChange={set('isPublic')} /> Public</label>
            </div>
          </div>
          <Field label="Description"><textarea required rows={3} className={input} value={edit.description} onChange={set('description')} /></Field>
          <Field label="Supporting text"><input required className={input} value={edit.supportingText} onChange={set('supportingText')} /></Field>
          <Field label="Rules (one per line)"><textarea rows={4} className={input} value={edit.rulesText} onChange={set('rulesText')} /></Field>
          <div className="flex gap-2"><button className={primary}>Save</button><button type="button" className={ghost} onClick={() => setEdit(null)}>Cancel</button></div>

          {edit.id && (
            <div className="pt-4 border-t border-[#29312B] space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#A4AEA7]">Candidates in this debate</h4>
              <ul className="space-y-1.5">
                {(debates.find((d) => d.id === edit.id)?.candidates || []).map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between text-xs bg-[#111512] border border-[#29312B] rounded-lg px-3 py-2">
                    <span className="text-[#F6F8F6]">{c.name} <span className="text-[#A4AEA7]">· {c.verifiedVotes} votes</span></span>
                    <button type="button" className="text-red-300 hover:underline" onClick={async () => { try { await adminApi.detach(edit.id, c.id); notice.ok('Removed'); load(); } catch (e) { notice.err(e); } }}>Remove</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <select className={input} value={attachId} onChange={(e) => setAttachId(e.target.value)}>
                  <option value="">Add an existing candidate…</option>
                  {cands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className={ghost} disabled={!attachId} onClick={async () => { try { await adminApi.attach(edit.id, attachId, 99); notice.ok('Added'); setAttachId(''); load(); } catch (e) { notice.err(e); } }}>Add</button>
              </div>
            </div>
          )}
        </form>
      )}
      <div className="space-y-3">
        {debates.map((d) => (
          <div key={d.id} className={`${card} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-[#A4AEA7]">/{d.slug} {d.isPublic ? '' : '· HIDDEN'}</div>
              <div className="font-display font-bold text-sm text-[#F6F8F6]">{d.title}</div>
              <div className="text-xs text-[#A4AEA7]">{d.candidates.length} candidates · {d.totalVotes} verified votes · {d.votingType === 'paid' ? `${kes(d.pricePerVoteKes)}/vote` : 'free'}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select aria-label="Status" className={`${input} !w-auto`} value={d.status} onChange={(e) => setStatus(d, e.target.value)}>{['upcoming', 'open', 'paused', 'closed', 'archived'].map((s) => <option key={s}>{s}</option>)}</select>
              <button className={ghost} onClick={() => open(d)}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notice({ n }: { n: ReturnType<typeof useNotice> }) {
  if (!n.n) return null;
  return <div role={n.n.kind === 'err' ? 'alert' : 'status'} className={`text-xs rounded-lg p-2.5 border ${n.n.kind === 'ok' ? 'text-[#39E477] border-[#39E477]/30 bg-[#39E477]/10' : 'text-red-300 border-red-900 bg-red-950/50'}`}>{n.n.text}</div>;
}

/* ----------------------------- Candidates ----------------------------- */
function Candidates() {
  const [rows, setRows] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const notice = useNotice();
  const load = useCallback(() => { adminApi.candidates().then((r) => setRows(r.candidates)).catch(notice.err); }, []); // eslint-disable-line
  useEffect(load, [load]);
  const set = (k: string) => (e: React.ChangeEvent<any>) => setEdit({ ...edit, [k]: e.target.value });
  const open = (c?: any) => setEdit(c ? { ...c, statsText: (c.stats || []).map((s: any) => `${s.label}: ${s.value}`).join('\n') } : { name: '', short_name: '', subtitle: '', club_affiliation: '', image_url: '', image_alt: '', image_attribution: '', image_license: '', image_source_url: '', highlight_color: '#39E477', statsText: '' });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = edit;
    const stats = f.statsText.split('\n').map((l: string) => l.trim()).filter(Boolean).map((l: string) => { const i = l.indexOf(':'); return { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() }; });
    const body = { name: f.name, shortName: f.short_name || null, subtitle: f.subtitle || null, clubAffiliation: f.club_affiliation || null, imageUrl: f.image_url || null, imageAlt: f.image_alt || null, imageAttribution: f.image_attribution || null, imageLicense: f.image_license || null, imageSourceUrl: f.image_source_url || null, highlightColor: f.highlight_color, stats };
    try { if (f.id) await adminApi.updateCandidate(f.id, body); else await adminApi.createCandidate(body); notice.ok('Saved'); setEdit(null); load(); } catch (err) { notice.err(err); }
  };
  return (
    <div className="space-y-4">
      <Notice n={notice} />
      {!edit && <button className={primary} onClick={() => open()}>+ New candidate</button>}
      {edit && (
        <form onSubmit={save} className={`${card} space-y-3`}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><input required className={input} value={edit.name} onChange={set('name')} /></Field>
            <Field label="Short name"><input className={input} value={edit.short_name ?? ''} onChange={set('short_name')} /></Field>
            <Field label="Subtitle / affiliation line" hint="Verify current club or role before publishing"><input className={input} value={edit.subtitle ?? ''} onChange={set('subtitle')} /></Field>
            <Field label="Club"><input className={input} value={edit.club_affiliation ?? ''} onChange={set('club_affiliation')} /></Field>
            <Field label="Accent colour"><input className={input} value={edit.highlight_color} onChange={set('highlight_color')} /></Field>
          </div>
          <fieldset className="border border-[#29312B] rounded-lg p-3 space-y-3">
            <legend className="text-[10px] uppercase font-bold text-[#A4AEA7] px-1">Photo (only with permission to use it commercially)</legend>
            <Field label="Image URL" hint="https://… or /assets/candidates/file.jpg. Leave blank to show a monogram."><input className={input} value={edit.image_url ?? ''} onChange={set('image_url')} /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Alt text"><input className={input} value={edit.image_alt ?? ''} onChange={set('image_alt')} /></Field>
              <Field label="Credit / photographer"><input className={input} value={edit.image_attribution ?? ''} onChange={set('image_attribution')} /></Field>
              <Field label="Licence"><input className={input} value={edit.image_license ?? ''} onChange={set('image_license')} /></Field>
              <Field label="Source URL"><input className={input} value={edit.image_source_url ?? ''} onChange={set('image_source_url')} /></Field>
            </div>
          </fieldset>
          <Field label="Stats (one per line, “Label: value”)"><textarea rows={4} className={input} value={edit.statsText} onChange={set('statsText')} /></Field>
          <div className="flex gap-2"><button className={primary}>Save</button><button type="button" className={ghost} onClick={() => setEdit(null)}>Cancel</button></div>
        </form>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((c) => (
          <div key={c.id} className={`${card} flex items-center justify-between gap-3`}>
            <div className="min-w-0"><div className="font-bold text-sm text-[#F6F8F6] truncate">{c.name}</div><div className="text-xs text-[#A4AEA7] truncate">{c.subtitle || '—'} · {c.image_url ? 'photo set' : 'no photo'}</div></div>
            <button className={ghost} onClick={() => open(c)}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Payments ------------------------------ */
function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const notice = useNotice();
  const load = useCallback(() => {
    adminApi.payments(filter || undefined).then((r) => setRows(r.payments)).catch(notice.err);
    adminApi.debates().then((r) => { const m: Record<string, string> = {}; r.debates.forEach((d) => { m[d.id] = d.title; d.candidates.forEach((c: any) => (m[c.id] = c.name)); }); setNames(m); }).catch(() => {});
  }, [filter]); // eslint-disable-line
  useEffect(load, [load]);
  const tone: Record<string, string> = { success: 'text-[#39E477] bg-[#39E477]/15', pending: 'text-yellow-300 bg-yellow-500/15', reconciliation_required: 'text-orange-300 bg-orange-500/15' };
  return (
    <div className="space-y-4">
      <Notice n={notice} />
      <div className="flex items-center gap-2">
        <select aria-label="Filter by status" className={`${input} !w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>{['pending', 'success', 'failed', 'abandoned', 'reconciliation_required'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className={ghost} onClick={load}>Refresh</button>
        <span className="text-xs text-[#A4AEA7]">Latest 200 · contains customer emails: handle with care</span>
      </div>
      {rows.length === 0 ? <p className="text-sm text-[#A4AEA7]">No payments.</p> : (
        <div className="overflow-x-auto rounded-xl border border-[#29312B]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c100e] text-[#A4AEA7]"><tr>{['Reference', 'Debate / pick', 'Qty', 'Amount', 'Status', 'Email', 'Created', ''].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#29312B]">
              {rows.map((p) => (
                <tr key={p.reference}>
                  <td className="p-3 font-mono text-[#F6F8F6]">{p.reference}</td>
                  <td className="p-3 text-[#F6F8F6]">{names[p.matchup_id] || '…'} <span className="text-[#A4AEA7]">→ {names[p.candidate_id] || '…'}</span></td>
                  <td className="p-3 text-[#A4AEA7]">{p.quantity}</td>
                  <td className="p-3 font-bold text-[#F6F8F6]">{kes(p.amount_kes)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tone[p.status] || 'text-[#A4AEA7] bg-[#29312B]'}`}>{p.status}</span>{p.failure_reason && <div className="text-[10px] text-[#A4AEA7] mt-1">{p.failure_reason}</div>}</td>
                  <td className="p-3 text-[#A4AEA7]">{p.customer_email}</td>
                  <td className="p-3 text-[#A4AEA7]">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-3">{p.status !== 'success' && <button className={ghost} onClick={async () => { try { const r = await adminApi.reconcile(p.reference); notice.ok(`${p.reference}: ${r.payment.status}${r.failureReason ? ` (${r.failureReason})` : ''}`); load(); } catch (e) { notice.err(e); } }}>Re-verify</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-[#A4AEA7]">“Re-verify” asks Paystack for the transaction’s true status and applies it (credits votes if paid and the debate is open). To refund a parked payment, use the Paystack dashboard.</p>
    </div>
  );
}

function Audit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => { adminApi.audit().then((r) => setRows(r.logs)).catch(() => {}); }, []);
  return <div className="space-y-3"><p className="text-xs text-[#A4AEA7]">Append-only: the database rejects edits and deletes.</p><AuditList rows={rows} /></div>;
}

/* -------------------------------- Shell -------------------------------- */
export default function AdminApp() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('overview');
  useEffect(() => { adminApi.me().then((r) => setEmail(r.email)).catch(() => setEmail(null)); }, []);
  if (email === undefined) return <p className="p-8 text-sm text-[#A4AEA7]">Loading…</p>;
  if (email === null) return <Login onDone={setEmail} />;
  const tabs: [Tab, string][] = [['overview', 'Overview'], ['debates', 'Debates'], ['candidates', 'Candidates'], ['payments', 'Payments'], ['audit', 'Audit log']];
  return (
    <div className="min-h-screen max-w-6xl mx-auto p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-black text-xl text-[#F6F8F6]">GOAT Wars <span className="text-[#39E477]">Admin</span></h1>
        <div className="flex items-center gap-3 text-xs text-[#A4AEA7]">{email}<button className={ghost} onClick={async () => { await adminApi.logout().catch(() => {}); setEmail(null); }}>Sign out</button></div>
      </header>
      <nav className="flex gap-2 overflow-x-auto border-b border-[#29312B] mb-6" role="tablist">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`pb-3 px-3 text-xs font-bold uppercase whitespace-nowrap border-b-2 ${tab === id ? 'border-[#39E477] text-[#39E477]' : 'border-transparent text-[#A4AEA7] hover:text-[#F6F8F6]'}`}>{label}</button>)}
      </nav>
      {tab === 'overview' && <Overview />}
      {tab === 'debates' && <Debates />}
      {tab === 'candidates' && <Candidates />}
      {tab === 'payments' && <Payments />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}
