
export interface AppSettings {
  whatsappNumber: string;
  emailAddress: string;
  spreadsheetUrl: string;
  googleScriptUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  autoSaveToCloud?: boolean;
}

export interface AnalysisResult {
  completionPercentage: number;
  summary: string;
  details: string[];
  recommendations: string;
  timestamp: string;
  location?: string;
  isRejected?: boolean; // True if AI detects fake/internet image
  rejectionReason?: string; // Reason for rejection
}

export interface HistoryItem {
  id: string;
  image: string; // base64 string
  result: AnalysisResult;
  savedAt: number;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}