import { useEffect, useRef, useState } from 'react';
import { automationApi, type EmailTestStatus } from '../../services/automation';

export function EmailTestPanel() {
  const [data, setData] = useState<EmailTestStatus | null>(null);
  const [recipient, setRecipient] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [real, setReal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('');
  const submitting = useRef(false);
  // Keep the same ID across a network error. A retry can only read the original outcome.
  const requestId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    automationApi.emailTestStatus().then(d => { if (active) setData(d); })
      .catch(() => { if (active) setError('Unable to load email test configuration.'); });
    return () => { active = false; };
  }, []);
  const reset = () => { requestId.current = null; setOutcome(''); setError(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || !authorized || !data) return;
    if (real && !window.confirm(`Send ONE real test email to ${recipient}? This does not resume the scheduler.`)) return;
    submitting.current = true; setBusy(true); setError(''); setOutcome('');
    requestId.current ??= crypto.randomUUID();
    try {
      const { run } = await automationApi.testEmail({ request_id: requestId.current, recipient, send_real: real, authorized });
      setOutcome(run.status === 'accepted' ? 'Accepted by Google Apps Script. Inbox delivery is not confirmed.'
        : run.status === 'simulated' ? 'Simulated successfully. No email was sent.'
        : `Test ${run.status}${run.error_code ? `: ${run.error_code}` : ''}. Review the history before another test.`);
      setData(await automationApi.emailTestStatus());
    } catch (e) { setError(e instanceof Error ? e.message : 'Test request failed. Retry with the same recipient to check its outcome.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
    <h2 className="text-sm font-bold text-slate-900">Google Apps Script email test</h2>
    <p className="text-xs text-slate-600">Admin only. One recipient, fixed dummy EMI content. Simulation is the default. Real tests require backend enablement, recipient allowlisting and explicit confirmation. This never changes automation mode or scheduler policy.</p>
    {data && <p className="text-xs text-slate-600">{data.allowlisted_count} allowlisted recipients. {data.enabled && data.ready ? 'Real tests enabled.' : 'Real tests disabled or not configured.'} {data.problem}</p>}
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy || !data} className="space-y-3 disabled:opacity-60">
        <label className="block text-xs font-medium">Authorized test email
          <input type="email" required maxLength={254} value={recipient} onChange={e => { setRecipient(e.target.value); setAuthorized(false); reset(); }} className="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} />This recipient explicitly authorized this test email.</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={real} disabled={!data?.enabled || !data?.ready} onChange={e => { setReal(e.target.checked); reset(); }} />Send one real email instead of a simulation</label>
        <button type="submit" disabled={!authorized || busy} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Checking test result...' : real ? 'Send one real test email' : 'Simulate email test'}</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {outcome && <p role="status" className="text-xs text-slate-700">{outcome}</p>}
    <p className="text-xs text-slate-500">Repeating the same request checks its stored result; it does not resend. An unknown result needs manual review.</p>
    {!!data?.runs.length && <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="text-left font-semibold pb-2">Email test history</caption>
      <thead><tr className="text-left text-slate-500"><th className="p-2">Recipient</th><th className="p-2">Status</th><th className="p-2">Last attempt</th><th className="p-2">Detail</th></tr></thead>
      <tbody>{data.runs.map(run => <tr key={run.request_id} className="border-t border-slate-100"><td className="p-2">{run.recipient}</td><td className="p-2">{run.status}</td><td className="p-2">{new Date(run.attempted_at).toLocaleString()}</td><td className="p-2">{run.error_code ?? run.provider_message_id ?? (run.real_send ? 'Outcome not confirmed' : 'No external send')}</td></tr>)}</tbody>
    </table></div>}
  </section>;
}
