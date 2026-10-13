import { useId, useRef, useState } from 'react';
import { CloudUpload, FileSpreadsheet, X } from 'lucide-react';

const configuredLimit = Number(import.meta.env.VITE_IMPORT_MAX_BYTES);
export const CSV_MAX_BYTES = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 5 * 1024 * 1024;
const sizeLabel = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface Props {
  file: File | null;
  disabled?: boolean;
  maxBytes?: number;
  onChange: (file: File | null) => void;
}

/** File checks are UX only; the import API remains authoritative for CSV contents. */
export function CsvDropzone({ file, disabled = false, maxBytes = CSV_MAX_BYTES, onChange }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const hintId = useId();
  const errorId = useId();
  const select = (files: FileList | File[]) => {
    if (disabled || !files.length) return;
    const next = files[0];
    const problem = files.length !== 1 ? 'Choose one CSV file at a time.'
      : !/\.csv$/i.test(next.name) ? 'Unsupported file format. Please choose a .csv file.'
      : next.size === 0 ? 'This file is empty. Choose a CSV containing data.'
      : next.size > maxBytes ? `File is too large. The maximum size is ${sizeLabel(maxBytes)}.` : '';
    setError(problem);
    onChange(problem ? null : next);
  };
  return (
    <div className="space-y-3">
      <input ref={picker} type="file" accept=".csv,text/csv" aria-label="CSV file" className="sr-only" tabIndex={-1} disabled={disabled}
        onChange={(event) => { if (event.target.files) select(event.target.files); event.target.value = ''; }} />
      <button type="button" disabled={disabled} aria-label="Browse Files" aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
        onClick={() => picker.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); if (!disabled) { depth.current++; setDragging(true); } }}
        onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; }}
        onDragLeave={(event) => { event.preventDefault(); event.stopPropagation(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); event.stopPropagation(); depth.current = 0; setDragging(false); select(event.dataTransfer.files); }}
        className={`flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/50'}`}>
        <span className="rounded-2xl bg-white p-3 text-blue-600 shadow-xs"><CloudUpload className="h-8 w-8" aria-hidden="true" /></span>
        <span className="text-sm font-semibold text-slate-900">{dragging ? 'Drop your CSV file here' : 'Drag & Drop your CSV file here'}</span>
        <span className="text-xs text-slate-500">or click to browse files</span>
        <span className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Browse Files</span>
        <span id={hintId} className="text-xs text-slate-500">CSV files only · Maximum {sizeLabel(maxBytes)}</span>
      </button>
      {error && <p id={errorId} role="alert" className="text-xs text-red-700">{error}</p>}
      {file && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <FileSpreadsheet className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="break-all text-sm font-medium text-slate-800">{file.name}</p><p className="text-xs text-slate-500">{sizeLabel(file.size)} · CSV{file.type ? ` (${file.type})` : ''}</p></div>
        <button type="button" disabled={disabled} className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50" onClick={() => picker.current?.click()}>Replace file</button>
        <button type="button" disabled={disabled} aria-label="Remove file" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" onClick={() => { setError(''); onChange(null); }}><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>}
    </div>
  );
}
