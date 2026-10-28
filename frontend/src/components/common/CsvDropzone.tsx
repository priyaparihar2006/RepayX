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
        className={`flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-4 py-8 text-center transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245C35] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${dragging ? 'border-[#245C35] bg-[#EDF5E5]' : 'border-[#E7EBE3] bg-[#F5F7F3] hover:border-[#245C35] hover:bg-[#EDF5E5]/40'}`}>
        <span className="rounded-full bg-white p-3.5 text-[#245C35] shadow-xs border border-[#E7EBE3]"><CloudUpload className="h-8 w-8" aria-hidden="true" /></span>
        <span className="text-sm font-bold text-[#171A17]">{dragging ? 'Drop your CSV file here' : 'Drag & Drop your CSV file here'}</span>
        <span className="text-xs text-[#777E77]">or click to browse files</span>
        <span className="rounded-full bg-[#245C35] hover:bg-[#1B4728] px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors">Browse Files</span>
        <span id={hintId} className="text-xs text-[#777E77]">CSV files only · Maximum {sizeLabel(maxBytes)}</span>
      </button>
      {error && <p id={errorId} role="alert" className="text-xs text-rose-700 bg-[#FDF2F4] p-3 rounded-xl border border-rose-200">{error}</p>}
      {file && <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-[#E7EBE3] bg-white p-4 shadow-fintech-card">
        <FileSpreadsheet className="h-6 w-6 shrink-0 text-[#245C35]" aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="break-all text-sm font-bold text-[#171A17]">{file.name}</p><p className="text-xs text-[#777E77]">{sizeLabel(file.size)} · CSV{file.type ? ` (${file.type})` : ''}</p></div>
        <button type="button" disabled={disabled} className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#245C35] hover:bg-[#EDF5E5] transition-colors disabled:opacity-50" onClick={() => picker.current?.click()}>Replace file</button>
        <button type="button" disabled={disabled} aria-label="Remove file" className="rounded-full p-2 text-[#777E77] hover:bg-[#FDF2F4] hover:text-rose-700 transition-colors disabled:opacity-50" onClick={() => { setError(''); onChange(null); }}><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>}
    </div>
  );
}
