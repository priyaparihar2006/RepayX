import React from 'react';
import type { AnalyticsResponse } from '../../types/api';
import { formatNumber, formatPercent } from '../../lib/format';

export const ModelCard: React.FC<{ model: NonNullable<AnalyticsResponse['model']> }> = ({ model }) => {
  const e = model.evaluation;
  const rows: [string, number | null][] = [
    ['ROC-AUC', e.roc_auc],
    ['Accuracy', e.accuracy],
    ['Precision', e.precision],
    ['Recall', e.recall],
    ['F1', e.f1],
  ];
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
      <h2 className="text-sm font-bold text-slate-900">Model Evaluation</h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Logistic regression · <span className="font-mono">{model.model_version}</span>
      </p>
      <dl className="mt-3 grid grid-cols-5 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{formatPercent(value, 1)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        Accuracy, precision, recall and F1 at the {formatPercent(model.classification_threshold * 100, 0)} classification
        threshold on {formatNumber(e.holdout_customers)} held-out customers. {e.note}
      </p>
    </section>
  );
};
