export type LoanStatus = 'paid' | 'due' | 'overdue' | 'promise_to_pay' | 'disputed';

export type AIIntent =
  | 'PAYMENT_DELAY'
  | 'PAYMENT_PROMISE'
  | 'FINANCIAL_DIFFICULTY'
  | 'PAYMENT_DISPUTE'
  | 'PAYMENT_CLAIMED'
  | 'EXTENSION_REQUEST'
  | 'WRONG_NUMBER';

export type FollowUpStatus = 'pending' | 'completed' | 'escalated' | 'failed';

export type PaymentStatus = 'verified' | 'pending' | 'failed' | 'disputed';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Customer {
  id: string; // CUS001
  name: string;
  phone: string;
  email: string;
  city: string;
  avatar: string;
  totalLoans: number;
  activeLoanId: string;
  riskCategory: 'Low' | 'Medium' | 'High';
  creditScore: number;
}

export interface Loan {
  id: string; // LN1001
  customerId: string;
  customerName: string;
  principal: number;
  emi: number;
  outstanding: number;
  dueDate: string;
  daysOverdue: number;
  status: LoanStatus;
  interestRate: number;
  tenureMonths: number;
  lastFollowupDate: string;
  nextFollowupDate: string;
  assignedManager: string;
  loanType: 'Personal Loan' | 'Business Loan' | 'Consumer Durable' | 'Auto Loan';
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'customer' | 'manager' | 'system';
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  isApprovedByManager?: boolean;
  intentBadge?: AIIntent;
}

export interface RagContext {
  policyTitle: string;
  relevantSection: string;
  sourceFile: string;
  chunkId: string;
  relevanceScore: number;
}

export interface AIAnalysis {
  detectedIntent: AIIntent;
  reason: string;
  paymentPromise: boolean;
  promisedTimeline: string;
  recommendedAction: string;
  confidence: number;
  ragContext: RagContext;
  aiSuggestedResponse: string;
  requiresManagerApproval: boolean;
  suggestedFollowupDate?: string;
  suggestedFollowupTime?: string;
  attemptCount: number;
}

export interface Conversation {
  id: string;
  loanId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAvatar: string;
  lastMessageTime: string;
  unread: boolean;
  messages: ChatMessage[];
  aiAnalysis: AIAnalysis;
  channel: 'WhatsApp' | 'SMS' | 'Call' | 'Email';
}

export interface FollowUpItem {
  id: string;
  customerId: string;
  customerName: string;
  loanId: string;
  followupType: 'WhatsApp' | 'SMS' | 'Interactive Call' | 'Email';
  scheduledAt: string;
  scheduledTime: string;
  aiReason: string;
  status: FollowUpStatus;
  priority: Priority;
  attemptNumber: number;
  outstandingAmount: number;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  method: 'UPI' | 'NetBanking' | 'Auto-Debit (NACH)' | 'Debit Card';
  referenceNumber: string;
  status: PaymentStatus;
}

export interface EscalationRecord {
  id: string;
  customerId: string;
  customerName: string;
  loanId: string;
  reason: string;
  aiRecommendation: string;
  createdAt: string;
  priority: Priority;
  assignedTo: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Approved' | 'Rejected';
  requestedExtensionDays?: number;
}

export interface RagDocumentChunk {
  chunkId: string;
  section: string;
  content: string;
  tokenCount: number;
  keywords: string[];
}

export interface RagDocument {
  id: string;
  title: string;
  category: string;
  fileType: 'PDF' | 'DOCX' | 'MD';
  fileSize: string;
  chunksCount: number;
  lastUpdated: string;
  indexedDate: string;
  status: 'Indexed' | 'Processing';
  summary: string;
  chunks: RagDocumentChunk[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'promise' | 'dispute' | 'payment' | 'rag' | 'alert';
  read: boolean;
  linkTab?: string;
  targetId?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  type: 'system' | 'customer' | 'ai' | 'manager' | 'payment';
  meta?: string;
}
