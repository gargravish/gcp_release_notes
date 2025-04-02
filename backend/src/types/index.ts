export interface ReleaseNote {
  product_name: string;
  release_note_type: string;
  description: string;
  published_at: string;
}

export type Timeframe = '7d' | '30d' | '90d';

export interface ReleaseNotesResponse {
  notes: ReleaseNote[];
  filters: {
    timeframe: Timeframe;
    types: string[];
    products: string[];
  };
  summary?: SummaryResult;
  summaryError?: {
    message: string;
    details: string;
  } | null;
}

export interface SummaryResult {
  markdown: string;
  keyFeatures: string[];
  industryUseCases: string[];
}

export interface MetaResponse {
  products?: string[];
  types?: string[];
}

export interface ApiError {
  error: string;
  message: string;
} 