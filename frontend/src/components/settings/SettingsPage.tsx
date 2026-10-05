import React, { useState } from 'react';
import { Settings, Shield, Sliders, Bell, Sparkles, Database, Save, Check } from 'lucide-react';
import { useToast } from '../common/Toast';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();

  const [tMinus2Reminder, setTMinus2Reminder] = useState(true);
  const [t0Reminder, setT0Reminder] = useState(true);
  const [tPlus3Escalation, setTPlus3Escalation] = useState(true);
  const [managerApprovalDisputes, setManagerApprovalDisputes] = useState(true);
  const [managerApprovalHardship, setManagerApprovalHardship] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [callingWindowStart, setCallingWindowStart] = useState('08:00');
  const [callingWindowEnd, setCallingWindowEnd] = useState('19:00');

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Configuration Saved',
      message: 'Recovery cadence and manager-in-the-loop policies updated successfully.',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">System & AI Recovery Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure outreach triggers, manager-in-the-loop guardrails, and compliance thresholds.
        </p>
      </div>

      {/* Cadence Rules */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Automated Follow-up Cadence</h2>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <p className="font-semibold text-slate-800">Pre-due Courtesy Reminder (T - 2 Days)</p>
              <p className="text-slate-500 text-[11px]">Send soft payment link via WhatsApp 48 hours before EMI due date.</p>
            </div>
            <input
              type="checkbox"
              checked={tMinus2Reminder}
              onChange={(e) => setTMinus2Reminder(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <p className="font-semibold text-slate-800">Due Date Reminder (T = 0)</p>
              <p className="text-slate-500 text-[11px]">Morning alert at 09:30 AM with NACH clearing notification.</p>
            </div>
            <input
              type="checkbox"
              checked={t0Reminder}
              onChange={(e) => setT0Reminder(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <p className="font-semibold text-slate-800">Delinquency Escalation (DPD + 3)</p>
              <p className="text-slate-500 text-[11px]">Trigger interactive voice response (IVR) or schedule executive call.</p>
            </div>
            <input
              type="checkbox"
              checked={tPlus3Escalation}
              onChange={(e) => setTPlus3Escalation(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Manager In The Loop Rules */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-900">Manager Authorization & Guardrails</h2>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <p className="font-semibold text-slate-800">Require Manager Approval for Billing Disputes</p>
              <p className="text-slate-500 text-[11px]">Halt automated messaging when borrower disputes balance until manual review.</p>
            </div>
            <input
              type="checkbox"
              checked={managerApprovalDisputes}
              onChange={(e) => setManagerApprovalDisputes(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <p className="font-semibold text-slate-800">Require Manager Approval for Financial Hardship</p>
              <p className="text-slate-500 text-[11px]">Enforce senior collection officer review before offering restructuring.</p>
            </div>
            <input
              type="checkbox"
              checked={managerApprovalHardship}
              onChange={(e) => setManagerApprovalHardship(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
          </label>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-800">RAG Semantic Similarity Cutoff</span>
              <span className="font-mono font-bold text-purple-700">{confidenceThreshold}%</span>
            </div>
            <p className="text-slate-500 text-[11px] mb-2">
              If chunk confidence is below this cutoff, route to manager review without auto-replying.
            </p>
            <input
              type="range"
              min="70"
              max="95"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full cursor-pointer accent-purple-600"
            />
          </div>
        </div>
      </div>

      {/* Regulatory Permissible Contact Windows */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Bell className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Regulatory Contact Windows (RBI Guidelines)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Permissible Start Time</label>
            <input
              type="time"
              value={callingWindowStart}
              onChange={(e) => setCallingWindowStart(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Permissible End Time</label>
            <input
              type="time"
              value={callingWindowEnd}
              onChange={(e) => setCallingWindowEnd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
