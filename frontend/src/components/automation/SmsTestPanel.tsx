import { useEffect, useRef, useState } from 'react';
import { automationApi, type SmsTestStatus } from '../../services/automation';
import { MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function SmsTestPanel() {
  const [data, setData] = useState<SmsTestStatus | null>(null);
  const [recipient, setRecipient] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [real, setReal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('');
  const submitting = useRef(false);
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    automationApi.smsTestStatus()
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setError('Unable to load SMS test configuration.');
      });
    return () => {
      active = false;
    };
  }, []);

  const reset = () => {
    requestId.current = null;
    setOutcome('');
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || !authorized || !data) return;

    if (real && !window.confirm(`Send ONE real test SMS to ${recipient}? This will incur provider usage and only test one recipient.`)) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');
    setOutcome('');
    requestId.current ??= crypto.randomUUID();

    try {
      const { run } = await automationApi.testSms({
        request_id: requestId.current,
        recipient,
        send_real: real,
        authorized,
      });

      setOutcome(
        run.status === 'accepted'
          ? `Dispatched via ${data.provider.toUpperCase()} (ID: ${run.provider_message_id || 'accepted'}). Delivery receipt is tracked asynchronously.`
          : run.status === 'simulated'
          ? 'Simulated successfully in sandbox mode. No real SMS was dispatched.'
          : `Test ${run.status}${run.error_code ? `: ${run.error_code}` : ''}. Review the history below.`
      );
      setData(await automationApi.smsTestStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test request failed. Retry with the same recipient to inspect stored outcome.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">SMS Gateway Test & Verification</h2>
            <p className="text-[11px] text-slate-500">
              Provider: <span className="font-semibold text-slate-800 uppercase">{data?.provider || 'Loading...'}</span>
              {data?.sender_id ? ` · Header/ID: ${data.sender_id}` : ''}
            </p>
          </div>
        </div>
        {data && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              data.ready
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {data.ready ? 'Gateway Ready' : 'Misconfigured'}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Admin only. Send a single Stage-1 compliant verification SMS with dummy EMI notice content. Real dispatch requires explicit consent, test-number allowlisting, and confirmation. Simulation is active when AUTOMATION_MODE is sandbox.
      </p>

      {data && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600">
            <span>Allowlisted Recipients:</span>
            <span className="font-semibold text-slate-900">{data.allowlisted_count} authorized numbers</span>
          </div>
          {data.problem && (
            <div className="text-amber-700 font-semibold flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{data.problem}</span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3 pt-1">
        <fieldset disabled={busy || !data} className="space-y-3 disabled:opacity-60">
          <label className="block text-xs font-medium text-slate-700">
            Authorized test mobile number
            <input
              type="tel"
              required
              placeholder="+91 9105830551 or +91 8077815522"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setAuthorized(false);
                reset();
              }}
              className="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>This recipient explicitly authorized this test SMS in compliance with TRAI / carrier rules.</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={real}
              disabled={!data?.ready}
              onChange={(e) => {
                setReal(e.target.checked);
                reset();
              }}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Dispatch one real SMS via {data?.provider.toUpperCase() || 'live gateway'} (not a sandbox simulation)</span>
          </label>

          <button
            type="submit"
            disabled={!authorized || busy}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Processing test...' : real ? 'Send Real Test SMS' : 'Simulate SMS Dispatch'}
          </button>
        </fieldset>
      </form>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {outcome && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{outcome}</span>
        </div>
      )}

      {!!data?.runs.length && (
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs">
            <caption className="text-left font-semibold text-slate-800 pb-2">SMS Test Execution Log</caption>
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 px-2">Recipient</th>
                <th className="py-1.5 px-2">Mode</th>
                <th className="py-1.5 px-2">Status</th>
                <th className="py-1.5 px-2">Attempted (IST)</th>
                <th className="py-1.5 px-2">Provider ID / Code</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map((run) => (
                <tr key={run.request_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2 font-mono font-medium">{run.recipient}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${run.real_send ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                      {run.real_send ? 'REAL' : 'SIMULATION'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        run.status === 'accepted' || run.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : run.status === 'simulated'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {run.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-slate-500">{new Date(run.attempted_at).toLocaleString()}</td>
                  <td className="py-2 px-2 font-mono text-[11px] text-slate-600">
                    {run.provider_message_id || run.error_code || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
