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
        <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">
          System & AI Recovery Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
          Configure outreach triggers, manager-in-the-loop guardrails, and compliance thresholds.
        </p>
      </div>

      {/* Cadence Rules */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E7EBE3] shadow-fintech-card space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E7EBE3] pb-3.5">
          <Sliders className="w-4 h-4 text-[#245C35]" />
          <h2 className="text-sm font-bold text-[#171A17] font-heading">Automated Follow-up Cadence</h2>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] cursor-pointer hover:border-[#D1E8BC] transition-colors">
            <div>
              <p className="font-semibold text-[#171A17]">Pre-due Courtesy Reminder (T - 2 Days)</p>
              <p className="text-[#777E77] text-[11px] mt-0.5">Send soft payment link via WhatsApp 48 hours before EMI due date.</p>
            </div>
            <input
              type="checkbox"
              checked={tMinus2Reminder}
              onChange={(e) => setTMinus2Reminder(e.target.checked)}
              className="w-4 h-4 accent-[#245C35] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] cursor-pointer hover:border-[#D1E8BC] transition-colors">
            <div>
              <p className="font-semibold text-[#171A17]">Due Date Reminder (T = 0)</p>
              <p className="text-[#777E77] text-[11px] mt-0.5">Morning alert at 09:30 AM with NACH clearing notification.</p>
            </div>
            <input
              type="checkbox"
              checked={t0Reminder}
              onChange={(e) => setT0Reminder(e.target.checked)}
              className="w-4 h-4 accent-[#245C35] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] cursor-pointer hover:border-[#D1E8BC] transition-colors">
            <div>
              <p className="font-semibold text-[#171A17]">Delinquency Escalation (DPD + 3)</p>
              <p className="text-[#777E77] text-[11px] mt-0.5">Trigger interactive voice response (IVR) or schedule executive call.</p>
            </div>
            <input
              type="checkbox"
              checked={tPlus3Escalation}
              onChange={(e) => setTPlus3Escalation(e.target.checked)}
              className="w-4 h-4 accent-[#245C35] rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Manager In The Loop Rules */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E7EBE3] shadow-fintech-card space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E7EBE3] pb-3.5">
          <Shield className="w-4 h-4 text-[#245C35]" />
          <h2 className="text-sm font-bold text-[#171A17] font-heading">Manager Authorization & Guardrails</h2>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] cursor-pointer hover:border-[#D1E8BC] transition-colors">
            <div>
              <p className="font-semibold text-[#171A17]">Require Manager Approval for Billing Disputes</p>
              <p className="text-[#777E77] text-[11px] mt-0.5">Halt automated messaging when borrower disputes balance until manual review.</p>
            </div>
            <input
              type="checkbox"
              checked={managerApprovalDisputes}
              onChange={(e) => setManagerApprovalDisputes(e.target.checked)}
              className="w-4 h-4 accent-[#245C35] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] cursor-pointer hover:border-[#D1E8BC] transition-colors">
            <div>
              <p className="font-semibold text-[#171A17]">Require Manager Approval for Financial Hardship</p>
              <p className="text-[#777E77] text-[11px] mt-0.5">Enforce senior collection officer review before offering restructuring.</p>
            </div>
            <input
              type="checkbox"
              checked={managerApprovalHardship}
              onChange={(e) => setManagerApprovalHardship(e.target.checked)}
              className="w-4 h-4 accent-[#245C35] rounded cursor-pointer"
            />
          </label>

          <div className="p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#171A17]">RAG Semantic Similarity Cutoff</span>
              <span className="font-mono font-bold text-[#245C35]">{confidenceThreshold}%</span>
            </div>
            <p className="text-[#777E77] text-[11px] mb-2">
              If chunk confidence is below this cutoff, route to manager review without auto-replying.
            </p>
            <input
              type="range"
              min="70"
              max="95"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full cursor-pointer accent-[#245C35]"
            />
          </div>
        </div>
      </div>

      {/* Regulatory Permissible Contact Windows */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E7EBE3] shadow-fintech-card space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E7EBE3] pb-3.5">
          <Bell className="w-4 h-4 text-[#245C35]" />
          <h2 className="text-sm font-bold text-[#171A17] font-heading">Regulatory Contact Windows (RBI Guidelines)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[#777E77] font-semibold block mb-1.5">Permissible Start Time</label>
            <input
              type="time"
              value={callingWindowStart}
              onChange={(e) => setCallingWindowStart(e.target.value)}
              className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-4 py-2 text-xs text-[#171A17] font-mono focus:outline-none focus:border-[#245C35]"
            />
          </div>
          <div>
            <label className="text-[#777E77] font-semibold block mb-1.5">Permissible End Time</label>
            <input
              type="time"
              value={callingWindowEnd}
              onChange={(e) => setCallingWindowEnd(e.target.value)}
              className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-4 py-2 text-xs text-[#171A17] font-mono focus:outline-none focus:border-[#245C35]"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-[#245C35] hover:bg-[#1B4728] text-white rounded-full text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
        >
          <Save className="w-4 h-4 text-[#B5F078]" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
