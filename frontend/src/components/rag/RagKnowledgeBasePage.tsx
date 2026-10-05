import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Upload,
  Search,
  Sparkles,
  CheckCircle2,
  Trash2,
  Eye,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { RagDocument } from '../../types';
import { INITIAL_RAG_DOCUMENTS } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export const RagKnowledgeBasePage: React.FC = () => {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<RagDocument[]>(INITIAL_RAG_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<RagDocument | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Delinquency Policy');
  const [isUploading, setIsUploading] = useState(false);

  // Test AI Retrieval state
  const [testQuery, setTestQuery] = useState(
    'What is the policy for customers requesting a payment extension?'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [retrievalResults, setRetrievalResults] = useState<{
    query: string;
    synthesizedAnswer: string;
    sources: Array<{
      title: string;
      chunkId: string;
      score: number;
      text: string;
    }>;
  } | null>({
    query: 'What is the policy for customers requesting a payment extension?',
    synthesizedAnswer:
      'Under the Emergency Extension & Hardship Policy (Section 2.5), borrowers requesting a temporary postponement due to medical emergencies or unforeseen hardship can be granted up to 10 days extension. This requires Collection Manager digital approval and a review of the borrower’s prior 12-month repayment consistency (maximum 1 prior default allowed). Outbound dunning calls are paused during the approved moratorium.',
    sources: [
      {
        title: 'Extension & Hardship Policy',
        chunkId: 'CHUNK-EXT-004',
        score: 96,
        text: 'Medical emergency extension requests up to 10 days can be approved by Collection Manager if past repayment record shows no more than 1 prior default in 12 months. Requires manager digital sign-off and suppresses legal escalation.',
      },
      {
        title: 'Late Payment Policy',
        chunkId: 'CHUNK-LP-014',
        score: 89,
        text: 'Customers who indicate a temporary income or salary delay within 7 days may be accommodated with an automated scheduled follow-up according to the approved repayment communication procedure.',
      },
    ],
  });

  const handleTestSearch = () => {
    if (!testQuery.trim()) return;
    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      const qLower = testQuery.toLowerCase();

      let answer = '';
      let sources = [];

      if (qLower.includes('wrong number') || qLower.includes('sim') || qLower.includes('dnd')) {
        answer =
          'According to Communication & DND Guidelines (Section 5.1), when a contact reports being a wrongful recipient or mentions a reassigned SIM card, all outbound automated messaging must immediately halt to ensure regulatory compliance. The record is flagged for KYC skip-tracing.';
        sources = [
          {
            title: 'Communication & DND Guidelines',
            chunkId: 'CHUNK-COM-019',
            score: 99,
            text: 'Upon recipient declaration of wrong number or reissued SIM card, the system must immediately cease automated omnichannel triggers to prevent regulatory penalties. Flag customer for skip-tracing.',
          },
        ];
      } else if (qLower.includes('late fee') || qLower.includes('waive') || qLower.includes('penal')) {
        answer =
          'Per Section 4.3 of Late Payment Policy, late fee penalties of 2% accrue on DPD +5. If a borrower communicates intent and commits to payment within the first 3 days of delinquency, collection managers hold authority to authorize a 100% penal interest waiver.';
        sources = [
          {
            title: 'Late Payment Policy',
            chunkId: 'CHUNK-LP-015',
            score: 95,
            text: 'Late fee penalties of 2% per month will begin accruing on DPD +5. For borrowers who communicate intent within the first 3 days, managers have discretionary power to offer a 100% waiver upon payment completion.',
          },
        ];
      } else if (qLower.includes('dispute') || qLower.includes('counter') || qLower.includes('cash')) {
        answer =
          'Under the Billing Dispute & Ledger Reconciliation SOP, when a borrower claims physical counter deposit or disputed ledger balance, active dunning is paused for 24 hours while internal branch cash-in-transit records and stamped counter receipts are verified.';
        sources = [
          {
            title: 'Billing Dispute & Ledger Reconciliation SOP',
            chunkId: 'CHUNK-DSP-003',
            score: 97,
            text: 'When customer disputes ledger balance stating physical counter or OTC receipt, collection operations must halt outbound dunning and initiate 24-hour branch receipt reconciliation with cash-in-transit records.',
          },
        ];
      } else {
        answer =
          'Based on retrieved lending operating procedures, borrowers communicating bona fide hardship or scheduled timeline delays are managed with structured PTP tags. Inbound chat sentiment is mapped directly to standard collection cadences (SOP 3.1).';
        sources = [
          {
            title: 'Late Payment Policy',
            chunkId: 'CHUNK-LP-014',
            score: 92,
            text: 'Customers who indicate a temporary income or salary delay within 7 days may be accommodated with an automated scheduled follow-up according to approved SOP.',
          },
          {
            title: 'Follow-up SOP & Call Scripts',
            chunkId: 'CHUNK-SOP-008',
            score: 87,
            text: 'Permissible contact window operates between 08:00 hrs and 19:00 hrs with respectful tone enforcement.',
          },
        ];
      }

      setRetrievalResults({
        query: testQuery,
        synthesizedAnswer: answer,
        sources,
      });

      addToast({
        type: 'success',
        title: 'Retrieval Complete',
        message: `Found ${sources.length} matching policy chunks with >85% semantic relevance.`,
      });
    }, 600);
  };

  const handleUploadSubmit = () => {
    if (!uploadTitle.trim()) return;
    setIsUploading(true);

    setTimeout(() => {
      const newDoc: RagDocument = {
        id: `DOC00${documents.length + 1}`,
        title: uploadTitle,
        category: uploadCategory,
        fileType: 'PDF',
        fileSize: '1.9 MB',
        chunksCount: 14,
        lastUpdated: '29 Sep 2026',
        indexedDate: '29 Sep 2026',
        status: 'Indexed',
        summary: 'Standard regulatory policy chunked into semantic vector embeddings for AI follow-up grounding.',
        chunks: [
          {
            chunkId: `CHUNK-${Math.floor(100 + Math.random() * 900)}`,
            section: 'General Operational Provisions',
            content: `Standard recovery guidelines for ${uploadTitle} applicable across all retail loan recovery agents.`,
            tokenCount: 82,
            keywords: ['policy', 'compliance', 'operations'],
          },
        ],
      };

      setDocuments([newDoc, ...documents]);
      setIsUploading(false);
      setIsUploadModalOpen(false);
      setUploadTitle('');

      addToast({
        type: 'success',
        title: 'Document Indexed',
        message: `"${newDoc.title}" successfully chunked into 14 vector embeddings.`,
      });
    }, 1200);
  };

  const handleDeleteDocument = (id: string, title: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
    addToast({
      type: 'info',
      title: 'Document Removed',
      message: `"${title}" removed from active RAG vector index.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              AI Knowledge Base
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
              RAG Grounding
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage documents used by the AI to make policy-aware, compliant recovery decisions.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all self-start sm:self-auto"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{doc.status}</span>
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                {doc.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {doc.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-3">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {doc.chunksCount} Chunks
                </span>
                <span>{doc.fileType} · {doc.fileSize}</span>
                <span>{doc.lastUpdated}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Chunks</span>
                </button>

                <button
                  onClick={() => handleDeleteDocument(doc.id, doc.title)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove from index"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive "Test AI Retrieval" Playground (Section 20) */}
      <div className="bg-white rounded-2xl p-6 border border-purple-200/80 shadow-xs bg-gradient-to-b from-purple-50/20 via-white to-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Test AI Retrieval (RAG Playground)</h2>
            <p className="text-xs text-slate-500">
              Simulate semantic similarity search against the indexed policy chunks.
            </p>
          </div>
        </div>

        {/* Query Input */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask a loan recovery policy question..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={handleTestSearch}
            disabled={isSearching}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSearching ? 'Embedding & Searching...' : 'Search Knowledge Base'}</span>
          </button>
        </div>

        {/* Quick Suggested Queries */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-medium">Quick examples:</span>
          {[
            'What is the policy for customers requesting a payment extension?',
            'When can late fee penalties be waived?',
            'How to handle customer reporting wrong number?',
            'What is the rule when customer disputes cash receipt?',
          ].map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setTestQuery(sample);
              }}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer text-left"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Results Presentation */}
        {retrievalResults && (
          <div className="mt-5 space-y-4 pt-5 border-t border-slate-100">
            {/* AI Synthesized Answer */}
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>RAG Grounded Response Synthesis</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-normal">
                {retrievalResults.synthesizedAnswer}
              </p>
            </div>

            {/* Retrieved Source Chunks with Relevance Score */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
                Retrieved Policy Sources ({retrievalResults.sources.length} Chunks)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {retrievalResults.sources.map((src, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900">{src.title}</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {src.score}% Match
                      </span>
                    </div>
                    <p className="text-slate-600 italic text-[11px] leading-relaxed">
                      "{src.text}"
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">
                      Chunk ID: {src.chunkId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Details Modal (Section 20) */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title || 'Document Details'}
        subtitle={`Category: ${selectedDoc?.category} · Status: ${selectedDoc?.status}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 block">Processing Status</span>
              <span className="font-bold text-emerald-700 font-mono">Indexed</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Total Chunks</span>
              <span className="font-bold text-slate-900 font-mono">{selectedDoc?.chunksCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Embeddings Model</span>
              <span className="font-bold text-slate-900 font-mono text-[11px]">text-embedding-004</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Last Indexed</span>
              <span className="font-bold text-slate-900 font-mono">{selectedDoc?.indexedDate}</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Retrieved Context Preview (Indexed Chunks)</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedDoc?.chunks.map((chunk) => (
                <div key={chunk.chunkId} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-purple-700">{chunk.section}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{chunk.chunkId}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{chunk.content}</p>
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 font-mono">
                    <span>{chunk.tokenCount} tokens</span>
                    <span>·</span>
                    <span>Keywords: {chunk.keywords.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <button
              onClick={() => setSelectedDoc(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload & Index Recovery Document"
        subtitle="Extract, chunk, and embed policy documents into RepayX RAG vector database."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Document Title</label>
            <input
              type="text"
              placeholder="e.g. RBI Fair Practices Code 2026"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="Delinquency Policy">Delinquency & Default Policy</option>
              <option value="Call Scripts">Omnichannel Call Scripts & Cadences</option>
              <option value="Compliance">Regulatory & Fair Practices</option>
              <option value="Restructuring">Hardship & Moratorium Restructuring</option>
            </select>
          </div>

          {/* File drop zone simulator */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-purple-400 transition-colors bg-slate-50/50">
            <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">Drag and drop policy file, or browse</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, DOCX, Markdown (Max 25 MB)</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={isUploading || !uploadTitle.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Chunking & Indexing...' : 'Upload & Generate Embeddings'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
